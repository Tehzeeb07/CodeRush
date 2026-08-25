import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new code execution.
 */
export const createExecution = mutation({
  args: {
    userId: v.id("users"),
    language: v.string(),
    executionId: v.string(),
  },

  handler: async (ctx, args) => {
    const executionId = await ctx.db.insert("executions", {
      userId: args.userId,
      language: args.language,
      status: "queued",
      executionId: args.executionId,
      startedAt: Date.now(),
    });

    return executionId;
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
      v.literal("internal_error")
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
        q.eq("executionId", args.executionId)
      )
      .unique();

    if (!execution) {
      throw new Error(
        `Execution not found: ${args.executionId}`
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
        q.eq("executionId", args.executionId)
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
      .withIndex("by_user", (q) =>
        q.eq("userId", args.userId)
      )
      .order("desc")
      .collect();
  },
});