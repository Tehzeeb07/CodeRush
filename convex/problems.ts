
/**
 * CodeRush — Problems Backend
 *
 * Problem queries, mutations, admin operations and judge data.
 *
 * SECURITY MODEL
 * --------------
 * Public queries return only safe problem information.
 * Hidden test cases are returned only by getJudgeData when the
 * server-side JUDGE_SECRET is provided.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";

/**
 * Secret shared between the Next.js judge route and Convex.
 */
function isJudgeAuthorized(secret: unknown): boolean {
  const expected = process.env.JUDGE_SECRET;

  return (
    typeof expected === "string" &&
    expected.length > 0 &&
    typeof secret === "string" &&
    secret === expected
  );
}

/**
 * ---------------------------------------------------------------------------
 * PUBLIC
 * ---------------------------------------------------------------------------
 */

/**
 * Public list of problems.
 *
 * Hidden test inputs/outputs are never returned.
 */
export const listProblems = query({
  args: {},

  handler: async (ctx) => {
    const docs = await ctx.db.query("problems").collect();

    return docs
      .filter((d) => !d.archived)
      .map((d) => ({
        slug: d.slug,
        title: d.title,
        difficulty: d.difficulty,
        tags: d.tags,

        counts: {
          sample: d.testCases.filter((t) => t.isSample).length,
          hidden: d.testCases.filter((t) => !t.isSample).length,
        },

        timeLimitMs: d.timeLimitMs,
        memoryLimitMb: d.memoryLimitMb,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  },
});

/**
 * Public problem page.
 *
 * Only sample test cases are exposed.
 */
export const getProblemBySlug = query({
  args: {
    slug: v.string(),
  },

  handler: async (ctx, args) => {
    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!problem) {
      return null;
    }

    if (problem.archived) {
      return null;
    }

    const sampleCases = problem.testCases.filter(
      (test) => test.isSample
    );

    /**
     * If examples were manually entered, use them.
     * Otherwise generate examples from sample test cases.
     */
    const examples =
      problem.examples.length > 0
        ? problem.examples.map((example) => ({
          id: example.id,
          input: example.input,
          output: example.output,
          explanation: example.explanation ?? null,
        }))
        : sampleCases.map((test) => ({
          id: test.id,
          input: test.input,
          output: test.expectedOutput,
          explanation: null as string | null,
        }));

    return {
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags,
      description: problem.description,
      constraints: problem.constraints,

      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,

      inputFormat: problem.inputFormat ?? "",
      outputFormat: problem.outputFormat ?? "",

      hints: problem.hints ?? [],
      editorial: problem.editorial ?? "",

      supportedLanguages: problem.supportedLanguages ?? [],

      /**
       * Starter code is safe to expose.
       *
       * Example:
       * {
       *   cpp: "...",
       *   python: "...",
       *   javascript: "..."
       * }
       */
      starterCode: problem.starterCode ?? {},

      examples,

      counts: {
        sample: sampleCases.length,
        hidden: problem.testCases.length - sampleCases.length,
      },
    };
  },
});

/**
 * ---------------------------------------------------------------------------
 * JUDGE
 * ---------------------------------------------------------------------------
 */

/**
 * Full judge data.
 *
 * This function requires the server-side JUDGE_SECRET.
 */
export const getJudgeData = query({
  args: {
    slug: v.string(),
    secret: v.string(),
  },

  handler: async (ctx, args) => {
    if (!isJudgeAuthorized(args.secret)) {
      throw new Error("Unauthorized judge data request");
    }

    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!problem) {
      return null;
    }

    return {
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description,
      constraints: problem.constraints,

      examples: problem.examples,

      inputFormat: problem.inputFormat ?? "",
      outputFormat: problem.outputFormat ?? "",

      hints: problem.hints ?? [],
      editorial: problem.editorial ?? "",

      supportedLanguages: problem.supportedLanguages ?? [],

      starterCode: problem.starterCode ?? {},

      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,

      tests: problem.testCases.map((test) => ({
        id: test.id,
        input: test.input,
        expectedOutput: test.expectedOutput,
        hidden: !test.isSample,
      })),
    };
  },
});

/**
 * ---------------------------------------------------------------------------
 * SEEDING
 * ---------------------------------------------------------------------------
 */

/**
 * Number of stored problems.
 */
export const seedStatus = query({
  args: {},

  handler: async (ctx) => {
    return (await ctx.db.query("problems").collect()).length;
  },
});

/**
 * Seed one problem.
 *
 * Used by scripts/seed-problems.mjs.
 */
export const seedProblem = mutation({
  args: {
    slug: v.string(),
    title: v.string(),

    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard")
    ),

    tags: v.array(v.string()),

    description: v.string(),

    constraints: v.array(v.string()),

    timeLimitMs: v.number(),

    memoryLimitMb: v.number(),

    examples: v.array(
      v.object({
        id: v.string(),
        input: v.string(),
        output: v.string(),
        explanation: v.optional(v.string()),
      })
    ),

    testCases: v.array(
      v.object({
        id: v.string(),
        input: v.string(),
        expectedOutput: v.string(),
        isSample: v.boolean(),
      })
    ),

    starterCode: v.optional(v.any()),

    category: v.optional(v.string()),

    inputFormat: v.optional(v.string()),

    outputFormat: v.optional(v.string()),

    hints: v.optional(v.array(v.string())),

    editorial: v.optional(v.string()),

    supportedLanguages: v.optional(v.array(v.string())),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("problems", {
      ...args,

      starterCode: args.starterCode ?? {},

      createdAt: Date.now(),
      updatedAt: Date.now(),

      published: true,
      archived: false,
    });
  },
});

/**
 * ---------------------------------------------------------------------------
 * ADMIN
 * ---------------------------------------------------------------------------
 */

/**
 * ADMIN:
 * Get one complete problem.
 */
export const getProblemFull = query({
  args: {
    slug: v.string(),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated");
    }

    const caller = await resolveIdentity(ctx, userId);

    if (
      !caller ||
      (caller.role !== "ADMIN" &&
        caller.role !== "SUPER_ADMIN")
    ) {
      throw new Error("Insufficient permissions");
    }

    return await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/**
 * ADMIN:
 * List all problems.
 */
export const listAllProblems = query({
  args: {},

  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated");
    }

    const caller = await resolveIdentity(ctx, userId);

    if (
      !caller ||
      (caller.role !== "ADMIN" &&
        caller.role !== "SUPER_ADMIN")
    ) {
      throw new Error("Insufficient permissions");
    }

    return await ctx.db
      .query("problems")
      .order("desc")
      .collect();
  },
});

/**
 * ADMIN+:
 * Create a new problem.
 */
export const createProblem = mutation({
  args: {
    slug: v.string(),

    title: v.string(),

    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard")
    ),

    tags: v.array(v.string()),

    description: v.string(),

    examples: v.array(
      v.object({
        id: v.string(),
        input: v.string(),
        output: v.string(),
        explanation: v.optional(v.string()),
      })
    ),

    constraints: v.array(v.string()),

    timeLimitMs: v.number(),

    memoryLimitMb: v.number(),

    testCases: v.array(
      v.object({
        id: v.string(),
        input: v.string(),
        expectedOutput: v.string(),
        isSample: v.boolean(),
      })
    ),

    published: v.optional(v.boolean()),

    archived: v.optional(v.boolean()),

    category: v.optional(v.string()),

    inputFormat: v.optional(v.string()),

    outputFormat: v.optional(v.string()),

    hints: v.optional(v.array(v.string())),

    editorial: v.optional(v.string()),

    supportedLanguages: v.optional(
      v.array(v.string())
    ),

    /**
     * IMPORTANT:
     * This fixes:
     *
     * Object contains extra field `starterCode`
     */
    starterCode: v.optional(v.any()),
  },

  handler: async (ctx, args) => {
    /**
     * Authentication.
     */
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated");
    }

    /**
     * Role check.
     */
    const caller = await resolveIdentity(ctx, userId);

    if (
      !caller ||
      (caller.role !== "ADMIN" &&
        caller.role !== "SUPER_ADMIN")
    ) {
      throw new Error("Insufficient permissions");
    }

    /**
     * Prevent duplicate slugs.
     */
    const existing = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error(
        "Problem with this slug already exists"
      );
    }

    const now = Date.now();

    /**
     * Create problem.
     */
    const problemId = await ctx.db.insert("problems", {
      ...args,

      /**
       * Make sure starterCode always exists.
       */
      starterCode: args.starterCode ?? {},

      published: args.published ?? false,

      archived: args.archived ?? false,

      createdAt: now,

      updatedAt: now,
    });

    /**
     * Audit log.
     */
    await ctx.db.insert("auditLogs", {
      adminId: userId,

      adminEmail: caller.email ?? "[unknown]",

      action: "problem_created",

      target: "problem",

      targetId: problemId,

      details: args.title,

      ip: undefined,

      createdAt: now,
    });

    return problemId;
  },
});

/**
 * ADMIN+:
 * Update problem.
 */
export const updateProblem = mutation({
    args: {
    id: v.id("problems"),

    /**
     * Allows the admin to change the problem's slug. A uniqueness
     * check is performed server-side in the handler below.
     */
    slug: v.optional(v.string()),

    title: v.optional(v.string()),

    difficulty: v.optional(
      v.union(
        v.literal("easy"),
        v.literal("medium"),
        v.literal("hard")
      )
    ),

    tags: v.optional(v.array(v.string())),

    description: v.optional(v.string()),

    examples: v.optional(
      v.array(
        v.object({
          id: v.string(),
          input: v.string(),
          output: v.string(),
          explanation: v.optional(v.string()),
        })
      )
    ),

    constraints: v.optional(v.array(v.string())),

    timeLimitMs: v.optional(v.number()),

    memoryLimitMb: v.optional(v.number()),

    testCases: v.optional(
      v.array(
        v.object({
          id: v.string(),
          input: v.string(),
          expectedOutput: v.string(),
          isSample: v.boolean(),
        })
      )
    ),

    published: v.optional(v.boolean()),

    archived: v.optional(v.boolean()),

    category: v.optional(v.string()),

    inputFormat: v.optional(v.string()),

    outputFormat: v.optional(v.string()),

    hints: v.optional(v.array(v.string())),

    editorial: v.optional(v.string()),

    supportedLanguages: v.optional(
      v.array(v.string())
    ),

    /**
     * IMPORTANT:
     * Allows the admin page to update starterCode.
     */
    starterCode: v.optional(v.any()),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated");
    }

    const caller = await resolveIdentity(ctx, userId);

    if (
      !caller ||
      (caller.role !== "ADMIN" &&
        caller.role !== "SUPER_ADMIN")
    ) {
      throw new Error("Insufficient permissions");
    }

    const { id, ...updates } = args;

    /**
     * If the slug is being changed, verify it is not already taken
     * by another problem.
     */
    const newSlug = updates.slug;

    if (newSlug !== undefined) {
      const existingSlug = await ctx.db
        .query("problems")
        .withIndex("by_slug", (q) => q.eq("slug", newSlug))
        .unique();

      if (existingSlug && existingSlug._id !== id) {
        throw new Error(
          `A problem with the slug "${newSlug}" already exists.`
        );
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      adminId: userId,

      adminEmail: caller.email ?? "[unknown]",

      action: "problem_updated",

      target: "problem",

      targetId: id,

      details: JSON.stringify(
        Object.keys(updates)
      ),

      ip: undefined,

      createdAt: Date.now(),
    });

    return {
      ok: true,
    };
  },
});

/**
 * ADMIN+:
 * Publish / unpublish problem.
 */
export const setProblemPublished = mutation({
  args: {
    id: v.id("problems"),

    published: v.boolean(),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated");
    }

    const caller = await resolveIdentity(ctx, userId);

    if (
      !caller ||
      (caller.role !== "ADMIN" &&
        caller.role !== "SUPER_ADMIN")
    ) {
      throw new Error("Insufficient permissions");
    }

    await ctx.db.patch(args.id, {
      published: args.published,

      updatedAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      adminId: userId,

      adminEmail: caller.email ?? "[unknown]",

      action: args.published
        ? "problem_published"
        : "problem_unpublished",

      target: "problem",

      targetId: args.id,

      ip: undefined,

      createdAt: Date.now(),
    });

    return {
      ok: true,
    };
  },
});

/**
 * ADMIN+:
 * Archive / unarchive problem.
 */
export const archiveProblem = mutation({
  args: {
    id: v.id("problems"),

    archived: v.boolean(),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated");
    }

    const caller = await resolveIdentity(ctx, userId);

    if (
      !caller ||
      (caller.role !== "ADMIN" &&
        caller.role !== "SUPER_ADMIN")
    ) {
      throw new Error("Insufficient permissions");
    }

    const existing = await ctx.db.get(args.id);

    if (!existing) {
      throw new Error("Problem not found");
    }

    await ctx.db.patch(args.id, {
      archived: args.archived,

      updatedAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      adminId: userId,

      adminEmail: caller.email ?? "[unknown]",

      action: args.archived
        ? "problem_archived"
        : "problem_unarchived",

      target: "problem",

      targetId: args.id,

      ip: undefined,

      createdAt: Date.now(),
    });

    return {
      ok: true,
    };
  },
});

/**
 * ADMIN+:
 * Duplicate problem.
 */
export const duplicateProblem = mutation({
  args: {
    id: v.id("problems"),

    newSlug: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new Error("Not authenticated");
    }

    const caller = await resolveIdentity(ctx, userId);

    if (
      !caller ||
      (caller.role !== "ADMIN" &&
        caller.role !== "SUPER_ADMIN")
    ) {
      throw new Error("Insufficient permissions");
    }

    const original = await ctx.db.get(args.id);

    if (!original) {
      throw new Error("Problem not found");
    }

        const now = Date.now();

    /**
     * Enforce slug uniqueness for the duplicate. If the proposed slug
     * already exists, append a numeric suffix until it is unique.
     */
    const baseSlug =
      args.newSlug ??
      `${original.slug}-copy`;

    let slug = baseSlug;
    let counter = 1;

    while (
      await ctx.db
        .query("problems")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Strip system fields before copying; Convex generates a new _id.
    const {
      _id: _originalId,
      _creationTime: _originalCreationTime,
      ...copyFields
    } = original;

    const duplicateId = await ctx.db.insert(
      "problems",
      {
        ...copyFields,

        slug,

        title:
          `${original.title} (Copy)`,

        published: false,

        archived: false,

        createdAt: now,

        updatedAt: now,
      }
    );

    /**
     * Audit log.
     */
    await ctx.db.insert("auditLogs", {
      adminId: userId,

      adminEmail:
        caller.email ??
        "[unknown]",

      action:
        "problem_duplicated",

      target:
        "problem",

      targetId:
        duplicateId,

      details:
        `Duplicated from ${original.title} (${original.slug})`,

      ip: undefined,

      createdAt: now,
    });

    return duplicateId;
  },
});

/**
 * ADMIN:
 * List problems with search, pagination and difficulty filter.
 */
export const listProblemsAdmin = query({
  args: {
    search: v.optional(v.string()),

    difficulty: v.optional(
      v.union(
        v.literal("easy"),
        v.literal("medium"),
        v.literal("hard")
      )
    ),

    page: v.optional(v.number()),

    pageSize: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);

    if (!callerId) {
      throw new Error("Not authenticated");
    }

    const caller = await resolveIdentity(
      ctx,
      callerId
    );

    if (
      !caller ||
      (caller.role !== "ADMIN" &&
        caller.role !== "SUPER_ADMIN")
    ) {
      throw new Error("Insufficient permissions");
    }

    const page = Math.max(
      args.page ?? 0,
      0
    );

    const pageSize = Math.min(
      args.pageSize ?? 20,
      100
    );

    const search =
      args.search?.trim().toLowerCase() ?? "";

    let all =
      await ctx.db
        .query("problems")
        .collect();

    if (search) {
      all = all.filter(
        (problem) =>
          (problem.title ?? "")
            .toLowerCase()
            .includes(search) ||
          (problem.slug ?? "")
            .toLowerCase()
            .includes(search)
      );
    }

    if (args.difficulty) {
      all = all.filter(
        (problem) =>
          problem.difficulty ===
          args.difficulty
      );
    }

    const sorted = all.sort(
      (a, b) =>
        (b.createdAt ?? 0) -
        (a.createdAt ?? 0)
    );

    const start =
      page * pageSize;

    const paged = sorted.slice(
      start,
      start + pageSize
    );

    return {
      problems: paged,

      total: sorted.length,

      page,

      pageSize,

      totalPages:
        Math.ceil(
          sorted.length /
          pageSize
        ),
    };
  },
});

/**
 * ADMIN+:
 * Delete problem.
 */
export const deleteProblem = mutation({
  args: {
    id: v.id("problems"),
  },

  handler: async (ctx, args) => {
    const userId =
      await getAuthUserId(ctx);

    if (!userId) {
      throw new Error(
        "Not authenticated"
      );
    }

    const caller =
      await resolveIdentity(
        ctx,
        userId
      );

    if (
      !caller ||
      (caller.role !== "ADMIN" &&
        caller.role !== "SUPER_ADMIN")
    ) {
      throw new Error(
        "Insufficient permissions"
      );
    }

    /**
     * Verify the problem exists before attempting deletion.
     */
    const problem = await ctx.db.get(args.id);

    if (!problem) {
      throw new Error(
        "Problem not found"
      );
    }

    /**
     * Clean up related records to avoid dangling references.
     *
     * - judgeSubmissions: cascade-delete (submissions are meaningless
     *   without the problem's test cases).
     * - executions: null-out problemId to preserve the run history while
     *   removing the now-dangling reference.
     * - bookmarks: null-out problemId to preserve the user's saved code
     *   snippet while removing the problem association.
     */

    // 1. Delete judge submissions tied to this problem
    const relatedSubs = await ctx.db
      .query("judgeSubmissions")
      .withIndex("by_problem", (q) => q.eq("problemId", args.id))
      .collect();

    for (const sub of relatedSubs) {
      await ctx.db.delete(sub._id);
    }

    // 2. Null-out problemId on execution records (preserve the run history)
    const relatedExecutions = await ctx.db
      .query("executions")
      .filter((q) => q.eq(q.field("problemId"), args.id))
      .collect();

    for (const exec of relatedExecutions) {
      await ctx.db.patch(exec._id, {
        problemId: undefined,
      });
    }

    // 3. Null-out problemId on bookmarks (preserve the user's saved code)
    const relatedBookmarks = await ctx.db
      .query("bookmarks")
      .filter((q) => q.eq(q.field("problemId"), args.id))
      .collect();

    for (const bm of relatedBookmarks) {
      await ctx.db.patch(bm._id, {
        problemId: undefined,
      });
    }

    // 4. Delete the problem document itself
    await ctx.db.delete(args.id);

    /**
     * Audit log.
     */
    await ctx.db.insert(
      "auditLogs",
      {
        adminId: userId,

        adminEmail:
          caller.email ??
          "[unknown]",

        action:
          "problem_deleted",

        target:
          "problem",

        targetId:
          args.id,

        ip: undefined,

        createdAt:
          Date.now(),
      }
    );

    return {
      ok: true,
    };
  },
});
