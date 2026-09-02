"use client";

/**
 * /problems/[slug] — the editor workspace for one problem.
 * Loads the sanitized problem (no hidden tests travel here), wires auth
 * state into the workspace, and owns the Convex query subscription.
 */

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useConvexAuth } from "@convex-dev/auth/react";

import Link from "next/link";
import ProblemWorkspace from "@/components/code-editor/problem/ProblemWorkspace";

export default function ProblemPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = use(params);
    const problem = useQuery(api.problems.getProblemBySlug, { slug });
    const { isLoading, isAuthenticated } = useConvexAuth();
    // Live subscription to the backend-verified progress for this user +
    // problem (null while anonymous). The client never writes this — it is
    // updated exclusively by the judge/XP pipeline (§13, §18).
    const progress = useQuery(
        api.xp.getMyProblemProgress,
        isAuthenticated ? { slug } : "skip",
    );

    if (!problem) {
        return (
            <div className="cr-shell mx-auto w-full max-w-2xl px-4 py-16">
                <p className="mb-4 text-sm text-neutral-400">
                    Loading problem…
                </p>
                <div className="skeleton h-8 w-56 rounded-lg" />
                <div className="skeleton mt-3 h-8 w-full rounded-lg" />
                <div className="skeleton mt-3 h-8 w-3/4 rounded-lg" />
                <Link
                    href="/problems"
                    className="mt-8 inline-block text-sm text-indigo-300 hover:underline"
                >
                    ← All problems
                </Link>
            </div>
        );
    }

    // Unknown slugs return a friendly empty state.
    if (problem.slug !== slug) {
        /* unreachable with unique index; defensive no-op */
    }

    const signedIn = !isLoading && isAuthenticated;

    return (
        <ProblemWorkspace
            problem={problem}
            signedIn={signedIn}
            progress={progress ?? null}
        />
    );
}
