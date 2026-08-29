/**
 * Judge submissions lifecycle.
 *
 * `createSubmission` runs with the caller's authenticated identity (route
 * uses ConvexHttpClient.setAuth(convexAuthNextjsToken())), so every
 * submission is attributed server-side — clients cannot forge identity.
 * Completion likewise verifies ownership before patching.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

/** Record created right before the judge starts evaluating (submit mode). */
export const createSubmission = mutation({
  args: {
    problemSlug: v.string(),
    language: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", args.problemSlug))
      .unique();
    if (!problem) {
      throw new Error(`Unknown problem: ${args.problemSlug}`);
    }

    return await ctx.db.insert("judgeSubmissions", {
      userId,
      problemId: problem._id,
      problemSlug: args.problemSlug,
      language: args.language,
      code: args.code,
      outcome: "queued",
      createdAt: Date.now(),
    });
  },
});

/**
 * Persist the judge verdict. Ownership is re-verified here so a leaked
 * id cannot be used to modify someone else's record.
 */
export const completeSubmission = mutation({
  args: {
    submissionId: v.id("judgeSubmissions"),
    outcome: v.union(
      v.literal("accepted"),
      v.literal("wrong_answer"),
      v.literal("compilation_error"),
      v.literal("runtime_error"),
      v.literal("time_limit_exceeded"),
      v.literal("memory_limit_exceeded"),
      v.literal("internal_error"),
    ),
    passedCount: v.number(),
    totalCount: v.number(),
    runtimeMs: v.number(),
    memoryKb: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }
    if (submission.userId !== userId) {
      throw new Error("Not authorized to complete this submission");
    }

    await ctx.db.patch(args.submissionId, {
      outcome: args.outcome,
      passedCount: args.passedCount,
      totalCount: args.totalCount,
      runtimeMs: args.runtimeMs,
      ...(args.memoryKb !== undefined ? { memoryKb: args.memoryKb } : {}),
      completedAt: Date.now(),
    });

    return args.submissionId;
  },
});

/** Recent submissions by the current user for the history tab. */
export const listRecentForUser = query({
  args: {
    /** Optional filter; omitted = across all problems. */
    problemSlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.min(args.limit ?? 20, 50);

    if (args.problemSlug !== undefined) {
      // Narrow path: compound index gets all rows for this user + problem,
      // newest-first via post-sort (small per-problem lists).
      const problem = await ctx.db
        .query("problems")
        .withIndex("by_slug", (q) => q.eq("slug", args.problemSlug!))
        .unique();
      if (!problem) return [];

      const rows = await ctx.db
        .query("judgeSubmissions")
        .withIndex(
          "by_user_problem_created",
          (q) =>
            q.eq("userId", userId).eq("problemId", problem._id),
        )
        .collect();
      rows.sort((a, b) => b.createdAt - a.createdAt);
      return rows.slice(0, limit).map(toSummary);
    }

    const rows = await ctx.db
      .query("judgeSubmissions")
      .withIndex(
        "by_user_created",
        (q) => q.eq("userId", userId),
      )
      .order("desc")
      .take(limit);

    return rows.map(toSummary);
  },
});

function toSummary(s: Doc<"judgeSubmissions">) {
  return {
    _id: s._id,
    problemSlug: s.problemSlug,
    language: s.language,
    outcome:
      s.outcome === "queued" ? ("queued" as const) : s.outcome,
    passedCount: s.passedCount ?? 0,
    totalCount: s.totalCount ?? 0,
    runtimeMs: s.runtimeMs ?? 0,
    memoryKb: s.memoryKb ?? null,
    createdAt: s.createdAt,
  };
}


/** Fetch one of the user's own submissions including code (history view). */
export const getOwnSubmissionCode = query({
  args: { submissionId: v.id("judgeSubmissions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const submission = await ctx.db.get(args.submissionId);
    if (!submission || submission.userId !== userId) return null;

    return {
      _id: submission._id,
      problemSlug: submission.problemSlug,
      language: submission.language,
      code: submission.code,
      outcome:
        submission.outcome === "queued"
          ? ("queued" as const)
          : submission.outcome,
      passedCount: submission.passedCount ?? 0,
      totalCount: submission.totalCount ?? 0,
      runtimeMs: submission.runtimeMs ?? 0,
      memoryKb: submission.memoryKb ?? null,
      createdAt: submission.createdAt,
    };
  },
});
