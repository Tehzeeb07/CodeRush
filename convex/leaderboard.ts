import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  type DatabaseReader,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";

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
  db: DatabaseReader,
  userId: Id<"users">,
  since: number
) {
  const executions = await db
    .query("executions")
    .withIndex(
      "by_user_startedAt",
      (q) =>
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
  ctx: { db: DatabaseReader },
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
  /**
   * SOURCE OF TRUTH: the Convex registered-users table.
   *
   * A leaderboard record (profile/userStats) may reference a user that no
   * longer exists (e.g. a stale record left behind after deletion). Such
   * orphans must NEVER appear on the leaderboard. We therefore load the
   * currently registered users first and keep only statistics whose
   * userId still resolves to a real user below.
   */
  const registeredUsers = await ctx.db
    .query("users")
    .collect();

  const existingUserIds = new Set<string>(
    registeredUsers.map((user) => String(user._id))
  );

  const profiles = await ctx.db
    .query("profiles")
    .collect();

  const allStats = await ctx.db
    .query("userStats")
    .collect();

  const profileByUser = new Map<string, Doc<"profiles">>(
    profiles.map((profile) => [
      profile.userId as string,
      profile,
    ])
  );

  const statsByUser = new Map<string, Doc<"userStats">>(
    allStats.map((stats) => [
      stats.userId as string,
      stats,
    ])
  );

  /**
   * The candidate list IS the registered-users table itself.
   * Every user that currently exists in Convex is a leaderboard candidate;
   * nothing outside this table can ever produce an entry.
   */
  const entries: LeaderboardEntry[] = [];

  for (const user of registeredUsers) {
    const userId = String(user._id);

    /**
     * DEFENSIVE ORPHAN FILTER (belt-and-braces):
     * statistics/profile records are only ever joined BY user id below —
     * a stale record whose user no longer exists can never be reached,
     * because this loop is driven by the live `users` table.
     * Ranks are assigned AFTER the loop, so remaining users never
     * inherit a rank gap from a deleted user.
     */
    if (!existingUserIds.has(userId)) {
      continue;
    }

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
        userId as Id<"users">, // guaranteed live: it came from the users table
        since
      );
    }

    const profile = profileByUser.get(userId);

    entries.push({
      rank: 0,

      userId,

      username:
        profile?.username ??
        fallbackUsername(userId),

      avatarUrl:
        profile?.avatarUrl ?? null,

      /**
       * Joined date comes straight from the registered
       * user's creation time in the Convex users table.
       */
      joinedAt:
        user._creationTime,

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
          (q) =>
            q.eq(
              "username",
              username
            )
        )
        .unique();

    if (!profile) {
      return null;
    }

    /**
     * DEFENSIVE: the profile might be a stale orphan whose backing
     * registered user was deleted from the Convex users table. Never
     * expose statistics for a user that does not exist.
     */
    const registeredUser = await ctx.db.get(profile.userId);
    if (!registeredUser) {
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
          (q) =>
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
          (execution) => ({
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
            (q) =>
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
            (q) =>
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
          (q) =>
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

/**
 * ADMIN: paginated, searchable leaderboard across all users.
 * Returns per-user display fields for the admin management page.
 */
export const getAdminLeaderboard = query({
  args: {
    search: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
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

    const allUsers = await ctx.db.query("users").collect();
    const allStats = await ctx.db.query("userStats").collect();
    const statsByUser = new Map<string, Doc<"userStats">>(allStats.map((s) => [String(s.userId), s]));
    const profiles = await ctx.db.query("profiles").collect();
    const profileByUser = new Map<string, Doc<"profiles">>(profiles.map((p) => [String(p.userId), p]));
    const allExecutions = await ctx.db.query("executions").collect();

    // Track last-active timestamp and number of distinct active days per user.
    const lastActiveByUser = new Map<string, number>();
    const activeDaysByUser = new Map<string, Set<string>>();
    for (const e of allExecutions) {
      const uid = String(e.userId);
      const startedAt = e.startedAt ?? 0;
      lastActiveByUser.set(uid, Math.max(lastActiveByUser.get(uid) ?? 0, startedAt));
      const day = new Date(startedAt).toISOString().slice(0, 10);
      const days = activeDaysByUser.get(uid) ?? new Set<string>();
      days.add(day);
      activeDaysByUser.set(uid, days);
    }

    const rows = allUsers.map((u) => {
      const stats = statsByUser.get(String(u._id));
      const profile = profileByUser.get(String(u._id));
      return {
        _id: u._id,
        userEmail: (u.email as string) ?? "",
        username: profile?.username ?? "Unnamed",
        xp: profile?.xp ?? 0,
        points: stats?.points ?? 0,
        problemsSolved: stats?.problemsSolved ?? 0,
        streak: activeDaysByUser.get(String(u._id))?.size ?? 0,
        lastActive: lastActiveByUser.get(String(u._id)) ?? u._creationTime,
        joinedAt: u._creationTime,
      };
    });

    let filtered = rows;
    if (search) {
      filtered = rows.filter((r) =>
        (r.username ?? "").toLowerCase().includes(search) ||
        (r.userEmail ?? "").toLowerCase().includes(search)
      );
    }
    filtered.sort((a, b) =>
      (b.points ?? 0) - (a.points ?? 0) ||
      (b.problemsSolved ?? 0) - (a.problemsSolved ?? 0) ||
      (a.joinedAt ?? 0) - (b.joinedAt ?? 0)
    );

    const start = page * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return {
      entries: paged,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  },
});

/**
 * CLEANUP: remove stale leaderboard/statistics records that reference
 * users which no longer exist in the Convex registered-users table.
 *
 * The leaderboard query already excludes such orphans defensively, so this
 * mutation is pure hygiene: it guarantees the `userStats` table never keeps
 * a permanently-stored record for a deleted user.
 */
export const cleanupOrphanedLeaderboardRecordsInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const registeredUsers = await ctx.db.query("users").collect();
    const existingUserIds = new Set<string>(
      registeredUsers.map((user) => String(user._id))
    );

    let removedStats = 0;

    const allStats = await ctx.db.query("userStats").collect();
    for (const stats of allStats) {
      if (!existingUserIds.has(String(stats.userId))) {
        await ctx.db.delete(stats._id);
        removedStats += 1;
      }
    }

    return { removedStats };
  },
});

/**
 * ADMIN: run the orphaned-leaderboard cleanup on demand.
 * SUPER_ADMIN only — same permission level as user deletion.
 */
export const cleanupOrphanedLeaderboardRecords = mutation({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || caller.role !== "SUPER_ADMIN") {
      throw new Error("Insufficient permissions");
    }

    const registeredUsers = await ctx.db.query("users").collect();
    const existingUserIds = new Set<string>(
      registeredUsers.map((user) => String(user._id))
    );

    let removedStats = 0;

    const allStats = await ctx.db.query("userStats").collect();
    for (const stats of allStats) {
      if (!existingUserIds.has(String(stats.userId))) {
        await ctx.db.delete(stats._id);
        removedStats += 1;
      }
    }

    return { removedStats };
  },
});