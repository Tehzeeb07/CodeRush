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

  const isWebChallenge =
    challenge?.category === "web" ||
    (challenge?.category === "hackathon" &&
      challenge.hackathonCategory === "web");

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
            {challenge.category === "hackathon" && challenge.hackathonCategory && (
              <span className="text-neutral-500">
                {" · "}
                {challenge.hackathonCategory === "ai"
                  ? "🤖 AI"
                  : challenge.hackathonCategory === "coding"
                    ? "🧩 Coding"
                    : "🌐 Web Development"}
              </span>
            )}
          </span>
          <span className="text-sm text-emerald-400 font-semibold">
            {challenge.xpReward} XP
          </span>
        </div>

        <h1 className="text-3xl font-bold mb-2">{challenge.title}</h1>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 capitalize">
            {challenge.difficulty}
          </span>
          {challenge.theme && (
            <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
              Theme: {challenge.theme}
            </span>
          )}
          {challenge.startDate && (
            <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
              Starts: {new Date(challenge.startDate).toLocaleDateString()}
            </span>
          )}
          {challenge.endDate && (
            <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
              Ends: {new Date(challenge.endDate).toLocaleDateString()}
            </span>
          )}
          {challenge.deadline && (
            <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
              Deadline: {new Date(challenge.deadline).toLocaleDateString()}
            </span>
          )}
        </div>

        {challenge.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={challenge.bannerUrl}
            alt={challenge.title}
            className="mb-8 w-full max-h-72 rounded-xl border border-neutral-800 object-cover"
          />
        )}

        <p className="text-neutral-300 whitespace-pre-wrap leading-relaxed mb-8">
          {challenge.description}
        </p>

        {challenge.rules && (
          <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-300">
              Rules & Guidelines
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-400">
              {challenge.rules}
            </p>
          </div>
        )}

        {isWebChallenge ? (
          <div className="mb-8 rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Ready to build?
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                  Work on your solution in the dedicated HTML / CSS /
                  JavaScript workspace with a live preview.
                </p>
              </div>
              <Link
                href={`/challenges/${challenge._id}/editor`}
                className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-indigo-500"
              >
                Open in Editor →
              </Link>
            </div>
          </div>
        ) : (
          <SubmitForm challengeId={challenge._id} />
        )}

        <SubmissionsList
          challengeId={challenge._id}
          isWebChallenge={isWebChallenge}
        />
      </div>
    </div>
  );
  function SubmissionsList({
    challengeId,
    isWebChallenge,
  }: {
    challengeId: Id<"challenges">;
    isWebChallenge: boolean;
  }) {
    const submissions = useQuery(api.submissions.listForChallenge, { challengeId });

    if (!submissions || submissions.length === 0) return null;

    return (
      <div className="mt-8">
        <h3 className="font-semibold text-lg mb-3">
          Submissions ({submissions.length})
        </h3>
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s._id} className="border border-neutral-800 rounded-lg p-4 bg-neutral-900">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{s.username}</span>
                <span className="text-xs text-neutral-500">
                  {new Date(s.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-neutral-400 text-sm mb-2">{s.description}</p>
              <div className="flex gap-3 text-xs">
                {s.repoUrl && (
                  <a href={s.repoUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                    Repo →
                  </a>
                )}
                {s.demoUrl && (
                  <a href={s.demoUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                    Live demo →
                  </a>
                )}
                {isWebChallenge && s.status && (
                  <span className="capitalize text-neutral-400">
                    Status: {s.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}