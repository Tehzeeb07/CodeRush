/**
 * RBAC â€” Role-Based Access Control for CodeRush Admin Panel.
 *
 * Roles: USER | ADMIN | SUPER_ADMIN
 *
 * Resolution priority:
 *   1. SUPER_ADMIN â€” email in the SUPER_ADMINS env list
 *   2. Role row in the `roles` table (assigned by a SUPER_ADMIN)
 *   3. USER â€” fallback
 *
 * Security:
 *   - Role is NEVER writable from the client.
 *   - All role mutations run through these server functions.
 *   - Every mutation writes an audit log entry.
 *   - A user can never promote themselves.
 */

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, mutation, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Emails that are always SUPER_ADMIN, regardless of DB state. */
function superAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMINS ?? "gb8585438@gmail.com";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Role hierarchy numeric values for comparison. */
const ROLE_RANK: Record<string, number> = {
  USER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
};

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

/** Reject banned callers from privileged actions. */
function requireNotBanned(caller: { isBanned: boolean }): void {
  if (caller.isBanned) {
    throw new Error("FORBIDDEN: Your account has been suspended. Contact an administrator to restore access.");
  }
}

/**
 * Internal helper: resolve the full auth user + profile for a given userId.
 */
async function resolveIdentity(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<{
  email: string | undefined;
  role: UserRole;
  username: string | null;
  isBanned: boolean;
} | null> {
  const authUser = await ctx.db.get(userId);
  if (!authUser) return null;

  const email = (authUser.email as string | undefined)?.toLowerCase();

  // 1. Hardcoded super-admin list
  if (email && superAdminEmails().includes(email)) {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return {
      email,
      role: "SUPER_ADMIN",
      username: profile?.username ?? null,
      isBanned: profile?.isBanned ?? false,
    };
  }

  // 2. DB role assignment
  const roleRow = await ctx.db
    .query("roles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  return {
    email,
    role: (roleRow?.role as UserRole) ?? "USER",
    username: profile?.username ?? null,
    isBanned: profile?.isBanned ?? false,
  };
}

/**
 * Query: get the authenticated user's identity and role.
 * Returns null when not signed in.
 */
export const me = query({
  args: {},
  handler: async (ctx): Promise<{
    email: string | undefined;
    role: UserRole;
    username: string | null;
    isBanned: boolean;
  } | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return resolveIdentity(ctx, userId);
  },
});

/**
 * Query: get any user's role by userId (admin+).
 */
export const getUserRole = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await getAuthUserId(ctx);
    if (!caller) throw new Error("Not authenticated");

    const callerInfo = await resolveIdentity(ctx, caller);
    if (!callerInfo) throw new Error("Could not resolve caller identity");
    if (callerInfo.role !== "ADMIN" && callerInfo.role !== "SUPER_ADMIN") {
      throw new Error("Insufficient permissions");
    }

    return resolveIdentity(ctx, args.userId);
  },
});

/**
 * Query: list all users with their roles and status, for the admin Users page.
 * Supports search by email or username, and filters by role.
 * ADMINS cannot see SUPER_ADMIN full details â€” they can only see they exist.
 */
export const listUsersAdmin = query({
  args: {
    search: v.optional(v.string()),
    roleFilter: v.optional(
      v.union(
        v.literal("USER"),
        v.literal("ADMIN"),
        v.literal("SUPER_ADMIN"),
        v.literal("ALL")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const caller = await resolveIdentity(ctx, callerId);
    if (!caller) throw new Error("Could not resolve caller");
    if (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN") {
      throw new Error("Insufficient permissions");
    }

    const limit = Math.min(args.limit ?? 100, 200);
    const users = await ctx.db.query("users").collect();

    let filtered = users;
    if (args.search && args.search.trim().length > 0) {
      const term = args.search.trim().toLowerCase();
      filtered = users.filter(
        (u) =>
          (u.email?.toLowerCase() ?? "").includes(term)
      );
    }

    const results: Array<{
      _id: Id<"users">;
      email: string | undefined;
      username: string | null;
      role: UserRole;
      isSuspended: boolean;
      isBanned: boolean;
      xp: number;
      avatarUrl: string | null;
      createdAt: number;
    }> = [];

    for (const u of filtered) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", u._id))
        .unique();

      const roleRow = await ctx.db
        .query("roles")
        .withIndex("by_userId", (q) => q.eq("userId", u._id))
        .unique();

      let effectiveRole: UserRole;
      if (superAdminEmails().includes((u.email as string)?.toLowerCase() ?? "")) {
        effectiveRole = "SUPER_ADMIN";
      } else {
        effectiveRole = (roleRow?.role as UserRole) ?? "USER";
      }

      if (caller.role === "ADMIN" && effectiveRole === "SUPER_ADMIN") {
        results.push({
          _id: u._id,
          email: "[protected]",
          username: profile?.username ?? "[protected]",
          role: effectiveRole,
          isSuspended: profile?.isSuspended ?? false,
          isBanned: profile?.isBanned ?? false,
          xp: profile?.xp ?? 0,
          avatarUrl: profile?.avatarUrl ?? null,
          createdAt: u._creationTime,
        });
        continue;
      }

      results.push({
        _id: u._id,
        email: u.email,
        username: profile?.username ?? null,
        role: effectiveRole,
        isSuspended: profile?.isSuspended ?? false,
        isBanned: profile?.isBanned ?? false,
        xp: profile?.xp ?? 0,
        avatarUrl: profile?.avatarUrl ?? null,
        createdAt: u._creationTime,
      });
    }

    let roleFiltered = results;
    if (args.roleFilter && args.roleFilter !== "ALL") {
      roleFiltered = results.filter((r) => r.role === args.roleFilter);
    }

        return roleFiltered.slice(0, limit);
  },
});

/**
 * Mutation: assign or change a user's role.
 * Only SUPER_ADMIN can manage roles. A user can never change their own role.
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("USER"), v.literal("ADMIN")),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const caller = await resolveIdentity(ctx, callerId);
    if (!caller) throw new Error("Could not resolve caller");
    requireNotBanned(caller);
    if (caller.role !== "SUPER_ADMIN") {
      throw new Error("Only SUPER_ADMIN can manage roles");
    }
    if (args.userId === callerId) {
      throw new Error("You cannot change your own role");
    }

    const target = await resolveIdentity(ctx, args.userId);
    if (!target) throw new Error("Target user not found");
    if (target.role === "SUPER_ADMIN") {
      throw new Error("Cannot modify a SUPER_ADMIN's role");
    }

    const existing = await ctx.db
      .query("roles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        assignedBy: callerId,
        assignedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("roles", {
        userId: args.userId,
        role: args.role,
        assignedBy: callerId,
        assignedAt: Date.now(),
      });
    }

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "role_changed",
      target: "user",
      targetId: args.userId,
      details: `Changed role to ${args.role}`,
      ip: undefined,
      createdAt: Date.now(),
    });

        return { ok: true };
  },
});

/**
 * Mutation: suspend or un-suspend a user. ADMIN+.
 */
export const setUserSuspension = mutation({
  args: {
    userId: v.id("users"),
    suspended: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const caller = await resolveIdentity(ctx, callerId);
    if (!caller) throw new Error("Could not resolve caller");
    requireNotBanned(caller);
    if (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN") {
      throw new Error("Insufficient permissions");
    }
    if (args.userId === callerId) {
      throw new Error("You cannot suspend yourself");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!profile) throw new Error("User profile not found");

    const targetRole = await resolveIdentity(ctx, args.userId);
    if (targetRole?.role === "SUPER_ADMIN") {
      throw new Error("SUPER_ADMIN_PROTECTED: Cannot modify a SUPER_ADMIN account");
    }

    await ctx.db.patch(profile._id, {
      isSuspended: args.suspended,
      suspendedAt: args.suspended ? Date.now() : undefined,
      suspendedBy: args.suspended ? callerId : undefined,
      suspendedReason: args.suspended
        ? args.reason ?? "No reason provided"
        : undefined,
    });

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "user_suspended",
      target: "user",
      targetId: args.userId,
      details: args.suspended
        ? `Suspended: ${args.reason ?? "No reason provided"}`
        : "Reinstated",
      ip: undefined,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

/**
 * Mutation: ban or un-ban a user. SUPER_ADMIN only.
 *
 * SUPER_ADMIN accounts are always protected - both the env email list and
 * DATABASE-assigned SUPER_ADMIN rows are rejected here server-side.
 */
export const setUserBan = mutation({
  args: {
    userId: v.id("users"),
    banned: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("UNAUTHORIZED: Not authenticated");

    const caller = await resolveIdentity(ctx, callerId);
    if (!caller) throw new Error("UNAUTHORIZED: Could not resolve caller");
    requireNotBanned(caller);
    if (caller.role !== "SUPER_ADMIN") {
      throw new Error("FORBIDDEN: Only SUPER_ADMIN can ban users");
    }
    if (args.userId === callerId) {
      throw new Error("FORBIDDEN: You cannot ban yourself");
    }

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("USER_NOT_FOUND: User not found");

    const targetRole = await resolveIdentity(ctx, args.userId);
    if (targetRole?.role === "SUPER_ADMIN") {
      throw new Error("SUPER_ADMIN_PROTECTED: Cannot ban a SUPER_ADMIN account");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!profile) throw new Error("USER_NOT_FOUND: User profile not found");

    if (args.banned && profile.isBanned) {
      throw new Error("USER_ALREADY_BANNED: This user is already banned");
    }
    if (!args.banned && !profile.isBanned) {
      throw new Error("USER_NOT_BANNED: This user is not banned");
    }

    await ctx.db.patch(profile._id, {
      isBanned: args.banned,
      bannedAt: args.banned ? Date.now() : undefined,
      bannedReason: args.banned
        ? args.reason ?? "No reason provided"
        : undefined,
      bannedBy: args.banned ? callerId : undefined,
    });

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: args.banned ? "user_banned" : "user_unbanned",
      target: "user",
      targetId: args.userId,
      details: args.banned
        ? `Banned: ${args.reason ?? "No reason provided"}`
        : "Unbanned - access restored",
      ip: undefined,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

/**
 * Delete a user - SUPER_ADMIN only.
 * Related records are cleaned up so the deletion leaves no dangling
 * references: profile, role, stats, submissions (+ likes), likes,
 * executions (+ logs), judge submissions, achievements, bookmarks,
 * notifications, owned teams (+ memberships), memberships, and reports
 * submitted by / targeting the user.
 */
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("UNAUTHORIZED: Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller) throw new Error("UNAUTHORIZED");
    requireNotBanned(caller);
    if (caller.role !== "SUPER_ADMIN") throw new Error("FORBIDDEN: Only SUPER_ADMIN can delete users");
    if (args.userId === callerId) throw new Error("FORBIDDEN: You cannot delete yourself");

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("USER_NOT_FOUND: User not found");
    const targetEmail = (target.email as string) ?? "[unknown]";

    const targetRole = await resolveIdentity(ctx, args.userId);
    if (targetRole?.role === "SUPER_ADMIN") {
      throw new Error("SUPER_ADMIN_PROTECTED: Cannot delete a SUPER_ADMIN account");
    }

    // ------------------------------------------------------------------
    // Convex AUTH data cleanup — the registered user must be permanently
    // removed from the authentication data as well, otherwise the user
    // would still "exist" in auth (sessions/accounts) after deletion.
    // ------------------------------------------------------------------

    // 1. Sessions -> their refresh tokens + verifiers, then the sessions.
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const session of sessions) {
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of refreshTokens) await ctx.db.delete(token._id);

      // authVerifiers has no session index — scan is scoped to this app.
      const verifiers = await ctx.db.query("authVerifiers").collect();
      for (const verifier of verifiers) {
        if (String(verifier.sessionId) === String(session._id)) {
          await ctx.db.delete(verifier._id);
        }
      }

      await ctx.db.delete(session._id);
    }

    // 2. Auth accounts (credentials) -> their verification codes, then the accounts.
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
      .collect();
    for (const account of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      for (const code of codes) await ctx.db.delete(code._id);

      await ctx.db.delete(account._id);
    }

    // ------------------------------------------------------------------
    // CodeRush domain cleanup — every table that references the user.
    // ------------------------------------------------------------------

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (profile) await ctx.db.delete(profile._id);

    const roleRow = await ctx.db
      .query("roles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (roleRow) await ctx.db.delete(roleRow._id);

    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (stats) await ctx.db.delete(stats._id);

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const b of bookmarks) await ctx.db.delete(b._id);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", args.userId))
      .collect();
    for (const n of notifications) await ctx.db.delete(n._id);

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of submissions) {
      const likesOn = await ctx.db
        .query("likes")
        .withIndex("by_submission", (q) => q.eq("submissionId", s._id))
        .collect();
      for (const l of likesOn) await ctx.db.delete(l._id);
      await ctx.db.delete(s._id);
    }

    const userLikes = await ctx.db
      .query("likes")
      .withIndex("by_user_and_submission", (q) => q.eq("userId", args.userId))
      .collect();
    for (const l of userLikes) await ctx.db.delete(l._id);

    const executionsOwn = await ctx.db
      .query("executions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const e of executionsOwn) {
      const logs = await ctx.db
        .query("executionLogs")
        .withIndex("by_execution", (q) => q.eq("executionId", e._id))
        .collect();
      for (const log of logs) await ctx.db.delete(log._id);
      await ctx.db.delete(e._id);
    }

    const judgeSubs = await ctx.db
      .query("judgeSubmissions")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of judgeSubs) await ctx.db.delete(s._id);

    const achievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const a of achievements) await ctx.db.delete(a._id);

    const ownedTeams = await ctx.db
      .query("teams")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();
    for (const t of ownedTeams) {
      const members = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", t._id))
        .collect();
      for (const m of members) await ctx.db.delete(m._id);
      await ctx.db.delete(t._id);
    }
    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const m of memberships) await ctx.db.delete(m._id);

    const allReports = await ctx.db.query("reports").collect();
    for (const r of allReports) {
      if (String(r.reporterId) === String(args.userId)) {
        await ctx.db.delete(r._id);
      } else if (r.targetType === "user" && r.targetId === String(args.userId)) {
        await ctx.db.delete(r._id);
      }
    }

    await ctx.db.delete(args.userId);
    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "user_deleted",
      target: "user",
      targetId: args.userId,
      details: `Deleted user ${targetEmail}`,
      ip: undefined,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

/**
 * Query: full profile for a single user (admin users page -> View Profile).
 * SUPER_ADMIN callers see everything (no secrets). ADMIN callers see
 * protected-real rows masked for users who outrank them.
 */
export const adminGetUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("UNAUTHORIZED: Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller) throw new Error("UNAUTHORIZED: Could not resolve caller");
    if (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN") {
      throw new Error("FORBIDDEN: Insufficient permissions");
    }

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("USER_NOT_FOUND: User not found");

    const targetRole = await resolveIdentity(ctx, args.userId);
    if (!targetRole) throw new Error("USER_NOT_FOUND: User not found");
    const isSuper = targetRole.role === "SUPER_ADMIN";

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    // ADMINS never see identity fields of people who outrank them.
    const masked = caller.role === "ADMIN" && isSuper;

    const lastExecution = await ctx.db
      .query("executions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    return {
      _id: args.userId,
      email: masked ? "[protected]" : (target.email as string | undefined),
      username: masked ? "[protected]" : (profile?.username ?? null),
      role: targetRole.role,
      xp: profile?.xp ?? 0,
      avatarUrl: masked ? null : (profile?.avatarUrl ?? null),
      bio: masked ? null : (profile?.bio ?? null),
      isSuspended: profile?.isSuspended ?? false,
      isBanned: profile?.isBanned ?? false,
      bannedAt: profile?.bannedAt ?? null,
      bannedReason: profile?.bannedReason ?? null,
      bannedBy: profile?.bannedBy ?? null,
      createdAt: target._creationTime,
      lastActiveAt: lastExecution?.startedAt ?? null,
    };
  },
});

/**
 * Mutation: edit safe profile fields of a NON-SUPER_ADMIN account.
 * Caller must be ADMIN (USER targets only) or SUPER_ADMIN (USER/ADMIN targets).
 * Role is untouched here - role changes go through updateUserRole.
 */
export const adminUpdateUser = mutation({
  args: {
    userId: v.id("users"),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("UNAUTHORIZED: Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller) throw new Error("UNAUTHORIZED: Could not resolve caller");
    requireNotBanned(caller);
    if (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN") {
      throw new Error("FORBIDDEN: Insufficient permissions");
    }

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("USER_NOT_FOUND: User not found");

    const targetRole = await resolveIdentity(ctx, args.userId);
    if (targetRole?.role === "SUPER_ADMIN") {
      throw new Error("SUPER_ADMIN_PROTECTED: Cannot edit a SUPER_ADMIN account");
    }
    if (caller.role === "ADMIN" && targetRole?.role === "ADMIN") {
      throw new Error("FORBIDDEN: ADMIN cannot edit another ADMIN account");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!profile) throw new Error("USER_NOT_FOUND: User profile not found");

    const patch: Record<string, unknown> = {};
    if (args.username !== undefined) {
      const username = args.username.trim();
      if (!USERNAME_RE.test(username)) {
        throw new Error("INVALID_USERNAME: Username must be 3-20 characters: letters, numbers, underscores only");
      }
      const taken = await ctx.db
        .query("profiles")
        .withIndex("by_username", (q) => q.eq("username", username))
        .unique();
      if (taken && String(taken.userId) !== String(args.userId)) {
        throw new Error("USERNAME_TAKEN: That username is already in use");
      }
      patch.username = username;
    }
    if (args.bio !== undefined) {
      const bio = args.bio.trim();
      if (bio.length > 500) throw new Error("INVALID_BIO: Bio must be 500 characters or fewer");
      patch.bio = bio;
    }
    if (args.avatarUrl !== undefined && args.avatarUrl !== null) {
      if (args.avatarUrl.length > 2048 || !/^https?:\/\//.test(args.avatarUrl)) {
        throw new Error("INVALID_AVATAR: Avatar must be a valid http(s) URL");
      }
      patch.avatarUrl = args.avatarUrl;
    }
    if (Object.keys(patch).length === 0) {
      throw new Error("INVALID_INPUT: No editable fields provided");
    }

    await ctx.db.patch(profile._id, patch);

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "user_updated",
      target: "user",
      targetId: args.userId,
      details: `Updated profile fields: ${Object.keys(patch).join(", ")}`,
      ip: undefined,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

/** Query: list all admins and super admins (for roles page). */
export const listAdmins = query({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const roleRows = await ctx.db.query("roles").collect();
    const superEmails = superAdminEmails();

    // Gather all admin user IDs
    const adminIds = new Set<Id<"users">>();
    for (const r of roleRows) {
      if (r.role === "ADMIN" || r.role === "SUPER_ADMIN") {
        adminIds.add(r.userId);
      }
    }
    // Also add super admin emails
    const allUsers = await ctx.db.query("users").collect();
    for (const u of allUsers) {
      if (u.email && superEmails.includes(u.email.toLowerCase())) {
        adminIds.add(u._id);
      }
    }

    // Resolve identities
    const results = await Promise.all([...adminIds].map(async (uid) => {
      const info = await resolveIdentity(ctx, uid);
      return info ? { _id: uid, ...info } : null;
    }));

    return results.filter(Boolean);
  },
});

export { superAdminEmails, resolveIdentity, ROLE_RANK, requireNotBanned };
