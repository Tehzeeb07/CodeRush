"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import {
  Cabin,
  Inter,
  Instrument_Serif,
  Manrope,
} from "next/font/google";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const cabin = Cabin({ subsets: ["latin"], variable: "--font-cabin" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260210_031346_d87182fb-b0af-4273-84d1-c6fd17d6bf0f.mp4";

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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const challenges = useQuery(api.challenges.list, {
    category: category || undefined,
    difficulty: difficulty || undefined,
  });

  return (
    <div
      className={`${manrope.variable} ${cabin.variable} ${instrumentSerif.variable} ${inter.variable} relative isolate min-h-screen overflow-hidden bg-[#0b0712] text-white`}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <video
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
      </div>

      <div className="pointer-events-none absolute inset-0 z-0 bg-transparent" />

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 px-6 py-5">
          <div className="flex items-center justify-between">
            <span className={`${manrope.className} text-sm font-medium text-white`}>
              Challenges
            </span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className={`${cabin.className} rounded-lg border border-white/15 px-4 py-2 text-sm text-white`}
            >
              Close
            </button>
          </div>
          <div className="mt-10 space-y-4">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  setCategory(c.value);
                  setMenuOpen(false);
                }}
                className={`${manrope.className} block w-full rounded-xl border border-white/10 px-4 py-3 text-left text-white/90`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative z-10 px-4 py-6 sm:px-6 lg:px-[120px]">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className={`${manrope.className} text-sm text-white/80 hover:text-white`}
          >
            ← Back to dashboard
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/20 text-white lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <HamburgerGlyph />
          </button>
        </div>

        <section className="mx-auto max-w-6xl rounded-[28px] border border-white/10 bg-[#120d1f]/55 p-5 shadow-[0_25px_90px_rgba(0,0,0,0.4)] backdrop-blur-[24px] sm:p-7 lg:p-10">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4">
              <h1 className={`${instrumentSerif.className} text-4xl font-normal tracking-tight sm:text-5xl lg:text-6xl`}>
                🏆 Challenges
              </h1>

              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`${manrope.className} rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      category === c.value
                        ? "border-[#7b39fc] bg-[#7b39fc] text-white"
                        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`${cabin.className} rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      difficulty === d.value
                        ? "border-white bg-white text-[#171717]"
                        : "border-white/10 bg-[#2b2344]/80 text-white/80 hover:bg-[#2b2344]"
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
                className={`${inter.className} w-full rounded-[12px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/45 outline-none transition-colors focus:border-[#7b39fc]`}
              />
            </div>

            {challenges === undefined && (
              <p className={`${manrope.className} text-white/60`}>Loading challenges…</p>
            )}

            {challenges?.length === 0 && (
              <p className={`${manrope.className} text-white/60`}>
                No challenges match these filters.
              </p>
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
                    className="group block rounded-[18px] border border-white/10 bg-[rgba(43,35,68,0.56)] p-5 transition-transform duration-200 hover:-translate-y-1 hover:border-white/20"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className={`${manrope.className} text-xs uppercase tracking-[0.18em] text-white/55`}>
                        {CATEGORIES.find((c) => c.value === challenge.category)?.label ??
                          challenge.category}
                      </span>
                      <span className={`${cabin.className} text-xs font-medium text-[#bda4ff]`}>
                        {challenge.xpReward} XP
                      </span>
                    </div>
                    <h2 className={`${instrumentSerif.className} mb-2 text-2xl text-white`}>
                      {challenge.title}
                    </h2>
                    {challenge.theme && (
                      <p className={`${inter.className} mb-2 text-sm text-white/70`}>
                        Theme: {challenge.theme}
                      </p>
                    )}
                    <p className={`${inter.className} line-clamp-2 text-sm leading-6 text-white/65`}>
                      {challenge.description}
                    </p>
                    <span
                      className={`${cabin.className} mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs capitalize text-white/80`}
                    >
                      {challenge.difficulty}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function HamburgerGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
