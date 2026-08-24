"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import LogoutButton from "./logout-button";
import Link from "next/dist/client/link";

export default function DashboardPage() {
  const user = useQuery(api.users.currentUser);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Loading…
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Not signed in.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome, {user.username ?? "there"} 👋
            </h1>
            <p className="text-neutral-400 text-sm">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/u/${user.username}`} className="text-sm text-neutral-400 hover:underline">
              View profile
            </Link>
            <Link href="/profile" className="text-sm text-neutral-400 hover:underline">
              Edit profile
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-neutral-400 text-sm mb-1">XP</p>
          <p className="text-3xl font-bold text-emerald-400">{user.xp}</p>
        </div>

        <p className="text-neutral-500 text-sm mt-8">
          This is the placeholder dashboard — challenge browsing, profile
          editing, and the rest of CodeRush will build on top of this.
        </p>
      </div>
    </div>
  );
}