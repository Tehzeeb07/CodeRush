import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "../../../../../convex/_generated/api";
import {
  getAppUrl,
  sendVerificationEmail,
} from "@/lib/email";

import { createHash, randomBytes } from "crypto";

/** SHA-256 hash of the raw token — only the hash is ever persisted. */
function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * POST /api/email/send-verification
 *
 * Requires an authenticated Convex Auth session (cookie-based). Generates a
 * cryptographically secure single-use token, stores its hash in Convex, and
 * emails the raw-token verification link to the user. The raw token never
 * leaves the server except inside the email itself.
 */
export async function POST(request: NextRequest) {
  try {
    const authToken = await convexAuthNextjsToken();
    if (!authToken) {
      return NextResponse.json(
        { status: "error", message: "You must be logged in to do that." },
        { status: 401 }
      );
    }

    const convex = new ConvexHttpClient(
      process.env.NEXT_PUBLIC_CONVEX_URL as string
    );
    convex.setAuth(authToken);

    // Generate a cryptographically secure, URL-safe token.
    const rawToken = randomBytes(32).toString("base64url");

    // Convex applies the 60s cooldown, invalidates previous tokens and
    // persists the hash. The expiresAt is computed server-side in Convex.
    const issue = await convex.mutation(api.emailVerification.beginIssueToken, {
      tokenHash: hashToken(rawToken),
    });

    if (issue.status === "rate_limited") {
      return NextResponse.json(
        {
          status: "rate_limited",
          message: "Please wait before requesting another verification email.",
          retryAfterSeconds: issue.retryAfterSeconds ?? 60,
        },
        { status: 429 }
      );
    }

    if (issue.status === "already_verified") {
      return NextResponse.json(
        { status: "already_verified", message: "Email is already verified." },
        { status: 200 }
      );
    }

    if (!issue.email) {
      return NextResponse.json(
        { status: "error", message: "Could not resolve your account email." },
        { status: 400 }
      );
    }

    // Build the verification link — base URL strictly from the environment,
    // falling back to the request origin (never a hardcoded localhost).
    const base =
      getAppUrl() ?? request.nextUrl.origin.replace(/\/+$/, "");
    const verificationUrl = `${base}/verify-email?token=${encodeURIComponent(rawToken)}`;

    const result = await sendVerificationEmail({
      to: issue.email,
      verificationUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        { status: "error", message: result.error },
        // 502: the account and token are fine, but the mail could not go out.
        { status: 502 }
      );
    }

    return NextResponse.json(
      { status: "ok", message: "Verification email sent successfully." },
      { status: 200 }
    );
  } catch (error) {
    // Log details server-side only; return a safe message.
    console.error(
      "[send-verification] Unexpected error:",
      error instanceof Error ? error.message : error
    );

    const unauthorized =
      error instanceof Error && error.message === "Not authenticated";
    if (unauthorized) {
      return NextResponse.json(
        { status: "error", message: "You must be logged in to do that." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { status: "error", message: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
