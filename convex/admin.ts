/**
 * Admin Dashboard â€” platform-wide analytics and aggregates.
 *
 * Every function verifies the caller is ADMIN or SUPER_ADMIN via
 * roles.resolveIdentity before returning data.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity, requireNotBanned } from "./roles";

/** Helper: check if email is a super admin. */
function superAdminEmailCheck(email: string | undefined): boolean {
  if (!email) return false;
  const raw = process.env.SUPER_ADMINS ?? "gb8585438@gmail.com";
  const admins = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

/** Admin dashboard KPI cards + trend data. */
export const getDashboardOverview = query({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const users = await ctx.db.query("users").collect();
    const problems = await ctx.db.query("problems").collect();
    const executions = await ctx.db.query("executions").collect();
    const judgeSubs = await ctx.db.query("judgeSubmissions").collect();
    const bookmarks = await ctx.db.query("bookmarks").collect();
    const submissions = await ctx.db.query("submissions").collect();

    const now = Date.now();
    const sevenDays = 7 * 86400000;

    // Source of truth for users: the Convex users table. Execution records
    // referencing a userId that no longer exists (orphans) are ignored so
    // user counts always reflect currently registered users only.
    const existingUserIds = new Set(users.map((u) => String(u._id)));

    const recentUserIds = new Set(
      executions
        .filter(
          (e) =>
            e.startedAt >= now - sevenDays &&
            existingUserIds.has(String(e.userId))
        )
        .map((e) => e.userId)
    );

    const successfulExecutions = executions.filter((e) => e.status === "success");
    const failedExecutions = executions.filter(
      (e) => e.status !== "success" && e.status !== "queued" && e.status !== "running"
    );

    const runtimes = executions
      .filter((e) => typeof e.executionTime === "number")
      .map((e) => e.executionTime as number);
    const avgExecutionTime = runtimes.length > 0
      ? Math.round(runtimes.reduce((a: number, b: number) => a + b, 0) / runtimes.length)
      : 0;

    // Users growth (last 7 days)
    const dailyNewUsers: Record<string, number> = {};
    users.forEach((u) => {
      const d = new Date(u._creationTime);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
      dailyNewUsers[key] = (dailyNewUsers[key] ?? 0) + 1;
    });

    // Daily submissions
    const dailySubmissions: Record<string, number> = {};
    judgeSubs.forEach((s) => {
      const d = new Date(s.createdAt);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
      dailySubmissions[key] = (dailySubmissions[key] ?? 0) + 1;
    });

    // Language usage
    const languageUsage: Record<string, number> = {};
    executions.forEach((e) => {
      languageUsage[e.language] = (languageUsage[e.language] ?? 0) + 1;
    });

    // Problem difficulty distribution
    const difficultyDist: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    problems.forEach((p) => {
      const d = p.difficulty as string;
      if (d in difficultyDist) difficultyDist[d] += 1;
    });

    const totalCompleted = successfulExecutions.length + failedExecutions.length;
    const successRate = totalCompleted > 0
      ? Math.round((successfulExecutions.length / totalCompleted) * 100)
      : 0;

    return {
      totalUsers: users.length,
      activeUsers: recentUserIds.size,
      totalProblems: problems.length,
      totalSubmissions: judgeSubs.length,
      successfulExecutions: successfulExecutions.length,
      failedExecutions: failedExecutions.length,
      totalBookmarks: bookmarks.length,
      totalShowcasePosts: submissions.length,
      averageExecutionTimeMs: avgExecutionTime,
      successRate,
      charts: {
        usersGrowth: Object.entries(dailyNewUsers)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-7),
        dailySubmissions: Object.entries(dailySubmissions)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-7),
        languageUsage: Object.entries(languageUsage)
          .map(([language, count]) => ({ language, count }))
          .sort((a, b) => b.count - a.count),
        difficultyDistribution: Object.entries(difficultyDist)
          .map(([difficulty, count]) => ({ difficulty, count })),
        platformActivity: executions
          .filter((e) => typeof e.executionTime === "number")
          .map((e) => ({
            date: new Date(e.startedAt).toISOString().slice(0, 10),
            ms: e.executionTime as number,
          }),
          ),
      },
        };
  },
});

/** Admin analytics: platform-wide stats for the admin analytics page. */
export const getAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const users = await ctx.db.query("users").collect();
    const problems = await ctx.db.query("problems").collect();
    const executions = await ctx.db.query("executions").collect();
    const judgeSubs = await ctx.db.query("judgeSubmissions").collect();

    // User growth (last 30 days)
    const userGrowth: { date: string; count: number }[] = [];
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const count = users.filter((u) => {
        const ud = new Date(u._creationTime);
        const ukey = `${ud.getUTCFullYear()}-${String(ud.getUTCMonth() + 1).padStart(2, "0")}-${String(ud.getUTCDate()).padStart(2, "0")}`;
        return ukey === key;
      }).length;
      userGrowth.push({ date: key, count });
    }

    // Language usage
    const languageMap: Record<string, number> = {};
    executions.forEach((e) => {
      languageMap[e.language] = (languageMap[e.language] ?? 0) + 1;
    });
    const languageUsage = Object.entries(languageMap)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    // Submission trends (last 30 days)
    const submissionTrends: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const count = judgeSubs.filter((s) => {
        const sd = new Date(s.createdAt);
        const skey = `${sd.getUTCFullYear()}-${String(sd.getUTCMonth() + 1).padStart(2, "0")}-${String(sd.getUTCDate()).padStart(2, "0")}`;
        return skey === key;
      }).length;
      submissionTrends.push({ date: key, count });
    }

    // Execution trends (last 30 days)
    const executionTrends: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const count = executions.filter((e) => {
        const ed = new Date(e.startedAt);
        const ekey = `${ed.getUTCFullYear()}-${String(ed.getUTCMonth() + 1).padStart(2, "0")}-${String(ed.getUTCDate()).padStart(2, "0")}`;
        return ekey === key;
      }).length;
      executionTrends.push({ date: key, count });
    }

    // Problem popularity
    const problemMap: Record<string, number> = {};
    judgeSubs.forEach((s) => {
      problemMap[s.problemSlug] = (problemMap[s.problemSlug] ?? 0) + 1;
    });
    const problemPopularity = Object.entries(problemMap)
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Difficulty distribution
    const difficultyDist = { easy: 0, medium: 0, hard: 0 };
    problems.forEach((p) => {
      if (p.difficulty in difficultyDist) difficultyDist[p.difficulty as keyof typeof difficultyDist]++;
    });

    // Success rate
    const accepted = judgeSubs.filter((s) => s.outcome === "accepted").length;
    const successRate = judgeSubs.length > 0 ? Math.round((accepted / judgeSubs.length) * 100) : 0;

    // Retention (users active in last 7 days / total users).
    // Only executions belonging to currently registered users count.
    const existingUserIds = new Set(users.map((u) => String(u._id)));
    const sevenDays = 7 * 86400000;
    const activeUserIds = new Set(
      executions
        .filter(
          (e) =>
            e.startedAt >= now - sevenDays &&
            existingUserIds.has(String(e.userId))
        )
        .map((e) => e.userId)
    );
    const retention = users.length > 0 ? Math.round((activeUserIds.size / users.length) * 100) : 0;

    // Active today (distinct registered users with an execution started today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const activeToday = new Set(
      executions
        .filter(
          (e) =>
            (e.startedAt ?? 0) >= todayStart.getTime() &&
            existingUserIds.has(String(e.userId))
        )
        .map((e) => e.userId)
    ).size;

    return {
      userGrowth,
      languageUsage,
      submissionTrends,
      executionTrends,
      problemPopularity,
      difficultyDistribution: Object.entries(difficultyDist).map(([difficulty, count]) => ({ difficulty, count })),
      successRate,
      retention,
      activeToday,
      totalUsers: users.length,
      totalProblems: problems.length,
      totalSubmissions: judgeSubs.length,
      totalExecutions: executions.length,
    };
  },
});

/** Admin query: list users with pagination + filter. */
export const adminListUsers = query({
  args: {
    search: v.optional(v.string()),
    roleFilter: v.optional(
      v.union(v.literal("USER"), v.literal("ADMIN"), v.literal("SUPER_ADMIN"), v.literal("ALL"))
    ),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
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

    const page = Math.max(args.page ?? 0, 0);
    const pageSize = Math.min(args.pageSize ?? 20, 100);
    const search = args.search?.trim().toLowerCase() ?? "";

    const allUsers = await ctx.db.query("users").collect();
    const allProfiles = await ctx.db.query("profiles").collect();
    const profileByUser = new Map<string, { username: string | null }>(
      allProfiles.map((p) => [String(p.userId), { username: p.username ?? null }])
    );

    // Role filter: compute the effective role (same priority as
    // resolveIdentity — super-admin email list wins, then the roles table).
    let filtered = allUsers;
    if (args.roleFilter && args.roleFilter !== "ALL") {
      const allRoleRows = await ctx.db.query("roles").collect();
      const roleByUser = new Map<string, string>(
        allRoleRows.map((r) => [String(r.userId), r.role])
      );
      filtered = filtered.filter((u) => {
        const effective = superAdminEmailCheck(u.email)
          ? "SUPER_ADMIN"
          : (roleByUser.get(String(u._id)) ?? "USER");
        return effective === args.roleFilter;
      });
    }

    if (search) {
      filtered = filtered.filter((u) => {
        if ((u.email ?? "").toLowerCase().includes(search)) return true;
        const username = profileByUser.get(String(u._id))?.username ?? "";
        return username.toLowerCase().includes(search);
      });
    }

    const start = page * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const results = await Promise.all(paged.map(async (u) => {
      const profile = await ctx.db
        .query("profiles").withIndex("by_userId", (q) => q.eq("userId", u._id)).unique();
      const roleRow = await ctx.db
        .query("roles").withIndex("by_userId", (q) => q.eq("userId", u._id)).unique();

      let effectiveRole: "USER" | "ADMIN" | "SUPER_ADMIN" = "USER";
      if (superAdminEmailCheck(u.email)) {
        effectiveRole = "SUPER_ADMIN";
      } else if (roleRow) {
        effectiveRole = roleRow.role as "USER" | "ADMIN" | "SUPER_ADMIN";
      }

      // ADMINs only see a protected stub for SUPER_ADMIN accounts.
      const protectSuper = caller.role === "ADMIN" && effectiveRole === "SUPER_ADMIN";

      return {
        _id: u._id,
        email: protectSuper ? "[protected]" : u.email,
        username: protectSuper ? "[protected]" : (profile?.username ?? null),
        role: effectiveRole,
        isSuspended: profile?.isSuspended ?? false,
        isBanned: profile?.isBanned ?? false,
        xp: profile?.xp ?? 0,
        avatarUrl: protectSuper ? null : (profile?.avatarUrl ?? null),
        createdAt: u._creationTime,
      };
    }));

    return {
      users: results,
      total: filtered.length,
      page, pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  },
});
