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
    Flame,
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

interface Activity {
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
    recentActivity: Activity[];
}

/* ================================================================
   HELPERS
================================================================ */

function computeStreak(activity?: Activity[]): number {
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

    const start = days.has(today)
        ? today
        : today - 86400000;

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
    const [theme, setTheme] =
        useState<"dark" | "light">("dark");

    const user = useQuery(api.users.currentUser);

    const stats = useQuery(
        api.leaderboard.getUserPublicStats,
        user?.username
            ? {
                username: user.username,
            }
            : "skip"
    ) as UserStats | null | undefined;

    // Use XP from stats (which comes from profiles.xp) or fallback to user.xp
    const displayXp = stats?.xp ?? user?.xp ?? 0;

    /* ============================================================
       THEME
    ============================================================ */

    useEffect(() => {
        // Defer state update to a microtask (react-hooks/set-state-in-effect).
        queueMicrotask(() => {
            const saved =
                window.localStorage.getItem(
                    "coderush-theme"
                );

            if (
                saved === "dark" ||
                saved === "light"
            ) {
                setTheme(saved);
            }
        });
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle(
            "dark",
            theme === "dark"
        );

        window.localStorage.setItem(
            "coderush-theme",
            theme
        );
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
        stats === undefined &&
        user.username !== null;

    const username =
        user.username ?? "Developer";

    const streak =
        computeStreak(
            stats?.recentActivity
        );

    const profileHref =
        user.username
            ? `/u/${user.username}`
            : "/profile";

    /* ============================================================
       RENDER
    ============================================================ */

    return (
        <div
            className={`relative min-h-screen overflow-hidden transition-colors duration-500 ${theme === "dark"
                    ? "bg-[#07090d] text-white"
                    : "bg-[#f4f6f8] text-black"
                }`}
        >

            {/* ====================================================
                AMBIENT BACKGROUND
            ==================================================== */}

            <div className="pointer-events-none fixed inset-0 overflow-hidden">

                <div
                    className={`absolute left-1/2 top-[-180px] h-[550px] w-[750px] -translate-x-1/2 rounded-full blur-[130px] ${theme === "dark"
                            ? "bg-blue-600/[0.08]"
                            : "bg-blue-500/[0.06]"
                        }`}
                />

                <div
                    className={`absolute bottom-[-220px] left-[-120px] h-[450px] w-[450px] rounded-full blur-[130px] ${theme === "dark"
                            ? "bg-violet-600/[0.07]"
                            : "bg-violet-500/[0.05]"
                        }`}
                />

                <div
                    className={`absolute right-[-150px] top-[30%] h-[450px] w-[450px] rounded-full blur-[130px] ${theme === "dark"
                            ? "bg-cyan-500/[0.045]"
                            : "bg-cyan-500/[0.03]"
                        }`}
                />

                {/* Grid */}

                <div
                    className={`absolute inset-0 ${theme === "dark"
                            ? "opacity-[0.025]"
                            : "opacity-[0.03]"
                        }`}
                    style={{
                        backgroundImage:
                            theme === "dark"
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
                                    rgba(0,0,0,0.35) 1px,
                                    transparent 1px
                                ),
                                linear-gradient(
                                    90deg,
                                    rgba(0,0,0,0.35) 1px,
                                    transparent 1px
                                )
                                `,
                        backgroundSize: "42px 42px",
                    }}
                />

            </div>

            {/* ====================================================
                CONTENT
            ==================================================== */}

            <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* =================================================
                    TOP NAV
                ================================================= */}

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

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
                            <Code2
                                size={17}
                                className="text-blue-400"
                            />
                        </div>

                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                                CodeRush
                            </p>

                            <p className="mt-0.5 text-xs font-semibold text-slate-400">
                                Developer Dashboard
                            </p>
                        </div>

                    </div>

                    <div className="flex items-center gap-2">

                        <div className="hidden items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-1.5 sm:flex">

                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

                            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                                Online
                            </span>

                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setTheme(
                                    theme === "dark"
                                        ? "light"
                                        : "dark"
                                )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                        >
                            {theme === "dark" ? (
                                <Sun size={15} />
                            ) : (
                                <Moon size={15} />
                            )}
                        </button>

                    </div>

                </motion.header>

                {/* =================================================
                    HERO
                ================================================= */}

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

                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/10 bg-violet-400/[0.05] px-3 py-1.5">

                        <Sparkles
                            size={13}
                            className="text-violet-400"
                        />

                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400">
                            Developer Dashboard
                        </span>

                    </div>

                    <h1 className="max-w-5xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">

                        Welcome back,

                        <br />

                        <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            {username}.
                        </span>

                    </h1>

                    <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                        {user.bio ||
                            "Practice coding, solve challenges, build projects, and climb the CodeRush leaderboard."}
                    </p>

                    <div className="mt-7 flex flex-wrap gap-3">

                        <Link
                            href="/code"
                            className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-black transition hover:-translate-y-0.5 hover:bg-white/90"
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
                            className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 backdrop-blur-xl transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white"
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

                {/* =================================================
                    STATISTICS
                ================================================= */}

                <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                    <DashboardStat
                        icon={
                            <CheckCircle2
                                size={17}
                                className="text-blue-400"
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
                        accent="bg-blue-500"
                    />

                    <DashboardStat
                        icon={
                            <Zap
                                size={17}
                                className="text-violet-400"
                            />
                        }
                        value={
                            loading
                                ? "..."
                                : formatNumber(
                                    displayXp
                                )
                        }
                        label="XP"
                        accent="bg-violet-500"
                        suffix="XP"
                        subtext="+10 from code runs"
                    />

                    <DashboardStat
                        icon={
                            <Trophy
                                size={17}
                                className="text-cyan-400"
                            />
                        }
                        value={
                            loading
                                ? "..."
                                : stats
                                    ? `#${formatNumber(
                                        stats.rank
                                    )}`
                                    : "—"
                        }
                        label="Leaderboard Rank"
                        accent="bg-cyan-500"
                    />

                    <DashboardStat
                        icon={
                            <Sparkles
                                size={17}
                                className="text-emerald-400"
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
                        accent="bg-emerald-500"
                        suffix="PTS"
                    />

                </section>

                {/* =================================================
                    PROFILE + PERFORMANCE
                ================================================= */}

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
                        className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0d1118] transition-all duration-300 hover:border-white/[0.12]"
                    >

                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

                        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-blue-500/[0.08] blur-3xl" />

                        <div className="relative p-6 sm:p-7">

                            <div className="mb-7 flex items-center justify-between">

                                <div>

                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-400">
                                        Developer Profile
                                    </p>

                                    <p className="mt-1.5 text-[10px] text-slate-600">
                                        Your CodeRush identity
                                    </p>

                                </div>

                                <User
                                    size={17}
                                    className="text-slate-700"
                                />

                            </div>

                            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

                                <div className="flex items-center gap-4">

                                    <Avatar
                                        avatarUrl={
                                            user.avatarUrl
                                        }
                                        username={
                                            user.username
                                        }
                                    />

                                    <div>

                                        <h2 className="text-lg font-bold text-white">
                                            {user.username ||
                                                "Your account"}
                                        </h2>

                                        <p className="mt-1 text-xs text-slate-600">
                                            {user.email}
                                        </p>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/10 bg-blue-400/[0.04] px-3 py-1.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                                                <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-blue-400">
                                                    Competitive Developer
                                                </span>
                                            </div>

                                            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                                                <CheckCircle2 size={11} className="text-emerald-400" />
                                                <span>{loading ? "..." : formatNumber(stats?.problemsSolved)} Problems Solved</span>
                                            </div>
                                        </div>

                                    </div>

                                </div>

                                <div className="flex gap-2">

                                    <Link
                                        href={
                                            profileHref
                                        }
                                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 transition hover:border-white/[0.13] hover:bg-white/[0.05] hover:text-white"
                                    >
                                        <User size={13} />

                                        Profile
                                    </Link>

                                    <Link
                                        href="/profile"
                                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 transition hover:border-white/[0.13] hover:bg-white/[0.05] hover:text-white"
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
                        className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0d1118]"
                    >

                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

                        <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-violet-500/[0.07] blur-3xl" />

                        <div className="relative p-6">

                            <div className="mb-6 flex items-center justify-between">

                                <div>

                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">
                                        Performance
                                    </p>

                                    <p className="mt-1.5 text-[10px] text-slate-600">
                                        Current statistics
                                    </p>

                                </div>

                                <BarChart3
                                    size={17}
                                    className="text-slate-700"
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
                                />

                                <PerformanceRow
                                    label="Success Rate"
                                    value={
                                        loading
                                            ? "..."
                                            : `${stats?.successRate ?? 0}%`
                                    }
                                />

                            </div>

                        </div>

                    </motion.div>

                </section>

                {/* =================================================
                    WORKSPACE
                ================================================= */}

                <section className="mb-8">

                    <div className="mb-5 flex items-end justify-between">

                        <div>

                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400">
                                Explore CodeRush
                            </p>

                            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-white">
                                Your workspace
                            </h2>

                        </div>

                        <span className="hidden text-[9px] font-bold uppercase tracking-[0.18em] text-slate-700 sm:block">
                            06 destinations
                        </span>

                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                        <WorkspaceCard
                            href="/challenges"
                            icon={
                                <Code2 size={20} />
                            }
                            title="Challenges"
                            description="Solve curated programming problems and sharpen your competitive coding skills."
                            number="01"
                            accent="blue"
                        />

                        <WorkspaceCard
                            href="/showcase"
                            icon={
                                <Sparkles
                                    size={20}
                                />
                            }
                            title="Showcase"
                            description="Discover projects, solutions, and impressive work from the CodeRush community."
                            number="02"
                            accent="violet"
                        />

                        <WorkspaceCard
                            href="/leaderboard"
                            icon={
                                <Trophy
                                    size={20}
                                />
                            }
                            title="Leaderboard"
                            description="Track your position and compete with developers across CodeRush."
                            number="03"
                            accent="cyan"
                        />

                        <WorkspaceCard
                            href="/bookmarks"
                            icon={
                                <Bookmark
                                    size={20}
                                />
                            }
                            title="Bookmarks"
                            description="Keep your favorite challenges and coding resources one click away."
                            number="04"
                            accent="violet"
                        />

                        <WorkspaceCard
                            href="/teams"
                            icon={
                                <UsersRound
                                    size={20}
                                />
                            }
                            title="Teams"
                            description="Collaborate with developers and build projects together."
                            number="05"
                            accent="blue"
                        />

                        <WorkspaceCard
                            href="/analytics"
                            icon={
                                <Activity
                                    size={20}
                                />
                            }
                            title="Analytics"
                            description="Understand your coding performance and monitor your progress."
                            number="06"
                            accent="cyan"
                        />

                    </div>

                </section>

                {/* =================================================
                    QUICK ACTIONS
                ================================================= */}

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
                    className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0d1118]"
                >

                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

                    <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/[0.05] blur-3xl" />

                    <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

                        <div>

                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400">
                                Quick Actions
                            </p>

                            <p className="mt-1.5 text-xs text-slate-600">
                                Jump directly into your workspace.
                            </p>

                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

                            <QuickAction
                                href="/code"
                                label="Code Editor"
                                icon={
                                    <Terminal
                                        size={14}
                                    />
                                }
                            />

                            <QuickAction
                                href="/challenges"
                                label="Challenges"
                                icon={
                                    <Target
                                        size={14}
                                    />
                                }
                            />

                            <QuickAction
                                href="/leaderboard"
                                label="Leaderboard"
                                icon={
                                    <Trophy
                                        size={14}
                                    />
                                }
                            />

                            <QuickAction
                                href="/analytics"
                                label="Analytics"
                                icon={
                                    <BarChart3
                                        size={14}
                                    />
                                }
                            />

                        </div>

                    </div>

                </motion.section>

                {/* =================================================
                    FOOTER
                ================================================= */}

                <div className="mt-14 border-t border-white/[0.05] pt-6 text-center">

                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-700">
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
}: {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    accent: string;
    suffix?: string;
    subtext?: string;
}) {
    return (
        <motion.div
            whileHover={{
                y: -3,
            }}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
        >

            <div
                className={`pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full ${accent} opacity-10 blur-3xl transition-opacity duration-500 group-hover:opacity-20`}
            />

            <div className="relative flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04]">
                    {icon}
                </div>

                <div>

                    <div className="flex items-end gap-1.5">

                        <p className="text-xl font-black tracking-tight text-white">
                            {value}
                        </p>

                        {suffix && (
                            <span className="mb-0.5 text-[8px] font-black uppercase tracking-wider text-slate-600">
                                {suffix}
                            </span>
                        )}

                    </div>

                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                        {label}
                    </p>

                    {subtext && (
                        <p className="mt-0.5 text-[8px] font-medium text-emerald-400">
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
}: {
    href: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    number: string;
    accent: "blue" | "violet" | "cyan";
}) {
    const accentClasses = {
        blue: {
            text: "text-blue-400",
            border: "group-hover:border-blue-400/20",
            bg: "bg-blue-500/[0.06]",
            glow: "bg-blue-500/[0.08]",
            gradient:
                "from-blue-500/20 via-blue-500/5 to-transparent",
        },

        violet: {
            text: "text-violet-400",
            border: "group-hover:border-violet-400/20",
            bg: "bg-violet-500/[0.06]",
            glow: "bg-violet-500/[0.08]",
            gradient:
                "from-violet-500/20 via-violet-500/5 to-transparent",
        },

        cyan: {
            text: "text-cyan-400",
            border: "group-hover:border-cyan-400/20",
            bg: "bg-cyan-500/[0.06]",
            glow: "bg-cyan-500/[0.08]",
            gradient:
                "from-cyan-500/20 via-cyan-500/5 to-transparent",
        },
    };

    const colors = accentClasses[accent];

    return (
        <Link href={href}>

            <motion.div
                whileHover={{
                    y: -6,
                }}
                className={`group relative min-h-[225px] overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0d1118] p-6 transition-all duration-300 ${colors.border} hover:shadow-[0_25px_70px_rgba(0,0,0,0.35)]`}
            >

                <div
                    className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${colors.text.replace(
                        "text-",
                        "via-"
                    )}/30 to-transparent`}
                />

                <span className="absolute right-5 top-5 font-mono text-[9px] font-bold tracking-[0.18em] text-slate-700 transition-colors group-hover:text-slate-500">
                    {number}
                </span>

                <div
                    className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full ${colors.glow} blur-3xl transition-transform duration-500 group-hover:scale-125`}
                />

                <div
                    className={`relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] ${colors.bg} ${colors.text} transition-transform duration-300 group-hover:scale-110`}
                >
                    {icon}
                </div>

                <div className="relative">

                    <h3 className="mt-6 text-lg font-bold tracking-tight text-white">
                        {title}
                    </h3>

                    <p className="mt-2 text-xs leading-6 text-slate-600">
                        {description}
                    </p>

                </div>

                <div className="absolute bottom-6 left-6 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.18em] text-slate-700 transition-all duration-300 group-hover:gap-3 group-hover:text-white">

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
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between border-b border-white/[0.05] pb-4 last:border-0 last:pb-0">

            <span className="text-xs text-slate-600">
                {label}
            </span>

            <span className="text-sm font-bold text-white">
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
}: {
    href: string;
    label: string;
    icon: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            className="group flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-white/[0.06] hover:text-white"
        >

            <span className="text-slate-700 transition-colors group-hover:text-cyan-400">
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
    const [failed, setFailed] =
        useState(false);

    if (avatarUrl && !failed) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatarUrl}
                alt=""
                className="relative h-16 w-16 rounded-full object-cover ring-1 ring-white/10"
                onError={() =>
                    setFailed(true)
                }
            />
        );
    }

    return (
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 via-violet-500/20 to-cyan-500/20 text-xl font-black text-white ring-1 ring-white/10">
            {username?.charAt(0)?.toUpperCase() ||
                "?"}
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

                    {[1, 2, 3, 4].map(
                        (item) => (
                            <div
                                key={item}
                                className="h-24 animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.025]"
                            />
                        )
                    )}

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

                <p className="relative mt-3 text-sm leading-6 text-slate-600">
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