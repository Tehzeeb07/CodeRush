import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    challengeId: v.id("challenges"),
    repoUrl: v.string(),
    demoUrl: v.optional(v.string()),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (!args.repoUrl.trim()) {
      throw new Error("A GitHub repo URL is required");
    }
    if (!args.description.trim()) {
      throw new Error("A description is required");
    }

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");

    return await ctx.db.insert("submissions", {
      ...args,
      userId,
      createdAt: Date.now(),
    });
  },
});

// All submissions for one challenge, newest first — used on the challenge
// details page to show "what people built".
export const listForChallenge = query({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, { challengeId }) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_challenge", (q) => q.eq("challengeId", challengeId))
      .collect();

    // Attach the submitter's username to each one
    const withAuthors = await Promise.all(
      submissions.map(async (s) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", s.userId))
          .unique();
        return { ...s, username: profile?.username ?? "unknown" };
      })
    );

    return withAuthors.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// The current user's own submissions, across all challenges — used later
// for a "my submissions" view.
export const myForChallenge = query({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, { challengeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_challenge", (q) => q.eq("challengeId", challengeId))
      .collect();

    return submissions
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});