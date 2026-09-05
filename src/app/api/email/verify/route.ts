import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { createHash } from "crypto";

/**
 * POST /api/email/verify
 * Body: { token: string } (the raw token from the email link)
 *
 * No authentication required — users may click the link on a device where
 * they are not logged in. Only the SHA-256 hash is sent to Convex; the raw
 * token is discarded immediately after hashing.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { status: "invalid", message: "Invalid verification link." },
        { status: 400 }
      );
    }

    const token =
      typeof body === "object" && body !== null && "token" in body
        ? (body as { token?: unknown }).token
        : undefined;

    if (typeof token !== "string" || token.trim().length === 0 || token.length > 256) {
      return NextResponse.json(
        { status: "invalid", message: "Invalid verification link." },
        { status: 400 }
      );
    }

    // Trim defensively — the raw token must hash exactly as it was hashed at
    // issue time, so stray whitespace (e.g. from a hand-pasted link) is
    // removed before hashing.
    const tokenHash = createHash("sha256").update(token.trim()).digest("hex");

    const convex = new ConvexHttpClient(
      process.env.NEXT_PUBLIC_CONVEX_URL as string
    );

    const result = await convex.mutation(
      api.emailVerification.verifyEmailToken,
      { tokenHash }
    );

    const messages: Record<string, string> = {
      ok: "Email verified successfully.",
      invalid: "Invalid verification link.",
      expired: "This verification link has expired. Please request a new one.",
      used: "This link has already been used.",
    };

    return NextResponse.json(
      { status: result.status, message: messages[result.status] },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[verify-email] Unexpected error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { status: "error", message: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
