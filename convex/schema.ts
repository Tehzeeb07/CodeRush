import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  /**
   * RBAC role assignments.
   *
   * Roles are resolved with this priority:
   *   1. SUPER_ADMIN if the user's email is in the SUPER_ADMINS env list
   *   2. Otherwise the role stored in this table
   *   3. Fallback USER
   *
   * role is never writable from the client — mutations live in roles.ts
   * and are gated server-side.
   */
  roles: defineTable({
    userId: v.id("users"),
    role: v.union(
      v.literal("USER"),
      v.literal("ADMIN"),
      v.literal("SUPER_ADMIN")
    ),
    /** Who granted this role (null = automatic / bootstrap). */
    assignedBy: v.optional(v.id("users")),
    /** Human-readable reason for auditability. */
    assignedAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  /**
   * Append-only audit trail. Every privileged admin action writes a row.
   */
  auditLogs: defineTable({
    adminId: v.id("users"),
    adminEmail: v.string(),
    action: v.string(),
    target: v.optional(v.string()),
    targetId: v.optional(v.string()),
    details: v.optional(v.string()),
    ip: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_admin", ["adminId"]),

  /**
   * Content reports submitted by users (users, showcase posts, comments,
   * judge submissions).
   */
  reports: defineTable({
    reporterId: v.id("users"),
    targetType: v.union(
      v.literal("user"),
      v.literal("showcase"),
      v.literal("comment"),
      v.literal("submission")
    ),
    targetId: v.string(),
    reason: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("dismissed"),
      v.literal("resolved")
    ),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_targetType", ["targetType"])
    .index("by_createdAt", ["createdAt"]),

  /**
   * Platform-wide announcements authored by admins.
   */
  announcements: defineTable({
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("maintenance"),
      v.literal("update"),
      v.literal("contest")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    /**
     * Canonical publish flag. `isActive` is kept for backwards compatibility
     * and is always mirrored: published === isActive === live announcement.
     * Draft announcements have published === false.
     */
    published: v.optional(v.boolean()),
    publishedAt: v.number(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_isActive", ["isActive"])
    .index("by_published", ["published"])
    .index("by_publishedAt", ["publishedAt"]),

  /**
   * User-scoped notifications (announcements, achievements, system).
   */
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("announcement"),
      v.literal("achievement"),
      v.literal("system")
    ),
    title: v.string(),
    message: v.string(),
    /**
     * Set when the notification was generated from an announcement.
     * Used both for the details-page link and to guarantee that publishing
     * the same announcement twice never creates duplicate notifications.
     */
    announcementId: v.optional(v.id("announcements")),
    /** The originating announcement's type (info/warning/...), for icons. */
    announcementType: v.optional(
      v.union(
        v.literal("info"),
        v.literal("warning"),
        v.literal("maintenance"),
        v.literal("update"),
        v.literal("contest")
      )
    ),
    read: v.boolean(),
    link: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_createdAt", ["userId", "createdAt"])
    .index("by_user_read", ["userId", "read"])
    .index("by_user_type", ["userId", "type"])
    .index("by_announcement", ["announcementId"]),

  /**
   * Achievement definitions — the "badge catalogue".
   */
  achievements: defineTable({
    code: v.string(),
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    category: v.string(),
    criteriaType: v.union(
      v.literal("submissions"),
      v.literal("problems_solved"),
      v.literal("executions"),
      v.literal("leaderboard_rank"),
      v.literal("points")
    ),
    criteriaValue: v.number(),
    xpReward: v.number(),
    isActive: v.boolean(),
  })
    .index("by_code", ["code"]),

  /**
   * Tracks which user has earned which achievement and when.
   */
  userAchievements: defineTable({
    userId: v.id("users"),
    achievementId: v.id("achievements"),
    earnedAt: v.number(),
    progress: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_achievement", ["userId", "achievementId"]),

  /**
   * Key-value platform settings — only SUPER_ADMIN may write.
   */
  settings: defineTable({
    key: v.string(),
    value: v.any(),
    type: v.union(
      v.literal("string"),
      v.literal("number"),
      v.literal("boolean"),
      v.literal("json")
    ),
    description: v.optional(v.string()),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"]),

  likes: defineTable({
    submissionId: v.id("submissions"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_submission", ["submissionId"])
    .index("by_user_and_submission", ["userId", "submissionId"]),

    profiles: defineTable({
    userId: v.id("users"),
    username: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    xp: v.number(),
    /** Admin-managed account status flags. */
    isSuspended: v.optional(v.boolean()),
    isBanned: v.optional(v.boolean()),
    suspendedAt: v.optional(v.number()),
    bannedAt: v.optional(v.number()),
    suspendedReason: v.optional(v.string()),
    bannedReason: v.optional(v.string()),
    suspendedBy: v.optional(v.id("users")),
    bannedBy: v.optional(v.id("users")),
  })
    .index("by_userId", ["userId"])
    .index("by_username", ["username"])
    .index("by_isBanned", ["isBanned"])
    .index("by_isSuspended", ["isSuspended"]),

  teams: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"]),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted")),
    requestedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_and_user", ["teamId", "userId"]),
    
  follows: defineTable({
    followerId: v.id("users"), // the person doing the following
    followingId: v.id("users"), // the person being followed
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_follower_and_following", ["followerId", "followingId"]),
    
    submissions: defineTable({
    challengeId: v.id("challenges"),
    userId: v.id("users"),
    teamId: v.optional(v.id("teams")),
    /** Project submissions (GitHub link flow) — required for those rows. */
    repoUrl: v.optional(v.string()),
    demoUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    createdAt: v.number(),
    /** Showcase moderation flags (admin-managed). */
    isFeatured: v.optional(v.boolean()),
    isHidden: v.optional(v.boolean()),
    featuredAt: v.optional(v.number()),
    /**
     * Web Development challenge submissions (category/hackathonCategory = web).
     * `submissionType = "web"` marks rows created from the in-browser editor;
     * rows without it are the original GitHub-link project submissions.
     */
    submissionType: v.optional(v.union(v.literal("project"), v.literal("web"))),
    /** Web editor code, present on `submissionType = "web"` rows. */
    htmlCode: v.optional(v.string()),
    cssCode: v.optional(v.string()),
    javascriptCode: v.optional(v.string()),
    /** Web submission lifecycle — pending → approved | rejected. */
    status: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
    ),
    submittedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    reviewNote: v.optional(v.string()),
    /** XP granted once when a web submission is approved (idempotency guard). */
    xpAwarded: v.optional(v.number()),
  })
    .index("by_challenge", ["challengeId"])
    .index("by_user", ["userId"])
    .index("by_featured", ["isFeatured"])
    .index("by_team", ["teamId"])
    .index("by_status", ["status"])
    .index("by_submissionType", ["submissionType"])
    .index("by_user_challenge", ["userId", "challengeId"]),

  challenges: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("coding"),
      v.literal("game"),
      v.literal("web"),
      v.literal("ai"),
      v.literal("creative"),
      v.literal("innovation"),
      v.literal("speed"),
      v.literal("hackathon")
    ),
    /**
     * Hackathon sub-category. Challenges created through the Admin Panel
     * Challenges → Hackathons flow set `category = "hackathon"` plus one of
     * these sub-categories so they land in the correct public section:
     *   AI / Coding / Web Development.
     */
    hackathonCategory: v.optional(
      v.union(
        v.literal("ai"),
        v.literal("coding"),
        v.literal("web")
      )
    ),
    difficulty: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    theme: v.optional(v.string()),
    xpReward: v.number(),
    deadline: v.optional(v.number()),
    /** Hackathon start / end timestamps (ms since epoch). */
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    /** Rules or requirements for the challenge. */
    rules: v.optional(v.string()),
    /** Optional image/banner URL shown on the public challenge card/page. */
    bannerUrl: v.optional(v.string()),
    /** Admin who created the challenge. */
    createdBy: v.optional(v.id("users")),
    /**
     * Web Development challenge starter templates. When set, the Web Editor
     * opens with these instead of the generic placeholder code.
     */
    starterHtml: v.optional(v.string()),
    starterCss: v.optional(v.string()),
    starterJavascript: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_hackathonCategory", ["hackathonCategory"])
    .index("by_difficulty", ["difficulty"]),

  /**
   * Per-user saved drafts for Web Development challenges (in-browser editor).
   * A draft exists when the user clicked "Save" (or auto-saved) inside
   * /challenges/[id]/editor. One row per user + challenge. `_creationTime`
   * doubles as the draft's createdAt.
   */
  webProjectDrafts: defineTable({
    challengeId: v.id("challenges"),
    userId: v.id("users"),
    htmlCode: v.string(),
    cssCode: v.string(),
    javascriptCode: v.string(),
    updatedAt: v.number(),
  })
    .index("by_user_challenge", ["userId", "challengeId"])
    .index("by_challenge", ["challengeId"]),

  /**
   * Code execution records. One document per run submitted through the
   * editor. Powers execution history, user statistics and leaderboards.
   *
   * Status lifecycle mirrors the execution API results:
   *   queued -> running -> success | runtime_error | compilation_error
   *                     | timeout   | failed         | internal_error
   */
  executions: defineTable({
    userId: v.id("users"),
    /** Client-facing correlation id (UUID) for log streaming. */
    executionId: v.string(),
    language: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("success"),
      v.literal("runtime_error"),
      v.literal("compilation_error"),
      v.literal("timeout"),
      v.literal("failed"),
      v.literal("internal_error"),
      v.literal("stopped")
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    exitCode: v.optional(v.number()),
    executionTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    /** Optional challenge/problem reference for future problem support. */
    problemId: v.optional(v.string()),
    /** Points awarded for this submission (denormalized for aggregations). */
    pointsAwarded: v.optional(v.number()),
    /**
     * XP awarded for this execution (denormalized for idempotency).
     * Once set, this execution cannot award XP again.
     */
    xpAwarded: v.optional(v.number()),
  })
    .index("by_executionId", ["executionId"])
    .index("by_user", ["userId"])
    .index("by_user_startedAt", ["userId", "startedAt"])
    .index("by_user_problem", ["userId", "problemId"])
    .index("by_status", ["status"])
    .index("by_startedAt", ["startedAt"]),

  /**
   * Terminal logs captured during an execution (stdout/stderr/stdin/system).
   */
  executionLogs: defineTable({
    executionId: v.id("executions"),
    type: v.union(
      v.literal("stdout"),
      v.literal("stderr"),
      v.literal("stdin"),
      v.literal("system")
    ),
    data: v.string(),
    sequence: v.number(),
    timestamp: v.number(),
  }).index("by_execution", ["executionId"]),

  /**
   * Denormalized per-user coding statistics kept in sync exclusively by
   * secure server-side mutations (see convex/leaderboard.ts). Clients can
   * only read these — never write points/ranks directly.
   *
   * xp and points are kept in sync: both represent the user's score,
   * with xp being the source of truth for display and points for ranking.
   */
  userStats: defineTable({
    userId: v.id("users"),
    points: v.number(),
    /** XP is synchronized with points - both represent the same score. */
    xp: v.optional(v.number()),
    totalSubmissions: v.number(),
    successfulSubmissions: v.number(),
    failedSubmissions: v.number(),
    problemsSolved: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  /**
   * User-private bookmarks of code snippets (and, later, problems).
   * Uniqueness strategy: userId + contentId when a stable content id
   * exists, otherwise an exact-match guard inside createBookmark.
   */
  bookmarks: defineTable({
    userId: v.id("users"),
    /** Stable identifier of external content, when bookmarked from a page. */
    contentId: v.optional(v.string()),
    /** Optional future problem/challenge reference. */
    problemId: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    code: v.string(),
    language: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_content", ["userId", "contentId"]),

  /**
   * Competitive-programming problems judged against test cases.
   *
   * IMPORTANT: `testCases` (including expected outputs for hidden tests)
   * must NEVER be exposed through a public query that omits projection —
   * see convex/problems.ts where only sanitized projections are public
   * and full data is gated behind the judge internal secret.
   */
    problems: defineTable({
    slug: v.string(),
    title: v.string(),
    difficulty: v.union(
      v.literal("easy"), v.literal("medium"), v.literal("hard")),
    tags: v.array(v.string()),
    description: v.string(),
    examples: v.array(
      v.object({
        id: v.string(),
        input: v.string(),
        output: v.string(),
        explanation: v.optional(v.string()),
      })),
    constraints: v.array(v.string()),
    timeLimitMs: v.number(),
    memoryLimitMb: v.number(),
    testCases: v.array(
      v.object({
        id: v.string(),
        input: v.string(),
        expectedOutput: v.string(),
        isSample: v.boolean(),
      })),
    /** Admin-managed lifecycle fields. */
    published: v.optional(v.boolean()),
    archived: v.optional(v.boolean()),
    category: v.optional(v.string()),
    /** Per-language starter code templates, e.g. { cpp: "...", python: "..." }. */
    starterCode: v.optional(v.any()),
    inputFormat: v.optional(v.string()),
    outputFormat: v.optional(v.string()),
    hints: v.optional(v.array(v.string())),
    editorial: v.optional(v.string()),
    supportedLanguages: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    }).index("by_slug", ["slug"])
    .index("by_published", ["published"])
    .index("by_createdAt", ["createdAt"]),

  /**
   * Judge submissions created server-side through /api/judge with the
   * caller's authenticated identity. Never written directly by clients.
   */
  judgeSubmissions: defineTable({
    userId: v.id("users"),
    problemId: v.id("problems"),
    problemSlug: v.string(),
    language: v.string(),
    code: v.string(),
    outcome: v.union(
      v.literal("queued"),
      v.literal("accepted"),
      v.literal("wrong_answer"),
      v.literal("compilation_error"),
      v.literal("runtime_error"),
      v.literal("time_limit_exceeded"),
      v.literal("memory_limit_exceeded"),
      v.literal("internal_error"),
    ),
    passedCount: v.optional(v.number()),
    totalCount: v.optional(v.number()),
    runtimeMs: v.optional(v.number()),
    memoryKb: v.optional(v.number()),
    /** Server-side ids of the test cases this submission passed (audit). */
    passedTestCaseIds: v.optional(v.array(v.string())),
    /** XP actually granted for this submission (set once — idempotency guard). */
    xpAwarded: v.optional(v.number()),
    /** XP-per-test-case rate that was in effect when this was judged. */
    xpPerTestSnapshot: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user_problem_created", ["userId", "problemId", "createdAt"])
    .index("by_user_created", ["userId", "createdAt"])
        .index("by_problem", ["problemId"])
    .index("by_outcome", ["outcome"])
    .index("by_createdAt", ["createdAt"]),
  /**
   * Per-user progress for every problem they have submitted to (§15).
   *
   * Written exclusively by the trusted XP/progress mutation after the judge
   * produces its verdict. Clients may read their own rows but can never
   * write them directly.
   */
  problemProgress: defineTable({
    userId: v.id("users"),
    problemId: v.id("problems"),
    problemSlug: v.string(),
    /** "attempted" = submitted but not fully accepted yet. */
    status: v.union(v.literal("attempted"), v.literal("solved")),
    bestPassedCount: v.number(),
    totalTestCount: v.number(),
    attempts: v.number(),
    firstAttemptAt: v.number(),
    firstSolvedAt: v.optional(v.number()),
    /** Total XP ever awarded for this problem (already farm-protected). */
    totalXpAwarded: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_problem", ["userId", "problemId"])
    .index("by_problem", ["problemId"])
    .index("by_user_updatedAt", ["userId", "updatedAt"]),

  /**
   * Append-only XP ledger (§12–§14).
   *
   * Every XP grant is a row here. `uniqueKey` makes awards idempotent:
   * `xp:<userId>:<problemId>:<testCaseId>` guarantees a test case can only
   * ever award XP once per user per problem, so re-submitting the same
   * solution (or brute-forcing variants) cannot farm XP.
   */
  xpLedger: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    reason: v.union(
      v.literal("test_case_passed"),
      v.literal("achievement"),
      v.literal("admin_grant"),
    ),
    problemId: v.optional(v.id("problems")),
    problemSlug: v.optional(v.string()),
    submissionId: v.optional(v.id("judgeSubmissions")),
    testCaseId: v.optional(v.string()),
    uniqueKey: v.string(),
    createdAt: v.number(),
  })
    .index("by_unique_key", ["uniqueKey"])
    .index("by_user_createdAt", ["userId", "createdAt"])
    .index("by_user_problem", ["userId", "problemId"]),
});