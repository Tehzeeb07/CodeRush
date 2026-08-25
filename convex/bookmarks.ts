import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Bookmarks — user-private saved code snippets (and, later, problems).
 *
 * Security model:
 *  - The authenticated user is always resolved server-side via
 *    getAuthUserId(); clients never pass a userId.
 *  - Every read/write/delete verifies ownership, so one user can never
 *    see or mutate another user's bookmarks.
 */

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_CODE_BYTES = 64 * 1024;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** List every bookmark owned by the authenticated user. */
export const listBookmarks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

/**
 * Fetch ONE bookmark for loading into the editor. Ownership is enforced:
 * another user's bookmark id resolves to null, never to its content.
 */
export const getBookmark = query({
  args: { id: v.id("bookmarks") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bookmark = await ctx.db.get(id);
    if (!bookmark || bookmark.userId !== userId) return null;
    return bookmark;
  },
});

/**
 * Does the authenticated user already have a bookmark with this exact
 * language + code? Used by the editor's toggle button to show
 * filled/unfilled state. Returns the matching bookmark id or null.
 */
export const findMineByCode = query({
  args: { language: v.string(), code: v.string() },
  handler: async (ctx, { language, code }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const mine = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const match = mine.find((b) => b.language === language && b.code === code);
    return match ? { id: match._id } : null;
  },
});

/**
 * Create a bookmark for the authenticated user.
 *
 * Duplicate protection:
 *  - With contentId/problemId: uniqueness on userId + contentId via the
 *    by_user_content index.
 *  - Without one: an exact-match guard (same user + title + language +
 *    code) prevents double-click duplicates.
 *
 * Idempotent: re-bookmarking the same item returns the existing row.
 */
export const createBookmark = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    code: v.string(),
    language: v.string(),
    problemId: v.optional(v.string()),
    contentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // --- Validate -------------------------------------------------------
    const title = args.title.trim();
    const code = args.code;
    if (title.length === 0) throw new Error("Bookmark title is required.");
    if (title.length > MAX_TITLE_LENGTH) {
      throw new Error("Bookmark title is too long.");
    }
    if (
      args.description !== undefined &&
      args.description.length > MAX_DESCRIPTION_LENGTH
    ) {
      throw new Error("Bookmark description is too long.");
    }
    if (code.trim().length === 0) {
      throw new Error("Cannot bookmark empty code.");
    }
    if (byteLength(code) > MAX_CODE_BYTES) {
      throw new Error("Code exceeds the maximum bookmark size.");
    }
    if (!args.language) throw new Error("Bookmark language is required.");

    // --- Duplicate protection -------------------------------------------
    if (args.contentId !== undefined || args.problemId !== undefined) {
      const key = args.contentId ?? args.problemId;
      const existing = await ctx.db
        .query("bookmarks")
        .withIndex("by_user_content", (q) =>
          q.eq("userId", userId).eq("contentId", key)
        )
        .unique();
      if (existing) return { id: existing._id, created: false };
    } else {
      const mine = await ctx.db
        .query("bookmarks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const duplicate = mine.find(
        (b) =>
          b.language === args.language &&
          b.title === title &&
          b.code === code &&
          b.problemId === args.problemId
      );
      if (duplicate) return { id: duplicate._id, created: false };
    }

    const now = Date.now();
    const id = await ctx.db.insert("bookmarks", {
      userId,
      title,
      description: args.description,
      code,
      language: args.language,
      problemId: args.problemId,
      contentId: args.contentId,
      createdAt: now,
      updatedAt: now,
    });

    return { id, created: true };
  },
});

/** Remove one of the authenticated user's own bookmarks. */
export const removeBookmark = mutation({
  args: { id: v.id("bookmarks") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bookmark = await ctx.db.get(id);
    if (!bookmark) throw new Error("Bookmark not found.");
    if (bookmark.userId !== userId) {
      throw new Error("You can only delete your own bookmarks.");
    }

    await ctx.db.delete(id);
    return { ok: true };
  },
});
