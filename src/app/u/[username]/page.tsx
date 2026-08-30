"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";

function formatStatus(status: string): string {
    switch (status) {
        case "success":
            return "✅ Success";
        case "runtime_error":
            return "⚠️ Runtime error";
        case "compilation_error":
            return "🛑 Compilation error";
        case "timeout":
            return "⏱️ Timeout";
        default:
            return status;
    }
}

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const profile = useQuery(api.users.getByUsername, { username: params.username });
  const stats = useQuery(api.leaderboard.getUserPublicStats, {
    username: params.username,
  });

  const counts = useQuery(
    api.follows.counts,
    profile ? { targetUserId: profile.userId } : "skip"
  );
  const isFollowing = useQuery(
    api.follows.isFollowing,
    profile ? { targetUserId: profile.userId } : "skip"
  );
  const toggleFollow = useMutation(api.follows.toggle);

  if (profile === undefined) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Loading…
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 gap-4">
        <p>No user found with username &quot;{params.username}&quot;</p>
        <Link href="/dashboard" className="text-emerald-400 hover:underline text-sm">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-sm text-neutral-400 hover:underline">
          ← Back to dashboard
        </Link>

        <div className="flex items-center gap-4 mt-6 mb-2">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={`${profile.username}'s avatar`}
              className="w-20 h-20 rounded-full object-cover border border-neutral-800"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500 text-2xl">
              {profile.username[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{profile.username}</h1>
            <p className="text-emerald-400 text-sm font-medium">{profile.xp} XP</p>
            <p className="text-neutral-500 text-xs mt-1">
              {counts?.followers ?? 0} followers · {counts?.following ?? 0} following
            </p>
          </div>
        </div>

        <button
          onClick={() => toggleFollow({ targetUserId: profile.userId })}
          className={`text-sm px-4 py-2 rounded-md font-semibold transition-colors mb-6 ${
            isFollowing
              ? "border border-neutral-700 hover:bg-neutral-800 text-white"
              : "bg-emerald-500 hover:bg-emerald-400 text-black"
          }`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>

        {profile.bio ? (
          <p className="text-neutral-300 whitespace-pre-wrap">{profile.bio}</p>
        ) : (
          <p className="text-neutral-500 italic">No bio yet.</p>
        )}

        {/* Coding statistics (from convex/leaderboard.ts — public data only) */}
        <section className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Coding Statistics
          </h2>

          {stats === undefined ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded bg-neutral-800"
                />
              ))}
            </div>
          ) : stats === null ? (
            <p className="text-sm text-neutral-500">Statistics unavailable.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Rank" value={`#${stats.rank}`} />
                <Stat label="Points" value={String(stats.points)} accent />
                <Stat label="Problems Solved" value={String(stats.problemsSolved)} />
                <Stat label="Submissions" value={String(stats.totalSubmissions)} />
                <Stat
                  label="Successful"
                  value={String(stats.successfulSubmissions)}
                />
                <Stat label="Success Rate" value={`${stats.successRate}%`} />
              </div>

              {/* Recent activity */}
              <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Recent Activity
              </h3>
              {stats.recentActivity.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No runs yet — the leaderboard awaits.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-800">
                  {stats.recentActivity.map((activity, i) => (
                    <li key={i} className="flex items-center justify-between py-2 text-sm">
                      <span>{formatStatus(activity.status)}</span>
                      <span className="text-neutral-500">
                        {activity.language}
                        {activity.executionTime !== null &&
                          ` · ${(activity.executionTime / 1000).toFixed(2)}s`}
                        {" · "}
                        {new Date(activity.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <Link
          href="/leaderboard"
          className="mt-6 inline-block text-sm text-emerald-400 hover:underline"
        >
          View full leaderboard →
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${
          accent ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}