/**
 * Judge submissions lifecycle.
 *
 * `createSubmission` runs with the caller's authenticated identity (route
 * uses ConvexHttpClient.setAuth(convexAuthNextjsToken())), so every
 * submission is attributed server-side â€” clients cannot forge identity.
 * Completion likewise verifies ownership before patching.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";
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

/** ADMIN: List all judge submissions with user/problem enrichment and pagination. */
export const adminListSubmissions = query({
  args: {
    language: v.optional(v.string()),
    outcome: v.optional(v.string()),
    search: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, userId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const page = Math.max(args.page ?? 0, 0);
    const pageSize = Math.min(args.pageSize ?? 15, 100);
    const search = args.search?.trim().toLowerCase() ?? "";
    const limit = Math.min(args.limit ?? 500, 1000);

    let subs = await ctx.db.query("judgeSubmissions").order("desc").take(limit);

    if (args.language) subs = subs.filter((s) => s.language === args.language);
    if (args.outcome && args.outcome !== "ALL") subs = subs.filter((s) => s.outcome === args.outcome);

    // Resolve problem titles + user emails once for all rows.
    const problems = await ctx.db.query("problems").collect();
    const problemById = new Map<string, Doc<"problems">>(problems.map((p) => [String(p._id), p]));
    const users = await ctx.db.query("users").collect();
    const userById = new Map<string, Doc<"users">>(users.map((u) => [String(u._id), u]));

    const enriched = await Promise.all(subs.map(async (s) => {
      const profile = await ctx.db
        .query("profiles").withIndex("by_userId", (q) => q.eq("userId", s.userId)).unique();
      const problem = problemById.get(String(s.problemId));
      const user = userById.get(String(s.userId));
      return {
        ...s,
        username: profile?.username ?? "unknown",
        avatarUrl: profile?.avatarUrl ?? null,
        userEmail: user?.email ?? null,
        problemTitle: problem?.title ?? s.problemSlug ?? "Unknown problem",
        status: s.outcome,
      };
    }));

    let filtered = enriched;
    if (search) {
      filtered = enriched.filter((r) =>
        (r.problemTitle ?? "").toLowerCase().includes(search) ||
        (r.username ?? "").toLowerCase().includes(search) ||
        (r.userEmail ?? "").toLowerCase().includes(search) ||
        (r.language ?? "").toLowerCase().includes(search)
      );
    }

    const start = page * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return {
      submissions: paged,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  },
});

/** ADMIN: Delete a judge submission. */
export const adminDeleteSubmission = mutation({
  args: { submissionId: v.id("judgeSubmissions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, userId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    await ctx.db.delete(args.submissionId);
    await ctx.db.insert("auditLogs", {
      adminId: userId,
      adminEmail: caller.email ?? "[unknown]",
      action: "submission_removed",
      target: "submission",
      targetId: args.submissionId,
      ip: undefined,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

/** ADMIN: Delete a showcase submission. */
export const adminDeleteShowcaseSubmission = mutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, userId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    await ctx.db.delete(args.submissionId);
    await ctx.db.insert("auditLogs", {
      adminId: userId,
      adminEmail: caller.email ?? "[unknown]",
      action: "showcase_submission_deleted",
      target: "submission",
      targetId: args.submissionId,
      ip: undefined,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

/** ADMIN: Feature/unfeature a showcase submission. */
export const adminFeatureShowcase = mutation({
  args: { submissionId: v.id("submissions"), featured: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, userId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    await ctx.db.patch(args.submissionId, {
      isFeatured: args.featured,
      featuredAt: args.featured ? Date.now() : undefined,
    });
    await ctx.db.insert("auditLogs", {
      adminId: userId,
      adminEmail: caller.email ?? "[unknown]",
      action: args.featured ? "showcase_featured" : "showcase_unfeatured",
      target: "submission",
      targetId: args.submissionId,
      ip: undefined,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

/** ADMIN: Hide/unhide a showcase submission. */
export const adminHideShowcase = mutation({
  args: { submissionId: v.id("submissions"), hidden: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, userId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    await ctx.db.patch(args.submissionId, { isHidden: args.hidden });
    await ctx.db.insert("auditLogs", {
      adminId: userId,
      adminEmail: caller.email ?? "[unknown]",
      action: args.hidden ? "showcase_hidden" : "showcase_unhidden",
      target: "submission",
      targetId: args.submissionId,
      ip: undefined,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});
