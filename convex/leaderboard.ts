import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Leaderboards & user statistics.
 *
 * Security model:
 *  - Statistics are ONLY written by `recordSubmission`, which always
 *    resolves the user from the authenticated Convex context. Clients
 *    cannot pass a userId, points value, or rank anywhere.
 *  - Leaderboard queries expose public data only (username, avatar,
 *    aggregate stats). Emails are never returned.
 *
 * Points system:
 *  - Successful execution:            +10
 *  - Compilation error / runtime / failed / timeout: +0
 *  - Problem bonus (future problems): easy +10, medium +25, hard +50
 *
 * problemsSolved counts distinct problems solved once a problem entity
 * exists (deduped per problemId). In today's free-practice mode (no
 * problemId) each successful run counts as one solved exercise.
 *
 * Ranking is deterministic:
 *   points DESC -> problemsSolved DESC -> successfulSubmissions DESC
 *   -> profile joinedAt ASC
 */

export const POINTS_PER_SUCCESSFUL_EXECUTION = 10;

export const PROBLEM_DIFFICULTY_POINTS = {
  easy: 10,
  medium: 25,
  hard: 50,
} as const;

const EXECUTION_STATUS = [
  v.literal("success"),
  v.literal("runtime_error"),
  v.literal("compilation_error"),
  v.literal("timeout"),
  v.literal("failed"),
  v.literal("internal_error"),
] as const;

const PERIOD = [
  v.literal("all"),
  v.literal("week"),
  v.literal("month"),
  v.literal("day"),
] as const;

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  points: number;
  totalSubmissions: number;
  successfulSubmissions: number;
  failedSubmissions: number;
  problemsSolved: number;
  successRate: number;
  joinedAt: number;
}

/** UTC start of the current day / ISO week (Monday) / month. */
function periodStart(period: "week" | "month" | "day", now: number): number {
  const d = new Date(now);
  if (period === "day") {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  if (period === "month") {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  }
  // Week starts Monday 00:00 UTC.
  const day = d.getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (day + 6) % 7;
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() - daysSinceMonday
  );
}

function successRate(successful: number, total: number): number {
  if (total <= 0) return 0; // avoid division by zero
  return Math.round((successful / total) * 1000) / 10;
}

/**
 * Display name for a user that has statistics but no profile row yet
 * (e.g. accounts created before profile creation was wired into the
 * signup flow). Deterministic and stable across queries.
 */
function fallbackUsername(userId: string): string {
  return `coder-${userId.slice(-6).toLowerCase()}`;
}

/** Deterministic sort: points -> problemsSolved -> successes -> tenure. */
function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.problemsSolved !== a.problemsSolved) {
    return b.problemsSolved - a.problemsSolved;
  }
  if (b.successfulSubmissions !== a.successfulSubmissions) {
    return b.successfulSubmissions - a.successfulSubmissions;
  }
  return a.joinedAt - b.joinedAt;
}

/** Aggregate a user's activity inside a time window from raw executions. */
async function aggregateWindow(
  db: any,
  userId: string,
  since: number
) {
  const execs = await db
    .query("executions")
    .withIndex("by_user_startedAt", (iq: any) =>
      iq.eq("userId", userId).gte("startedAt", since)
    )
    .collect();

  let total = 0;
  let successful = 0;
  let failed = 0;
  let points = 0;
  const solvedProblems = new Set<string>();
  let practiceSolves = 0;

  for (const e of execs) {
    total += 1;
    if (e.status === "success") {
      successful += 1;
      // Only count points that the authoritative recordSubmission
      // mutation actually awarded. Rows with no pointsAwarded field are
      // legacy executions recorded before the points system existed;
      // retro-awarding them here would make time-windowed totals
      // disagree with the denormalized all-time stats in userStats.
      points += e.pointsAwarded ?? 0;
      if (e.problemId) solvedProblems.add(e.problemId);
      else practiceSolves += 1;
    } else {
      failed += 1;
    }
  }

  return {
    totalSubmissions: total,
    successfulSubmissions: successful,
    failedSubmissions: failed,
    points,
    problemsSolved: solvedProblems.size + practiceSolves,
  };
}

/**
 * Build ranked entries for a period.
 *
 * ROOT-CAUSE FIX: the roster is now the UNION of `profiles` and
 * `userStats`. The previous implementation iterated `profiles` only,
 * which made any account without a profile row invisible on the
 * leaderboard even though its points were recorded correctly in
 * `userStats` by `recordSubmission`. Since points live in `userStats`,
 * both tables must be considered:
 *   - user has profile + stats  -> normal entry (username, avatar)
 *   - user has stats, no profile -> entry with fallback username
 *   - user has profile, no stats -> entry with zeroed stats
 *
 * All-time ranking still reads the denormalized `userStats` document;
 * time-windowed periods aggregate raw `executions` via the
 * `by_user_startedAt` index.
 */
async function buildLeaderboard(
  ctx: any,
  period: "all" | "week" | "month" | "day",
  viewerId: string | null
): Promise<{ entries: LeaderboardEntry[]; me: LeaderboardEntry | null }> {
  const since =
    period === "all" ? undefined : periodStart(period, Date.now());

  // Load both rosters once. For the all-time period this also replaces
  // the previous per-profile `userStats` lookup with a single scan.
  const profiles = await ctx.db.query("profiles").collect();
  const allStats = await ctx.db.query("userStats").collect();

  const profileByUser = new Map<string, any>(
    profiles.map((p: any) => [p.userId as string, p])
  );
  const statsByUser = new Map<string, any>(
    allStats.map((s: any) => [s.userId as string, s])
  );

  const userIds = new Set<string>([
    ...profileByUser.keys(),
    ...statsByUser.keys(),
  ]);

  const entries: LeaderboardEntry[] = [];
  for (const userId of userIds) {
    let agg;
    if (since === undefined) {
      const stats = statsByUser.get(userId);
      agg = stats
        ? {
            totalSubmissions: stats.totalSubmissions,
            successfulSubmissions: stats.successfulSubmissions,
            failedSubmissions: stats.failedSubmissions,
            points: stats.points,
            problemsSolved: stats.problemsSolved,
          }
        : {
            totalSubmissions: 0,
            successfulSubmissions: 0,
            failedSubmissions: 0,
            points: 0,
            problemsSolved: 0,
          };
    } else {
      agg = await aggregateWindow(ctx.db, userId, since);
    }

    const profile = profileByUser.get(userId);
    const stats = statsByUser.get(userId);

    entries.push({
      rank: 0,
      userId,
      username: profile?.username ?? fallbackUsername(userId),
      avatarUrl: profile?.avatarUrl ?? null,
      joinedAt: profile?._creationTime ?? stats?._creationTime ?? 0,
      successRate: successRate(agg.successfulSubmissions, agg.totalSubmissions),
      ...agg,
    });
  }

  if (entries.length > 0) {
    console.log(
      `[leaderboard] period=${period} users=${entries.length} topPoints=${Math.max(
        ...entries.map((e) => e.points)
      )}`
    );
  }

  entries.sort(compareEntries);
  entries.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  const me = viewerId
    ? entries.find((entry) => entry.userId === viewerId) ?? null
    : null;

  return { entries, me };
}

export type Period = "all" | "week" | "month" | "day";

/**
 * Public leaderboard query. Backend-computed ranking; supports time
 * filters (all-time / this week / this month / today). Returns the top
 * `limit` entries plus the current viewer's own entry/rank even when
 * they fall outside the visible window.
 */
export const getLeaderboard = query({
  args: {
    period: v.union(...PERIOD),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx); // nullable — leaderboard is public
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);

    const { entries, me } = await buildLeaderboard(ctx, args.period, viewerId);

    const top = entries.slice(0, limit);
    const meInTop = me ? top.some((entry) => entry.rank === me.rank) : false;

    return {
      period: args.period,
      entries: top,
      totalUsers: entries.length,
      // The viewer's full entry when not visible in the top list.
      me: me && !meInTop ? me : null,
    };
  },
});

/**
 * Public coding statistics for a user profile page (no private data —
 * email is never exposed). Includes all-time rank + recent activity.
 */
export const getUserPublicStats = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const viewerId = await getAuthUserId(ctx);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!profile) return null;

    const { entries } = await buildLeaderboard(ctx, "all", viewerId);
    const entry = entries.find((e) => e.userId === profile.userId);
    if (!entry) return null;

    const recentExecutions = await ctx.db
      .query("executions")
      .withIndex("by_user_startedAt", (q) => q.eq("userId", profile.userId))
      .order("desc")
      .take(10);

    return {
      username: profile.username,
      avatarUrl: profile.avatarUrl ?? null,
      rank: entry.rank,
      points: entry.points,
      totalSubmissions: entry.totalSubmissions,
      successfulSubmissions: entry.successfulSubmissions,
      failedSubmissions: entry.failedSubmissions,
      problemsSolved: entry.problemsSolved,
      successRate: entry.successRate,
      recentActivity: recentExecutions.map((e) => ({
        status: e.status,
        language: e.language,
        executionTime: e.executionTime ?? null,
        createdAt: e.startedAt,
      })),
    };
  },
});

/**
 * Record a submission from an actual code execution and atomically
 * update the user's statistics + points.
 *
 * The user is taken from the authenticated context — NOT from arguments
 * — so no client can submit runs (or points) on someone else's behalf.
 */
export const recordSubmission = mutation({
  args: {
    language: v.string(),
    status: v.union(...EXECUTION_STATUS),
    executionTime: v.optional(v.number()),
    exitCode: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    problemId: v.optional(v.string()),
    problemDifficulty: v.optional(
      v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const successful = args.status === "success";
    const now = Date.now();

    // --- First-solve detection (before inserting this attempt) ----------
    let firstSolveOfProblem = false;
    if (successful && args.problemId) {
      const priorSuccess = await ctx.db
        .query("executions")
        .withIndex("by_user_problem", (q) =>
          q.eq("userId", userId).eq("problemId", args.problemId!)
        )
        .filter((q) => q.eq(q.field("status"), "success"))
        .first();
      firstSolveOfProblem = priorSuccess === null;
    }

    // --- Points -----------------------------------------------------------
    let awarded = 0;
    if (successful) {
      awarded += POINTS_PER_SUCCESSFUL_EXECUTION;
      if (args.problemDifficulty) {
        awarded += PROBLEM_DIFFICULTY_POINTS[args.problemDifficulty];
      }
    }

    // --- Execution record ---------------------------------------------------
    const executionId = crypto.randomUUID();
    await ctx.db.insert("executions", {
      userId,
      executionId,
      language: args.language,
      status: args.status,
      startedAt: now - Math.max(0, args.executionTime ?? 0),
      completedAt: now,
      exitCode: args.exitCode,
      executionTime: args.executionTime,
      errorMessage: args.errorMessage,
      problemId: args.problemId,
      pointsAwarded: awarded,
    });

    // --- Denormalized statistics --------------------------------------------
    let stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!stats) {
      const id = await ctx.db.insert("userStats", {
        userId,
        points: 0,
        totalSubmissions: 0,
        successfulSubmissions: 0,
        failedSubmissions: 0,
        problemsSolved: 0,
        updatedAt: now,
      });
      stats = await ctx.db.get(id);
    }
    if (!stats) throw new Error("Failed to update statistics.");

    await ctx.db.patch(stats._id, {
      points: stats.points + awarded,
      totalSubmissions: stats.totalSubmissions + 1,
      successfulSubmissions:
        stats.successfulSubmissions + (successful ? 1 : 0),
      failedSubmissions: stats.failedSubmissions + (successful ? 0 : 1),
      problemsSolved:
        stats.problemsSolved +
        (successful && (!args.problemId || firstSolveOfProblem) ? 1 : 0),
      updatedAt: now,
    });

    return { executionId, pointsAwarded: awarded };
  },
});

