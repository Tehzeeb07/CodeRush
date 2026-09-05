import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Email verification tokens & status.
 *
 * Security model:
 * - The raw token is generated in the Next.js API route (Node crypto) and is
 *   ONLY ever delivered to the user via email. Only the SHA-256 hash of the
 *   token is persisted here, so a database leak cannot be replayed.
 * - Tokens expire (24h) and are single-use (`usedAt`).
 * - Issuing a new token invalidates all previous unused tokens for the user.
 * - A 60s cooldown per user protects against email-bombing / abuse.
 */

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

export type VerifyTokenStatus = "ok" | "invalid" | "expired" | "used";

export interface IssueTokenResult {
  status: "ok" | "rate_limited" | "already_verified";
  email?: string;
  retryAfterSeconds?: number;
}

/**
 * Whether the currently authenticated user has a verified email.
 * Returns false when unauthenticated / unverified (callers must gate on the
 * auth loading state, see useConvexAuth in the dashboard page).
 */
export const isCurrentUserEmailVerified = query({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const row = await ctx.db
      .query("emailVerifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return row !== null;
  },
});

/**
 * Status of the current user for the /verify-email page.
 */
export const getCurrentUserStatus = query({
  args: {},
  handler: async (
    ctx
  ): Promise<{ authenticated: boolean; verified: boolean; email: string | null }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { authenticated: false, verified: false, email: null };
    const user = await ctx.db.get(userId);
    const row = await ctx.db
      .query("emailVerifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return {
      authenticated: true,
      verified: row !== null,
      email: user?.email ?? null,
    };
  },
});

/**
 * Called by the Next.js API route AFTER it generated a raw token and hashed
 * it. Applies the resend cooldown, invalidates previous unused tokens, and
 * stores the new token hash. Returns the user's email so the route can send
 * the verification email.
 */
export const beginIssueToken = mutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }): Promise<IssueTokenResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user?.email) throw new Error("User account has no email address");

    // Already verified — nothing to do.
    const verifiedRow = await ctx.db
      .query("emailVerifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (verifiedRow) return { status: "already_verified" };

    const tokens = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const now = Date.now();

    // Cooldown: most recent unused token must be older than the cooldown.
    const latestUnused = tokens
      .filter((t) => !t.usedAt)
      .reduce<(typeof tokens)[number] | null>(
        (latest, t) => (!latest || t.createdAt > latest.createdAt ? t : latest),
        null
      );
    if (latestUnused && now - latestUnused.createdAt < RESEND_COOLDOWN_MS) {
      return {
        status: "rate_limited",
        retryAfterSeconds: Math.ceil(
          (RESEND_COOLDOWN_MS - (now - latestUnused.createdAt)) / 1000
        ),
      };
    }

    // Invalidate (delete) all previous unused tokens — single active token.
    for (const t of tokens) {
      if (!t.usedAt) await ctx.db.delete(t._id);
    }

    await ctx.db.insert("emailVerificationTokens", {
      userId,
      tokenHash,
      expiresAt: now + TOKEN_TTL_MS,
      createdAt: now,
    });

    return { status: "ok", email: user.email };
  },
});

/**
 * Public (token-scoped) verification. The caller supplies the SHA-256 hash of
 * the raw email token — the raw token itself is required to produce it, so
 * this cannot be abused without a valid email link. No authentication needed:
 * users may click the link on a device where they are not logged in.
 */
export const verifyEmailToken = mutation({
  args: { tokenHash: v.string() },
  handler: async (ctx, { tokenHash }): Promise<{ status: VerifyTokenStatus }> => {
    const token = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique();

    if (!token) return { status: "invalid" };
    if (token.usedAt) return { status: "used" };
    if (token.expiresAt < Date.now()) return { status: "expired" };

    // Single-use: consume the token.
    await ctx.db.patch(token._id, { usedAt: Date.now() });

    const user = await ctx.db.get(token.userId);
    if (user?.email) {
      const existing = await ctx.db
        .query("emailVerifications")
        .withIndex("by_userId", (q) => q.eq("userId", token.userId))
        .unique();
      if (!existing) {
        await ctx.db.insert("emailVerifications", {
          userId: token.userId,
          email: user.email,
          verifiedAt: Date.now(),
        });
      }
    }

    return { status: "ok" };
  },
});
