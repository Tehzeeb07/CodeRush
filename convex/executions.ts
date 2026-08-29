import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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