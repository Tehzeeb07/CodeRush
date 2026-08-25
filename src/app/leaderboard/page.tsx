"use client";

/**
 * /leaderboard — public ranking of CodeRush coders.
 *
 * Ranking is computed entirely on the backend (convex/leaderboard.ts)
 * from real execution data. This page renders:
 *  - time filters (All Time / This Week / This Month / Today),
 *  - a podium for the top 3,
 *  - a table for everyone else with the current user highlighted,
 *  - a separate "Your Rank" card when the viewer is outside the top list.
 */

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { UiErrorBoundary, SkeletonList } from "@/components/ui/states";

type Period = "all" | "week" | "month" | "day";

const PERIOD_TABS: { value: Period; label: string }[] = [
    { value: "all", label: "All Time" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "day", label: "Today" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

interface Entry {
    rank: number;
    username: string;
    avatarUrl: string | null;
    points: number;
    totalSubmissions: number;
    successfulSubmissions: number;
    failedSubmissions: number;
    problemsSolved: number;
    successRate: number;
}

function Avatar({
    username,
    avatarUrl,
    size = "w-8 h-8",
}: {
    username: string;
    avatarUrl: string | null;
    size?: string;
}) {
    if (avatarUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatarUrl}
                alt={`${username}'s avatar`}
                className={`${size} rounded-full object-cover border border-neutral-800`}
                onError={(e) => (e.currentTarget.style.display = "none")}
            />
        );
    }
    return (
        <div
            className={`${size} rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 text-sm font-semibold`}
        >
            {username.charAt(0).toUpperCase()}
        </div>
    );
}

function PodiumCard({ entry }: { entry: Entry }) {
    return (
        <Link
            href={`/u/${entry.username}`}
            className={`flex flex-col items-center rounded-lg border p-5 text-center transition-colors ${
                entry.rank === 1
                    ? "border-yellow-600/60 bg-yellow-950/20 hover:border-yellow-500"
                    : entry.rank === 2
                        ? "border-neutral-600 bg-neutral-900 hover:border-neutral-400"
                        : "border-amber-800/60 bg-amber-950/10 hover:border-amber-600"
            }`}
        >
            <span className="text-3xl">{MEDALS[entry.rank - 1]}</span>
            <div className="mt-2">
                <Avatar username={entry.username} avatarUrl={entry.avatarUrl} size="w-12 h-12" />
            </div>
            <p className="mt-2 font-semibold text-white hover:underline">
                {entry.username}
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-400">
                {entry.points} pts
            </p>
            <p className="text-xs text-neutral-500">Rank #{entry.rank}</p>
        </Link>
    );
}

export default function LeaderboardPage() {
    const [period, setPeriod] = useState<Period>("all");

    const viewer = useQuery(api.users.currentUser);
    const leaderboard = useQuery(api.leaderboard.getLeaderboard, {
        period,
        limit: 50,
    });

    const podium = leaderboard ? leaderboard.entries.slice(0, 3) : [];
    const rest = leaderboard ? leaderboard.entries.slice(3) : [];

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 pb-16">
                <div>
                    <h1 className="text-2xl font-bold">Leaderboard</h1>
                    <p className="mt-1 text-sm text-neutral-400">
                        +10 points per successful execution. Run code to climb the ranks.
                    </p>
                </div>

                {/* Time filters */}
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Leaderboard period">
                    {PERIOD_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            role="tab"
                            aria-selected={period === tab.value}
                            onClick={() => setPeriod(tab.value)}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                                period === tab.value
                                    ? "border-emerald-600 bg-emerald-950 text-emerald-300"
                                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <UiErrorBoundary>
                    {leaderboard === undefined ? (
                        /* Loading skeleton */
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="h-40 animate-pulse rounded-lg bg-neutral-900 border border-neutral-800" />
                                ))}
                            </div>
                            <SkeletonList count={5} />
                        </div>
                    ) : leaderboard.entries.length === 0 && !leaderboard.me ? (
                        /* Empty state */
                        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-10 text-center">
                            <p className="font-medium text-white">No leaderboard data yet.</p>
                            <p className="mt-2 text-sm text-neutral-400">
                                Start coding and run your first program to appear on the leaderboard.
                            </p>
                            <Link
                                href="/code"
                                className="mt-4 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                            >
                                Open Code Editor
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Top 3 podium */}
                            {podium.length > 0 && (
                                <div
                                    className={`grid grid-cols-1 gap-3 ${
                                        podium.length === 3
                                            ? "sm:grid-cols-3"
                                            : podium.length === 2
                                                ? "sm:grid-cols-2"
                                                : ""
                                    }`}
                                >
                                    {podium.map((entry) => (
                                        <PodiumCard key={entry.rank} entry={entry} />
                                    ))}
                                </div>
                            )}


                            {/* Remaining users */}
                            {rest.length > 0 && (
                                <div className="overflow-x-auto rounded-lg border border-neutral-800">
                                    <table className="w-full min-w-[640px] text-left text-sm">
                                        <thead className="bg-neutral-900 text-xs uppercase tracking-wider text-neutral-500">
                                            <tr>
                                                <th className="px-4 py-3">Rank</th>
                                                <th className="px-4 py-3">User</th>
                                                <th className="px-4 py-3 text-right">Problems Solved</th>
                                                <th className="px-4 py-3 text-right">Submissions</th>
                                                <th className="px-4 py-3 text-right">Success Rate</th>
                                                <th className="px-4 py-3 text-right">Points</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-800 bg-neutral-950">
                                            {rest.map((entry) => {
                                                const isMe =
                                                    viewer != null &&
                                                    entry.username === viewer.username;
                                                return (
                                                    <tr
                                                        key={entry.userId}
                                                        className={
                                                            isMe
                                                                ? "bg-emerald-950/40"
                                                                : "hover:bg-neutral-900"
                                                        }
                                                    >
                                                        <td className="px-4 py-3 font-medium text-neutral-400">
                                                            #{entry.rank}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Link
                                                                href={`/u/${entry.username}`}
                                                                className="flex items-center gap-2 group"
                                                            >
                                                                <Avatar username={entry.username} avatarUrl={entry.avatarUrl} />
                                                                <span className={`group-hover:underline ${isMe ? "font-semibold text-emerald-300" : "text-white"}`}>
                                                                    {entry.username}
                                                                    {isMe && (
                                                                        <span className="ml-2 rounded bg-emerald-900 px-1.5 py-0.5 text-xs text-emerald-300">
                                                                            You
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </Link>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">{entry.problemsSolved}</td>
                                                        <td className="px-4 py-3 text-right text-neutral-300">
                                                            {entry.totalSubmissions}{" "}
                                                            <span className="text-neutral-500">({entry.successfulSubmissions} ok)</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">{entry.successRate}%</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                                                            {entry.points}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Current user outside the visible top list */}
                            {leaderboard.me && (
                                <section className="rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-5">
                                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                        Your Rank
                                    </h2>
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl font-bold text-emerald-300">
                                            #{leaderboard.me.rank}
                                        </span>
                                        <Avatar
                                            username={leaderboard.me.username}
                                            avatarUrl={leaderboard.me.avatarUrl}
                                            size="w-10 h-10"
                                        />
                                        <div>
                                            <p className="font-semibold">{leaderboard.me.username}</p>
                                            <p className="text-sm text-neutral-400">
                                                {leaderboard.me.points} Points ·{" "}
                                                {leaderboard.me.problemsSolved} Problems Solved ·{" "}
                                                {leaderboard.me.successRate}% Success
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </UiErrorBoundary>
            </main>
        </div>
    );
}

