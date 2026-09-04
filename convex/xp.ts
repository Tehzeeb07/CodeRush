/**
 * CodeRush — XP & user-progress system (requirements §12–§15).
 *
 * Every XP grant happens here, on the trusted backend:
 *
 *   judging verdict (server) → awardSubmissionXp → profile.xp
 *                                            → xpLedger (idempotent)
 *                                            → problemProgress
 *
 * XP rules are read from the platform `settings` table
 * (`xpPerTestCase`, default 10) — nothing is hardcoded per problem,
 * per language or per test count. Run / custom-input executions never
 * reach this module, so they can never award XP (§14).
 *
 * Anti-farm rules (§14):
 *   1. A submission can only be awarded XP once (`judgeSubmissions.xpAwarded`
 *      acts as an idempotency guard — replays of the same verdict are no-ops).
 *   2. A given test case can only award XP once per user per problem
 *      (`xpLedger.uniqueKey = xp:<userId>:<problemId>:<testCaseId>`), so
 *      resubmitting the same passing solution earns nothing extra.
 */

import { v } from "convex/values";
import { mutation, query, type DatabaseReader } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel";

/** Fallback XP rate when the `xpPerTestCase` setting is absent/invalid. */
export const DEFAULT_XP_PER_TEST_CASE = 10;

/** Read the platform-configured XP-per-test-case rate. */
async function readXpPerTestCase(db: DatabaseReader): Promise<number> {
  const setting = await db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "xpPerTestCase"))
    .unique();
  const value = setting?.value;
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : DEFAULT_XP_PER_TEST_CASE;
}

/**
 * Award XP for a judged submission and update the user's progress.
 *
 * Called by the judge API route AFTER the verdict is persisted. The route
 * is trusted (server-side identity), but this mutation still re-verifies
 * ownership, re-reads the verdict from the submission record and is fully
 * idempotent — a repeated call with the same submissionId can never
 * double-award.
 */
export const awardSubmissionXp = mutation({
  args: {
    submissionId: v.id("judgeSubmissions"),
    /**
     * Server-side ids of the test cases that passed, as reported by the
     * judge runner. Validated against the stored verdict before any XP
     * is granted.
     */
    passedTestCaseIds: v.array(v.string()),
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
      throw new Error("Not authorized to award XP for this submission");
    }
    if (submission.outcome === "queued") {
      throw new Error("Submission has not been judged yet");
    }

    // Idempotency guard #1 — this submission was already accounted for.
    if (submission.xpAwarded !== undefined) {
      return {
        xpAwarded: 0,
        newlyPassedCount: 0,
        xpPerTestCase: submission.xpPerTestSnapshot ?? 0,
        alreadyAwarded: true,
      };
    }

    // Sanitize the id list: non-empty strings, duplicates removed.
    const passedIds = Array.from(
      new Set(args.passedTestCaseIds.filter((id) => id.length > 0)),
    );

    // Integrity check — the ids must match the persisted verdict.
    if (
      submission.passedCount !== undefined &&
      submission.passedCount !== passedIds.length
    ) {
      throw new Error(
        "Passed test-case ids do not match the judged result; refusing to award XP.",
      );
    }

    const xpPerTestCase = await readXpPerTestCase(ctx.db);

    // Idempotency guard #2 — a test case awards XP only the first time
    // this user passes it on this problem (§14).
    const alreadyAwardedIds = new Set<string>();
    for (const testCaseId of passedIds) {
      const uniqueKey = `xp:${userId}:${submission.problemId}:${testCaseId}`;
      const existing = await ctx.db
        .query("xpLedger")
        .withIndex("by_unique_key", (q) => q.eq("uniqueKey", uniqueKey))
        .unique();
      if (existing) {
        alreadyAwardedIds.add(testCaseId);
      }
    }
    const newlyPassedIds = passedIds.filter((id) => !alreadyAwardedIds.has(id));
    const amount = newlyPassedIds.length * xpPerTestCase;
    const now = Date.now();

    // Grant XP (append-only ledger + profile balance).
    if (amount > 0) {
      for (const testCaseId of newlyPassedIds) {
        await ctx.db.insert("xpLedger", {
          userId,
          amount: xpPerTestCase,
          reason: "test_case_passed",
          problemId: submission.problemId,
          problemSlug: submission.problemSlug,
          submissionId: submission._id,
          testCaseId,
          uniqueKey: `xp:${userId}:${submission.problemId}:${testCaseId}`,
          createdAt: now,
        });
      }

      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();
      if (profile) {
        await ctx.db.patch(profile._id, { xp: profile.xp + amount });
      }
    }

    // Update per-problem progress (§15).
    const solved = submission.outcome === "accepted";
    const progress = await ctx.db
      .query("problemProgress")
      .withIndex("by_user_problem", (q) =>
        q.eq("userId", userId).eq("problemId", submission.problemId),
      )
      .unique();

    const isFirstSolve = solved && progress?.status !== "solved";

    const bestPassedCount = Math.max(
      progress?.bestPassedCount ?? 0,
      passedIds.length,
    );
    const totalCount =
      submission.totalCount ?? progress?.totalTestCount ?? passedIds.length;

    if (progress) {
      await ctx.db.patch(progress._id, {
        status: solved ? "solved" : progress.status,
        bestPassedCount,
        totalTestCount: totalCount,
        attempts: progress.attempts + 1,
        ...(solved && progress.firstSolvedAt === undefined
          ? { firstSolvedAt: now }
          : {}),
        totalXpAwarded: progress.totalXpAwarded + amount,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("problemProgress", {
        userId,
        problemId: submission.problemId,
        problemSlug: submission.problemSlug,
        status: solved ? "solved" : "attempted",
        bestPassedCount,
        totalTestCount: totalCount,
        attempts: 1,
        firstAttemptAt: now,
        ...(solved ? { firstSolvedAt: now } : {}),
        totalXpAwarded: amount,
        updatedAt: now,
      });
    }

    // Update userStats — keeps XP, points, and problemsSolved strictly synchronized
    let stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!stats) {
      const statsId = await ctx.db.insert("userStats", {
        userId,
        points: 0,
        xp: 0,
        totalSubmissions: 0,
        successfulSubmissions: 0,
        failedSubmissions: 0,
        problemsSolved: 0,
        updatedAt: now,
      });
      stats = await ctx.db.get(statsId);
    }

    if (stats) {
      await ctx.db.patch(stats._id, {
        points: stats.points + amount,
        xp: (stats.xp ?? stats.points ?? 0) + amount,
        totalSubmissions: stats.totalSubmissions + 1,
        successfulSubmissions: stats.successfulSubmissions + (solved ? 1 : 0),
        failedSubmissions: stats.failedSubmissions + (solved ? 0 : 1),
        problemsSolved: stats.problemsSolved + (isFirstSolve ? 1 : 0),
        updatedAt: now,
      });
    }

    // Mark the submission as accounted for (idempotency guard #1).
    await ctx.db.patch(submission._id, {
      xpAwarded: amount,
      xpPerTestSnapshot: xpPerTestCase,
    });

    return {
      xpAwarded: amount,
      newlyPassedCount: newlyPassedIds.length,
      xpPerTestCase,
      alreadyAwarded: false,
    };
  },
});

/** Public-safe shape returned to the client. */
export interface ProblemProgressView {
  problemSlug: string;
  status: "attempted" | "solved";
  bestPassedCount: number;
  totalTestCount: number;
  attempts: number;
  totalXpAwarded: number;
  firstSolvedAt: number | null;
}

function toView(row: Doc<"problemProgress">): ProblemProgressView {
  return {
    problemSlug: row.problemSlug,
    status: row.status,
    bestPassedCount: row.bestPassedCount,
    totalTestCount: row.totalTestCount,
    attempts: row.attempts,
    totalXpAwarded: row.totalXpAwarded,
    firstSolvedAt: row.firstSolvedAt ?? null,
  };
}

/** The caller's progress on one problem (safe fields only). */
export const getMyProblemProgress = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const row = await ctx.db
      .query("problemProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("problemSlug"), args.slug))
      .first();

    return row ? toView(row) : null;
  },
});

/** The caller's progress across all attempted problems (dashboard-ready). */
export const listMyProgress = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.min(args.limit ?? 100, 500);
    const rows = await ctx.db
      .query("problemProgress")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return rows.map(toView);
  },
});

/**
 * The caller's XP ledger entries (most recent first). Safe read-only view —
 * clients can inspect their own history but can never write it.
 */
export const listMyXpLedger = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.min(args.limit ?? 50, 200);
    const rows = await ctx.db
      .query("xpLedger")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return rows.map((row) => ({
      _id: row._id,
      amount: row.amount,
      reason: row.reason,
      problemSlug: row.problemSlug ?? null,
      createdAt: row.createdAt,
    }));
  },
});
