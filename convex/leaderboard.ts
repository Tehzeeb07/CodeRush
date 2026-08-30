import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * CodeRush Leaderboard & User Statistics
 *
 * Points:
 * - Every successful code execution = +10 points
 * - Failed / runtime / compilation / timeout = +0 points
 *
 * Statistics are stored in userStats and executions.
 *
 * IMPORTANT:
 * The leaderboard reads points from userStats.points.
 * It does NOT use profiles.xp.
 */

export const POINTS_PER_SUCCESSFUL_EXECUTION = 10;

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

/**
 * Get the beginning of the requested period.
 */
function periodStart(
  period: "week" | "month" | "day",
  now: number
): number {
  const d = new Date(now);

  if (period === "day") {
    return Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate()
    );
  }

  if (period === "month") {
    return Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      1
    );
  }

  // Monday 00:00 UTC
  const day = d.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;

  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() - daysSinceMonday
  );
}

/**
 * Calculate success percentage.
 */
function successRate(
  successful: number,
  total: number
): number {
  if (total <= 0) return 0;

  return Math.round((successful / total) * 1000) / 10;
}

/**
 * Fallback username if a user has statistics
 * but does not yet have a profile.
 */
function fallbackUsername(userId: string): string {
  return `coder-${userId.slice(-6).toLowerCase()}`;
}

/**
 * Deterministic leaderboard sorting:
 *
 * 1. Points DESC
 * 2. Problems solved DESC
 * 3. Successful submissions DESC
 * 4. Joined date ASC
 */
function compareEntries(
  a: LeaderboardEntry,
  b: LeaderboardEntry
): number {
  if (b.points !== a.points) {
    return b.points - a.points;
  }

  if (b.problemsSolved !== a.problemsSolved) {
    return b.problemsSolved - a.problemsSolved;
  }

  if (
    b.successfulSubmissions !==
    a.successfulSubmissions
  ) {
    return (
      b.successfulSubmissions -
      a.successfulSubmissions
    );
  }

  return a.joinedAt - b.joinedAt;
}

/**
 * Aggregate executions for a specific user
 * inside a time period.
 */
async function aggregateWindow(
  db: any,
  userId: string,
  since: number
) {
  const executions = await db
    .query("executions")
    .withIndex(
      "by_user_startedAt",
      (q: any) =>
        q
          .eq("userId", userId)
          .gte("startedAt", since)
    )
    .collect();

  let totalSubmissions = 0;
  let successfulSubmissions = 0;
  let failedSubmissions = 0;
  let points = 0;

  const solvedProblems = new Set<string>();
  let practiceSolves = 0;

  for (const execution of executions) {
    totalSubmissions += 1;

    if (execution.status === "success") {
      successfulSubmissions += 1;

      /**
       * Use the points that were actually awarded
       * by recordSubmission.
       */
      points += execution.pointsAwarded ?? 0;

      if (execution.problemId) {
        solvedProblems.add(execution.problemId);
      } else {
        practiceSolves += 1;
      }
    } else {
      failedSubmissions += 1;
    }
  }

  return {
    totalSubmissions,
    successfulSubmissions,
    failedSubmissions,
    points,
    problemsSolved:
      solvedProblems.size + practiceSolves,
  };
}

/**
 * Build the complete leaderboard.
 */
async function buildLeaderboard(
  ctx: any,
  period: "all" | "week" | "month" | "day",
  viewerId: string | null
): Promise<{
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}> {
  const since =
    period === "all"
      ? undefined
      : periodStart(period, Date.now());

  /**
   * Load profiles and statistics.
   *
   * We use the UNION of both tables because a user can
   * have statistics even if the profile record is missing.
   */
  const profiles = await ctx.db
    .query("profiles")
    .collect();

  const allStats = await ctx.db
    .query("userStats")
    .collect();

  const profileByUser = new Map<string, any>(
    profiles.map((profile: any) => [
      profile.userId as string,
      profile,
    ])
  );

  const statsByUser = new Map<string, any>(
    allStats.map((stats: any) => [
      stats.userId as string,
      stats,
    ])
  );

  /**
   * Combine all users from profiles + userStats.
   */
  const userIds = new Set<string>([
    ...profileByUser.keys(),
    ...statsByUser.keys(),
  ]);

  const entries: LeaderboardEntry[] = [];

  for (const userId of userIds) {
    let statsData;

    /**
     * ALL TIME
     *
     * Read directly from userStats.
     */
    if (since === undefined) {
      const stats = statsByUser.get(userId);

      statsData = stats
        ? {
            totalSubmissions:
              stats.totalSubmissions ?? 0,

            successfulSubmissions:
              stats.successfulSubmissions ?? 0,

            failedSubmissions:
              stats.failedSubmissions ?? 0,

            /**
             * IMPORTANT:
             * Points come from userStats.points.
             */
            points: stats.points ?? 0,

            problemsSolved:
              stats.problemsSolved ?? 0,
          }
        : {
            totalSubmissions: 0,
            successfulSubmissions: 0,
            failedSubmissions: 0,
            points: 0,
            problemsSolved: 0,
          };
    } else {
      /**
       * WEEK / MONTH / DAY
       *
       * Aggregate executions for the requested window.
       */
      statsData = await aggregateWindow(
        ctx.db,
        userId,
        since
      );
    }

    const profile = profileByUser.get(userId);
    const stats = statsByUser.get(userId);

    entries.push({
      rank: 0,

      userId,

      username:
        profile?.username ??
        fallbackUsername(userId),

      avatarUrl:
        profile?.avatarUrl ?? null,

      joinedAt:
        profile?._creationTime ??
        stats?._creationTime ??
        0,

            points: profile?.xp ?? 0,

      totalSubmissions:
        statsData.totalSubmissions,

      successfulSubmissions:
        statsData.successfulSubmissions,

      failedSubmissions:
        statsData.failedSubmissions,

      problemsSolved:
        statsData.problemsSolved,

      successRate: successRate(
        statsData.successfulSubmissions,
        statsData.totalSubmissions
      ),
    });
  }

  /**
   * Sort users.
   */
  entries.sort(compareEntries);

  /**
   * Assign ranks.
   */
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  /**
   * Find current viewer.
   */
  const me = viewerId
    ? entries.find(
        (entry) => entry.userId === viewerId
      ) ?? null
    : null;

  /**
   * Debug information.
   */
  if (entries.length > 0) {
    console.log(
      `[leaderboard] period=${period} users=${entries.length} topPoints=${Math.max(
        ...entries.map(
          (entry) => entry.points
        )
      )}`
    );
  }

  return {
    entries,
    me,
  };
}

export type Period =
  | "all"
  | "week"
  | "month"
  | "day";

/**
 * PUBLIC LEADERBOARD
 */
export const getLeaderboard = query({
  args: {
    period: v.union(...PERIOD),
    limit: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const viewerId =
      await getAuthUserId(ctx);

    const limit = Math.min(
      Math.max(args.limit ?? 50, 1),
      100
    );

    const {
      entries,
      me,
    } = await buildLeaderboard(
      ctx,
      args.period,
      viewerId
    );

    const top = entries.slice(
      0,
      limit
    );

    const meInTop =
      me !== null &&
      top.some(
        (entry) =>
          entry.rank === me.rank
      );

    return {
      period: args.period,

      entries: top,

      totalUsers:
        entries.length,

      /**
       * Return the current user separately
       * if they are outside the visible top list.
       */
      me:
        me && !meInTop
          ? me
          : null,
    };
  },
});

/**
 * PUBLIC USER STATISTICS
 */
export const getUserPublicStats = query({
  args: {
    username: v.string(),
  },

  handler: async (
    ctx,
    { username }
  ) => {
    const viewerId =
      await getAuthUserId(ctx);

    const profile =
      await ctx.db
        .query("profiles")
        .withIndex(
          "by_username",
          (q: any) =>
            q.eq(
              "username",
              username
            )
        )
        .unique();

    if (!profile) {
      return null;
    }

    const {
      entries,
    } = await buildLeaderboard(
      ctx,
      "all",
      viewerId
    );

    const entry =
      entries.find(
        (item) =>
          item.userId ===
          profile.userId
      );

    if (!entry) {
      return null;
    }

    const recentExecutions =
      await ctx.db
        .query("executions")
        .withIndex(
          "by_user_startedAt",
          (q: any) =>
            q.eq(
              "userId",
              profile.userId
            )
        )
        .order("desc")
        .take(10);

    return {
      username:
        profile.username,

      avatarUrl:
        profile.avatarUrl ??
        null,

      rank:
        entry.rank,

      points:
        entry.points,

      totalSubmissions:
        entry.totalSubmissions,

      successfulSubmissions:
        entry.successfulSubmissions,

      failedSubmissions:
        entry.failedSubmissions,

      problemsSolved:
        entry.problemsSolved,

      successRate:
        entry.successRate,

      recentActivity:
        recentExecutions.map(
          (execution: any) => ({
            status:
              execution.status,

            language:
              execution.language,

            executionTime:
              execution.executionTime ??
              null,

            createdAt:
              execution.startedAt,
          })
        ),
    };
  },
});

/**
 * RECORD CODE EXECUTION
 *
 * This mutation:
 *
 * SUCCESS:
 *     +10 points
 *
 * FAILURE:
 *     +0 points
 *
 * It also records the execution and updates
 * userStats.
 */
export const recordSubmission = mutation({
  args: {
    language: v.string(),

    status:
      v.union(...EXECUTION_STATUS),

    executionTime:
      v.optional(v.number()),

    exitCode:
      v.optional(v.number()),

    errorMessage:
      v.optional(v.string()),

    problemId:
      v.optional(v.string()),

    problemDifficulty:
      v.optional(
        v.union(
          v.literal("easy"),
          v.literal("medium"),
          v.literal("hard")
        )
      ),
  },

  handler: async (
    ctx,
    args
  ) => {
    /**
     * Always get the authenticated user.
     */
    const userId =
      await getAuthUserId(ctx);

    if (!userId) {
      throw new Error(
        "Not authenticated"
      );
    }

    const successful =
      args.status === "success";

    const now =
      Date.now();

    /**
     * Determine whether this is the
     * first successful solve of a problem.
     */
    let firstSolveOfProblem =
      false;

    if (
      successful &&
      args.problemId
    ) {
      const previousSuccess =
        await ctx.db
          .query("executions")
          .withIndex(
            "by_user_problem",
            (q: any) =>
              q
                .eq(
                  "userId",
                  userId
                )
                .eq(
                  "problemId",
                  args.problemId!
                )
          )
          .filter(
            (q: any) =>
              q.eq(
                q.field("status"),
                "success"
              )
          )
          .first();

      firstSolveOfProblem =
        previousSuccess === null;
    }

    /**
     * POINTS
     *
     * Every successful execution
     * receives exactly +10 points.
     */
    const awarded =
      successful
        ? POINTS_PER_SUCCESSFUL_EXECUTION
        : 0;

    /**
     * Create execution record.
     */
    const executionId =
      crypto.randomUUID();

    await ctx.db.insert(
      "executions",
      {
        userId,

        executionId,

        language:
          args.language,

        status:
          args.status,

        startedAt:
          now -
          Math.max(
            0,
            args.executionTime ?? 0
          ),

        completedAt:
          now,

        exitCode:
          args.exitCode,

        executionTime:
          args.executionTime,

        errorMessage:
          args.errorMessage,

        problemId:
          args.problemId,

        /**
         * This is the authoritative
         * points amount for this execution.
         */
        pointsAwarded:
          awarded,
      }
    );

    /**
     * Find user's statistics record.
     */
    let stats =
      await ctx.db
        .query("userStats")
        .withIndex(
          "by_user",
          (q: any) =>
            q.eq(
              "userId",
              userId
            )
        )
        .unique();

    /**
     * Create statistics if missing.
     */
    if (!stats) {
      const statsId =
        await ctx.db.insert(
          "userStats",
          {
            userId,

            points: 0,

            totalSubmissions: 0,

            successfulSubmissions: 0,

            failedSubmissions: 0,

            problemsSolved: 0,

            updatedAt:
              now,
          }
        );

      stats =
        await ctx.db.get(
          statsId
        );
    }

    if (!stats) {
      throw new Error(
        "Failed to create user statistics."
      );
    }

    /**
     * Update statistics.
     *
     * SUCCESS:
     * points + 10
     *
     * FAILURE:
     * points + 0
     */
    await ctx.db.patch(
      stats._id,
      {
        points:
          stats.points +
          awarded,

        totalSubmissions:
          stats.totalSubmissions +
          1,

        successfulSubmissions:
          stats.successfulSubmissions +
          (successful
            ? 1
            : 0),

        failedSubmissions:
          stats.failedSubmissions +
          (successful
            ? 0
            : 1),

        /**
         * Practice execution without
         * problemId counts as a solved exercise.
         *
         * Problem execution only counts
         * the first successful solve.
         */
        problemsSolved:
          stats.problemsSolved +
          (
            successful &&
            (
              !args.problemId ||
              firstSolveOfProblem
            )
              ? 1
              : 0
          ),

        updatedAt:
          now,
      }
    );

    console.log(
      `[leaderboard] user=${userId} status=${args.status} pointsAwarded=${awarded}`
    );

    return {
      executionId,

      pointsAwarded:
        awarded,

      totalPoints:
        stats.points +
        awarded,
    };
  },
});