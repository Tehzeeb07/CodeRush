"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";

export default function FollowingPage() {
  const params = useParams<{ username: string }>();
  const profile = useQuery(api.users.getByUsername, { username: params.username });
  const following = useQuery(
    api.follows.followingList,
    profile ? { targetUserId: profile.userId } : "skip"
  );

  if (profile === undefined || following === undefined) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Loading…
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        User not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-10">
      <div className="max-w-md mx-auto">
        <Link href={`/u/${params.username}`} className="text-sm text-neutral-400 hover:underline">
          ← Back to {params.username}
        </Link>

        <h1 className="text-xl font-bold mt-4 mb-6">
          {params.username} follows ({following.length})
        </h1>

        {following.length === 0 && (
          <p className="text-neutral-500 text-sm">Not following anyone yet.</p>
        )}

        <div className="space-y-2">
          {following.map((f, i) => (
            <Link
              key={i}
              href={`/u/${f.username}`}
              className="flex items-center gap-3 border border-neutral-800 rounded-md p-3 bg-neutral-900 hover:border-neutral-600 transition-colors"
            >
              {f.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs text-neutral-500">
                  {f.username[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-sm">{f.username}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}