import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const toggle = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, { targetUserId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (userId === targetUserId) throw new Error("You can't follow yourself");

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", userId).eq("followingId", targetUserId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { following: false };
    } else {
      await ctx.db.insert("follows", {
        followerId: userId,
        followingId: targetUserId,
        createdAt: Date.now(),
      });
      return { following: true };
    }
  },
});

export const isFollowing = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, { targetUserId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", userId).eq("followingId", targetUserId)
      )
      .unique();
    return existing !== null;
  },
});

export const counts = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, { targetUserId }) => {
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", targetUserId))
      .collect();
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", targetUserId))
      .collect();

    return { followers: followers.length, following: following.length };
  },
});

export const followersList = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, { targetUserId }) => {
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", targetUserId))
      .collect();

    return await Promise.all(
      rows.map(async (r) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", r.followerId))
          .unique();
        return { username: profile?.username ?? "unknown", avatarUrl: profile?.avatarUrl ?? null };
      })
    );
  },
});

export const followingList = query({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, { targetUserId }) => {
    const rows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", targetUserId))
      .collect();

    return await Promise.all(
      rows.map(async (r) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", r.followingId))
          .unique();
        return { username: profile?.username ?? "unknown", avatarUrl: profile?.avatarUrl ?? null };
      })
    );
  },
});