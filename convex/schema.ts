import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // authTables provides: users, authSessions, authAccounts, authRefreshTokens, etc.
  ...authTables,

  // Extend the built-in `users` table's shape via a separate profile table
  // keyed by userId — keeps auth internals untouched and easy to upgrade.
  profiles: defineTable({
    userId: v.id("users"),
    username: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    xp: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_username", ["username"]),
});