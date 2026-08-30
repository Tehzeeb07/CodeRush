/**
 * Executions â€” admin monitoring for code execution jobs.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";

/** Admin query: list recent executions (most recent first). */
export const listRecentExecutions = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("queued"), v.literal("running"), v.literal("success"),
      v.literal("failed"), v.literal("timeout"), v.literal("internal_error"), v.literal("ALL")
    )),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const limit = Math.min(args.limit ?? 50, 200);

    let all = await ctx.db.query("executions")
      .withIndex("by_startedAt")
      .order("desc")
      .collect();

    if (args.status && args.status !== "ALL") {
      all = all.filter((e) => e.status === args.status);
    }

    return all.slice(0, limit);
  },
});

export const listExecutions = query({
  args: {
    status: v.optional(v.union(
      v.literal("queued"), v.literal("running"), v.literal("success"),
      v.literal("failed"), v.literal("timeout"), v.literal("internal_error"), v.literal("ALL")
    )),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const page = Math.max(args.page ?? 0, 0);
    const pageSize = Math.min(args.pageSize ?? 20, 100);
    const search = args.search?.trim().toLowerCase() ?? "";

    let all = await ctx.db.query("executions").collect();

    if (args.status && args.status !== "ALL") {
      all = all.filter((e) => e.status === args.status);
    }
    if (search) {
      all = all.filter((e) =>
        (e.userId ?? "").toString().toLowerCase().includes(search) ||
        (e.language ?? "").toLowerCase().includes(search) ||
        (e.problemId ?? "").toString().toLowerCase().includes(search)
      );
    }

    const sorted = all.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
    const start = page * pageSize;
    const paged = sorted.slice(start, start + pageSize);

    return {
      executions: paged,
      total: sorted.length,
      page,
      pageSize,
      totalPages: Math.ceil(sorted.length / pageSize),
    };
  },
});

export const getExecutionStats = query({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const all = await ctx.db.query("executions").collect();
    const running = all.filter((e) => e.status === "running").length;
    const queued = all.filter((e) => e.status === "queued").length;
    const successful = all.filter((e) => e.status === "success").length;
    const failed = all.filter((e) => e.status !== "success" && e.status !== "queued" && e.status !== "running").length;

    const runtimes = all.filter((e) => typeof e.executionTime === "number").map((e) => e.executionTime as number);
    const avgRuntime = runtimes.length > 0 ? Math.round(runtimes.reduce((a: number, b: number) => a + b, 0) / runtimes.length) : 0;

    // Language distribution
    const languageDist: Record<string, number> = {};
    all.forEach((e) => { languageDist[e.language] = (languageDist[e.language] ?? 0) + 1; });

    // Daily executions (last 7 days)
    const dailyExecs: Record<string, number> = {};
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
      dailyExecs[key] = 0;
    }
    all.forEach((e) => {
      const d = new Date(e.startedAt);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
      if (key in dailyExecs) dailyExecs[key] += 1;
    });

    return {
      total: all.length,
      running, queued, successful, failed,
      queueLength: queued,
      avgRuntimeMs: avgRuntime,
      languageDistribution: Object.entries(languageDist).map(([language, count]) => ({ language, count })).sort((a, b) => b.count - a.count),
      dailyExecutions: Object.entries(dailyExecs).map(([date, count]) => ({ date, count })),
    };
  },
});

/**
 * Create a new code execution for the currently authenticated user.
 *
 * The client-facing executionId is the same ID used by the
 * interactive execution session.
 */
export const createExecution = mutation({
  args: {
    executionId: v.string(),
    language: v.string(),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Prevent accidental duplicate execution records.
    const existing = await ctx.db
      .query("executions")
      .withIndex("by_executionId", (q) =>
        q.eq("executionId", args.executionId),
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("executions", {
      userId,
      executionId: args.executionId,
      language: args.language,
      status: "running",
      startedAt: Date.now(),
    });
  },
});

/**
 * Update execution status/details.
 */
export const updateExecution = mutation({
  args: {
    executionId: v.string(),

    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("success"),
      v.literal("runtime_error"),
      v.literal("compilation_error"),
      v.literal("timeout"),
      v.literal("failed"),
      v.literal("internal_error"),
      v.literal("stopped"),
    ),

    completedAt: v.optional(v.number()),
    exitCode: v.optional(v.number()),
    executionTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("executions")
      .withIndex("by_executionId", (q) =>
        q.eq("executionId", args.executionId),
      )
      .unique();

    if (!execution) {
      throw new Error(
        `Execution not found: ${args.executionId}`,
      );
    }

    await ctx.db.patch(execution._id, {
      status: args.status,

      ...(args.completedAt !== undefined
        ? { completedAt: args.completedAt }
        : {}),

      ...(args.exitCode !== undefined
        ? { exitCode: args.exitCode }
        : {}),

      ...(args.executionTime !== undefined
        ? { executionTime: args.executionTime }
        : {}),

      ...(args.errorMessage !== undefined
        ? { errorMessage: args.errorMessage }
        : {}),
    });

    return execution._id;
  },
});

/**
 * Get one execution.
 */
export const getExecution = query({
  args: {
    executionId: v.string(),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("executions")
      .withIndex("by_executionId", (q) =>
        q.eq("executionId", args.executionId),
      )
      .unique();
  },
});

/**
 * Get user's execution history.
 */
export const getUserExecutions = query({
  args: {
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("executions")
      .withIndex("by_user_startedAt", (q) =>
        q.eq("userId", args.userId),
      )
      .order("desc")
      .collect();
  },
});