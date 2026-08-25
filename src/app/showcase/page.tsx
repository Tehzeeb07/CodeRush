"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import LikeButton from "./like-button";

export default function ShowcasePage() {
  const submissions = useQuery(api.submissions.listAll);

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-sm text-neutral-400 hover:underline">
          ← Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold mt-4 mb-6">🖼️ Project Showcase</h1>

        {submissions === undefined && (
          <p className="text-neutral-500">Loading projects…</p>
        )}

        {submissions?.length === 0 && (
          <p className="text-neutral-500">
            No projects submitted yet — be the first!
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {submissions?.map((s) => (
            <div
              key={s._id}
              className="border border-neutral-800 rounded-lg p-5 bg-neutral-900"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-neutral-500">{s.challengeTitle}</span>
                <LikeButton submissionId={s._id} />
              </div>

              <p className="font-medium text-sm mb-1">by {s.username}</p>
              <p className="text-neutral-400 text-sm mb-3">{s.description}</p>

              <div className="flex gap-3 text-xs">
                
                  href={s.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  Repo →
                </a>
                {s.demoUrl && (
                  
                    href={s.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline"
                  >
                    Live demo →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}