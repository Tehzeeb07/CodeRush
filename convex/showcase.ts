/**
 * Showcase — admin moderation for project showcase submissions.
 *
 * The showcase stores rows in the `submissions` table (challenge projects).
 * This module exposes admin-only views with user enrichment and pagination.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";

/**
 * ADMIN: paginated, searchable list of showcase submissions.
 * Fields match what the moderation UI renders: title, description,
 * authorName, featured, likes, comments, timestamps.
 */
export const adminListShowcase = query({
  args: {
    search: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const page = Math.max(args.page ?? 0, 0);
    const pageSize = Math.min(args.pageSize ?? 12, 50);
    const search = args.search?.trim().toLowerCase() ?? "";

    const all = await ctx.db.query("submissions").collect();
    const likes = await ctx.db.query("likes").collect();
    const likeCounts = new Map<string, number>();
    for (const like of likes) {
      const key = String(like.submissionId);
      likeCounts.set(key, (likeCounts.get(key) ?? 0) + 1);
    }

    const posts = await Promise.all(
      all.map(async (s) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", s.userId))
          .unique();
        const challenge = await ctx.db.get(s.challengeId);
        return {
          _id: s._id,
          title: challenge?.title ?? "Untitled project",
          description: s.description,
          authorName: profile?.username ?? "unknown",
          imageUrl: null as string | null,
          featured: s.isFeatured ?? false,
          likes: likeCounts.get(String(s._id)) ?? 0,
          comments: 0,
          createdAt: s.createdAt,
          repoUrl: s.repoUrl,
          demoUrl: s.demoUrl ?? null,
          isFeatured: s.isFeatured ?? false,
          isHidden: s.isHidden ?? false,
        };
      })
    );

    posts.sort((a, b) => b.createdAt - a.createdAt);

    let filtered = posts;
    if (search) {
      filtered = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          p.authorName.toLowerCase().includes(search)
      );
    }

    const start = page * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return {
      posts: paged,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  },
});