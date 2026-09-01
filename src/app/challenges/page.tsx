"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";


type ChallengeCategory =
  | "coding"
  | "game"
  | "web"
  | "ai"
  | "creative"
  | "innovation"
  | "speed"
  | "hackathon";


const CATEGORIES: Array<{ value: "" | ChallengeCategory; label: string }> = [
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
  const [category, setCategory] = useState<"" | ChallengeCategory>("");
  const [difficulty, setDifficulty] = useState(
    () =>
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("difficulty") ?? ""
        : ""
  );
  const [themeSearch, setThemeSearch] = useState(
    () =>
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("theme") ?? ""
        : ""
  );
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      setMouse({ x, y });
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);
    () =>
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("difficulty") ?? ""
        : ""
  );
  const [themeSearch, setThemeSearch] = useState(
    () =>
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("theme") ?? ""
        : ""
  );

  const challenges = useQuery(api.challenges.list, {
    category: category || undefined,
    difficulty: difficulty || undefined,
  });

  return (
    <div className="relative min-h-screen bg-black text-white px-4 py-10 overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f0d] via-black to-black" />
        <div
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-emerald-500/15 rounded-full blur-[150px] animate-[drift1_16s_ease-in-out_infinite] transition-transform duration-300 ease-out"
          style={{ transform: `translate(calc(-50% + ${mouse.x}px), ${mouse.y}px)` }}
        />
        <div
          className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-[130px] animate-[drift2_20s_ease-in-out_infinite] transition-transform duration-300 ease-out"
          style={{ transform: `translate(${-mouse.x}px, ${-mouse.y}px)` }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
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

              <input
                  type="text"
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  placeholder="Search by theme (e.g. Space, Sustainability)…"
                  className="w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-white text-sm outline-none focus:border-neutral-500 mb-8"
              />

        {challenges === undefined && (
          <p className="text-neutral-500">Loading challenges…</p>
        )}

        {challenges?.length === 0 && (
          <p className="text-neutral-500">No challenges match these filters.</p>
        )}

              <div className="grid gap-4 sm:grid-cols-2">
                  {challenges
                      ?.filter((c) =>
                          themeSearch
                              ? c.theme?.toLowerCase().includes(themeSearch.toLowerCase())
                              : true
                      )
                      .map((challenge) => (
            <Link
              key={challenge._id}
              href={`/challenges/${challenge._id}`}
              className="liquid-glass block rounded-lg p-5 hover:scale-[1.02] transition-transform"
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

      <style jsx>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50% { transform: translate(-42%, 50px) scale(1.1); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -30px) scale(1.08); }
        }
      `}</style>

      <style jsx global>{`
        .liquid-glass {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: none;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.08);
          position: relative;
          overflow: hidden;
        }
        .liquid-glass::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.2px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.35) 0%,
            rgba(255, 255, 255, 0.1) 25%,
            rgba(255, 255, 255, 0) 50%,
            rgba(255, 255, 255, 0.1) 75%,
            rgba(255, 255, 255, 0.35) 100%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}