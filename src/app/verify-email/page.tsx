"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

type VerifyState =
  | "verifying"
  | "success"
  | "invalid"
  | "expired"
  | "used"
  // Token-less visit: the normal state right after signup / unverified login
  // (the app navigates here WITHOUT a token — the token only ever arrives via
  // the email link). Rendered as a friendly "check your inbox / resend" panel,
  // NOT as an error.
  | "awaiting"
  | "error";

interface VerifyResponse {
  status: string;
  message: string;
  retryAfterSeconds?: number;
}

const RESEND_COOLDOWN_SECONDS = 60;

function Spinner() {
  return (
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The app navigates here with ?sent=1 after signup (no token — the token
  // only ever arrives through the email link).
  const sentJustNow = searchParams.get("sent") === "1";

  // The email link is /verify-email?token=<base64url>. Normalize defensively:
  // - trim whitespace (hand-pasted tokens),
  // - one extra decodeURIComponent in case a mail client double-encoded the
  //   token (searchParams.get() already decodes once),
  // - an empty/whitespace-only ?token= counts as NO token (malformed link).
  const token = useMemo(() => {
    const raw = searchParams.get("token");
    if (raw === null) return null;
    let t = raw.trim();
    if (/%/.test(t)) {
      try {
        t = decodeURIComponent(t);
      } catch {
        // Malformed percent-encoding — pass the raw value through; the
        // server will reject it as an invalid token.
      }
    }
    return t.length > 0 ? t : null;
  }, [searchParams]);

  // Live status of the current session (undefined while loading).
  const userStatus = useQuery(api.emailVerification.getCurrentUserStatus);

  const [state, setState] = useState<VerifyState>(
    token ? "verifying" : "awaiting"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback((seconds: number) => {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1 && cooldownRef.current) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  // Verify the token once on mount.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch("/api/email/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data: VerifyResponse = await res.json();
        if (cancelled) return;
        switch (data.status) {
          case "ok":
            setState("success");
            break;
          case "used":
            setState("used");
            break;
          case "expired":
            setState("expired");
            break;
          case "invalid":
            setState("invalid");
            break;
          default:
            setState("error");
            setErrorMessage(data.message);
        }
      } catch {
        if (!cancelled) {
          setState("error");
          setErrorMessage("Something went wrong. Please try again later.");
        }
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Derive "already verified" (no setState-in-effect): if the live session
  // is already verified, treat the visit as success immediately — whether it
  // arrived with a token (verifying) or without one (awaiting).
  const alreadyVerified =
    userStatus?.authenticated === true && userStatus.verified === true;
  const effectiveState: VerifyState =
    alreadyVerified && (state === "verifying" || state === "awaiting")
      ? "success"
      : state;

  // After a successful verification, signed-in users (clicked the email link
  // in the same browser they signed up from) go straight to the dashboard.
  // Users who clicked on another device stay here and use the Log in button.
  useEffect(() => {
    if (state !== "success" || userStatus?.authenticated !== true) return;
    const t = setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 2000);
    return () => clearTimeout(t);
  }, [state, userStatus, router]);

  const canResend =
    userStatus?.authenticated === true &&
    userStatus.verified === false &&
    userStatus.email !== null;

  async function handleResend() {
    setResendMessage(null);
    setResendLoading(true);
    try {
      const res = await fetch("/api/email/send-verification", { method: "POST" });
      const data: VerifyResponse = await res.json();
      if (res.status === 429) {
        setResendMessage(data.message);
        startCooldown(data.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
      } else if (res.ok && data.status === "ok") {
        setResendMessage("Verification email sent successfully.");
        startCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setResendMessage(data.message || "Something went wrong. Please try again later.");
      }
    } catch {
      setResendMessage("Something went wrong. Please try again later.");
    } finally {
      setResendLoading(false);
    }
  }

  if (effectiveState === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4">
        <Spinner />
        <p className="text-sm text-neutral-400">Verifying your email…</p>
      </div>
    );
  }

  if (effectiveState === "success") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-3xl">
          ✅
        </div>
        <h1 className="text-2xl font-bold text-white">Email verified successfully</h1>
        <p className="text-sm text-neutral-400">
          Your email address has been confirmed. Welcome to CodeRush!
        </p>
        <div className="mt-2 flex gap-3">
          <button
            onClick={() => {
              router.replace("/dashboard");
              router.refresh();
            }}
            className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2 transition-colors"
          >
            Go to Dashboard
          </button>
          <Link
            href="/login"
            className="rounded-md border border-neutral-700 hover:border-neutral-500 text-neutral-200 px-5 py-2 transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (effectiveState === "used") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-3xl">
          ℹ️
        </div>
        <h1 className="text-2xl font-bold text-white">Already verified</h1>
        <p className="text-sm text-neutral-400">
          This verification link has already been used. If your email is already
          verified, just log in.
        </p>
        <Link
          href="/login"
          className="mt-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2 transition-colors"
        >
          Log in
        </Link>
      </div>
    );
  }

  // Token-less visit (post-signup / unverified login / malformed link).
  // This is a normal, expected state — not an error — so render a friendly
  // "check your inbox" panel with resend, matching the original messaging.
  if (effectiveState === "awaiting") {
    // Wait for the auth session to resolve before deciding what to show
    // (avoids flashing the logged-out prompt for signed-in users).
    if (userStatus === undefined) {
      return (
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          <p className="text-sm text-neutral-400">Loading…</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-3xl">
          📬
        </div>
        <h1 className="text-2xl font-bold text-white">
          {sentJustNow ? "Verification email sent" : "Check your inbox"}
        </h1>
        <p className="text-sm text-neutral-400">
          {sentJustNow
            ? `We sent a verification link to ${
                userStatus.email ?? "your email address"
              }. Open the link in that email to verify your account.`
            : userStatus.authenticated
              ? "To verify your account, open the verification link from your email. You can also request a new verification email below."
              : "This page verifies the link from your verification email. If you didn't get the email, log in and request a new one below."}
        </p>
        <ResendSection
          canResend={canResend}
          resendMessage={resendMessage}
          resendLoading={resendLoading}
          cooldown={cooldown}
          onResend={handleResend}
          onGoToLogin={() => {
            router.replace("/login");
            router.refresh();
          }}
        />
      </div>
    );
  }

  const needsResend =
    effectiveState === "expired" || effectiveState === "invalid" || state === "error";

  if (needsResend) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-3xl">
          ❌
        </div>
        <h1 className="text-2xl font-bold text-white">
          {effectiveState === "expired" ? "Expired verification link" : "Verification failed"}
        </h1>
        <p className="text-sm text-neutral-400">
          {effectiveState === "expired"
            ? "This link has expired. Request a new verification email below."
            : effectiveState === "invalid"
              ? "Invalid verification link."
              : (errorMessage ?? "Something went wrong. Please try again later.")}
        </p>
        <ResendSection
          canResend={canResend}
          resendMessage={resendMessage}
          resendLoading={resendLoading}
          cooldown={cooldown}
          onResend={handleResend}
          onGoToLogin={() => {
            router.replace("/login");
            router.refresh();
          }}
        />
      </div>
    );
  }

  return null;
}

interface ResendSectionProps {
  canResend: boolean;
  resendMessage: string | null;
  resendLoading: boolean;
  cooldown: number;
  onResend: () => void;
  onGoToLogin: () => void;
}

function ResendSection({
  canResend,
  resendMessage,
  resendLoading,
  cooldown,
  onResend,
  onGoToLogin,
}: ResendSectionProps) {
  return (
    <div className="mt-2 flex flex-col items-center gap-3">
      {canResend ? (
        <>
          <button
            onClick={onResend}
            disabled={resendLoading || cooldown > 0}
            className="rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold px-5 py-2 transition-colors"
          >
            {resendLoading
              ? "Sending…"
              : cooldown > 0
                ? `Resend available in ${cooldown}s`
                : "Resend verification email"}
          </button>
          {resendMessage && <p className="text-sm text-neutral-300">{resendMessage}</p>}
        </>
      ) : (
        <>
          <p className="text-sm text-neutral-500">
            Logged out? Log in to request a new verification email.
          </p>
          <button
            onClick={onGoToLogin}
            className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2 transition-colors"
          >
            Go to Login
          </button>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <div className="flex flex-col items-center gap-4">
              <Spinner />
              <p className="text-sm text-neutral-400">Loading…</p>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
