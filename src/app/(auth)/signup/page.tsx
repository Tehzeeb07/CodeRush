"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

/**
 * Ask the server to send the verification email. Retried once in case the
 * Convex Auth cookie has not been synced yet (it is set asynchronously right
 * after signIn). Returns a user-safe message on failure, never throws.
 */
async function requestVerificationEmail(): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch("/api/email/send-verification", { method: "POST" });
      const data: { status?: string; message?: string } = await res
        .json()
        .catch(() => ({}));
      if (res.ok && data.status === "ok") return null; // success
      if (res.ok && data.status === "already_verified") return null;
      if (res.status === 401 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 700)); // cookie may still be syncing
        continue;
      }
      // Surface a safe, actionable message — never silently fail.
      return (
        data.message ??
        "Account created, but the verification email could not be sent. You can resend it from the verification page."
      );
    } catch {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 700));
        continue;
      }
      return "Account created, but the verification email could not be sent right now. You can resend it from the verification page.";
    }
  }
  return "Account created, but the verification email could not be sent right now. You can resend it from the verification page.";
}

export default function SignupPage() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const createProfile = useMutation(api.users.createProfile);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError("Username must be 3-20 characters: letters, numbers, underscores only");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await signIn("password", { email, password, flow: "signUp" });
      await new Promise((resolve) => setTimeout(resolve, 300));
      await createProfile({ username });

      // Send the verification email (non-blocking for account creation).
      // Failures are surfaced to the user, never silent.
      const emailError = await requestVerificationEmail();

      // New accounts are not email-verified yet: always land on the
      // verification page, which offers resend + login/dashboard actions.
      router.replace(`/verify-email${emailError ? "" : "?sent=1"}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(
        message.includes("already") || message.toLowerCase().includes("exists")
          ? "Email or username is already taken"
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
        <p className="text-neutral-400 mb-6 text-sm">
          Join CodeRush and start building.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-white outline-none focus:border-neutral-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-white outline-none focus:border-neutral-500"
              placeholder="coderush_dev"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-white outline-none focus:border-neutral-500"
              placeholder="At least 8 characters"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold py-2 transition-colors"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="text-sm text-neutral-400 mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}