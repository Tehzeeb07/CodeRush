/**
 * Achievements â€” badge catalogue and user achievement tracking.
 */
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";

/** Seeded achievement definitions. */
const DEFAULT_ACHIEVEMENTS = [
  { code: "first_submission", name: "First Submission", description: "Submit your first solution", icon: "◑", category: "beginner", criteriaType: "submissions" as const, criteriaValue: 1, xpReward: 10, isActive: true },
  { code: "ten_solved", name: "10 Problems Solved", description: "Solve 10 problems", icon: "ðŸ”¥", category: "milestone", criteriaType: "problems_solved" as const, criteriaValue: 10, xpReward: 50, isActive: true },
  { code: "hundred_executions", name: "100 Executions", description: "Run code 100 times", icon: "âš¡", category: "milestone", criteriaType: "executions" as const, criteriaValue: 100, xpReward: 50, isActive: true },
  { code: "top_10", name: "Top 10 Leaderboard", description: "Reach rank #10 or higher", icon: "ðŸ‘‘", category: "competitive", criteriaType: "leaderboard_rank" as const, criteriaValue: 10, xpReward: 100, isActive: true },
];

export const listAchievements = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("achievements")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const listAllAchievementsAdmin = query({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }
    return await ctx.db.query("achievements").order("desc").collect();
  },
});

export const getUserAchievements = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const targetId = args.userId ?? callerId;
    return await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", targetId))
      .collect();
  },
});

export const createAchievement = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    category: v.string(),
    criteriaType: v.union(v.literal("submissions"), v.literal("problems_solved"), v.literal("executions"), v.literal("leaderboard_rank"), v.literal("points")),
    criteriaValue: v.number(),
    xpReward: v.number(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const existing = await ctx.db
      .query("achievements").withIndex("by_code", (q) => q.eq("code", args.code)).unique();
    if (existing) throw new Error("Achievement code already exists");

    return await ctx.db.insert("achievements", {
      ...args,
      isActive: args.isActive ?? true,
    });
  },
});

export const updateAchievement = mutation({
  args: {
    id: v.id("achievements"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    category: v.optional(v.string()),
    criteriaType: v.optional(v.union(v.literal("submissions"), v.literal("problems_solved"), v.literal("executions"), v.literal("leaderboard_rank"), v.literal("points"))),
    criteriaValue: v.optional(v.number()),
    xpReward: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return { ok: true };
  },
});

export const deleteAchievement = mutation({
  args: { id: v.id("achievements") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    // Cascade delete user achievements
    const userAchievements = await ctx.db
      .query("userAchievements")
      .filter((q) => q.eq(q.field("achievementId"), args.id))
      .collect();
    for (const ua of userAchievements) await ctx.db.delete(ua._id);

    await ctx.db.delete(args.id);
    return { ok: true };
  },
});

export const seedAchievements = mutation({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const existing = await ctx.db.query("achievements").collect();
    if (existing.length > 0) return { alreadySeeded: true };

    for (const a of DEFAULT_ACHIEVEMENTS) {
      await ctx.db.insert("achievements", { ...a, isActive: true });
    }
    return { seeded: DEFAULT_ACHIEVEMENTS.length };
  },
});
