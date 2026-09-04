import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

/**
 * CodeRush â€” Premium Analytics
 *
 * All analytics are aggregated HERE, server side, and are ALWAYS scoped
 * strictly to the authenticated user via getAuthUserId(). No username or
 * userId argument is accepted â€” the requesting principal is the only
 * identity ever queried, so a user can never view or alter another user's
 * statistics through these functions.
 *
 * Data sources (real backend tables, never hardcoded):
 *   - userStats   â†’ authoritative all-time totals (points, submissions,
 *                   problemsSolved). Written only by secure server mutations.
 *   - executions  â†’ every code run recorded through the editor (status,
 *                   language, executionTime, pointsAwarded, startedAt,
 *                   optional problemId). Powers trends, languages, heatmap,
 *                   difficulty, recent activity and streaks.
 *   - challenges  â†’ optional problem metadata (difficulty, theme) used to
 *                   bucket problem-backed solves by difficulty / subject.
 *
 * Heavy time-series + heatmap aggregation happens here so the browser
 * never receives every raw submission.
 */

export type AnalyticsRange = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  "7d": 7,
  "30d": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
  all: 365,
};

const DAY = 86400000;
const ACCEPTED = "success";

/** Terminal states that represent a real attempt (excludes queued / running). */
const TERMINAL_STATUSES = new Set([
  "success",
  "runtime_error",
  "compilation_error",
  "timeout",
  "failed",
  "internal_error",
  "stopped",
]);

/** UTC date bucket key (start of day, in ms). */
function dayStart(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Stable "YYYY-MM-DD" key for heatmap / streak maps. */
function dayKey(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Current + longest streak from a set of active UTC day keys. */
function computeStreaks(
  activeDays: Set<string>
): { current: number; longest: number } {
  if (activeDays.size === 0) return { current: 0, longest: 0 };

  const now = new Date();
  const today = dayKey(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // Longest streak: walk sorted consecutive keys.
  const sorted = [...activeDays].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    const gap =
      prev === null
        ? 1
        : (dayStart(new Date(key + "T00:00:00Z").getTime()) -
          dayStart(new Date(prev + "T00:00:00Z").getTime())) /
        DAY;
    run = prev === null || gap === 1 ? run + 1 : 1;
    prev = key;
    if (run > longest) longest = run;
  }

  // Current streak: consecutive days ending today (or yesterday if quiet).
  let cursor = activeDays.has(today)
    ? today
    : activeDays.has(dayKey(Date.now() - DAY))
      ? dayKey(Date.now() - DAY)
      : "";
  let current = 0;
  for (let i = 0; i < 366 && cursor !== ""; i++) {
    current += 1;
    const d = new Date(cursor + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = dayKey(d.getTime());
    if (!activeDays.has(cursor)) break;
  }

  return { current, longest };
}

/** Trailing moving average used to smooth noisy per-day metrics. */
function smooth(values: number[], window = 7): number[] {
  return values.map((_, i) => {
    const from = Math.max(0, i - window + 1);
    const slice = values.slice(from, i + 1);
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
  });
}

export const getAnalytics = query({
  args: {
    range: v.union(
      v.literal("7d"),
      v.literal("30d"),
      v.literal("3m"),
      v.literal("6m"),
      v.literal("1y"),
      v.literal("all")
    ),
  },

  handler: async (ctx, { range }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const now = Date.now();
    const rangeDays = RANGE_DAYS[range];
    const rangeStart = now - rangeDays * DAY;
    const yearStart = now - 366 * DAY;
    const previousStart = rangeStart - rangeDays * DAY;

    // ---- All-time denormalized totals (fast, single doc) ---------------
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const allTime = {
      totalSubmissions: stats?.totalSubmissions ?? 0,
      successful: stats?.successfulSubmissions ?? 0,
      failed: stats?.failedSubmissions ?? 0,
      problemsSolved: stats?.problemsSolved ?? 0,
      points: stats?.points ?? 0,
    };

    // Executions within the trailing year (single bounded index scan).
    const execs = await ctx.db
      .query("executions")
      .withIndex("by_user_startedAt", (q) =>
        q.eq("userId", userId).gte("startedAt", yearStart)
      )
      .order("asc")
      .collect();

    const hasSubmissions = allTime.totalSubmissions > 0 || execs.length > 0;

    // ---- Challenge metadata (difficulty + theme for problem-backed runs) -
    const challenges = await ctx.db.query("challenges").collect();
    const challengeInfo = new Map<string, { difficulty: string; theme: string }>();
    for (const c of challenges) {
      challengeInfo.set(c._id, {
        difficulty: c.difficulty,
        theme: c.theme ?? c.category,
      });
    }
    const difficultyOf = (problemId?: string): string | null => {
      if (!problemId) return null;
      return challengeInfo.get(problemId as Id<"challenges">)?.difficulty ?? null;
    };
    const themeOf = (problemId?: string): string | null => {
      if (!problemId) return null;
      return challengeInfo.get(problemId as Id<"challenges">)?.theme ?? null;
    };

    // ---- Windows used for trends / deltas -------------------------------
    const rangeExecs = execs.filter(
      (e) => e.startedAt >= rangeStart && e.startedAt <= now
    );
    const prevExecs = execs.filter(
      (e) => e.startedAt >= previousStart && e.startedAt < rangeStart
    );

    // ---------------- Difficulty + subject solves -------------------------
    // Mirrors leaderboard semantics: a distinct problem counts once (first
    // success); a practice run (no problemId) counts once as a solve.
    const solvedProblems = new Set<string>();
    let practiceSolves = 0;
    const themeTally = new Map<string, number>();
    const themeTotalMap = new Map<string, number>();
    for (const c of challenges) {
      const theme = c.theme ?? c.category;
      themeTotalMap.set(theme, (themeTotalMap.get(theme) ?? 0) + 1);
    }

    for (const e of execs) {
      if (e.status !== ACCEPTED) continue;
      const key = e.problemId ?? `practice:${e.executionId}`;
      if (solvedProblems.has(key)) continue;
      solvedProblems.add(key);
      if (e.problemId) {
        const theme = themeOf(e.problemId);
        if (theme) themeTally.set(theme, (themeTally.get(theme) ?? 0) + 1);
      } else {
        practiceSolves += 1;
      }
    }

    const solvedCountByDifficulty = { easy: 0, medium: 0, hard: 0 };
    for (const key of Array.from(solvedProblems)) {
      if (key.startsWith("practice:")) continue;
      const d = difficultyOf(key);
      if (d === "beginner") solvedCountByDifficulty.easy += 1;
      else if (d === "intermediate") solvedCountByDifficulty.medium += 1;
      else if (d === "advanced") solvedCountByDifficulty.hard += 1;
    }

    const difficultyBuckets: {
      difficulty: "easy" | "medium" | "hard" | "practice";
      solved: number;
      percent: number;
    }[] = [
        { difficulty: "easy", solved: solvedCountByDifficulty.easy, percent: 0 },
        { difficulty: "medium", solved: solvedCountByDifficulty.medium, percent: 0 },
        { difficulty: "hard", solved: solvedCountByDifficulty.hard, percent: 0 },
        { difficulty: "practice", solved: practiceSolves, percent: 0 },
      ];
    difficultyBuckets[0].percent = Math.round((difficultyBuckets[0].solved / 60) * 100);
    difficultyBuckets[1].percent = Math.round((difficultyBuckets[1].solved / 80) * 100);
    difficultyBuckets[2].percent = Math.round((difficultyBuckets[2].solved / 50) * 100);

    const skills: {
      name: string;
      solved: number;
      total: number;
      percent: number;
    }[] = [];
    for (const [name, solved] of Array.from(themeTally.entries())) {
      const total = themeTotalMap.get(name) ?? solved;
      const percent = total > 0 ? Math.round((solved / total) * 100) : 0;
      skills.push({ name, solved, total, percent });
    }
    skills.sort((a, b) => b.percent - a.percent || b.solved - a.solved);

    // ---------------- Languages (within the selected window) -------------
    const langTally = new Map<string, { total: number; accepted: number }>();
    for (const e of rangeExecs) {
      const t = langTally.get(e.language) ?? { total: 0, accepted: 0 };
      t.total += 1;
      if (e.status === ACCEPTED) t.accepted += 1;
      langTally.set(e.language, t);
    }
    const languages = Array.from(langTally.entries())
      .map(([language, { total, accepted }]) => ({
        language,
        total,
        accepted,
        percent: rangeExecs.length
          ? Math.round((total / rangeExecs.length) * 1000) / 10
          : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ---------------- Coding activity heatmap (trailing year) ------------
    const heatByKey = new Map<string, { count: number; accepted: number; rejected: number }>();
    const activeDays = new Set<string>();
    for (const e of execs) {
      const key = dayKey(e.startedAt);
      const c = heatByKey.get(key) ?? { count: 0, accepted: 0, rejected: 0 };
      c.count += 1;
      if (e.status === ACCEPTED) c.accepted += 1;
      else if (TERMINAL_STATUSES.has(e.status)) c.rejected += 1;
      heatByKey.set(key, c);
      if (e.status === ACCEPTED) activeDays.add(key);
    }
    // Layout: 53 columns of 7 day-cells, ending on the last full week *before*
    // today so the grid is stable and aligned to week starts (Monday).
    const heatmapStart = new Date();
    heatmapStart.setHours(0, 0, 0, 0);
    const weekday = (heatmapStart.getUTCDay() + 6) % 7; // Mon=0
    heatmapStart.setUTCDate(heatmapStart.getUTCDate() - weekday - 371);
    const heatmap: {
      iso: string;
      ts: number;
      count: number;
      accepted: number;
      rejected: number;
    }[] = [];
    const heatCursor = new Date(heatmapStart);
    for (let i = 0; i < 371; i++) {
      const ts = heatCursor.getTime();
      const iso = dayKey(ts);
      const c = heatByKey.get(iso) ?? { count: 0, accepted: 0, rejected: 0 };
      heatmap.push({ iso, ts, ...c });
      heatCursor.setUTCDate(heatCursor.getUTCDate() + 1);
    }

    const { current, longest } = computeStreaks(activeDays);

    // ---------------- Performance over time ------------------------------
    const daysInRange = Math.max(1, Math.ceil((now - rangeStart) / DAY) + 1);
    const perfLabels: string[] = [];
    const perfAcceptance: number[] = [];
    const perfProblems: number[] = [];
    const perfSubmissions: number[] = [];
    const perfRuntime: number[] = [];
    const perfXp: number[] = [];

    const solvedRunning = new Set<string>();

    // Short, non-cluttered axis label: month-only for long ranges, else date.
    const formatDayLabel = (ts: number, totalDays: number): string => {
      const d = new Date(ts);
      const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
      if (totalDays > 200) return month;
      if (totalDays > 60) return `${month} ${d.getUTCDate()}`;
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
    };

    for (let d = 0; d < daysInRange; d++) {
      const dayTs = rangeStart + d * DAY;
      const nextTs = dayTs + DAY;
      const bucket = { total: 0, accepted: 0, runtimeSum: 0, runtimeN: 0, xp: 0 };
      for (const e of rangeExecs) {
        if (e.startedAt >= dayTs && e.startedAt < nextTs) {
          bucket.total += 1;
          if (e.status === ACCEPTED) bucket.accepted += 1;
          if (typeof e.executionTime === "number" && e.executionTime >= 0) {
            bucket.runtimeSum += e.executionTime;
            bucket.runtimeN += 1;
          }
          bucket.xp += e.pointsAwarded ?? 0;
        }
      }
      // Running solved total (distinct problems + practice).
      for (const e of rangeExecs) {
        if (e.status !== ACCEPTED || e.startedAt < dayTs || e.startedAt >= nextTs) continue;
        const key = e.problemId ?? `practice:${e.executionId}`;
        if (solvedRunning.has(key)) continue;
        solvedRunning.add(key);
      }
      perfLabels.push(formatDayLabel(dayTs, rangeDays));
      perfProblems.push(solvedRunning.size);
      perfSubmissions.push(bucket.total);
      perfXp.push(bucket.xp);
      const dayRate = bucket.total > 0 ? (bucket.accepted / bucket.total) * 100 : 0;
      const dayRuntime = bucket.runtimeN > 0 ? bucket.runtimeSum / bucket.runtimeN : 0;
      perfAcceptance.push(dayRate);
      perfRuntime.push(dayRuntime);
    }

    // Smooth volatile per-day metrics for a clearer trend line.
    const smoothedAcceptance = smooth(perfAcceptance, 7);
    const smoothedRuntime = smooth(perfRuntime, 7);
    for (let i = 0; i < perfAcceptance.length; i++) {
      perfAcceptance[i] = Math.round(smoothedAcceptance[i] * 10) / 10;
      perfRuntime[i] = Math.round(smoothedRuntime[i] * 1000) / 1000;
    }

    // ---------------- KPIs + deltas --------------------------------------
    const sumPoints = (list: typeof execs) =>
      list.reduce((acc, e) => acc + (e.pointsAwarded ?? 0), 0);
    // Distinct "new solves" inside a window (distinct problems + practice).
    const countSolves = (list: typeof execs): number => {
      const seen = new Set<string>();
      for (const e of list) {
        if (e.status !== ACCEPTED) continue;
        seen.add(e.problemId ?? `practice:${e.executionId}`);
      }
      return seen.size;
    };

    const solvesInRange = countSolves(rangeExecs);
    const solvesPrev = countSolves(prevExecs);
    const submissionDelta = rangeExecs.length - prevExecs.length;
    const xpDelta = sumPoints(rangeExecs) - sumPoints(prevExecs);

    const windowRate = (list: typeof rangeExecs): number => {
      if (list.length === 0) return 0;
      const accepted = list.filter((e) => e.status === ACCEPTED).length;
      return Math.round((accepted / list.length) * 1000) / 10;
    };
    const acceptanceDelta = Math.round((windowRate(rangeExecs) - windowRate(prevExecs)) * 10) / 10;
    const acceptanceRate =
      allTime.totalSubmissions > 0
        ? Math.round((allTime.successful / allTime.totalSubmissions) * 1000) / 10
        : 0;

    const kpis = {
      problemsSolved: allTime.problemsSolved,
      solvesDelta: solvesInRange - solvesPrev,
      acceptanceRate,
      acceptanceDelta,
      totalSubmissions: allTime.totalSubmissions,
      submissionsDelta: submissionDelta,
      currentStreak: current,
      longestStreak: longest,
      totalXp: allTime.points,
      xpDelta,
    };

    // ---------------- Recent activity -------------------------------------
    const recent = Array.from(execs)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 12)
      .map((e) => ({
        status: e.status,
        language: e.language,
        executionTime: e.executionTime ?? null,
        createdAt: e.startedAt,
        problemId: e.problemId ?? null,
      }));

    // ---------------- Insights (derived from real data) -------------------
    const insights: { icon: string; text: string }[] = [];
    if (solvesInRange - solvesPrev > 0) {
      insights.push({
        icon: "◑",
        text: `You solved ${solvesInRange - solvesPrev} more ${(solvesInRange - solvesPrev) === 1 ? "problem" : "problems"} than in the previous period.`,
      });
    }
    if (current > 0) {
      insights.push({
        icon: "ðŸ”¥",
        text: `Your current streak is ${current} day${current === 1 ? "" : "s"}. Keep going!`,
      });
    }
    if (acceptanceDelta > 0) {
      insights.push({
        icon: "ðŸ“ˆ",
        text: `Your acceptance rate improved by ${Math.round(acceptanceDelta)} points`,
      });
    } else if (acceptanceDelta < 0) {
      insights.push({
        icon: "ðŸ“‰",
        text: `Your acceptance rate dipped by ${Math.round(Math.abs(acceptanceDelta))} points this period.`,
      });
    }
    if (languages.length > 0) {
      insights.push({
        icon: "ðŸ’»",
        text: `You code most in ${languages[0].language} (${languages[0].percent}% of submissions).`,
      });
    }
    if (skills.length > 0) {
      insights.push({
        icon: "âš¡",
        text: `You are strongest in ${skills[0].name} (${skills[0].percent}% mastery).`,
      });
    }
    {
      const stones = [1, 10, 25, 50, 100, 250, 500];
      const names = [
        "First Problem",
        "10 Problems",
        "25 Problems",
        "50 Problems",
        "Century Coder",
        "250 Problems",
        "500 Problems",
      ];
      const idx = stones.findIndex((t) => allTime.problemsSolved < t);
      if (idx === -1) {
        insights.push({ icon: "ðŸ…", text: "You have completed every coding milestone. Legendary!" });
      } else {
        const remain = stones[idx] - allTime.problemsSolved;
        insights.push({
          icon: "ðŸŽ¯",
          text: `${remain < 50 ? "Almost there â€” " : ""}you are ${remain} from ${names[idx]}.`,
        });
      }
    }

    // ---------------- Milestones ------------------------------------------
    const MILESTONES: { target: number; label: string }[] = [
      { target: 1, label: "First Problem" },
      { target: 10, label: "10 Problems" },
      { target: 25, label: "25 Problems" },
      { target: 50, label: "50 Problems" },
      { target: 100, label: "Century Coder" },
      { target: 250, label: "250 Problems" },
      { target: 500, label: "500 Problems" },
    ];
    const solvedTotal = allTime.problemsSolved;
    const nextIndex = MILESTONES.findIndex((m) => solvedTotal < m.target);
    const next =
      nextIndex === -1 ? null : MILESTONES[nextIndex];
    const milestones = {
      stones: MILESTONES.map((m, i) => ({
        ...m,
        achieved: solvedTotal >= m.target,
        isNext: i === nextIndex,
      })),
      solved: solvedTotal,
      next,
      remaining: next ? next.target - solvedTotal : 0,
      percent: next ? Math.min(100, Math.round((solvedTotal / next.target) * 100)) : 100,
    };

    // ---------------- Final payload ---------------------------------------
    return {
      range,
      hasSubmissions,
      kpis,
      problems: difficultyBuckets,
      languages,
      languagesTotal: rangeExecs.length,
      heatmap,
      performance: {
        labels: perfLabels,
        acceptance: perfAcceptance,
        problems: perfProblems,
        submissions: perfSubmissions,
        runtime: perfRuntime,
        xp: perfXp,
      },
      skills,
      recent,
      insights,
      milestones,
      allTimeTotals: {
        problemsSolved: allTime.problemsSolved,
        submissions: allTime.totalSubmissions,
        successful: allTime.successful,
        failed: allTime.failed,
        points: allTime.points,
        profileXp: profile?.xp ?? 0,
      },
    };
  },
});

/** Admin analytics: platform-wide aggregated data for admin dashboard. */
export const getAdminAnalytics = query({
  args: {
    range: v.optional(v.union(v.literal("7d"), v.literal("30d"), v.literal("3m"), v.literal("6m"), v.literal("1y"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    // Verify admin role
    const roleRow = await ctx.db
      .query("roles")
      .withIndex("by_userId", (q) => q.eq("userId", callerId))
      .unique();

    const caller = await ctx.db.get(callerId);
    const superAdminEmails = (process.env.SUPER_ADMINS ?? "gb8585438@gmail.com")
      .split(",")
      .map((e: string) => e.trim().toLowerCase());

    const isSuperAdmin = caller?.email && superAdminEmails.includes(caller.email.toLowerCase());
    const isAdmin = roleRow && (roleRow.role === "ADMIN" || roleRow.role === "SUPER_ADMIN");

    if (!isAdmin && !isSuperAdmin) {
      throw new Error("Insufficient permissions");
    }

    const range = args.range ?? "30d";
    const days = RANGE_DAYS[range];
    const cutoff = range === "all" ? 0 : Date.now() - days * DAY;

    // Gather all data
    const allUsers = await ctx.db.query("users").collect();
    const allExecutions = await ctx.db.query("executions").collect();
    const allProblems = await ctx.db.query("problems").collect();
    const allSubmissions = await ctx.db.query("judgeSubmissions").collect();

    // Filter by date range
    const recentExecutions = allExecutions.filter((e) => (e.startedAt ?? 0) >= cutoff);
    const recentSubmissions = allSubmissions.filter((s) => (s.createdAt ?? 0) >= cutoff);

    // User growth over time
    const userGrowth: Record<string, number> = {};
    allUsers.forEach((u) => {
      const key = dayKey(u._creationTime);
      userGrowth[key] = (userGrowth[key] ?? 0) + 1;
    });

    // Cumulative user growth
    const sortedDays = Object.keys(userGrowth).sort();
    let cumulative = 0;
    const cumulativeGrowth = sortedDays.map((day) => {
      cumulative += userGrowth[day];
      return { date: day, count: cumulative };
    });

    // Daily submissions
    const dailySubmissions: Record<string, number> = {};
    recentSubmissions.forEach((s) => {
      const key = dayKey(s.createdAt);
      dailySubmissions[key] = (dailySubmissions[key] ?? 0) + 1;
    });

    // Language usage
    const languageUsage: Record<string, number> = {};
    recentExecutions.forEach((e) => {
      languageUsage[e.language] = (languageUsage[e.language] ?? 0) + 1;
    });

    // Execution trends
    const executionTrends: Record<string, { total: number; success: number; failed: number }> = {};
    recentExecutions.forEach((e) => {
      const key = dayKey(e.startedAt);
      if (!executionTrends[key]) executionTrends[key] = { total: 0, success: 0, failed: 0 };
      executionTrends[key].total += 1;
      if (e.status === "success") executionTrends[key].success += 1;
      else executionTrends[key].failed += 1;
    });

    // Problem popularity
    const problemPopularity: Record<string, number> = {};
    recentSubmissions.forEach((s) => {
      const pid = s.problemId;
      problemPopularity[pid] = (problemPopularity[pid] ?? 0) + 1;
    });

    // Retention (users active in last 7 days / total users)
    const now = Date.now();
    const activeUserIds = new Set(
      allExecutions
        .filter((e) => (e.startedAt ?? 0) >= now - 7 * DAY)
        .map((e) => e.userId)
    );
    const retention = allUsers.length > 0 ? Math.round((activeUserIds.size / allUsers.length) * 100) : 0;

    // Success rate
    const totalCompleted = recentExecutions.filter((e) => TERMINAL_STATUSES.has(e.status)).length;
    const successful = recentExecutions.filter((e) => e.status === "success").length;
    const successRate = totalCompleted > 0 ? Math.round((successful / totalCompleted) * 100) : 0;

    return {
      range,
      kpis: {
        totalUsers: allUsers.length,
        activeUsers: activeUserIds.size,
        totalProblems: allProblems.length,
        totalSubmissions: allSubmissions.length,
        totalExecutions: allExecutions.length,
        successRate,
        retention,
      },
      charts: {
        userGrowth: cumulativeGrowth.slice(-30),
        dailySubmissions: Object.entries(dailySubmissions)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        languageUsage: Object.entries(languageUsage)
          .map(([language, count]) => ({ language, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        executionTrends: Object.entries(executionTrends)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        problemPopularity: Object.entries(problemPopularity)
          .map(([problemId, count]) => ({ problemId, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      },
    };
  },
});