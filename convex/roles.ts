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

type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

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
    if (caller.role === "ADMIN" && targetRole?.role === "SUPER_ADMIN") {
      throw new Error("ADMIN cannot modify a SUPER_ADMIN");
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
 */
export const setUserBan = mutation({
  args: {
    userId: v.id("users"),
    banned: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const caller = await resolveIdentity(ctx, callerId);
    if (!caller) throw new Error("Could not resolve caller");
    if (caller.role !== "SUPER_ADMIN") {
      throw new Error("Only SUPER_ADMIN can ban users");
    }
    if (args.userId === callerId) {
      throw new Error("You cannot ban yourself");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, {
        isBanned: args.banned,
        bannedAt: args.banned ? Date.now() : undefined,
        bannedReason: args.banned
          ? args.reason ?? "No reason provided"
          : undefined,
        bannedBy: args.banned ? callerId : undefined,
      });
    }

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "user_banned",
      target: "user",
      targetId: args.userId,
      details: `Banned: ${args.banned}${
        args.reason ? ` â€” ${args.reason}` : ""
      }`,
      ip: undefined,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

/** Delete a user â€” SUPER_ADMIN only. */
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || caller.role !== "SUPER_ADMIN") throw new Error("Forbidden");
    if (args.userId === callerId) throw new Error("You cannot delete yourself");

    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");
    const targetEmail = (target.email as string) ?? "[unknown]";
    if (superAdminEmails().includes(targetEmail.toLowerCase())) {
      throw new Error("Cannot delete a SUPER_ADMIN");
    }

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

export { superAdminEmails, resolveIdentity, ROLE_RANK };
