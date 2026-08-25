import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const toggle = mutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, { submissionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("likes")
      .withIndex("by_user_and_submission", (q) =>
        q.eq("userId", userId).eq("submissionId", submissionId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false };
    } else {
      await ctx.db.insert("likes", { submissionId, userId, createdAt: Date.now() });
      return { liked: true };
    }
  },
});

export const countForSubmission = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, { submissionId }) => {
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_submission", (q) => q.eq("submissionId", submissionId))
      .collect();
    return likes.length;
  },
});

export const hasLiked = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, { submissionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const existing = await ctx.db
      .query("likes")
      .withIndex("by_user_and_submission", (q) =>
        q.eq("userId", userId).eq("submissionId", submissionId)
      )
      .unique();
    return existing !== null;
  },
});