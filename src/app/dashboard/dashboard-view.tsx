"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

import {
    ArrowUpRight,
    Trophy,
    Code2,
    Users,
    CheckCircle2,
    BarChart3,
    Bookmark,
    UsersRound,
    Activity,
    Sparkles,
    Edit3,
    User,
    Zap,
    Target,
    Terminal,
    Sun,
    Moon,
} from "lucide-react";

/* ================================================================
   TYPES
================================================================ */

interface ActivityItem {
    status: string;
    createdAt: number;
}

interface UserStats {
    rank: number;
    points: number;
    xp: number;
    totalSubmissions: number;
    successfulSubmissions: number;
    problemsSolved: number;
    successRate: number;
    recentActivity: ActivityItem[];
}

/* ================================================================
   HELPERS
================================================================ */

function computeStreak(activity?: ActivityItem[]): number {
    if (!activity || activity.length === 0) return 0;

    const days = new Set<number>();

    for (const item of activity) {
        if (item.status !== "success") continue;

        const date = new Date(item.createdAt);

        days.add(
            Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate()
            )
        );
    }

    if (days.size === 0) return 0;

    const now = new Date();

    const today = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    );

    const start = days.has(today) ? today : today - 86400000;

    if (!days.has(start)) return 0;

    let streak = 0;

    for (
        let current = start;
        days.has(current);
        current -= 86400000
    ) {
        streak++;
    }

    return streak;
}

function formatNumber(value?: number | null) {
    if (value === undefined || value === null) return "—";
    return value.toLocaleString("en-US");
}

/* ================================================================
   MAIN DASHBOARD
================================================================ */

export default function DashboardView() {
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    const user = useQuery(api.users.currentUser);

    const stats = useQuery(
        api.leaderboard.getUserPublicStats,
        user?.username
            ? {
                username: user.username,
            }
            : "skip"
    ) as UserStats | null | undefined;

    const displayXp = stats?.xp ?? user?.xp ?? 0;

    /* ============================================================
       THEME
    ============================================================ */

    useEffect(() => {
        queueMicrotask(() => {
            const saved = window.localStorage.getItem("coderush-theme");

            if (saved === "dark" || saved === "light") {
                setTheme(saved);
            }
        });
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle(
            "dark",
            theme === "dark"
        );

        window.localStorage.setItem("coderush-theme", theme);
    }, [theme]);

    /* ============================================================
       LOADING
    ============================================================ */

    if (user === undefined) {
        return <LoadingState />;
    }

    if (user === null) {
        return <SignedOutState />;
    }

    const loading =
        stats === undefined && user.username !== null;

    const username = user.username ?? "Developer";

    const streak = computeStreak(stats?.recentActivity);

    const profileHref = user.username
        ? `/u/${user.username}`
        : "/profile";

    /* ============================================================
       THEME CLASSES
    ============================================================ */

    const isDark = theme === "dark";

    const pageBackground = isDark
        ? "bg-[#07090d] text-white"
        : "bg-[#f5f7fb] text-slate-950";

    const primaryText = isDark
        ? "text-white"
        : "text-slate-950";

    const secondaryText = isDark
        ? "text-slate-500"
        : "text-slate-600";

    const mutedText = isDark
        ? "text-slate-600"
        : "text-slate-500";

    const cardBackground = isDark
        ? "bg-[#0d1118]"
        : "bg-white";

    const cardBorder = isDark
        ? "border-white/[0.06]"
        : "border-slate-200";

    /* ============================================================
       RENDER
    ============================================================ */

    return (
        <div
            className={`relative min-h-screen overflow-hidden transition-colors duration-500 ${pageBackground}`}
        >
            {/* ========================================================
          AMBIENT BACKGROUND
      ======================================================== */}

            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div
                    className={`absolute left-1/2 top-[-180px] h-[550px] w-[750px] -translate-x-1/2 rounded-full blur-[130px] ${isDark
                            ? "bg-blue-600/[0.08]"
                            : "bg-blue-500/[0.06]"
                        }`}
                />

                <div
                    className={`absolute bottom-[-220px] left-[-120px] h-[450px] w-[450px] rounded-full blur-[130px] ${isDark
                            ? "bg-violet-600/[0.07]"
                            : "bg-violet-500/[0.05]"
                        }`}
                />

                <div
                    className={`absolute right-[-150px] top-[30%] h-[450px] w-[450px] rounded-full blur-[130px] ${isDark
                            ? "bg-cyan-500/[0.045]"
                            : "bg-cyan-500/[0.03]"
                        }`}
                />

                <div
                    className={`absolute inset-0 ${isDark ? "opacity-[0.025]" : "opacity-[0.035]"
                        }`}
                    style={{
                        backgroundImage: isDark
                            ? `
                linear-gradient(
                  rgba(255,255,255,0.5) 1px,
                  transparent 1px
                ),
                linear-gradient(
                  90deg,
                  rgba(255,255,255,0.5) 1px,
                  transparent 1px
                )
              `
                            : `
                linear-gradient(
                  rgba(15,23,42,0.18) 1px,
                  transparent 1px
                ),
                linear-gradient(
                  90deg,
                  rgba(15,23,42,0.18) 1px,
                  transparent 1px
                )
              `,
                        backgroundSize: "42px 42px",
                    }}
                />
            </div>

            {/* ========================================================
          CONTENT
      ======================================================== */}

            <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* ======================================================
            TOP NAV
        ====================================================== */}

                <motion.header
                    initial={{
                        opacity: 0,
                        y: -10,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                    }}
                    className="mb-12 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${isDark
                                    ? "border-white/[0.07] bg-white/[0.025]"
                                    : "border-slate-200 bg-white shadow-sm"
                                }`}
                        >
                            <Code2
                                size={17}
                                className="text-blue-500"
                            />
                        </div>

                        <div>
                            <p
                                className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark
                                        ? "text-slate-600"
                                        : "text-slate-500"
                                    }`}
                            >
                                CodeRush
                            </p>

                            <p
                                className={`mt-0.5 text-xs font-semibold ${isDark
                                        ? "text-slate-400"
                                        : "text-slate-600"
                                    }`}
                            >
                                Developer Dashboard
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div
                            className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 sm:flex ${isDark
                                    ? "border-emerald-400/10 bg-emerald-400/[0.04]"
                                    : "border-emerald-200 bg-emerald-50"
                                }`}
                        >
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />

                            <span
                                className={`text-[9px] font-bold uppercase tracking-[0.18em] ${isDark
                                        ? "text-emerald-400"
                                        : "text-emerald-600"
                                    }`}
                            >
                                Online
                            </span>
                        </div>

                        <button
                            type="button"
                            aria-label="Toggle theme"
                            onClick={() =>
                                setTheme(
                                    theme === "dark"
                                        ? "light"
                                        : "dark"
                                )
                            }
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${isDark
                                    ? "border-white/[0.07] bg-white/[0.025] text-slate-400 hover:bg-white/[0.06] hover:text-white"
                                    : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                                }`}
                        >
                            {isDark ? (
                                <Sun size={15} />
                            ) : (
                                <Moon size={15} />
                            )}
                        </button>
                    </div>
                </motion.header>

                {/* ======================================================
            HERO
        ====================================================== */}

                <motion.section
                    initial={{
                        opacity: 0,
                        y: 20,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                    }}
                    transition={{
                        duration: 0.5,
                    }}
                    className="mb-10"
                >
                    <div
                        className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${isDark
                                ? "border-violet-400/10 bg-violet-400/[0.05]"
                                : "border-violet-200 bg-violet-50"
                            }`}
                    >
                        <Sparkles
                            size={13}
                            className={
                                isDark
                                    ? "text-violet-400"
                                    : "text-violet-600"
                            }
                        />

                        <span
                            className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDark
                                    ? "text-violet-400"
                                    : "text-violet-700"
                                }`}
                        >
                            Developer Dashboard
                        </span>
                    </div>

                    <h1
                        className={`max-w-5xl text-4xl font-black tracking-[-0.05em] sm:text-5xl lg:text-6xl ${primaryText}`}
                    >
                        Welcome back,

                        <br />

                        <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
                            {username}.
                        </span>
                    </h1>

                    <p
                        className={`mt-5 max-w-2xl text-sm leading-6 sm:text-base ${secondaryText}`}
                    >
                        {user.bio ||
                            "Practice coding, solve challenges, build projects, and climb the CodeRush leaderboard."}
                    </p>

                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link
                            href="/code"
                            className={`group inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[9px] font-black uppercase tracking-[0.16em] transition hover:-translate-y-0.5 ${isDark
                                    ? "bg-white text-black hover:bg-white/90"
                                    : "bg-slate-950 text-white shadow-lg shadow-slate-950/10 hover:bg-slate-800"
                                }`}
                        >
                            <Terminal size={14} />

                            Open Code Editor

                            <ArrowUpRight
                                size={13}
                                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            />
                        </Link>

                        <Link
                            href="/challenges"
                            className={`group inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-[9px] font-black uppercase tracking-[0.16em] backdrop-blur-xl transition ${isDark
                                    ? "border-white/[0.08] bg-white/[0.025] text-slate-400 hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white"
                                    : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                                }`}
                        >
                            <Target size={14} />

                            Explore Challenges

                            <ArrowUpRight
                                size={13}
                                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            />
                        </Link>
                    </div>
                </motion.section>

                {/* ======================================================
            STATISTICS
        ====================================================== */}

                <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DashboardStat
                        icon={
                            <CheckCircle2
                                size={17}
                                className="text-blue-500"
                            />
                        }
                        value={
                            loading
                                ? "..."
                                : formatNumber(
                                    stats?.problemsSolved
                                )
                        }
                        label="Problems Solved"
                        accent="blue"
                        theme={theme}
                    />

                    <DashboardStat
                        icon={
                            <Zap
                                size={17}
                                className="text-violet-500"
                            />
                        }
                        value={
                            loading
                                ? "..."
                                : formatNumber(displayXp)
                        }
                        label="XP"
                        accent="violet"
                        suffix="XP"
                        subtext="+10 from code runs"
                        theme={theme}
                    />

                    <DashboardStat
                        icon={
                            <Trophy
                                size={17}
                                className="text-cyan-500"
                            />
                        }
                        value={
                            loading
                                ? "..."
                                : stats
                                    ? `#${formatNumber(stats.rank)}`
                                    : "—"
                        }
                        label="Leaderboard Rank"
                        accent="cyan"
                        theme={theme}
                    />

                    <DashboardStat
                        icon={
                            <Sparkles
                                size={17}
                                className="text-emerald-500"
                            />
                        }
                        value={
                            loading
                                ? "..."
                                : formatNumber(
                                    stats?.points ?? displayXp
                                )
                        }
                        label="Points"
                        accent="emerald"
                        suffix="PTS"
                        theme={theme}
                    />
                </section>

                {/* ======================================================
            PROFILE + PERFORMANCE
        ====================================================== */}

                <section className="mb-8 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">

                    {/* PROFILE */}

                    <motion.div
                        initial={{
                            opacity: 0,
                            y: 20,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                        transition={{
                            delay: 0.1,
                        }}
                        className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 ${isDark
                                ? "border-white/[0.06] bg-[#0d1118] hover:border-white/[0.12]"
                                : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50"
                            }`}
                    >
                        <div
                            className={`absolute inset-x-0 top-0 h-px ${isDark
                                    ? "bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"
                                    : "bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"
                                }`}
                        />

                        <div
                            className={`pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full blur-3xl ${isDark
                                    ? "bg-blue-500/[0.08]"
                                    : "bg-blue-500/[0.05]"
                                }`}
                        />

                        <div className="relative p-6 sm:p-7">
                            <div className="mb-7 flex items-center justify-between">
                                <div>
                                    <p
                                        className={`text-[10px] font-black uppercase tracking-[0.18em] ${isDark
                                                ? "text-blue-400"
                                                : "text-blue-600"
                                            }`}
                                    >
                                        Developer Profile
                                    </p>

                                    <p
                                        className={`mt-1.5 text-[10px] ${mutedText}`}
                                    >
                                        Your CodeRush identity
                                    </p>
                                </div>

                                <User
                                    size={17}
                                    className={
                                        isDark
                                            ? "text-slate-700"
                                            : "text-slate-400"
                                    }
                                />
                            </div>

                            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-4">
                                    <Avatar
                                        avatarUrl={user.avatarUrl}
                                        username={user.username}
                                    />

                                    <div>
                                        <h2
                                            className={`text-lg font-bold ${primaryText}`}
                                        >
                                            {user.username ||
                                                "Your account"}
                                        </h2>

                                        <p
                                            className={`mt-1 text-xs ${isDark
                                                    ? "text-slate-600"
                                                    : "text-slate-500"
                                                }`}
                                        >
                                            {user.email}
                                        </p>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <div
                                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${isDark
                                                        ? "border-blue-400/10 bg-blue-400/[0.04]"
                                                        : "border-blue-200 bg-blue-50"
                                                    }`}
                                            >
                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />

                                                <span
                                                    className={`text-[8px] font-bold uppercase tracking-[0.16em] ${isDark
                                                            ? "text-blue-400"
                                                            : "text-blue-700"
                                                        }`}
                                                >
                                                    Competitive Developer
                                                </span>
                                            </div>

                                            <div
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.16em] ${isDark
                                                        ? "border-emerald-400/10 bg-emerald-400/[0.04] text-emerald-400"
                                                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    }`}
                                            >
                                                <CheckCircle2
                                                    size={11}
                                                    className={
                                                        isDark
                                                            ? "text-emerald-400"
                                                            : "text-emerald-600"
                                                    }
                                                />

                                                <span>
                                                    {loading
                                                        ? "..."
                                                        : formatNumber(
                                                            stats?.problemsSolved
                                                        )}{" "}
                                                    Problems Solved
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Link
                                        href={profileHref}
                                        className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3.5 text-[9px] font-bold uppercase tracking-[0.12em] transition ${isDark
                                                ? "border-white/[0.07] bg-white/[0.025] text-slate-400 hover:border-white/[0.13] hover:bg-white/[0.05] hover:text-white"
                                                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-950"
                                            }`}
                                    >
                                        <User size={13} />

                                        Profile
                                    </Link>

                                    <Link
                                        href="/profile"
                                        className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3.5 text-[9px] font-bold uppercase tracking-[0.12em] transition ${isDark
                                                ? "border-white/[0.07] bg-white/[0.025] text-slate-400 hover:border-white/[0.13] hover:bg-white/[0.05] hover:text-white"
                                                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-950"
                                            }`}
                                    >
                                        <Edit3 size={13} />

                                        Edit
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* PERFORMANCE */}

                    <motion.div
                        initial={{
                            opacity: 0,
                            y: 20,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                        transition={{
                            delay: 0.16,
                        }}
                        className={`relative overflow-hidden rounded-3xl border ${isDark
                                ? "border-white/[0.06] bg-[#0d1118]"
                                : "border-slate-200 bg-white shadow-sm"
                            }`}
                    >
                        <div
                            className={`absolute inset-x-0 top-0 h-px ${isDark
                                    ? "bg-gradient-to-r from-transparent via-violet-400/40 to-transparent"
                                    : "bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"
                                }`}
                        />

                        <div
                            className={`pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full blur-3xl ${isDark
                                    ? "bg-violet-500/[0.07]"
                                    : "bg-violet-500/[0.05]"
                                }`}
                        />

                        <div className="relative p-6">
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <p
                                        className={`text-[10px] font-black uppercase tracking-[0.18em] ${isDark
                                                ? "text-violet-400"
                                                : "text-violet-600"
                                            }`}
                                    >
                                        Performance
                                    </p>

                                    <p
                                        className={`mt-1.5 text-[10px] ${mutedText}`}
                                    >
                                        Current statistics
                                    </p>
                                </div>

                                <BarChart3
                                    size={17}
                                    className={
                                        isDark
                                            ? "text-slate-700"
                                            : "text-slate-400"
                                    }
                                />
                            </div>

                            <div className="space-y-4">
                                <PerformanceRow
                                    label="Problems Solved"
                                    value={
                                        loading
                                            ? "..."
                                            : formatNumber(
                                                stats?.problemsSolved
                                            )
                                    }
                                    theme={theme}
                                />

                                <PerformanceRow
                                    label="Submissions"
                                    value={
                                        loading
                                            ? "..."
                                            : formatNumber(
                                                stats?.totalSubmissions
                                            )
                                    }
                                    theme={theme}
                                />

                                <PerformanceRow
                                    label="Successful"
                                    value={
                                        loading
                                            ? "..."
                                            : formatNumber(
                                                stats?.successfulSubmissions
                                            )
                                    }
                                    theme={theme}
                                />

                                <PerformanceRow
                                    label="Success Rate"
                                    value={
                                        loading
                                            ? "..."
                                            : `${stats?.successRate ?? 0}%`
                                    }
                                    theme={theme}
                                />

                                <PerformanceRow
                                    label="Current Streak"
                                    value={
                                        loading
                                            ? "..."
                                            : `${streak} ${streak === 1 ? "day" : "days"}`
                                    }
                                    theme={theme}
                                />
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* ======================================================
            WORKSPACE
        ====================================================== */}

                <section className="mb-8">
                    <div className="mb-5 flex items-end justify-between">
                        <div>
                            <p
                                className={`text-[10px] font-black uppercase tracking-[0.18em] ${isDark
                                        ? "text-cyan-400"
                                        : "text-cyan-600"
                                    }`}
                            >
                                Explore CodeRush
                            </p>

                            <h2
                                className={`mt-1.5 text-xl font-bold tracking-tight ${primaryText}`}
                            >
                                Your workspace
                            </h2>
                        </div>

                        <span
                            className={`hidden text-[9px] font-bold uppercase tracking-[0.18em] sm:block ${isDark
                                    ? "text-slate-700"
                                    : "text-slate-400"
                                }`}
                        >
                            07 destinations
                        </span>
                    </div>

                    {/* TALENT CONNECT */}

                    <Link
                        href="/talent-connect"
                        className={`group relative mb-4 block overflow-hidden rounded-3xl border p-6 transition-all duration-300 sm:p-8 ${isDark
                                ? "border-amber-400/15 bg-gradient-to-br from-[#14100a] via-[#0d1118] to-[#0d1118] hover:border-amber-400/30 hover:shadow-[0_25px_80px_rgba(245,158,11,0.12)]"
                                : "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white shadow-sm hover:border-amber-300 hover:shadow-xl hover:shadow-amber-100"
                            }`}
                    >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

                        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/[0.08] blur-3xl transition-transform duration-500 group-hover:scale-125" />

                        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-orange-500/[0.05] blur-3xl" />

                        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-500 shadow-[0_10px_40px_rgba(245,158,11,0.15)] transition-transform duration-300 group-hover:scale-110">
                                    <Target size={26} />

                                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[8px] font-black text-black">
                                        ★
                                    </span>
                                </div>

                                <div className="min-w-0">
                                    <p
                                        className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark
                                                ? "text-amber-400"
                                                : "text-amber-600"
                                            }`}
                                    >
                                        🎯 Premium · New
                                    </p>

                                    <h3
                                        className={`mt-1.5 text-xl font-bold tracking-tight ${primaryText}`}
                                    >
                                        Talent Connect
                                    </h3>

                                    <p
                                        className={`mt-2 max-w-2xl text-xs leading-6 ${isDark
                                                ? "text-slate-500"
                                                : "text-slate-600"
                                            }`}
                                    >
                                        Showcase your skills, experience, and
                                        projects. Connect with real-world
                                        projects, companies, and career
                                        opportunities.
                                    </p>
                                </div>
                            </div>

                            <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-black shadow-[0_10px_40px_rgba(245,158,11,0.25)] transition-all duration-300 group-hover:shadow-[0_15px_50px_rgba(245,158,11,0.4)] lg:self-center">
                                Explore Talent Connect

                                <ArrowUpRight
                                    size={14}
                                    className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                />
                            </span>
                        </div>
                    </Link>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <WorkspaceCard
                            href="/challenges"
                            icon={<Code2 size={20} />}
                            title="Challenges"
                            description="Solve curated programming problems and sharpen your competitive coding skills."
                            number="01"
                            accent="blue"
                            theme={theme}
                        />

                        <WorkspaceCard
                            href="/showcase"
                            icon={<Sparkles size={20} />}
                            title="Showcase"
                            description="Discover projects, solutions, and impressive work from the CodeRush community."
                            number="02"
                            accent="violet"
                            theme={theme}
                        />

                        <WorkspaceCard
                            href="/leaderboard"
                            icon={<Trophy size={20} />}
                            title="Leaderboard"
                            description="Track your position and compete with developers across CodeRush."
                            number="03"
                            accent="cyan"
                            theme={theme}
                        />

                        <WorkspaceCard
                            href="/bookmarks"
                            icon={<Bookmark size={20} />}
                            title="Bookmarks"
                            description="Keep your favorite challenges and coding resources one click away."
                            number="04"
                            accent="violet"
                            theme={theme}
                        />

                        <WorkspaceCard
                            href="/teams"
                            icon={<UsersRound size={20} />}
                            title="Teams"
                            description="Collaborate with developers and build projects together."
                            number="05"
                            accent="blue"
                            theme={theme}
                        />

                        <WorkspaceCard
                            href="/analytics"
                            icon={<Activity size={20} />}
                            title="Analytics"
                            description="Understand your coding performance and monitor your progress."
                            number="06"
                            accent="cyan"
                            theme={theme}
                        />
                    </div>
                </section>

                {/* ======================================================
            QUICK ACTIONS
        ====================================================== */}

                <motion.section
                    initial={{
                        opacity: 0,
                        y: 20,
                    }}
                    animate={{
                        opacity: 1,
                        y: 0,
                    }}
                    transition={{
                        delay: 0.25,
                    }}
                    className={`relative overflow-hidden rounded-3xl border ${isDark
                            ? "border-white/[0.06] bg-[#0d1118]"
                            : "border-slate-200 bg-white shadow-sm"
                        }`}
                >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

                    <div
                        className={`pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl ${isDark
                                ? "bg-cyan-500/[0.05]"
                                : "bg-cyan-500/[0.04]"
                            }`}
                    />

                    <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p
                                className={`text-[10px] font-black uppercase tracking-[0.18em] ${isDark
                                        ? "text-cyan-400"
                                        : "text-cyan-600"
                                    }`}
                            >
                                Quick Actions
                            </p>

                            <p
                                className={`mt-1.5 text-xs ${isDark
                                        ? "text-slate-600"
                                        : "text-slate-500"
                                    }`}
                            >
                                Jump directly into your workspace.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <QuickAction
                                href="/code"
                                label="Code Editor"
                                icon={<Terminal size={14} />}
                                theme={theme}
                            />

                            <QuickAction
                                href="/challenges"
                                label="Challenges"
                                icon={<Target size={14} />}
                                theme={theme}
                            />

                            <QuickAction
                                href="/leaderboard"
                                label="Leaderboard"
                                icon={<Trophy size={14} />}
                                theme={theme}
                            />

                            <QuickAction
                                href="/analytics"
                                label="Analytics"
                                icon={<BarChart3 size={14} />}
                                theme={theme}
                            />
                        </div>
                    </div>
                </motion.section>

                {/* ======================================================
            FOOTER
        ====================================================== */}

                <div
                    className={`mt-14 border-t pt-6 text-center ${isDark
                            ? "border-white/[0.05]"
                            : "border-slate-200"
                        }`}
                >
                    <p
                        className={`text-[9px] font-bold uppercase tracking-[0.2em] ${isDark
                                ? "text-slate-700"
                                : "text-slate-400"
                            }`}
                    >
                        CodeRush · Build · Learn · Compete
                    </p>
                </div>
            </main>
        </div>
    );
}

/* ================================================================
   DASHBOARD STAT
================================================================ */

function DashboardStat({
    icon,
    value,
    label,
    accent,
    suffix,
    subtext,
    theme,
}: {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    accent: "blue" | "violet" | "cyan" | "emerald";
    suffix?: string;
    subtext?: string;
    theme: "dark" | "light";
}) {
    const isDark = theme === "dark";

    const accentClasses = {
        blue: {
            glow: "bg-blue-500",
        },
        violet: {
            glow: "bg-violet-500",
        },
        cyan: {
            glow: "bg-cyan-500",
        },
        emerald: {
            glow: "bg-emerald-500",
        },
    };

    return (
        <motion.div
            whileHover={{
                y: -3,
            }}
            className={`group relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl transition-all duration-300 ${isDark
                    ? "border-white/[0.06] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.04]"
                    : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50"
                }`}
        >
            <div
                className={`pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full ${accentClasses[accent].glow
                    } opacity-10 blur-3xl transition-opacity duration-500 group-hover:opacity-20`}
            />

            <div className="relative flex items-center gap-3">
                <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${isDark
                            ? "border-white/[0.06] bg-white/[0.04]"
                            : "border-slate-200 bg-slate-50"
                        }`}
                >
                    {icon}
                </div>

                <div>
                    <div className="flex items-end gap-1.5">
                        <p
                            className={`text-xl font-black tracking-tight ${isDark
                                    ? "text-white"
                                    : "text-slate-950"
                                }`}
                        >
                            {value}
                        </p>

                        {suffix && (
                            <span
                                className={`mb-0.5 text-[8px] font-black uppercase tracking-wider ${isDark
                                        ? "text-slate-600"
                                        : "text-slate-500"
                                    }`}
                            >
                                {suffix}
                            </span>
                        )}
                    </div>

                    <p
                        className={`mt-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] ${isDark
                                ? "text-slate-600"
                                : "text-slate-500"
                            }`}
                    >
                        {label}
                    </p>

                    {subtext && (
                        <p className="mt-0.5 text-[8px] font-medium text-emerald-500">
                            {subtext}
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

/* ================================================================
   WORKSPACE CARD
================================================================ */

function WorkspaceCard({
    href,
    icon,
    title,
    description,
    number,
    accent,
    theme,
}: {
    href: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    number: string;
    accent: "blue" | "violet" | "cyan";
    theme: "dark" | "light";
}) {
    const isDark = theme === "dark";

    const accentClasses = {
        blue: {
            text: isDark ? "text-blue-400" : "text-blue-600",
            border: isDark
                ? "group-hover:border-blue-400/20"
                : "group-hover:border-blue-300",
            bg: isDark
                ? "bg-blue-500/[0.06]"
                : "bg-blue-50",
            glow: isDark
                ? "bg-blue-500/[0.08]"
                : "bg-blue-500/[0.06]",
        },

        violet: {
            text: isDark
                ? "text-violet-400"
                : "text-violet-600",
            border: isDark
                ? "group-hover:border-violet-400/20"
                : "group-hover:border-violet-300",
            bg: isDark
                ? "bg-violet-500/[0.06]"
                : "bg-violet-50",
            glow: isDark
                ? "bg-violet-500/[0.08]"
                : "bg-violet-500/[0.06]",
        },

        cyan: {
            text: isDark
                ? "text-cyan-400"
                : "text-cyan-600",
            border: isDark
                ? "group-hover:border-cyan-400/20"
                : "group-hover:border-cyan-300",
            bg: isDark
                ? "bg-cyan-500/[0.06]"
                : "bg-cyan-50",
            glow: isDark
                ? "bg-cyan-500/[0.08]"
                : "bg-cyan-500/[0.06]",
        },
    };

    const colors = accentClasses[accent];

    return (
        <Link href={href}>
            <motion.div
                whileHover={{
                    y: -6,
                }}
                className={`group relative min-h-[225px] overflow-hidden rounded-3xl border p-6 transition-all duration-300 ${isDark
                        ? "border-white/[0.06] bg-[#0d1118] hover:shadow-[0_25px_70px_rgba(0,0,0,0.35)]"
                        : "border-slate-200 bg-white shadow-sm hover:shadow-xl hover:shadow-slate-200/60"
                    } ${colors.border}`}
            >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-30" />

                <span
                    className={`absolute right-5 top-5 font-mono text-[9px] font-bold tracking-[0.18em] transition-colors ${isDark
                            ? "text-slate-700 group-hover:text-slate-500"
                            : "text-slate-400 group-hover:text-slate-600"
                        }`}
                >
                    {number}
                </span>

                <div
                    className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full ${colors.glow} blur-3xl transition-transform duration-500 group-hover:scale-125`}
                />

                <div
                    className={`relative flex h-11 w-11 items-center justify-center rounded-xl border ${isDark
                            ? "border-white/[0.07]"
                            : "border-slate-200"
                        } ${colors.bg} ${colors.text} transition-transform duration-300 group-hover:scale-110`}
                >
                    {icon}
                </div>

                <div className="relative">
                    <h3
                        className={`mt-6 text-lg font-bold tracking-tight ${isDark
                                ? "text-white"
                                : "text-slate-950"
                            }`}
                    >
                        {title}
                    </h3>

                    <p
                        className={`mt-2 text-xs leading-6 ${isDark
                                ? "text-slate-600"
                                : "text-slate-600"
                            }`}
                    >
                        {description}
                    </p>
                </div>

                <div
                    className={`absolute bottom-6 left-6 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.18em] transition-all duration-300 group-hover:gap-3 ${isDark
                            ? "text-slate-700 group-hover:text-white"
                            : "text-slate-400 group-hover:text-slate-950"
                        }`}
                >
                    Explore

                    <ArrowUpRight size={12} />
                </div>
            </motion.div>
        </Link>
    );
}

/* ================================================================
   PERFORMANCE ROW
================================================================ */

function PerformanceRow({
    label,
    value,
    theme,
}: {
    label: string;
    value: string;
    theme: "dark" | "light";
}) {
    const isDark = theme === "dark";

    return (
        <div
            className={`flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 ${isDark
                    ? "border-white/[0.05]"
                    : "border-slate-100"
                }`}
        >
            <span
                className={`text-xs ${isDark
                        ? "text-slate-600"
                        : "text-slate-600"
                    }`}
            >
                {label}
            </span>

            <span
                className={`text-sm font-bold ${isDark
                        ? "text-white"
                        : "text-slate-950"
                    }`}
            >
                {value}
            </span>
        </div>
    );
}

/* ================================================================
   QUICK ACTION
================================================================ */

function QuickAction({
    href,
    label,
    icon,
    theme,
}: {
    href: string;
    label: string;
    icon: React.ReactNode;
    theme: "dark" | "light";
}) {
    const isDark = theme === "dark";

    return (
        <Link
            href={href}
            className={`group flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-[9px] font-bold uppercase tracking-[0.08em] transition-all duration-300 hover:-translate-y-0.5 ${isDark
                    ? "border-white/[0.06] bg-white/[0.025] text-slate-600 hover:border-white/[0.13] hover:bg-white/[0.06] hover:text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-950"
                }`}
        >
            <span
                className={`transition-colors ${isDark
                        ? "text-slate-700 group-hover:text-cyan-400"
                        : "text-slate-500 group-hover:text-cyan-600"
                    }`}
            >
                {icon}
            </span>

            {label}
        </Link>
    );
}

/* ================================================================
   AVATAR
================================================================ */

function Avatar({
    avatarUrl,
    username,
}: {
    avatarUrl: string | null;
    username: string | null;
}) {
    const [failed, setFailed] = useState(false);

    if (avatarUrl && !failed) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatarUrl}
                alt=""
                className="relative h-16 w-16 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
                onError={() => setFailed(true)}
            />
        );
    }

    return (
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 via-violet-500/20 to-cyan-500/20 text-xl font-black text-slate-900 ring-1 ring-black/10 dark:text-white dark:ring-white/10">
            {username?.charAt(0)?.toUpperCase() || "?"}
        </div>
    );
}

/* ================================================================
   LOADING
================================================================ */

function LoadingState() {
    return (
        <div className="min-h-screen bg-[#07090d] px-4 py-10">
            <div className="mx-auto max-w-7xl">
                <div className="h-10 w-40 animate-pulse rounded-xl bg-white/[0.05]" />

                <div className="mt-12 h-6 w-40 animate-pulse rounded bg-white/[0.05]" />

                <div className="mt-4 h-20 w-[600px] max-w-full animate-pulse rounded bg-white/[0.05]" />

                <div className="mt-5 h-5 w-96 max-w-full animate-pulse rounded bg-white/[0.03]" />

                <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <div
                            key={item}
                            className="h-24 animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.025]"
                        />
                    ))}
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
                    <div className="h-52 animate-pulse rounded-3xl bg-white/[0.025]" />

                    <div className="h-52 animate-pulse rounded-3xl bg-white/[0.025]" />
                </div>
            </div>
        </div>
    );
}

/* ================================================================
   SIGNED OUT
================================================================ */

function SignedOutState() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#07090d] px-4">
            <motion.div
                initial={{
                    opacity: 0,
                    scale: 0.96,
                }}
                animate={{
                    opacity: 1,
                    scale: 1,
                }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0d1118] p-10 text-center"
            >
                <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-blue-500/[0.08] blur-3xl" />

                <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.04]">
                    <Users
                        size={22}
                        className="text-blue-400"
                    />
                </div>

                <h1 className="relative mt-6 text-2xl font-bold text-white">
                    Not signed in
                </h1>

                <p className="relative mt-3 text-sm leading-6 text-slate-500">
                    Sign in to access your CodeRush dashboard.
                </p>

                <Link
                    href="/login"
                    className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-black transition hover:-translate-y-0.5"
                >
                    Sign In

                    <ArrowUpRight size={13} />
                </Link>
            </motion.div>
        </div>
    );
}