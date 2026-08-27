import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Add a terminal log for an execution.
 *
 * Log types:
 * - stdout -> normal program output
 * - stderr -> compiler/runtime error output
 * - stdin  -> input entered by the user
 * - system -> system messages
 */
export const addLog = mutation({
  args: {
    executionId: v.id("executions"),

    type: v.union(
      v.literal("stdout"),
      v.literal("stderr"),
      v.literal("stdin"),
      v.literal("system"),
    ),

    data: v.string(),

    sequence: v.number(),

    timestamp: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    return await ctx.db.insert("executionLogs", {
      executionId: args.executionId,
      type: args.type,
      data: args.data,
      sequence: args.sequence,
      timestamp: args.timestamp ?? Date.now(),
    });
  },
});

/**
 * Get all logs for one execution.
 */
export const getLogs = query({
  args: {
    executionId: v.id("executions"),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("executionLogs")
      .withIndex("by_execution", (q) =>
        q.eq("executionId", args.executionId),
      )
      .order("asc")
      .collect();
  },
});