"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { Ban, ShieldAlert } from "lucide-react";
import { api } from "../../../convex/_generated/api";

/**
 * App-wide ban enforcement.
 *
 * Renders nothing while the viewer is allowed; when the authenticated
 * user's profile has isBanned, every page collapses to a full "Your
 * account has been suspended" screen with a sign-out action. Backend
 * mutations reject banned callers independently — this is a UX layer,
 * not the security boundary.
 */
export function BanGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const identity = useQuery(api.roles.me);

  const isBanned = identity?.isBanned === true;

  useEffect(() => {
    if (isBanned) {
      // Drop them out of any admin layout state (sidebar, guards) visually by
      // resetting scroll + not navigating; the screen below is global.
      window.scrollTo(0, 0);
    }
  }, [isBanned]);

  if (isBanned) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070B14] p-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-900/40 bg-[#0F172A] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <Ban size={32} className="text-red-400" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-white">
            Your account has been suspended
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            An administrator has restricted your access to CodeRush’s protected
            functionality. If you believe this is a mistake, please contact an
            administrator to restore your account.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-xs text-red-300">
            <ShieldAlert size={14} />
            Access to protected platform features is disabled.
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/login");
              router.refresh();
            }}
            className="mt-6 w-full rounded-lg border border-slate-700 bg-[#1E293B] px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700/50"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}