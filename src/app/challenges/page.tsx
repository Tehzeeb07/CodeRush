"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "coding", label: "🧩 Coding" },
  { value: "game", label: "🎮 Game" },
  { value: "web", label: "🌐 Web" },
  { value: "ai", label: "🤖 AI" },
  { value: "creative", label: "🎨 Creative" },
  { value: "innovation", label: "💡 Innovation" },
  { value: "speed", label: "⚡ Speed" },
  { value: "hackathon", label: "🏆 Hackathon" },
];

const DIFFICULTIES = [
  { value: "", label: "All" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function ChallengesPage() {
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const challenges = useQuery(api.challenges.list, {
    category: category || undefined,
    difficulty: difficulty || undefined,
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-sm text-neutral-400 hover:underline">
          ← Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold mt-4 mb-6">🏆 Challenges</h1>

        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                category === c.value
                  ? "bg-emerald-500 border-emerald-500 text-black font-semibold"
                  : "border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                difficulty === d.value
                  ? "bg-neutral-200 border-neutral-200 text-black font-semibold"
                  : "border-neutral-800 text-neutral-500 hover:bg-neutral-900"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {challenges === undefined && (
          <p className="text-neutral-500">Loading challenges…</p>
        )}

        {challenges?.length === 0 && (
          <p className="text-neutral-500">No challenges match these filters.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {challenges?.map((challenge) => (
            <Link
              key={challenge._id}
              href={`/challenges/${challenge._id}`}
              className="block rounded-lg border border-neutral-800 bg-neutral-900 p-5 hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wide text-neutral-500">
                  {CATEGORIES.find((c) => c.value === challenge.category)?.label ??
                    challenge.category}
                </span>
                <span className="text-xs text-emerald-400 font-semibold">
                  {challenge.xpReward} XP
                </span>
              </div>
              <h2 className="font-semibold text-lg mb-1">{challenge.title}</h2>
              {challenge.theme && (
                <p className="text-neutral-400 text-sm mb-2">Theme: {challenge.theme}</p>
              )}
              <p className="text-neutral-500 text-sm line-clamp-2">
                {challenge.description}
              </p>
              <span className="inline-block mt-3 text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 capitalize">
                {challenge.difficulty}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}