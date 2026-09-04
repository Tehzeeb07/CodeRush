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
 * Code Editor:
 * - Every successful execution = +10 points
 * - Every successful execution = +10 XP
 * - Failed / runtime / compilation / timeout = +0
 *
 * IMPORTANT:
 * - userStats.points is used for leaderboard ranking.
 * - profiles.xp is the user's displayed XP.
 * - For Code Editor executions both values are incremented together.
 */

export const POINTS_PER_SUCCESSFUL_EXECUTION = 10;
export const XP_PER_SUCCESSFUL_EXECUTION = 10;

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
  xp: number;
  totalSubmissions: number;
  successfulSubmissions: number;
  failedSubmissions: number;
  problemsSolved: number;
  successRate: number;
  joinedAt: number;
}

/**
 * Get beginning of requested period.
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

  return Math.round(
    (successful / total) * 1000
  ) / 10;
}

/**
 * Fallback username.
 */
function fallbackUsername(
  userId: string
): string {
  return `coder-${userId
    .slice(-6)
    .toLowerCase()}`;
}

/**
 * Leaderboard sorting.
 *
 * XP is the primary ranking value.
 *
 * 1. XP DESC
 * 2. Points DESC
 * 3. Problems solved DESC
 * 4. Successful submissions DESC
 * 5. Joined date ASC
 */
function compareEntries(
  a: LeaderboardEntry,
  b: LeaderboardEntry
): number {
  if (b.xp !== a.xp) {
    return b.xp - a.xp;
  }

  if (b.points !== a.points) {
    return b.points - a.points;
  }

  if (
    b.problemsSolved !==
    a.problemsSolved
  ) {
    return (
      b.problemsSolved -
      a.problemsSolved
    );
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

  if (a.joinedAt !== b.joinedAt) {
    return a.joinedAt - b.joinedAt;
  }

  return a.userId.localeCompare(b.userId);
}

/**
 * Aggregate executions for a user
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

  const solvedProblems =
    new Set<string>();

  let practiceSolves = 0;

  for (const execution of executions) {
    totalSubmissions += 1;

    if (execution.status === "success") {
      successfulSubmissions += 1;

      points +=
        execution.pointsAwarded ?? 0;

      if (execution.problemId) {
        solvedProblems.add(
          execution.problemId
        );
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
      solvedProblems.size +
      practiceSolves,
  };
}

/**
 * Build complete leaderboard.
 */
async function buildLeaderboard(
  ctx: { db: DatabaseReader },
  period:
    | "all"
    | "week"
    | "month"
    | "day",
  viewerId: string | null
): Promise<{
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}> {
  const since =
    period === "all"
      ? undefined
      : periodStart(
        period,
        Date.now()
      );

  const registeredUsers =
    await ctx.db
      .query("users")
      .collect();

  const existingUserIds =
    new Set<string>(
      registeredUsers.map(
        (user) => String(user._id)
      )
    );

  const profiles =
    await ctx.db
      .query("profiles")
      .collect();

  const allStats =
    await ctx.db
      .query("userStats")
      .collect();

  const profileByUser =
    new Map<string, Doc<"profiles">>(
      profiles.map((profile) => [
        String(profile.userId),
        profile,
      ])
    );

  const statsByUser =
    new Map<string, Doc<"userStats">>(
      allStats.map((stats) => [
        String(stats.userId),
        stats,
      ])
    );

  const entries: LeaderboardEntry[] =
    [];

  for (const user of registeredUsers) {
    const userId =
      String(user._id);

    if (!existingUserIds.has(userId)) {
      continue;
    }

    let statsData;

    /**
     * ALL TIME
     */
    if (since === undefined) {
      const stats =
        statsByUser.get(userId);

      statsData = stats
        ? {
          totalSubmissions:
            stats.totalSubmissions ?? 0,

          successfulSubmissions:
            stats.successfulSubmissions ??
            0,

          failedSubmissions:
            stats.failedSubmissions ??
            0,

          points:
            stats.points ?? 0,

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
      statsData =
        await aggregateWindow(
          ctx.db,
          userId as Id<"users">,
          since
        );
    }

    const profile =
      profileByUser.get(userId);

    /**
     * XP SOURCE OF TRUTH:
     *
     * profiles.xp
     */
    const xp =
      profile?.xp ?? 0;

    entries.push({
      rank: 0,

      userId,

      username:
        profile?.username ??
        fallbackUsername(userId),

      avatarUrl:
        profile?.avatarUrl ??
        null,

      joinedAt:
        user._creationTime,

      points:
        statsData.points,

      xp,

      totalSubmissions:
        statsData.totalSubmissions,

      successfulSubmissions:
        statsData.successfulSubmissions,

      failedSubmissions:
        statsData.failedSubmissions,

      problemsSolved:
        statsData.problemsSolved,

      successRate:
        successRate(
          statsData.successfulSubmissions,
          statsData.totalSubmissions
        ),
    });
  }

  /**
   * Sort by XP.
   */
  entries.sort(compareEntries);

  /**
   * Assign ranks AFTER sorting.
   */
  entries.forEach(
    (entry, index) => {
      entry.rank =
        index + 1;
    }
  );

  const me = viewerId
    ? entries.find(
      (entry) =>
        entry.userId ===
        viewerId
    ) ?? null
    : null;

  if (entries.length > 0) {
    console.log(
      `[leaderboard] period=${period} users=${entries.length} topXP=${Math.max(
        ...entries.map(
          (entry) => entry.xp
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
export const getLeaderboard =
  query({
    args: {
      period: v.union(...PERIOD),
      limit: v.optional(
        v.number()
      ),
    },

    handler: async (
      ctx,
      args
    ) => {
      const viewerId =
        await getAuthUserId(ctx);

      const limit = Math.min(
        Math.max(
          args.limit ?? 50,
          1
        ),
        100
      );

      const {
        entries,
        me,
      } =
        await buildLeaderboard(
          ctx,
          args.period,
          viewerId
        );

      const top =
        entries.slice(
          0,
          limit
        );

      const meInTop =
        me !== null &&
        top.some(
          (entry) =>
            entry.rank ===
            me.rank
        );

      return {
        period:
          args.period,

        entries: top,

        totalUsers:
          entries.length,

        me:
          me &&
            !meInTop
            ? me
            : null,
      };
    },
  });

/**
 * PUBLIC USER STATISTICS
 */
export const getUserPublicStats =
  query({
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

      const registeredUser =
        await ctx.db.get(
          profile.userId
        );

      if (!registeredUser) {
        return null;
      }

      const { entries } =
        await buildLeaderboard(
          ctx,
          "all",
          viewerId
        );

      const entry =
        entries.find(
          (item) =>
            item.userId ===
            String(
              profile.userId
            )
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

        /**
         * IMPORTANT:
         * Return XP to dashboard.
         */
        xp:
          profile.xp ?? 0,

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
 * Successful execution:
 *
 * +10 points
 * +10 XP
 *
 * Failed execution:
 *
 * +0 points
 * +0 XP
 */
export const recordSubmission =
  mutation({
    args: {
      language: v.string(),

      status:
        v.union(
          ...EXECUTION_STATUS
        ),

      executionTime:
        v.optional(
          v.number()
        ),

      exitCode:
        v.optional(
          v.number()
        ),

      errorMessage:
        v.optional(
          v.string()
        ),

      problemId:
        v.optional(
          v.string()
        ),

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
      const userId =
        await getAuthUserId(ctx);

      if (!userId) {
        throw new Error(
          "Not authenticated"
        );
      }

      const successful =
        args.status ===
        "success";

      const now =
        Date.now();

      /**
       * Determine whether this is the
       * first successful solve.
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
                  q.field(
                    "status"
                  ),
                  "success"
                )
            )
            .first();

        firstSolveOfProblem =
          previousSuccess ===
          null;
      }

      /**
       * POINTS
       */
      const awardedPoints =
        successful
          ? POINTS_PER_SUCCESSFUL_EXECUTION
          : 0;

      /**
       * XP
       */
      const awardedXP =
        successful
          ? XP_PER_SUCCESSFUL_EXECUTION
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
              args.executionTime ??
              0
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

          pointsAwarded:
            awardedPoints,
        }
      );

      /**
       * Find user statistics.
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

              xp: 0,

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
       * Update userStats.
       *
       * XP and points are kept in sync.
       */
      await ctx.db.patch(
        stats._id,
        {
          points:
            stats.points +
            awardedPoints,

          /**
           * XP is synchronized with points.
           * Both represent the same score.
           */
          xp:
            (stats.xp ?? stats.points ?? 0) +
            awardedXP,

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

      /**
       * ==========================================================
       * IMPORTANT XP FIX
       * ==========================================================
       *
       * The old implementation updated userStats.points but never
       * updated profiles.xp.
       *
       * Dashboard and leaderboard read XP from profiles.xp.
       *
       * Therefore successful executions were giving points but the
       * displayed XP remained unchanged.
       */
      const profile =
        await ctx.db
          .query("profiles")
          .withIndex(
            "by_userId",
            (q) =>
              q.eq(
                "userId",
                userId
              )
          )
          .unique();

      if (profile) {
        await ctx.db.patch(
          profile._id,
          {
            xp:
              (profile.xp ?? 0) +
              awardedXP,
          }
        );
      } else {
        /**
         * Normally every authenticated user should already have
         * a profile.
         *
         * We intentionally do not create a fake profile here because
         * username is required and profile creation belongs to the
         * profile/auth flow.
         */
        console.warn(
          `[leaderboard] profile missing for user=${userId}; XP could not be displayed`
        );
      }

      console.log(
        `[leaderboard] user=${userId} status=${args.status} pointsAwarded=${awardedPoints} xpAwarded=${awardedXP}`
      );

      /**
       * Read final XP so the client immediately knows the new value.
       */
      const updatedProfile =
        await ctx.db
          .query("profiles")
          .withIndex(
            "by_userId",
            (q) =>
              q.eq(
                "userId",
                userId
              )
          )
          .unique();

      return {
        executionId,

        pointsAwarded:
          awardedPoints,

        xpAwarded:
          awardedXP,

        totalPoints:
          stats.points +
          awardedPoints,

        totalXP:
          updatedProfile?.xp ??
          0,
      };
    },
  });

/**
 * RECORD CODE EXECUTION (IDEMPOTENT)
 *
 * This mutation is called by the /api/code/execute route AFTER a successful
 * code execution. It awards +10 XP and +10 points for successful executions.
 *
 * IDEMPOTENCY:
 * - The executionId is used to prevent double-awarding XP.
 * - If xpAwarded is already set on the execution record, this is a no-op.
 * - This protects against retries, double-clicks, and network issues.
 *
 * XP/POINTS SYNCHRONIZATION:
 * - Both profiles.xp and userStats.xp are updated together.
 * - This ensures Dashboard and Leaderboard always show the same values.
 */
export const recordCodeExecution =
  mutation({
    args: {
      executionId: v.string(),
      status: v.union(...EXECUTION_STATUS),
      executionTime: v.optional(v.number()),
      exitCode: v.optional(v.number()),
      errorMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const callerId = await getAuthUserId(ctx);

      // Find the execution record
      const execution = await ctx.db
        .query("executions")
        .withIndex("by_executionId", (q) =>
          q.eq("executionId", args.executionId)
        )
        .unique();

      if (!execution) {
        throw new Error(`Execution not found: ${args.executionId}`);
      }

      const userId = callerId ?? execution.userId;
      if (callerId && callerId !== execution.userId) {
        throw new Error("Unauthorized execution record");
      }

      const successful = args.status === "success";
      const now = Date.now();

      // IDEMPOTENCY CHECK: If xpAwarded is already set, this is a no-op
      if (execution.xpAwarded !== undefined) {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();

        return {
          executionId: args.executionId,
          pointsAwarded: 0,
          xpAwarded: 0,
          totalPoints: profile?.xp ?? 0,
          totalXP: profile?.xp ?? 0,
          alreadyAwarded: true,
        };
      }

      // Calculate awarded points/XP (+10 on success, 0 on failure)
      const awardedPoints = successful ? POINTS_PER_SUCCESSFUL_EXECUTION : 0;
      const awardedXP = successful ? XP_PER_SUCCESSFUL_EXECUTION : 0;

      // Mark execution as processed (idempotency guard)
      await ctx.db.patch(execution._id, {
        xpAwarded: awardedXP,
        pointsAwarded: awardedPoints,
        status: args.status,
        completedAt: now,
        executionTime: args.executionTime,
        ...(args.exitCode !== undefined ? { exitCode: args.exitCode } : {}),
        ...(args.errorMessage !== undefined ? { errorMessage: args.errorMessage } : {}),
      });

      // Find or create user statistics
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

      if (!stats) {
        throw new Error("Failed to create user statistics.");
      }

      // Update userStats - XP and points are kept in sync
      // Code execution runs do NOT increment problemsSolved
      await ctx.db.patch(stats._id, {
        points: stats.points + awardedPoints,
        xp: (stats.xp ?? stats.points ?? 0) + awardedXP,
        totalSubmissions: stats.totalSubmissions + 1,
        successfulSubmissions: stats.successfulSubmissions + (successful ? 1 : 0),
        failedSubmissions: stats.failedSubmissions + (successful ? 0 : 1),
        updatedAt: now,
      });

      // Update profiles.xp (the displayed XP)
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();

      if (profile) {
        await ctx.db.patch(profile._id, {
          xp: (profile.xp ?? 0) + awardedXP,
        });
      } else {
        console.warn(
          `[leaderboard] profile missing for user=${userId}; XP could not be displayed`
        );
      }

      console.log(
        `[leaderboard] recordCodeExecution user=${userId} executionId=${args.executionId} status=${args.status} pointsAwarded=${awardedPoints} xpAwarded=${awardedXP}`
      );

      // Read final XP for the response
      const updatedProfile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();

      return {
        executionId: args.executionId,
        pointsAwarded: awardedPoints,
        xpAwarded: awardedXP,
        totalPoints: stats.points + awardedPoints,
        totalXP: updatedProfile?.xp ?? 0,
        alreadyAwarded: false,
      };
    },
  });

/**
 * ADMIN: paginated, searchable leaderboard.
 */
export const getAdminLeaderboard =
  query({
    args: {
      search:
        v.optional(
          v.string()
        ),
      page:
        v.optional(
          v.number()
        ),
      pageSize:
        v.optional(
          v.number()
        ),
    },

    handler: async (
      ctx,
      args
    ) => {
      const callerId =
        await getAuthUserId(ctx);

      if (!callerId) {
        throw new Error(
          "Not authenticated"
        );
      }

      const caller =
        await resolveIdentity(
          ctx,
          callerId
        );

      if (
        !caller ||
        (
          caller.role !==
          "ADMIN" &&
          caller.role !==
          "SUPER_ADMIN"
        )
      ) {
        throw new Error(
          "Insufficient permissions"
        );
      }

      const page = Math.max(
        args.page ?? 0,
        0
      );

      const pageSize =
        Math.min(
          args.pageSize ?? 20,
          100
        );

      const search =
        args.search
          ?.trim()
          .toLowerCase() ??
        "";

      const allUsers =
        await ctx.db
          .query("users")
          .collect();

      const allStats =
        await ctx.db
          .query("userStats")
          .collect();

      const statsByUser =
        new Map<
          string,
          Doc<"userStats">
        >(
          allStats.map((s) => [
            String(s.userId),
            s,
          ])
        );

      const profiles =
        await ctx.db
          .query("profiles")
          .collect();

      const profileByUser =
        new Map<
          string,
          Doc<"profiles">
        >(
          profiles.map((p) => [
            String(p.userId),
            p,
          ])
        );

      const allExecutions =
        await ctx.db
          .query("executions")
          .collect();

      const lastActiveByUser =
        new Map<
          string,
          number
        >();

      const activeDaysByUser =
        new Map<
          string,
          Set<string>
        >();

      for (const e of allExecutions) {
        const uid =
          String(e.userId);

        const startedAt =
          e.startedAt ?? 0;

        lastActiveByUser.set(
          uid,
          Math.max(
            lastActiveByUser.get(
              uid
            ) ?? 0,
            startedAt
          )
        );

        const day =
          new Date(
            startedAt
          )
            .toISOString()
            .slice(0, 10);

        const days =
          activeDaysByUser.get(
            uid
          ) ??
          new Set<string>();

        days.add(day);

        activeDaysByUser.set(
          uid,
          days
        );
      }

      const rows =
        allUsers.map((u) => {
          const stats =
            statsByUser.get(
              String(u._id)
            );

          const profile =
            profileByUser.get(
              String(u._id)
            );

          return {
            _id: u._id,

            userEmail:
              (u.email as string) ??
              "",

            username:
              profile?.username ??
              "Unnamed",

            xp:
              profile?.xp ?? 0,

            points:
              stats?.points ?? 0,

            problemsSolved:
              stats?.problemsSolved ??
              0,

            streak:
              activeDaysByUser.get(
                String(u._id)
              )?.size ?? 0,

            lastActive:
              lastActiveByUser.get(
                String(u._id)
              ) ??
              u._creationTime,

            joinedAt:
              u._creationTime,
          };
        });

      let filtered =
        rows;

      if (search) {
        filtered =
          rows.filter(
            (r) =>
              (
                r.username ??
                ""
              )
                .toLowerCase()
                .includes(search) ||
              (
                r.userEmail ??
                ""
              )
                .toLowerCase()
                .includes(search)
          );
      }

      filtered.sort(
        (a, b) =>
          (b.xp ?? 0) -
          (a.xp ?? 0) ||
          (b.points ?? 0) -
          (a.points ?? 0) ||
          (b.problemsSolved ??
            0) -
          (a.problemsSolved ??
            0) ||
          (a.joinedAt ?? 0) -
          (b.joinedAt ?? 0)
      );

      const start =
        page * pageSize;

      const paged =
        filtered.slice(
          start,
          start + pageSize
        );

      return {
        entries: paged,

        total:
          filtered.length,

        page,

        pageSize,

        totalPages:
          Math.ceil(
            filtered.length /
            pageSize
          ),
      };
    },
  });

/**
 * CLEANUP orphaned stats.
 */
export const cleanupOrphanedLeaderboardRecordsInternal =
  internalMutation({
    args: {},

    handler: async (ctx) => {
      const registeredUsers =
        await ctx.db
          .query("users")
          .collect();

      const existingUserIds =
        new Set<string>(
          registeredUsers.map(
            (user) =>
              String(user._id)
          )
        );

      let removedStats = 0;

      const allStats =
        await ctx.db
          .query("userStats")
          .collect();

      for (const stats of allStats) {
        if (
          !existingUserIds.has(
            String(stats.userId)
          )
        ) {
          await ctx.db.delete(
            stats._id
          );

          removedStats += 1;
        }
      }

      return {
        removedStats,
      };
    },
  });

/**
 * ADMIN cleanup.
 */
export const cleanupOrphanedLeaderboardRecords =
  mutation({
    args: {},

    handler: async (ctx) => {
      const callerId =
        await getAuthUserId(ctx);

      if (!callerId) {
        throw new Error(
          "Not authenticated"
        );
      }

      const caller =
        await resolveIdentity(
          ctx,
          callerId
        );

      if (
        !caller ||
        caller.role !==
        "SUPER_ADMIN"
      ) {
        throw new Error(
          "Insufficient permissions"
        );
      }

      const registeredUsers =
        await ctx.db
          .query("users")
          .collect();

      const existingUserIds =
        new Set<string>(
          registeredUsers.map(
            (user) =>
              String(user._id)
          )
        );

      let removedStats = 0;

      const allStats =
        await ctx.db
          .query("userStats")
          .collect();

      for (const stats of allStats) {
        if (
          !existingUserIds.has(
            String(stats.userId)
          )
        ) {
          await ctx.db.delete(
            stats._id
          );

          removedStats += 1;
        }
      }

      return {
        removedStats,
      };
    },
  });

/**
 * MIGRATION: Backfill userStats.xp from profiles.xp.
 *
 * This internal mutation should be called once after deployment to
 * populate the new `xp` field in userStats for existing users.
 *
 * Usage: npx convex run leaderboard:backfillUserStatsXp
 */
export const backfillUserStatsXp =
  internalMutation({
    args: {},

    handler: async (ctx) => {
      const profiles =
        await ctx.db
          .query("profiles")
          .collect();

      let updated = 0;
      let created = 0;

      for (const profile of profiles) {
        const existingStats =
          await ctx.db
            .query("userStats")
            .withIndex(
              "by_user",
              (q) =>
                q.eq(
                  "userId",
                  profile.userId
                )
            )
            .unique();

        if (existingStats) {
          // Update existing stats with XP
          await ctx.db.patch(
            existingStats._id,
            {
              xp:
                profile.xp ?? 0,
              updatedAt:
                Date.now(),
            }
          );
          updated += 1;
        } else {
          // Create new stats row with XP
          await ctx.db.insert(
            "userStats",
            {
              userId:
                profile.userId,
              points: 0,
              xp:
                profile.xp ?? 0,
              totalSubmissions: 0,
              successfulSubmissions: 0,
              failedSubmissions: 0,
              problemsSolved: 0,
              updatedAt:
                Date.now(),
            }
          );
          created += 1;
        }
      }

      return {
        updated,
        created,
        total:
          profiles.length,
      };
    },
  });

/**
 * MIGRATION: Ensure profiles.xp is always initialized.
 *
 * This internal mutation ensures that all profiles have xp: 0
 * (not null or undefined).
 *
 * Usage: npx convex run leaderboard:ensureProfilesXp
 */
export const ensureProfilesXp =
  internalMutation({
    args: {},

    handler: async (ctx) => {
      const profiles =
        await ctx.db
          .query("profiles")
          .collect();

      let fixed = 0;

      for (const profile of profiles) {
        if (
          profile.xp === null ||
          profile.xp === undefined
        ) {
          await ctx.db.patch(
            profile._id,
            {
              xp: 0,
            }
          );
          fixed += 1;
        }
      }

      return {
        fixed,
        total: profiles.length,
      };
    },
  });

/**
 * MIGRATION & REPAIR: Synchronize all users' userStats with profiles and problemProgress.
 *
 * Ensures:
 * - userStats.xp == profiles.xp
 * - userStats.points == profiles.xp
 * - userStats.problemsSolved == count of solved problems in problemProgress
 *
 * Usage: npx convex run leaderboard:syncAllUserStatsAndXp
 */
export const syncAllUserStatsAndXp =
  internalMutation({
    args: {},

    handler: async (ctx) => {
      const users = await ctx.db.query("users").collect();
      let updated = 0;

      for (const user of users) {
        const userId = user._id;

        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();

        const solvedProgress = await ctx.db
          .query("problemProgress")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("status"), "solved"))
          .collect();

        const executions = await ctx.db
          .query("executions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

        const totalExecutions = executions.length;
        const successfulExecutions = executions.filter(
          (e) => e.status === "success"
        ).length;
        const failedExecutions = totalExecutions - successfulExecutions;

        const currentXp = profile?.xp ?? 0;
        const problemsSolvedCount = solvedProgress.length;

        let stats = await ctx.db
          .query("userStats")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .unique();

        if (stats) {
          await ctx.db.patch(stats._id, {
            xp: currentXp,
            points: currentXp,
            problemsSolved: problemsSolvedCount,
            totalSubmissions: Math.max(stats.totalSubmissions, totalExecutions),
            successfulSubmissions: Math.max(
              stats.successfulSubmissions,
              successfulExecutions
            ),
            failedSubmissions: Math.max(stats.failedSubmissions, failedExecutions),
            updatedAt: Date.now(),
          });
        } else {
          await ctx.db.insert("userStats", {
            userId,
            xp: currentXp,
            points: currentXp,
            problemsSolved: problemsSolvedCount,
            totalSubmissions: totalExecutions,
            successfulSubmissions: successfulExecutions,
            failedSubmissions: failedExecutions,
            updatedAt: Date.now(),
          });
        }
        updated += 1;
      }

      return {
        updated,
        total: users.length,
      };
    },
  });