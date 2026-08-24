import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    category: v.optional(v.string()),
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, { category, difficulty }) => {
    let challenges;

    if (category) {
      challenges = await ctx.db
        .query("challenges")
        .withIndex("by_category", (q) => q.eq("category", category as any))
        .collect();
    } else {
      challenges = await ctx.db.query("challenges").collect();
    }

    if (difficulty) {
      challenges = challenges.filter((c) => c.difficulty === difficulty);
    }

    // Newest first
    return challenges.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id("challenges") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Temporary — lets us create test challenges from the Convex dashboard's
// "Run function" panel until there's an admin UI.
export const create = mutation({
  args: {
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
  },
    handler: async (ctx, args) => {
        return await ctx.db.insert("challenges", {
      ...args,
      createdAt: Date.now(),
    });
  },
});