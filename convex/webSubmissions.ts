/**
 * Web Development Challenge workspace backend.
 *
 * Provides:
 *   - Per-user draft persistence (Save + auto-restore) → webProjectDrafts
 *   - Web solution submissions → existing `submissions` table with
 *     `submissionType = "web"` (status lifecycle pending → approved|rejected)
 *   - Admin review queries + approve/reject (XP granted once on approval)
 *
 * The browser preview itself never touches Convex — Run happens entirely in
 * the sandboxed iframe. Drafts/submissions are the only persisted state.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";
import type { Doc, Id } from "./_generated/dataModel";

/** A challenge is a Web Development challenge when its category is `web` or
 *  it is a hackathon challenge with `hackathonCategory = "web"`. */
export function isWebChallenge(
  c: Doc<"challenges"> | null | undefined
): boolean {
  if (!c) return false;
  return c.category === "web" || (c.category === "hackathon" && c.hackathonCategory === "web");
}

const empty = (s: string) => !s || s.replace(/\s/g, "").length === 0;

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

/** The current user's saved draft for a challenge, or null. */
export const getMyDraft = query({
  args: { challengeId: v.id("challenges") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("webProjectDrafts"),
      _creationTime: v.number(),
      challengeId: v.id("challenges"),
      userId: v.id("users"),
      htmlCode: v.string(),
      cssCode: v.string(),
      javascriptCode: v.string(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const draft = await ctx.db
      .query("webProjectDrafts")
      .withIndex("by_user_challenge", (q) =>
        q.eq("userId", userId).eq("challengeId", args.challengeId)
      )
      .unique();
    return draft;
  },
});

/** Upsert the user's draft for a challenge (Save button / Ctrl+S). */
export const saveDraft = mutation({
  args: {
    challengeId: v.id("challenges"),
    htmlCode: v.string(),
    cssCode: v.string(),
    javascriptCode: v.string(),
  },
  returns: v.id("webProjectDrafts"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");
    if (!isWebChallenge(challenge)) {
      throw new Error("This challenge is not a Web Development challenge");
    }

    const existing = await ctx.db
      .query("webProjectDrafts")
      .withIndex("by_user_challenge", (q) =>
        q.eq("userId", userId).eq("challengeId", args.challengeId)
      )
      .unique();

    const data = {
      challengeId: args.challengeId,
      userId,
      htmlCode: args.htmlCode,
      cssCode: args.cssCode,
      javascriptCode: args.javascriptCode,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert("webProjectDrafts", data);
  },
});

// ---------------------------------------------------------------------------
// Web submissions
// ---------------------------------------------------------------------------

/**
 * Submit a Web Development solution for admin review.
 *
 * A user may re-submit while their previous submission is still `pending` —
 * the pending row is replaced instead of duplicated, which also makes rapid
 * double-clicks harmless (the second call overwrites the first).
 */
export const submitWebChallenge = mutation({
  args: {
    challengeId: v.id("challenges"),
    htmlCode: v.string(),
    cssCode: v.string(),
    javascriptCode: v.string(),
  },
  returns: v.id("submissions"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const challenge = await ctx.db.get(args.challengeId);
    if (!challenge) throw new Error("Challenge not found");
    if (!isWebChallenge(challenge)) {
      throw new Error("This challenge is not a Web Development challenge");
    }

    if (
      empty(args.htmlCode) &&
      empty(args.cssCode) &&
      empty(args.javascriptCode)
    ) {
      throw new Error("Nothing to submit — write some HTML, CSS or JavaScript first.");
    }

    const now = Date.now();
    const existingPending = await ctx.db
      .query("submissions")
      .withIndex("by_user_challenge", (q) =>
        q.eq("userId", userId).eq("challengeId", args.challengeId)
      )
      .filter((q) => q.eq(q.field("submissionType"), "web"))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    const data = {
      challengeId: args.challengeId,
      userId,
      submissionType: "web" as const,
      htmlCode: args.htmlCode,
      cssCode: args.cssCode,
      javascriptCode: args.javascriptCode,
      status: "pending" as const,
      submittedAt: now,
    };

    if (existingPending) {
      await ctx.db.patch(existingPending._id, data);
      return existingPending._id;
    }
    return await ctx.db.insert("submissions", { ...data, createdAt: now });
  },
});

// ---------------------------------------------------------------------------
// Admin review
// ---------------------------------------------------------------------------

/** Admin: paginated, searchable list of Web Development submissions. */
export const listWebSubmissionsAdmin = query({
  args: {
    status: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
    ),
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
    const pageSize = Math.min(args.pageSize ?? 15, 100);
    const search = args.search?.trim().toLowerCase() ?? "";

    const subs = await ctx.db
      .query("submissions")
      .withIndex("by_submissionType", (q) => q.eq("submissionType", "web"))
      .collect();
    // Newest first.
    subs.sort(
      (a, b) => (b.submittedAt ?? b.createdAt) - (a.submittedAt ?? a.createdAt)
    );

    const challengeIds = [...new Set(subs.map((s) => String(s.challengeId)))];
    const challenges = await Promise.all(
      challengeIds.map((id) => ctx.db.get(id as Id<"challenges">))
    );
    const challengeById = new Map(
      challenges.filter((c): c is Doc<"challenges"> => Boolean(c)).map((c) => [c._id, c])
    );
    const users = await ctx.db.query("users").collect();
    const userById = new Map(users.map((u) => [String(u._id), u]));

    const enriched = await Promise.all(
      subs.map(async (s) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", s.userId))
          .unique();
        const challenge = challengeById.get(s.challengeId);
        return {
          _id: s._id,
          challengeId: s.challengeId,
          userId: s.userId,
          username: profile?.username ?? "unknown",
          userEmail: userById.get(String(s.userId))?.email ?? null,
          challengeTitle: challenge?.title ?? "Unknown challenge",
          status: s.status ?? ("pending" as const),
          submittedAt: s.submittedAt ?? s.createdAt,
          reviewedAt: s.reviewedAt ?? null,
        };
      })
    );

    let filtered = enriched;
    if (args.status) filtered = filtered.filter((r) => r.status === args.status);
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.challengeTitle.toLowerCase().includes(search) ||
          r.username.toLowerCase().includes(search) ||
          (r.userEmail ?? "").toLowerCase().includes(search)
      );
    }

    const start = page * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return {
      submissions: paged,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  },
});

/** Admin: full detail of one Web Development submission (code + context). */
export const getWebSubmissionAdmin = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const sub = await ctx.db.get(args.submissionId);
    if (!sub || sub.submissionType !== "web") {
      throw new Error("Submission not found");
    }

    const [profile, challenge, submitter, reviewer] = await Promise.all([
      ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", sub.userId))
        .unique(),
      ctx.db.get(sub.challengeId),
      ctx.db.get(sub.userId),
      sub.reviewedBy ? ctx.db.get(sub.reviewedBy) : null,
    ]);

    return {
      _id: sub._id,
      challengeId: sub.challengeId,
      challengeTitle: challenge?.title ?? "Unknown challenge",
      challengeDescription: challenge?.description ?? "",
      username: profile?.username ?? "unknown",
      userEmail: submitter?.email ?? null,
      htmlCode: sub.htmlCode ?? "",
      cssCode: sub.cssCode ?? "",
      javascriptCode: sub.javascriptCode ?? "",
      status: sub.status ?? ("pending" as const),
      submittedAt: sub.submittedAt ?? sub.createdAt,
      reviewedBy: reviewer?.email ?? null,
      reviewedAt: sub.reviewedAt ?? null,
      reviewNote: sub.reviewNote ?? null,
      xpAwarded: sub.xpAwarded ?? null,
    };
  },
});

/**
 * Admin: approve/reject a Web Development submission.
 *
 * Approving a previously-unrewarded web submission grants the challenge's
 * XP once per user (idempotency guard via `xpAwarded`). This mirrors the
 * existing project-submission XP behavior (profile.xp patch) — XP is never
 * granted for Run or Save, only for an approved submission.
 */
export const reviewWebSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    verdict: v.union(v.literal("approved"), v.literal("rejected")),
    note: v.optional(v.string()),
  },
  returns: v.id("submissions"),
  handler: async (ctx, args) => {
    const reviewerId = await getAuthUserId(ctx);
    if (!reviewerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, reviewerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const sub = await ctx.db.get(args.submissionId);
    if (!sub || sub.submissionType !== "web") {
      throw new Error("Submission not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.submissionId, {
      status: args.verdict,
      reviewedBy: reviewerId,
      reviewedAt: now,
      reviewNote: args.note?.trim() || undefined,
    });

    if (args.verdict === "approved") {
      // Grant XP exactly once per user + challenge.
      const allForChallenge = await ctx.db
        .query("submissions")
        .withIndex("by_challenge", (q) => q.eq("challengeId", sub.challengeId))
        .collect();
      const mine = allForChallenge.filter((s) => String(s.userId) === String(sub.userId));
      const alreadyRewarded =
        mine.some((s) => s.xpAwarded !== undefined) ||
        mine.some((s) => s.submissionType !== "web");

      if (!alreadyRewarded) {
        const challenge = await ctx.db.get(sub.challengeId);
        if (challenge && challenge.xpReward > 0) {
          const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", sub.userId))
            .unique();
          if (profile) {
            await ctx.db.patch(profile._id, { xp: profile.xp + challenge.xpReward });
            await ctx.db.patch(args.submissionId, { xpAwarded: challenge.xpReward });
          }
        }
      }
    }

    return args.submissionId;
  },
});