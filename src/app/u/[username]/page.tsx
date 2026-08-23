"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const profile = useQuery(api.users.getByUsername, { username: params.username });

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
        <p>No user found with username "{params.username}"</p>
        <Link href="/dashboard" className="text-emerald-400 hover:underline text-sm">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-10">
      <div className="max-w-md mx-auto">
        <Link href="/dashboard" className="text-sm text-neutral-400 hover:underline">
          ← Back to dashboard
        </Link>

        <div className="flex items-center gap-4 mt-6 mb-6">
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
          </div>
        </div>

        {profile.bio ? (
          <p className="text-neutral-300 whitespace-pre-wrap">{profile.bio}</p>
        ) : (
          <p className="text-neutral-500 italic">No bio yet.</p>
        )}
      </div>
    </div>
  );
}