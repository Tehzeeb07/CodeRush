/**
 * Talent Connect — proposals.
 *
 * Users submit professional proposals against published Talent Connect
 * posts (solution, technical approach, experience, portfolio links and
 * previous projects). Admins review, shortlist, approve or reject them
 * and provide feedback.
 *
 * One proposal per user per post — enforced via the `by_user_post` index.
 */

import { v } from "convex/values";
import { query, mutation, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";
import type { Doc } from "./_generated/dataModel";

export const SUBMISSION_STATUSES = [
  "pending",
  "under_review",
  "shortlisted",
  "approved",
  "rejected",
] as const;
export type TalentConnectSubmissionStatus =
  (typeof SUBMISSION_STATUSES)[number];

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("under_review"),
  v.literal("shortlisted"),
  v.literal("approved"),
  v.literal("rejected")
);

/* ================================================================
   SHARED HELPERS
   ================================================================ */

async function requireUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const identity = await resolveIdentity(ctx, userId);
  if (!identity) throw new Error("Not authenticated");
  if (identity.isBanned) {
    throw new Error("FORBIDDEN: Your account has been suspended.");
  }
  return userId;
}

async function requireAdmin(ctx: QueryCtx) {
  const callerId = await getAuthUserId(ctx);
  if (!callerId) throw new Error("Not authenticated");

  const caller = await resolveIdentity(ctx, callerId);
  if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
    throw new Error("Insufficient permissions");
  }
  return { callerId, caller };
}

/** Enrich a proposal with the submitter's public profile. */
async function withProfile(
  ctx: QueryCtx,
  submission: Doc<"talentConnectSubmissions">
) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", submission.userId))
    .unique();

  return {
    ...submission,
    username: profile?.username ?? "unknown",
    avatarUrl: profile?.avatarUrl ?? null,
    userBio: profile?.bio ?? null,
  };
}

const proposalFields = {
  proposedSolution: v.string(),
  technicalApproach: v.string(),
  technologyStack: v.array(v.string()),
  relevantExperience: v.string(),
  portfolioUrl: v.optional(v.string()),
  githubUrl: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  previousProjects: v.array(
    v.object({
      title: v.string(),
      url: v.optional(v.string()),
      description: v.optional(v.string()),
      technologies: v.optional(v.array(v.string())),
    })
  ),
  additionalMessage: v.optional(v.string()),
};

const httpUrl = (url: string | undefined) => {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (!/^https?:\/\//.test(trimmed)) {
    throw new Error("Links must start with http:// or https://");
  }
  if (trimmed.length > 2048) {
    throw new Error("Link is too long");
  }
  return trimmed;
};

/* ================================================================
   USER QUERIES
   ================================================================ */

/** Authenticated user: all of their Talent Connect proposals, newest first. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);

    const submissions = await ctx.db
      .query("talentConnectSubmissions")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .collect();

    submissions.sort((a, b) => b.updatedAt - a.updatedAt);

    return Promise.all(
      submissions.map(async (s) => {
        const post = await ctx.db.get(s.talentConnectPostId);
        return {
          ...s,
          postTitle: post?.title ?? "Removed post",
          companyName: post?.companyName ?? "—",
        };
      })
    );
  },
});

/** Authenticated user: their own proposal for a specific Talent Connect post. */
export const getMine = query({
  args: { postId: v.id("talentConnectPosts") },
  handler: async (ctx, { postId }) => {
    const userId = await requireUser(ctx);

    const existing = await ctx.db
      .query("talentConnectSubmissions")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", userId).eq("talentConnectPostId", postId)
      )
      .unique();

    return existing ?? null;
  },
});

/* ================================================================
   USER MUTATIONS
   ================================================================ */

/**
 * Authenticated user: submit a proposal for a published Talent Connect
 * post. Each user may hold only one proposal per post while it is
 * reviewable — resubmission after a decision is not allowed.
 */
export const submit = mutation({
  args: {
    postId: v.id("talentConnectPosts"),
    ...proposalFields,
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post || post.status !== "published") {
      throw new Error("This Talent Connect post is not open for proposals");
    }

    const existing = await ctx.db
      .query("talentConnectSubmissions")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", userId).eq("talentConnectPostId", args.postId)
      )
      .unique();
    if (existing) {
      throw new Error(
        "You have already submitted a proposal for this Talent Connect post"
      );
    }

    if (!args.proposedSolution.trim())
      throw new Error("Proposed solution is required");
    if (!args.technicalApproach.trim())
      throw new Error("Technical approach is required");
    if (!args.relevantExperience.trim())
      throw new Error("Relevant experience is required");

    const now = Date.now();

    return await ctx.db.insert("talentConnectSubmissions", {
      talentConnectPostId: args.postId,
      userId,
      proposedSolution: args.proposedSolution.trim(),
      technicalApproach: args.technicalApproach.trim(),
      technologyStack: args.technologyStack.map((t) => t.trim()).filter(Boolean),
      relevantExperience: args.relevantExperience.trim(),
      portfolioUrl: httpUrl(args.portfolioUrl),
      githubUrl: httpUrl(args.githubUrl),
      linkedinUrl: httpUrl(args.linkedinUrl),
      previousProjects: args.previousProjects
        .filter((p) => p.title.trim())
        .map((p) => ({
          title: p.title.trim(),
          url: httpUrl(p.url ?? undefined),
          description: p.description?.trim() || undefined,
          technologies: p.technologies?.map((t) => t.trim()).filter(Boolean),
        })),
      additionalMessage: args.additionalMessage?.trim() || undefined,
      submissionStatus: "pending",
      submittedAt: now,
      updatedAt: now,
    });
  },
});

/* ================================================================
   ADMIN QUERIES
   ================================================================ */

/**
 * ADMIN+: all proposals for a Talent Connect post, enriched with the
 * submitter's public profile (username, avatar, bio).
 */
export const listForPostAdmin = query({
  args: {
    postId: v.id("talentConnectPosts"),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let submissions = await ctx.db
      .query("talentConnectSubmissions")
      .withIndex("by_post", (q) => q.eq("talentConnectPostId", args.postId))
      .collect();

    if (args.status) {
      submissions = submissions.filter(
        (s) => s.submissionStatus === args.status
      );
    }

    submissions.sort((a, b) => b.submittedAt - a.submittedAt);

    return Promise.all(submissions.map((s) => withProfile(ctx, s)));
  },
});

/** ADMIN+: a single proposal with submitter profile. */
export const adminGetSubmission = query({
  args: { submissionId: v.id("talentConnectSubmissions") },
  handler: async (ctx, { submissionId }) => {
    await requireAdmin(ctx);

    const submission = await ctx.db.get(submissionId);
    if (!submission) return null;
    return withProfile(ctx, submission);
  },
});

/* ================================================================
   ADMIN MUTATIONS
   ================================================================ */

/**
 * ADMIN+: change a proposal's review status. Setting `rejected` or
 * `approved` usually goes together with feedback, but feedback can also
 * be provided separately through `provideFeedback`.
 */
export const updateStatus = mutation({
  args: {
    submissionId: v.id("talentConnectSubmissions"),
    submissionStatus: statusValidator,
  },
  handler: async (ctx, args) => {
    const { callerId, caller } = await requireAdmin(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Proposal not found");

    const now = Date.now();

    await ctx.db.patch(args.submissionId, {
      submissionStatus: args.submissionStatus,
      reviewedBy: callerId,
      reviewedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: `talent_connect_proposal_${args.submissionStatus}`,
      target: "talentConnectSubmission",
      targetId: args.submissionId,
      ip: undefined,
      createdAt: now,
    });
  },
});

/** ADMIN+: provide review feedback on a proposal. */
export const provideFeedback = mutation({
  args: {
    submissionId: v.id("talentConnectSubmissions"),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const { callerId, caller } = await requireAdmin(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Proposal not found");

    if (!args.feedback.trim()) throw new Error("Feedback cannot be empty");

    const now = Date.now();

    await ctx.db.patch(args.submissionId, {
      adminFeedback: args.feedback.trim(),
      reviewedBy: callerId,
      reviewedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "talent_connect_proposal_feedback",
      target: "talentConnectSubmission",
      targetId: args.submissionId,
      details: args.feedback.slice(0, 120),
      ip: undefined,
      createdAt: now,
    });
  },
});

/** ADMIN+: delete a proposal (moderation cleanup). */
export const adminDeleteSubmission = mutation({
  args: { submissionId: v.id("talentConnectSubmissions") },
  handler: async (ctx, args) => {
    const { callerId, caller } = await requireAdmin(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Proposal not found");

    await ctx.db.delete(args.submissionId);

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "talent_connect_proposal_deleted",
      target: "talentConnectSubmission",
      targetId: args.submissionId,
      ip: undefined,
      createdAt: Date.now(),
    });
  },
});
