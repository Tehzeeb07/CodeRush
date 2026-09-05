"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cabin,
  Inter,
  Instrument_Serif,
  Manrope,
} from "next/font/google";
import {
  Code2,
  Trophy,
  Search,
  Sparkles,
  CheckCircle2,
  Clock,
  Shuffle,
  Terminal,
  Cpu,
  ArrowRight,
  Layers,
  Zap,
  Flame,
  Check,
  Filter,
  CalendarDays,
} from "lucide-react";

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

type ViewTab = "problems" | "challenges" | "all";

const CATEGORIES: Array<{ value: "" | ChallengeCategory; label: string }> = [
  { value: "", label: "All Categories" },
  { value: "coding", label: "🧩 Coding" },
  { value: "game", label: "🎮 Game" },
  { value: "web", label: "🌐 Web" },
  { value: "ai", label: "🤖 AI" },
  { value: "creative", label: "🎨 Creative" },
  { value: "innovation", label: "💡 Innovation" },
  { value: "speed", label: "⚡ Speed" },
  { value: "hackathon", label: "🏆 Hackathon" },
];

const CHALLENGE_DIFFICULTIES = [
  { value: "", label: "All Difficulties" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const PROBLEM_DIFFICULTIES = [
  { value: "", label: "All Difficulties" },
  { value: "easy", label: "Easy", color: "emerald" },
  { value: "medium", label: "Medium", color: "amber" },
  { value: "hard", label: "Hard", color: "rose" },
];

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260210_031346_d87182fb-b0af-4273-84d1-c6fd17d6bf0f.mp4";

export default function ChallengesPage() {
  const router = useRouter();

  // Active View Tab: problems, challenges, or all
  const [activeTab, setActiveTab] = useState<ViewTab>(() => {
    if (typeof window !== "undefined") {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam === "challenges" || tabParam === "all" || tabParam === "problems") {
        return tabParam as ViewTab;
      }
    }
    return "problems";
  });

  // Project Challenges Filters
  const [category, setCategory] = useState<"" | ChallengeCategory>("");
  const [challengeDifficulty, setChallengeDifficulty] = useState(
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

  // Coding Problems Filters
  const [problemSearch, setProblemSearch] = useState("");
  const [problemDifficulty, setProblemDifficulty] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [problemStatusFilter, setProblemStatusFilter] = useState<"all" | "solved" | "attempted" | "unsolved">("all");

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

  // Convex Queries
  const challenges = useQuery(api.challenges.list, {
    category: category || undefined,
    difficulty: challengeDifficulty || undefined,
  });

  const problems = useQuery(api.problems.listProblems, {});
  const userProgress = useQuery(api.xp.listMyProgress, { limit: 200 });

  // Map user progress by problem slug
  const progressMap = useMemo(() => {
    const map = new Map<string, "solved" | "attempted">();
    if (userProgress) {
      for (const prog of userProgress) {
        if (prog.problemSlug) {
          map.set(prog.problemSlug, prog.status);
        }
      }
    }
    return map;
  }, [userProgress]);

  // Extract unique problem tags
  const uniqueTags = useMemo(() => {
    if (!problems) return [];
    const tagsSet = new Set<string>();
    for (const p of problems) {
      for (const tag of p.tags) {
        if (tag.trim()) tagsSet.add(tag.trim());
      }
    }
    return Array.from(tagsSet).slice(0, 15);
  }, [problems]);

  // Filtered problems
  const filteredProblems = useMemo(() => {
    if (!problems) return [];
    return problems.filter((p) => {
      // Search filter
      if (problemSearch.trim()) {
        const query = problemSearch.toLowerCase().trim();
        const matchTitle = p.title.toLowerCase().includes(query);
        const matchSlug = p.slug.toLowerCase().includes(query);
        const matchTag = p.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchTitle && !matchSlug && !matchTag) return false;
      }

      // Difficulty filter
      if (problemDifficulty && p.difficulty !== problemDifficulty) {
        return false;
      }

      // Tag filter
      if (selectedTag && !p.tags.includes(selectedTag)) {
        return false;
      }

      // Status filter
      if (problemStatusFilter !== "all") {
        const status = progressMap.get(p.slug);
        if (problemStatusFilter === "solved" && status !== "solved") return false;
        if (problemStatusFilter === "attempted" && status !== "attempted") return false;
        if (problemStatusFilter === "unsolved" && status !== undefined) return false;
      }

      return true;
    });
  }, [problems, problemSearch, problemDifficulty, selectedTag, problemStatusFilter, progressMap]);

  // Problems Stats
  const problemsStats = useMemo(() => {
    if (!problems) return { total: 0, easy: 0, medium: 0, hard: 0, solved: 0 };
    let easy = 0;
    let medium = 0;
    let hard = 0;
    let solved = 0;

    for (const p of problems) {
      if (p.difficulty === "easy") easy++;
      if (p.difficulty === "medium") medium++;
      if (p.difficulty === "hard") hard++;
      if (progressMap.get(p.slug) === "solved") solved++;
    }

    return {
      total: problems.length,
      easy,
      medium,
      hard,
      solved,
    };
  }, [problems, progressMap]);

  // Pick Random Problem
  function handleRandomProblem() {
    if (!problems || problems.length === 0) return;
    const unsolved = problems.filter((p) => progressMap.get(p.slug) !== "solved");
    const pool = unsolved.length > 0 ? unsolved : problems;
    const randomItem = pool[Math.floor(Math.random() * pool.length)];
    if (randomItem) {
      router.push(`/problems/${randomItem.slug}`);
    }
  }

  return (
    <div
      className={`${manrope.variable} ${cabin.variable} ${instrumentSerif.variable} ${inter.variable} relative isolate min-h-screen overflow-hidden bg-[#07050d] text-white`}
    >
      {/* Background Video */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
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

      {/* Atmospheric Glow overlays */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#0b0714]/80 via-[#07050d]/90 to-[#07050d]" />
      <div className="pointer-events-none absolute left-1/4 top-10 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 top-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 px-6 py-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className={`${manrope.className} text-base font-semibold text-white`}>
              Coding Challenges & Problems
            </span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className={`${cabin.className} rounded-lg border border-white/15 px-4 py-2 text-sm text-white`}
            >
              Close
            </button>
          </div>

          <div className="mt-8 space-y-3">
            <p className="text-xs font-mono uppercase tracking-wider text-white/40">Section</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("problems");
                  setMenuOpen(false);
                }}
                className={`rounded-xl border p-3 text-left font-medium transition ${activeTab === "problems"
                    ? "border-violet-500 bg-violet-500/20 text-white"
                    : "border-white/10 bg-white/5 text-white/70"
                  }`}
              >
                ⚡ Coding Problems
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("challenges");
                  setMenuOpen(false);
                }}
                className={`rounded-xl border p-3 text-left font-medium transition ${activeTab === "challenges"
                    ? "border-violet-500 bg-violet-500/20 text-white"
                    : "border-white/10 bg-white/5 text-white/70"
                  }`}
              >
                🏆 Project Challenges
              </button>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <p className="text-xs font-mono uppercase tracking-wider text-white/40">Categories</p>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  setCategory(c.value);
                  setActiveTab("challenges");
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

      {/* Main Container */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className={`${manrope.className} group inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white`}
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span> Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRandomProblem}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/80 backdrop-blur-md transition hover:border-violet-500/50 hover:bg-violet-500/15 hover:text-white"
            >
              <Shuffle className="h-3.5 w-3.5 text-violet-400" />
              <span className="hidden sm:inline">Random Problem</span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/30 text-white lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              <HamburgerGlyph />
            </button>
          </div>
        </div>

        {/* Hero & Navigation Card */}
        <div className="mb-8 rounded-[32px] border border-white/10 bg-[#120c22]/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                <span>CodeRush Arenas & Problem Sets</span>
              </div>
              <h1 className={`${instrumentSerif.className} text-4xl font-normal tracking-tight sm:text-5xl lg:text-6xl text-white`}>
                Challenges & Problems
              </h1>
              <p className={`${inter.className} mt-3 text-sm leading-relaxed text-white/70 sm:text-base`}>
                Solve competitive algorithmic problems verified with real-time automated test cases, or build full-stack creations for platform-wide hackathon challenges.
              </p>
            </div>

            {/* View Switcher Pills */}
            <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1.5 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setActiveTab("problems")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${activeTab === "problems"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30"
                    : "text-white/60 hover:text-white"
                  }`}
              >
                <Code2 className="h-4 w-4" />
                <span>Problems</span>
                {problems && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-mono">
                    {problems.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("challenges")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${activeTab === "challenges"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30"
                    : "text-white/60 hover:text-white"
                  }`}
              >
                <Trophy className="h-4 w-4" />
                <span>Hackathons</span>
                {challenges && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-mono">
                    {challenges.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${activeTab === "all"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30"
                    : "text-white/60 hover:text-white"
                  }`}
              >
                <Layers className="h-4 w-4" />
                <span>All</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: CODING PROBLEMS                                                */}
        {/* ========================================================================= */}
        {(activeTab === "problems" || activeTab === "all") && (
          <section className="mb-12">
            {/* Section Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
                    <Code2 className="h-4 w-4" />
                  </div>
                  <h2 className={`${manrope.className} text-2xl font-bold tracking-tight text-white`}>
                    Algorithmic Coding Problems
                  </h2>
                </div>
                <p className={`${inter.className} mt-1 text-xs text-white/60 sm:text-sm`}>
                  Run code in Python, C++, Java, or JavaScript. Submit against hidden tests and earn XP.
                </p>
              </div>

              {/* Problem Stats Bar */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-white/80">
                  <span className="text-white/40">Total: </span>
                  <span className="font-semibold text-white">{problemsStats.total}</span>
                </div>
                {problemsStats.solved > 0 && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
                    <span className="text-emerald-400/70">Solved: </span>
                    <span className="font-semibold">{problemsStats.solved}</span>
                  </div>
                )}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 text-emerald-400">
                  Easy: {problemsStats.easy}
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 text-amber-400">
                  Med: {problemsStats.medium}
                </div>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 text-rose-400">
                  Hard: {problemsStats.hard}
                </div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="mb-6 space-y-3 rounded-2xl border border-white/10 bg-[#120d20]/60 p-4 backdrop-blur-xl">
              <div className="grid gap-3 sm:grid-cols-12">
                {/* Search */}
                <div className="relative sm:col-span-6">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={problemSearch}
                    onChange={(e) => setProblemSearch(e.target.value)}
                    placeholder="Search problems by title, tag, or slug…"
                    className={`${inter.className} w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-violet-500`}
                  />
                </div>

                {/* Difficulty Filter */}
                <div className="flex flex-wrap items-center gap-1.5 sm:col-span-6 sm:justify-end">
                  {PROBLEM_DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setProblemDifficulty(d.value)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${problemDifficulty === d.value
                          ? d.value === "easy"
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                            : d.value === "medium"
                              ? "border-amber-500 bg-amber-500/20 text-amber-300"
                              : d.value === "hard"
                                ? "border-rose-500 bg-rose-500/20 text-rose-300"
                                : "border-violet-500 bg-violet-500/20 text-white"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags & Status pills */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
                {/* Status Toggle */}
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-white/40 mr-1 flex items-center gap-1">
                    <Filter className="h-3 w-3" /> Status:
                  </span>
                  {(["all", "solved", "attempted", "unsolved"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setProblemStatusFilter(st)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] capitalize transition ${problemStatusFilter === st
                          ? "bg-violet-600 text-white font-medium"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {/* Tag Pills */}
                {uniqueTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedTag && (
                      <button
                        type="button"
                        onClick={() => setSelectedTag("")}
                        className="rounded-full bg-violet-500/20 border border-violet-500/40 px-2 py-0.5 text-[10px] text-violet-300 hover:bg-violet-500/30"
                      >
                        ✕ Clear ({selectedTag})
                      </button>
                    )}
                    {uniqueTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${selectedTag === tag
                            ? "border-cyan-400 bg-cyan-400/20 text-cyan-300"
                            : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                          }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Problem List Cards */}
            {problems === undefined ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-44 rounded-2xl border border-white/5 bg-white/5 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredProblems.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#120d20]/50 p-8 text-center backdrop-blur-md">
                <Code2 className="mx-auto h-10 w-10 text-white/30" />
                <h3 className="mt-3 text-base font-semibold text-white">No coding problems found</h3>
                <p className="mt-1 text-sm text-white/60">
                  Try adjusting your search query, difficulty filters, or tags.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setProblemSearch("");
                    setProblemDifficulty("");
                    setSelectedTag("");
                    setProblemStatusFilter("all");
                  }}
                  className="mt-4 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProblems.map((problem) => {
                  const status = progressMap.get(problem.slug);
                  const isSolved = status === "solved";
                  const isAttempted = status === "attempted";

                  return (
                    <div
                      key={problem.slug}
                      className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[rgba(26,18,44,0.65)] p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-[rgba(33,23,56,0.85)] hover:shadow-[0_15px_40px_rgba(123,57,252,0.15)]"
                    >
                      <div>
                        {/* Top Meta row */}
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${problem.difficulty === "easy"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                : problem.difficulty === "medium"
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                  : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                              }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${problem.difficulty === "easy"
                                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                  : problem.difficulty === "medium"
                                    ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                                    : "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                                }`}
                            />
                            {problem.difficulty}
                          </span>

                          {/* Solved / Attempted badge */}
                          {isSolved ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Solved
                            </span>
                          ) : isAttempted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                              <Clock className="h-3 w-3 text-amber-400" /> Attempted
                            </span>
                          ) : null}
                        </div>

                        {/* Title */}
                        <Link href={`/problems/${problem.slug}`} className="block">
                          <h3 className="text-lg font-bold text-white transition group-hover:text-violet-300">
                            {problem.title}
                          </h3>
                        </Link>

                        {/* Tags */}
                        {problem.tags && problem.tags.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {problem.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-white/60"
                              >
                                {tag}
                              </span>
                            ))}
                            {problem.tags.length > 3 && (
                              <span className="rounded-md border border-white/5 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-white/40">
                                +{problem.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Footer & Action */}
                      <div className="mt-5 border-t border-white/5 pt-4">
                        <div className="mb-3 flex items-center justify-between text-[11px] text-white/50">
                          <span className="inline-flex items-center gap-1">
                            <Terminal className="h-3 w-3 text-violet-400" />
                            {problem.counts.sample} sample · {problem.counts.hidden} hidden
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Cpu className="h-3 w-3 text-cyan-400" />
                            {(problem.timeLimitMs / 1000).toFixed(1)}s limit
                          </span>
                        </div>

                        <Link
                          href={`/problems/${problem.slug}`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 px-4 py-2.5 text-xs font-semibold text-white transition duration-200 group-hover:border-violet-500 group-hover:from-violet-600 group-hover:to-indigo-600 group-hover:shadow-[0_0_20px_rgba(123,57,252,0.4)]"
                        >
                          <span>Solve Challenge</span>
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: PROJECT & HACKATHON CHALLENGES                                 */}
        {/* ========================================================================= */}
        {(activeTab === "challenges" || activeTab === "all") && (
          <section className="mb-12">
            {/* Section Header */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <h2 className={`${manrope.className} text-2xl font-bold tracking-tight text-white`}>
                    Project & Hackathon Challenges
                  </h2>
                </div>
                <p className={`${inter.className} mt-1 text-xs text-white/60 sm:text-sm`}>
                  Build and submit real projects, repositories, and applications to earn XP and showcase your work.
                </p>
              </div>
            </div>

            {/* Hackathon Filters Card */}
            <div className="mb-6 space-y-4 rounded-2xl border border-white/10 bg-[#120d20]/60 p-5 backdrop-blur-xl">
              {/* Category Pills */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`${manrope.className} rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${category === c.value
                        ? "border-[#7b39fc] bg-[#7b39fc] text-white shadow-lg shadow-[#7b39fc]/30"
                        : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                      }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Difficulty & Search */}
              <div className="grid gap-3 sm:grid-cols-12 sm:items-center">
                <div className="flex flex-wrap gap-2 sm:col-span-6">
                  {CHALLENGE_DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setChallengeDifficulty(d.value)}
                      className={`${cabin.className} rounded-full border px-3 py-1.5 text-xs transition-colors ${challengeDifficulty === d.value
                          ? "border-white bg-white text-[#171717] font-semibold"
                          : "border-white/10 bg-[#2b2344]/80 text-white/80 hover:bg-[#2b2344]"
                        }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <div className="sm:col-span-6">
                  <input
                    type="text"
                    value={themeSearch}
                    onChange={(e) => setThemeSearch(e.target.value)}
                    placeholder="Search by theme (e.g. Space, Sustainability, AI)…"
                    className={`${inter.className} w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-xs text-white placeholder:text-white/40 outline-none transition-colors focus:border-[#7b39fc]`}
                  />
                </div>
              </div>
            </div>

            {/* Challenges List */}
            {challenges === undefined && (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-44 rounded-2xl border border-white/5 bg-white/5 animate-pulse" />
                ))}
              </div>
            )}

            {challenges?.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#120d20]/50 p-8 text-center backdrop-blur-md">
                <Trophy className="mx-auto h-10 w-10 text-white/30" />
                <h3 className="mt-3 text-base font-semibold text-white">No challenges match these filters</h3>
                <p className="mt-1 text-sm text-white/60">
                  Try clearing the category or difficulty filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCategory("");
                    setChallengeDifficulty("");
                    setThemeSearch("");
                  }}
                  className="mt-4 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  Reset Filters
                </button>
              </div>
            )}

            {(() => {
              const visible = (challenges ?? []).filter((c) =>
                themeSearch
                  ? c.theme?.toLowerCase().includes(themeSearch.toLowerCase())
                  : true
              );

              const hackathons = visible.filter(
                (c) => c.category === "hackathon"
              );
              const others = visible.filter(
                (c) => c.category !== "hackathon"
              );

              // Hackathon pill or "All": render the three grouped sections.
              const showGroups =
                category === "" || category === "hackathon";

              return (
                <>
                  {showGroups &&
                    HACKATHON_SECTIONS.map((section) => {
                      const items = hackathons.filter(
                        (c) => c.hackathonCategory === section.value
                      );

                      return (
                        <div key={section.value} className="mb-10">
                          <div className="mb-4 flex flex-wrap items-center gap-3">
                            <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${section.accent}`}>
                              <span aria-hidden>{section.emoji}</span>
                              {section.label}
                            </span>
                            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-mono text-white/60">
                              {items.length}
                            </span>
                            <span className={`${inter.className} hidden text-xs text-white/45 sm:inline`}>
                              {section.blurb}
                            </span>
                          </div>

                          {items.length === 0 ? (
                            <p className={`${inter.className} rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-6 text-sm text-white/45`}>
                              No {section.label} hackathons are live right now — check back soon.
                            </p>
                          ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                              {items.map((challenge) => (
                                <ChallengeCard
                                  key={challenge._id}
                                  challenge={challenge}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {others.length > 0 && (
                    <div>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm font-semibold text-white/80">
                          <span aria-hidden>✨</span> More Challenges
                        </span>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-mono text-white/60">
                          {others.length}
                        </span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {others.map((challenge) => (
                          <ChallengeCard
                            key={challenge._id}
                            challenge={challenge}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {hackathons.length === 0 && others.length === 0 && null}
                </>
              );
            })()}
          </section>
        )}
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

/* ===========================================================================
 * HACKATHON SECTIONS
 * Public Hackathons are grouped under three fixed sub-sections.
 * ========================================================================= */
const HACKATHON_SECTIONS: Array<{
  value: "ai" | "coding" | "web";
  label: string;
  emoji: string;
  blurb: string;
  accent: string;
}> = [
    {
      value: "ai",
      label: "AI",
      emoji: "🤖",
      blurb: "Machine learning, generative AI, agents & intelligent systems.",
      accent: "text-violet-300 border-violet-500/40 bg-violet-500/10",
    },
    {
      value: "coding",
      label: "Coding",
      emoji: "🧩",
      blurb: "Algorithms, competitive programming & engineering puzzles.",
      accent: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
    },
    {
      value: "web",
      label: "Web Development",
      emoji: "🌐",
      blurb: "Full-stack builds, APIs, and beautiful user experiences.",
      accent: "text-cyan-300 border-cyan-500/40 bg-cyan-500/10",
    },
  ];

/* ===========================================================================
 * ChallengeCard — shared card for hackathon groups & the general grid.
 * Shows an optional banner image plus dates when they are configured.
 * ========================================================================= */
function ChallengeCard({
  challenge,
}: {
  challenge: {
    _id: string;
    title: string;
    description: string;
    category: string;
    hackathonCategory?: string;
    theme?: string;
    difficulty: string;
    xpReward: number;
    bannerUrl?: string;
    startDate?: number;
    endDate?: number;
  };
}) {
  const fmt = (ts?: number) =>
    ts
      ? new Date(ts).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      : null;

  const categoryLabel =
    challenge.category === "hackathon"
      ? HACKATHON_SECTIONS.find((s) => s.value === challenge.hackathonCategory)
        ?.label ?? "Hackathon"
      : CATEGORIES.find((c) => c.value === challenge.category)?.label ??
      challenge.category;

  return (
    <Link
      href={`/challenges/${challenge._id}`}
      className="group block overflow-hidden rounded-[22px] border border-white/10 bg-[rgba(43,35,68,0.56)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-[rgba(50,40,80,0.7)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
    >
      {/* Banner */}
      {challenge.bannerUrl && (
        <div className="relative h-36 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={challenge.bannerUrl}
            alt={challenge.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(43,35,68,1)] via-transparent to-transparent" />
        </div>
      )}

      <div className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <span
            className={`${manrope.className} text-xs uppercase tracking-[0.18em] text-white/60 font-semibold`}
          >
            {categoryLabel}
          </span>
          <span
            className={`${cabin.className} inline-flex items-center gap-1 rounded-full bg-violet-500/20 border border-violet-500/30 px-2.5 py-1 text-xs font-semibold text-[#bda4ff]`}
          >
            <Zap className="h-3 w-3 text-violet-400" />
            {challenge.xpReward} XP
          </span>
        </div>

        <h3
          className={`${instrumentSerif.className} mb-2 text-2xl text-white group-hover:text-violet-300 transition`}
        >
          {challenge.title}
        </h3>

        {challenge.theme && (
          <p className={`${inter.className} mb-2 text-xs text-white/70`}>
            Theme: <span className="text-violet-300 font-medium">{challenge.theme}</span>
          </p>
        )}

        <p
          className={`${inter.className} line-clamp-2 text-xs leading-relaxed text-white/65`}
        >
          {challenge.description}
        </p>

        {(fmt(challenge.startDate) || fmt(challenge.endDate)) && (
          <p
            className={`${cabin.className} mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] text-white/70`}
          >
            <CalendarDays className="h-3 w-3 text-violet-400" />
            {fmt(challenge.startDate) ?? "Open"} → {fmt(challenge.endDate) ?? "Open"}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
          <span
            className={`${cabin.className} inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] capitalize text-white/80`}
          >
            {challenge.difficulty}
          </span>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-400 group-hover:text-violet-300">
            View Details{" "}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
