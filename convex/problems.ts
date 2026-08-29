/**
 * Problem queries.
 *
 * SECURITY MODEL
 * --------------
 * Public queries project ONLY user-safe fields. Full test data — which
 * includes hidden test inputs and expected outputs — is served exclusively
 * through `getJudgeData`, callable only with the server-side judge secret
 * that never reaches browsers. The /api/judge route keeps that secret in
 * its own environment, so a curious client can never reproduce the call.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Secret shared between the Next.js route and this Convex deployment. */
function isJudgeAuthorized(secret: unknown): boolean {
  const expected = process.env.JUDGE_SECRET;
  return (
    typeof expected === "string" &&
    expected.length > 0 &&
    typeof secret === "string" &&
    secret === expected
  );
}

/** Projected problem safe to show in lists. */
export const listProblems = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("problems").collect();
    return docs
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

/** Full sanitized projection of one problem: samples included, hidden omitted entirely. */
export const getProblemBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!problem) return null;

    const sampleCases = problem.testCases.filter((t) => t.isSample);
    // Examples rendered from sample cases when the author did not override them.
    const examples =
      problem.examples.length > 0
        ? problem.examples.map((e) => ({
            id: e.id,
            input: e.input,
            output: e.output,
            explanation: e.explanation ?? null,
          }))
        : sampleCases.map((t) => ({
            id: t.id,
            input: t.input,
            output: t.expectedOutput,
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
      examples,
      counts: {
        sample: sampleCases.length,
        hidden: problem.testCases.length - sampleCases.length,
      },
    };
  },
});

export const getJudgeData = query({
  args: { slug: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    if (!isJudgeAuthorized(args.secret)) {
      throw new Error("Unauthorized judge data request");
    }
    const problem = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!problem) return null;

    return {
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      description: problem.description,
      constraints: problem.constraints,
      examples: problem.examples,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
      tests: problem.testCases.map((t) => ({
        id: t.id,
        input: t.input,
        expectedOutput: t.expectedOutput,
        hidden: !t.isSample,
      })),
    };
  },
});

// ---------------------------------------------------------------------------
// Seeding (bootstrap only — see scripts/seed-problems.mjs)
// ---------------------------------------------------------------------------

/** Number of stored problems; used by the seed script as a guard. */
export const seedStatus = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("problems").collect()).length,
});

/** Idempotent insert of a single problem document. */
export const seedProblem = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
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
      })),
    testCases: v.array(
      v.object({
        id: v.string(),
        input: v.string(),
        expectedOutput: v.string(),
        isSample: v.boolean(),
      })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("problems")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("problems", { ...args, createdAt: Date.now() });
  },
});

