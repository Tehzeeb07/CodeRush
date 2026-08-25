import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

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
});