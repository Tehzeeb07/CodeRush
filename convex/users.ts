import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Call this once, right after a successful signUp, from the client.
 * Convex Auth creates the `users` row itself (email/password) — this
 * attaches the CodeRush-specific profile (username, xp, ...) to it.
 */
export const createProfile = mutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (!USERNAME_RE.test(username)) {
      throw new Error(
        "Username must be 3-20 characters: letters, numbers, underscores only"
      );
    }

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (existingProfile) return existingProfile._id; // idempotent

    const taken = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (taken) throw new Error("Username is already taken");

    return await ctx.db.insert("profiles", {
      userId,
      username,
      xp: 0,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const setAvatar = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found");

    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Upload failed");

    await ctx.db.patch(profile._id, { avatarUrl: url });
    return url;
  },
});

export const usernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    if (!USERNAME_RE.test(username)) return false;
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    return existing === null;
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const authUser = await ctx.db.get(userId);
    if (!authUser) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    return {
      id: userId,
      email: authUser.email,
      username: profile?.username ?? null,
      bio: profile?.bio ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      xp: profile?.xp ?? 0,
      profileComplete: profile !== null,
    };
  },
});

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!profile) return null;

    const authUser = await ctx.db.get(profile.userId);
    if (!authUser) return null;

    return {
      userId: profile.userId,
      username: profile.username,
      bio: profile.bio ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      xp: profile.xp,
    };
  },
});

export const searchByUsername = query({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    if (!query.trim()) return [];

    const profiles = await ctx.db.query("profiles").collect();
    const q = query.toLowerCase();

    return profiles
      .filter((p) => p.username.toLowerCase().includes(q))
      .slice(0, 10)
      .map((p) => ({
        username: p.username,
        avatarUrl: p.avatarUrl ?? null,
        xp: p.xp,
      }));
  },
});

export const updateProfile = mutation({
  args: {
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("Profile not found — call createProfile first");

    await ctx.db.patch(profile._id, {
      ...(args.bio !== undefined ? { bio: args.bio } : {}),
      ...(args.avatarUrl !== undefined ? { avatarUrl: args.avatarUrl } : {}),
    });
  },
});