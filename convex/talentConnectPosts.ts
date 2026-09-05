/**
 * Talent Connect — posts.
 *
 * Admins/companies publish real-world projects and technical requirements;
 * talented developers discover them and submit professional proposals.
 * This module owns the `talentConnectPosts` table lifecycle (draft →
 * published → unpublished → archived) and every admin-gated mutation
 * writes an entry to the shared `auditLogs` trail.
 *
 * Completely independent from Coding Problems and Web Development
 * Challenges.
 */

import { v } from "convex/values";
import { query, mutation, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";
import type { Id } from "./_generated/dataModel";

/* ================================================================
   CATEGORIES / LEVELS
   ================================================================ */

export const TALENT_CONNECT_CATEGORIES = [
  "technical_solution",
  "project_collaboration",
  "startup_idea",
  "freelance_project",
  "job_opportunity",
  "innovation_challenge",
  "open_technical_problem",
  "developer_recruitment",
] as const;
export type TalentConnectCategory = (typeof TALENT_CONNECT_CATEGORIES)[number];

export const DIFFICULTY_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;
export type TalentConnectDifficulty = (typeof DIFFICULTY_LEVELS)[number];

export const EXPERIENCE_LEVELS = [
  "beginner",
  "intermediate",
  "experienced",
  "senior",
  "any_level",
] as const;
export type TalentConnectExperience = (typeof EXPERIENCE_LEVELS)[number];

const categoryValidator = v.union(
  v.literal("technical_solution"),
  v.literal("project_collaboration"),
  v.literal("startup_idea"),
  v.literal("freelance_project"),
  v.literal("job_opportunity"),
  v.literal("innovation_challenge"),
  v.literal("open_technical_problem"),
  v.literal("developer_recruitment")
);

const difficultyValidator = v.union(
  v.literal("beginner"),
  v.literal("intermediate"),
  v.literal("advanced"),
  v.literal("expert")
);

const experienceValidator = v.union(
  v.literal("beginner"),
  v.literal("intermediate"),
  v.literal("experienced"),
  v.literal("senior"),
  v.literal("any_level")
);

/* ================================================================
   SHARED HELPERS
   ================================================================ */

/** Throws when the caller is not an authenticated ADMIN/SUPER_ADMIN. */
async function requireAdmin(ctx: QueryCtx) {
  const callerId = await getAuthUserId(ctx);
  if (!callerId) throw new Error("Not authenticated");

  const caller = await resolveIdentity(ctx, callerId);
  if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
    throw new Error("Insufficient permissions");
  }
  return { callerId, caller };
}

/** Number of proposals submitted for each of the given posts. */
async function submissionCounts(
  ctx: QueryCtx,
  postIds: Id<"talentConnectPosts">[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const postId of postIds) {
    const subs = await ctx.db
      .query("talentConnectSubmissions")
      .withIndex("by_post", (q) => q.eq("talentConnectPostId", postId))
      .collect();
    counts.set(postId, subs.length);
  }
  return counts;
}

const postFields = {
  title: v.string(),
  shortDescription: v.string(),
  fullDescription: v.string(),
  requirements: v.array(v.string()),
  requiredSkills: v.array(v.string()),
  category: categoryValidator,
  difficultyLevel: difficultyValidator,
  experienceLevel: experienceValidator,
  companyName: v.string(),
  compensationInfo: v.optional(v.string()),
  deadline: v.optional(v.number()),
  tags: v.array(v.string()),
};

export type TalentConnectPost = {
  _id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  requirements: string[];
  requiredSkills: string[];
  category: TalentConnectCategory;
  difficultyLevel: TalentConnectDifficulty;
  experienceLevel: TalentConnectExperience;
  companyName: string;
  compensationInfo?: string;
  deadline?: number;
  tags: string[];
  status: "draft" | "published" | "unpublished" | "archived";
  publishedAt?: number;
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
  submissionCount?: number;
};

/* ================================================================
   PUBLIC QUERIES
   ================================================================ */

/**
 * Public: list every published Talent Connect post (newest first) with
 * the number of proposals each one received.
 */
export const listPublished = query({
  args: {
    category: v.optional(categoryValidator),
    experienceLevel: v.optional(experienceValidator),
  },
  handler: async (ctx, args) => {
    let posts = await ctx.db
      .query("talentConnectPosts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    if (args.category) {
      posts = posts.filter((p) => p.category === args.category);
    }
    if (args.experienceLevel) {
      posts = posts.filter((p) => p.experienceLevel === args.experienceLevel);
    }

    posts.sort((a, b) => b.createdAt - a.createdAt);

    const counts = await submissionCounts(
      ctx,
      posts.map((p) => p._id)
    );

    return posts.map((p) => ({
      ...p,
      submissionCount: counts.get(p._id) ?? 0,
    }));
  },
});

/**
 * Public: a single published Talent Connect post with its proposal count.
 * Admins fetch unpublished posts through `adminGet` instead.
 */
export const getPublished = query({
  args: { id: v.id("talentConnectPosts") },
  handler: async (ctx, { id }) => {
    const post = await ctx.db.get(id);
    if (!post || post.status !== "published") return null;

    const counts = await submissionCounts(ctx, [id]);
    return { ...post, submissionCount: counts.get(id) ?? 0 };
  },
});

/* ================================================================
   ADMIN QUERIES
   ================================================================ */

/**
 * ADMIN+: every Talent Connect post regardless of status, with optional
 * search + status/category filters. Newest first.
 */
export const listAdmin = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("unpublished"),
        v.literal("archived")
      )
    ),
    category: v.optional(categoryValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let all = await ctx.db.query("talentConnectPosts").collect();

    const search = args.search?.trim().toLowerCase() ?? "";
    if (search) {
      all = all.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.shortDescription.toLowerCase().includes(search) ||
          p.companyName.toLowerCase().includes(search)
      );
    }

    if (args.status) all = all.filter((p) => p.status === args.status);
    if (args.category) all = all.filter((p) => p.category === args.category);

    all.sort((a, b) => b.createdAt - a.createdAt);

    const counts = await submissionCounts(
      ctx,
      all.map((p) => p._id)
    );

    return all.map((p) => ({
      ...p,
      submissionCount: counts.get(p._id) ?? 0,
    }));
  },
});

/** ADMIN+: full detail for any post (including drafts/unpublished). */
export const adminGet = query({
  args: { id: v.id("talentConnectPosts") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);

    const post = await ctx.db.get(id);
    if (!post) return null;

    const counts = await submissionCounts(ctx, [id]);
    return { ...post, submissionCount: counts.get(id) ?? 0 };
  },
});

/* ================================================================
   ADMIN MUTATIONS
   ================================================================ */

/** ADMIN+: create a new Talent Connect post (starts as a draft). */
export const createPost = mutation({
  args: postFields,
  handler: async (ctx, args) => {
    const { callerId, caller } = await requireAdmin(ctx);

    if (!args.title.trim()) throw new Error("Title is required");
    if (!args.shortDescription.trim())
      throw new Error("Short description is required");
    if (!args.fullDescription.trim())
      throw new Error("Full description is required");

    const now = Date.now();

    const postId = await ctx.db.insert("talentConnectPosts", {
      ...args,
      title: args.title.trim(),
      shortDescription: args.shortDescription.trim(),
      fullDescription: args.fullDescription.trim(),
      companyName: args.companyName.trim(),
      requiredSkills: args.requiredSkills.map((s) => s.trim()).filter(Boolean),
      requirements: args.requirements.map((s) => s.trim()).filter(Boolean),
      tags: args.tags.map((s) => s.trim()).filter(Boolean),
      status: "draft",
      createdBy: callerId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "talent_connect_post_created",
      target: "talentConnectPost",
      targetId: postId,
      details: args.title,
      ip: undefined,
      createdAt: now,
    });

    return postId;
  },
});

/** ADMIN+: update every editable field of a Talent Connect post. */
export const updatePost = mutation({
  args: {
    postId: v.id("talentConnectPosts"),
    ...postFields,
  },
  handler: async (ctx, args) => {
    const { callerId, caller } = await requireAdmin(ctx);

    const existing = await ctx.db.get(args.postId);
    if (!existing) throw new Error("Talent Connect post not found");

    if (!args.title.trim()) throw new Error("Title is required");
    if (!args.shortDescription.trim())
      throw new Error("Short description is required");
    if (!args.fullDescription.trim())
      throw new Error("Full description is required");

    const now = Date.now();

    await ctx.db.patch(args.postId, {
      title: args.title.trim(),
      shortDescription: args.shortDescription.trim(),
      fullDescription: args.fullDescription.trim(),
      companyName: args.companyName.trim(),
      requirements: args.requirements.map((s) => s.trim()).filter(Boolean),
      requiredSkills: args.requiredSkills.map((s) => s.trim()).filter(Boolean),
      tags: args.tags.map((s) => s.trim()).filter(Boolean),
      category: args.category,
      difficultyLevel: args.difficultyLevel,
      experienceLevel: args.experienceLevel,
      compensationInfo: args.compensationInfo?.trim() || undefined,
      deadline: args.deadline,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "talent_connect_post_updated",
      target: "talentConnectPost",
      targetId: args.postId,
      details: args.title,
      ip: undefined,
      createdAt: now,
    });
  },
});

/**
 * ADMIN+: publish / unpublish / archive a post. Publishing stamps
 * `publishedAt`; archiving permanently retires the post and hides it
 * from users.
 */
export const setPostStatus = mutation({
  args: {
    postId: v.id("talentConnectPosts"),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("unpublished"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    const { callerId, caller } = await requireAdmin(ctx);

    const existing = await ctx.db.get(args.postId);
    if (!existing) throw new Error("Talent Connect post not found");

    const now = Date.now();

    await ctx.db.patch(args.postId, {
      status: args.status,
      publishedAt:
        args.status === "published"
          ? (existing.publishedAt ?? now)
          : existing.publishedAt,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: `talent_connect_post_${args.status}`,
      target: "talentConnectPost",
      targetId: args.postId,
      details: existing.title,
      ip: undefined,
      createdAt: now,
    });
  },
});

/**
 * ADMIN+: delete a post and cascade-delete all of its proposals so no
 * dangling references remain.
 */
export const deletePost = mutation({
  args: { postId: v.id("talentConnectPosts") },
  handler: async (ctx, args) => {
    const { callerId, caller } = await requireAdmin(ctx);

    const existing = await ctx.db.get(args.postId);
    if (!existing) throw new Error("Talent Connect post not found");

    const related = await ctx.db
      .query("talentConnectSubmissions")
      .withIndex("by_post", (q) => q.eq("talentConnectPostId", args.postId))
      .collect();
    for (const sub of related) {
      await ctx.db.delete(sub._id);
    }

    await ctx.db.delete(args.postId);

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "talent_connect_post_deleted",
      target: "talentConnectPost",
      targetId: args.postId,
      details: existing.title,
      ip: undefined,
      createdAt: Date.now(),
    });
  },
});