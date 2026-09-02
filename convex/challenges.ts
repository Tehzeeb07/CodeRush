import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";

/**
 * Hackathon sub-categories (Admin Panel → Challenges → Hackathons).
 * Challenges created through the admin flow store `category = "hackathon"`
 * plus one of these sub-categories so they appear in the matching public
 * section (AI / Coding / Web Development).
 */
export const HACKATHON_CATEGORIES = ["ai", "coding", "web"] as const;
export type HackathonCategory = (typeof HACKATHON_CATEGORIES)[number];

export const list = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("coding"),
        v.literal("game"),
        v.literal("web"),
        v.literal("ai"),
        v.literal("creative"),
        v.literal("innovation"),
        v.literal("speed"),
        v.literal("hackathon")
      )
    ),
    hackathonCategory: v.optional(
      v.union(
        v.literal("ai"),
        v.literal("coding"),
        v.literal("web")
      )
    ),
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, { category, hackathonCategory, difficulty }) => {
    let challenges;

    if (category) {
      challenges = await ctx.db
        .query("challenges")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
    } else if (hackathonCategory) {
      challenges = await ctx.db
        .query("challenges")
        .withIndex("by_hackathonCategory", (q) =>
          q.eq("hackathonCategory", hackathonCategory)
        )
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

/**
 * ADMIN+:
 * List every challenge (including hackathon challenges) with optional
 * search + hackathon sub-category filter. Newest first.
 */
export const listChallengesAdmin = query({
  args: {
    search: v.optional(v.string()),
    hackathonCategory: v.optional(
      v.union(
        v.literal("ai"),
        v.literal("coding"),
        v.literal("web")
      )
    ),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    let all = await ctx.db.query("challenges").collect();

    const search = args.search?.trim().toLowerCase() ?? "";
    if (search) {
      all = all.filter(
        (c) =>
          (c.title ?? "").toLowerCase().includes(search) ||
          (c.description ?? "").toLowerCase().includes(search) ||
          (c.hackathonCategory ?? "").toLowerCase().includes(search)
      );
    }

    if (args.hackathonCategory) {
      all = all.filter((c) => c.hackathonCategory === args.hackathonCategory);
    }

    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * ADMIN+:
 * Create a new hackathon challenge. The admin picks one of the three
 * hackathon sub-categories (ai | coding | web); the challenge is stored
 * with `category = "hackathon"` so it lands in the correct public section.
 */
export const createChallenge = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    hackathonCategory: v.union(
      v.literal("ai"),
      v.literal("coding"),
      v.literal("web")
    ),
    difficulty: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    rules: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    theme: v.optional(v.string()),
    xpReward: v.number(),
    /** Web Development starter templates (used when hackathonCategory = "web"). */
    starterHtml: v.optional(v.string()),
    starterCss: v.optional(v.string()),
    starterJavascript: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    if (!args.title.trim()) throw new Error("Challenge title is required");
    if (!args.description.trim()) throw new Error("Description is required");

    const now = Date.now();

    const challengeId = await ctx.db.insert("challenges", {
      title: args.title.trim(),
      description: args.description.trim(),
      category: "hackathon",
      hackathonCategory: args.hackathonCategory,
      difficulty: args.difficulty,
      theme: args.theme?.trim() || undefined,
      xpReward: args.xpReward,
      startDate: args.startDate,
      endDate: args.endDate,
      rules: args.rules?.trim() || undefined,
      bannerUrl: args.bannerUrl?.trim() || undefined,
      starterHtml: args.starterHtml?.trim() || undefined,
      starterCss: args.starterCss?.trim() || undefined,
      starterJavascript: args.starterJavascript?.trim() || undefined,
      createdBy: callerId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "challenge_created",
      target: "challenge",
      targetId: challengeId,
      details: args.title,
      ip: undefined,
      createdAt: now,
    });

    return challengeId;
  },
});

/**
 * ADMIN+:
 * Update an existing challenge (title, description, category, difficulty,
 * dates, rules, banner, theme, xp reward).
 */
export const updateChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
    title: v.string(),
    description: v.string(),
    hackathonCategory: v.union(
      v.literal("ai"),
      v.literal("coding"),
      v.literal("web")
    ),
    difficulty: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    rules: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    theme: v.optional(v.string()),
    xpReward: v.number(),
    /** Web Development starter templates (used when hackathonCategory = "web"). */
    starterHtml: v.optional(v.string()),
    starterCss: v.optional(v.string()),
    starterJavascript: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const existing = await ctx.db.get(args.challengeId);
    if (!existing) throw new Error("Challenge not found");

    if (!args.title.trim()) throw new Error("Challenge title is required");
    if (!args.description.trim()) throw new Error("Description is required");

    const now = Date.now();

    await ctx.db.patch(args.challengeId, {
      title: args.title.trim(),
      description: args.description.trim(),
      category: "hackathon",
      hackathonCategory: args.hackathonCategory,
      difficulty: args.difficulty,
      theme: args.theme?.trim() || undefined,
      xpReward: args.xpReward,
      startDate: args.startDate,
      endDate: args.endDate,
      rules: args.rules?.trim() || undefined,
      bannerUrl: args.bannerUrl?.trim() || undefined,
      starterHtml: args.starterHtml?.trim() || undefined,
      starterCss: args.starterCss?.trim() || undefined,
      starterJavascript: args.starterJavascript?.trim() || undefined,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "challenge_updated",
      target: "challenge",
      targetId: args.challengeId,
      details: args.title,
      ip: undefined,
      createdAt: now,
    });

    return args.challengeId;
  },
});

/**
 * ADMIN+:
 * Delete a challenge and its related submissions (cascade) to avoid
 * dangling references.
 */
export const deleteChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const existing = await ctx.db.get(args.challengeId);
    if (!existing) throw new Error("Challenge not found");

    // Cascade-delete submissions tied to this challenge.
    const relatedSubs = await ctx.db
      .query("submissions")
      .withIndex("by_challenge", (q) => q.eq("challengeId", args.challengeId))
      .collect();
    for (const sub of relatedSubs) {
      await ctx.db.delete(sub._id);
    }

    await ctx.db.delete(args.challengeId);

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "challenge_deleted",
      target: "challenge",
      targetId: args.challengeId,
      details: existing.title,
      ip: undefined,
      createdAt: Date.now(),
    });
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