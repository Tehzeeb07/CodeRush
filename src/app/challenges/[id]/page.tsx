"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { Id } from "../../../../convex/_generated/dataModel";
import SubmitForm from "./submit-form";

const CATEGORY_LABELS: Record<string, string> = {
  coding: "🧩 Coding",
  game: "🎮 Game",
  web: "🌐 Web",
  ai: "🤖 AI",
  creative: "🎨 Creative Coding",
  innovation: "💡 Innovation",
  speed: "⚡ Speed",
  hackathon: "🏆 Hackathon",
};

export default function ChallengeDetailsPage() {
  const params = useParams<{ id: string }>();
  const challenge = useQuery(api.challenges.get, {
    id: params.id as Id<"challenges">,
  });

  if (challenge === undefined) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Loading…
      </div>
    );
  }

  if (challenge === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 gap-4">
        <p>Challenge not found.</p>
        <Link href="/challenges" className="text-emerald-400 hover:underline text-sm">
          ← Back to challenges
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/challenges" className="text-sm text-neutral-400 hover:underline">
          ← Back to challenges
        </Link>

        <div className="flex items-center justify-between mt-4 mb-2">
          <span className="text-sm text-neutral-400">
            {CATEGORY_LABELS[challenge.category] ?? challenge.category}
          </span>
          <span className="text-sm text-emerald-400 font-semibold">
            {challenge.xpReward} XP
          </span>
        </div>

        <h1 className="text-3xl font-bold mb-2">{challenge.title}</h1>

        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 capitalize">
            {challenge.difficulty}
          </span>
          {challenge.theme && (
            <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
              Theme: {challenge.theme}
            </span>
          )}
          {challenge.deadline && (
            <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
              Deadline: {new Date(challenge.deadline).toLocaleDateString()}
            </span>
          )}
        </div>

        <p className="text-neutral-300 whitespace-pre-wrap leading-relaxed mb-8">
          {challenge.description}
        </p>

        <SubmitForm challengeId={challenge._id} />

        <SubmissionsList challengeId={challenge._id} />
      </div>
    </div>
  );
}