import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

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
  })
    .index("by_userId", ["userId"])
    .index("by_username", ["username"]),

  submissions: defineTable({
    challengeId: v.id("challenges"),
    userId: v.id("users"),
    repoUrl: v.string(),
    demoUrl: v.optional(v.string()),
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_challenge", ["challengeId"])
    .index("by_user", ["userId"]),

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
    difficulty: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    theme: v.optional(v.string()),
    xpReward: v.number(),
    deadline: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_difficulty", ["difficulty"]),

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
  })
    .index("by_executionId", ["executionId"])
    .index("by_user", ["userId"])
    .index("by_user_startedAt", ["userId", "startedAt"])
    .index("by_user_problem", ["userId", "problemId"]),

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
   */
  userStats: defineTable({
    userId: v.id("users"),
    points: v.number(),
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
});