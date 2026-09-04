"use client";

/**
 * /challenges/[id]/editor — Web Development challenge workspace.
 *
 * Guards: challenge exists, is a Web Development challenge, and the user is
 * signed in. Everything else is delegated to <WebEditor /> (drafts, preview,
 * save, submit).
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import WebEditor from "@/components/web-editor/WebEditor";

export default function WebChallengeEditorPage() {
  const params = useParams<{ id: string }>();
  const challenge = useQuery(api.challenges.get, {
    id: params.id as Id<"challenges">,
  });
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

  if (challenge === undefined || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-700 border-t-emerald-400" />
          Loading…
        </div>
      </div>
    );
  }

  if (challenge === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 px-4 text-neutral-400">
        <p>Challenge not found.</p>
        <Link
          href="/challenges"
          className="text-sm text-emerald-400 hover:underline"
        >
          ← Back to challenges
        </Link>
      </div>
    );
  }

  const isWeb =
    challenge.category === "web" ||
    (challenge.category === "hackathon" &&
      challenge.hackathonCategory === "web");

  if (!isWeb) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 px-4 text-center text-neutral-300">
        <p className="text-lg font-semibold text-white">
          This challenge uses the classic code editor
        </p>
        <p className="max-w-md text-sm text-neutral-400">
          The Web Development workspace is only available for challenges with
          the <span className="font-mono text-emerald-400">web</span> category.
        </p>
        <Link
          href={`/challenges/${challenge._id}`}
          className="text-sm text-emerald-400 hover:underline"
        >
          ← Back to challenge
        </Link>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 px-4 text-center">
        <p className="text-lg font-semibold text-white">
          Sign in to open the Web Editor
        </p>
        <p className="max-w-md text-sm text-neutral-400">
          You need an account to save drafts and submit your solution for{" "}
          <span className="text-white">{challenge.title}</span>.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/challenges/${challenge._id}/editor`)}`}
          className="rounded-md bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return <WebEditor challenge={challenge} />;
}