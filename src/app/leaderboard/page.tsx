
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
    ArrowLeft,
    ArrowUpRight,
    Trophy,
    Crown,
    Code2,
    Users,
    CheckCircle2,
    BarChart3,
    Sun,
    Moon,
    Sparkles,
    Medal,
} from "lucide-react";

import {
    UiErrorBoundary,
    SkeletonList,
} from "@/components/ui/states";

/* ================================================================
   TYPES
================================================================ */

type Period = "all" | "week" | "month" | "day";

interface PeriodTab {
    value: Period;
    label: string;
    short: string;
}

interface Entry {
    userId: string;
    rank: number;
    username: string;
    avatarUrl: string | null;
    points: number;
    xp: number;
    totalSubmissions: number;
    successfulSubmissions: number;
    failedSubmissions: number;
    problemsSolved: number;
    successRate: number;
}

/* ================================================================
   CONSTANTS
================================================================ */

const PERIOD_TABS: PeriodTab[] = [
    {
        value: "all",
        label: "All Time",
        short: "ALL",
    },
    {
        value: "week",
        label: "This Week",
        short: "7D",
    },
    {
        value: "month",
        label: "This Month",
        short: "30D",
    },
    {
        value: "day",
        label: "Today",
        short: "24H",
    },
];

/* ================================================================
   AVATAR
================================================================ */

function Avatar({
    username,
    avatarUrl,
    size = "h-10 w-10",
}: {
    username: string;
    avatarUrl: string | null;
    size?: string;
}) {
    const [failed, setFailed] = useState(false);

    if (avatarUrl && !failed) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatarUrl}
                alt={`${username}'s avatar`}
                className={`${size} rounded-full object-cover ring-1 ring-white/10`}
                onError={() => setFailed(true)}
            />
        );
    }

    return (
        <div
            className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 via-violet-500/20 to-cyan-500/20 text-sm font-black text-white ring-1 ring-white/10`}
        >
            {username?.charAt(0)?.toUpperCase() || "?"}
        </div>
    );
}

/* ================================================================
   STAT CARD
================================================================ */

function StatCard({
    icon,
    value,
    label,
    accent,
}: {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    accent: string;
}) {
    return (
        <motion.div
            whileHover={{ y: -3 }}
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
                    <p className="text-xl font-black tracking-tight text-white">
                        {value}
                    </p>

                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                        {label}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

/* ================================================================
   PODIUM CARD
================================================================ */

function PodiumCard({
    entry,
    position,
}: {
    entry: Entry;
    position: 1 | 2 | 3;
}) {
    const first = position === 1;

    const accent =
        position === 1
            ? "from-blue-500/20 via-violet-500/15 to-cyan-500/10"
            : position === 2
                ? "from-violet-500/15 to-blue-500/10"
                : "from-cyan-500/15 to-violet-500/10";

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.5,
                delay: position * 0.08,
            }}
            whileHover={{
                y: -7,
            }}
            className={`group relative overflow-hidden rounded-3xl border ${first
                ? "border-blue-400/20"
                : "border-white/[0.06]"
                } bg-[#0d1118] transition-all duration-300 hover:border-white/[0.14] hover:shadow-[0_25px_70px_rgba(0,0,0,0.35)]`}
        >
            {/* Glow */}

            <div
                className={`pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-gradient-to-br ${accent} blur-3xl transition-all duration-500 group-hover:scale-125`}
            />

            <div
                className={`h-px w-full bg-gradient-to-r from-transparent ${first
                    ? "via-blue-400/70"
                    : "via-violet-400/30"
                    } to-transparent`}
            />

            <div className="relative p-6 text-center">
                {/* Rank */}

                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-700">
                        Rank
                    </span>

                    <span
                        className={`font-mono text-[11px] font-bold ${first
                            ? "text-blue-400"
                            : "text-slate-600"
                            }`}
                    >
                        #{String(position).padStart(2, "0")}
                    </span>
                </div>

                {/* Crown */}

                <div
                    className={`mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-2xl border ${first
                        ? "border-blue-400/20 bg-blue-400/10 text-blue-400"
                        : "border-white/[0.06] bg-white/[0.03] text-slate-500"
                        }`}
                >
                    {first ? (
                        <Crown size={21} />
                    ) : (
                        <Medal size={21} />
                    )}
                </div>

                {/* Avatar */}

                <div className="relative mx-auto mt-5 w-fit">
                    <div
                        className={`absolute -inset-3 rounded-full blur-2xl ${first
                            ? "bg-blue-500/20"
                            : "bg-violet-500/10"
                            }`}
                    />

                    <div className="relative">
                        <Avatar
                            username={entry.username}
                            avatarUrl={entry.avatarUrl}
                            size={first ? "h-20 w-20" : "h-16 w-16"}
                        />
                    </div>
                </div>

                {/* Username */}

                <Link href={`/u/${entry.username}`}>
                    <h3 className="mt-5 truncate text-base font-bold text-white transition-colors group-hover:text-blue-300">
                        {entry.username}
                    </h3>
                </Link>

                {/* Points */}

                <div className="mt-2">
                    <span className="text-2xl font-black tracking-tight text-white">
                        {entry.points.toLocaleString()}
                    </span>

                    <span className="ml-1 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                        points
                    </span>
                </div>

                {/* Stats */}

                <div className="mt-5 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-bold text-cyan-400">
                        <CheckCircle2 size={11} />
                        {entry.problemsSolved} Solved
                    </span>

                    <span className="rounded-lg border border-white/[0.05] bg-white/[0.025] px-2.5 py-1 text-[9px] font-semibold text-slate-400">
                        {entry.xp} XP
                    </span>

                    <span className="rounded-lg border border-white/[0.05] bg-white/[0.025] px-2.5 py-1 text-[9px] font-semibold text-slate-500">
                        {entry.successRate}%
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

/* ================================================================
   RANK BADGE
================================================================ */

function RankBadge({ rank }: { rank: number }) {
    if (rank <= 3) {
        return (
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035] px-2 font-mono text-[10px] font-black text-slate-400">
                {String(rank).padStart(2, "0")}
            </span>
        );
    }

    return (
        <span className="font-mono text-[10px] font-bold text-slate-700">
            #{String(rank).padStart(2, "0")}
        </span>
    );
}

/* ================================================================
   LEADERBOARD ROW
================================================================ */

function LeaderboardRow({
    entry,
    isMe,
}: {
    entry: Entry;
    isMe: boolean;
}) {
    return (
        <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`group border-t border-white/[0.05] transition-all ${isMe
                ? "bg-blue-500/[0.045]"
                : "hover:bg-white/[0.025]"
                }`}
        >
            {/* Rank */}

            <td className="px-4 py-4 sm:px-5">
                <RankBadge rank={entry.rank} />
            </td>

            {/* Developer */}

            <td className="px-4 py-4 sm:px-5">
                <Link
                    href={`/u/${entry.username}`}
                    className="group/user flex min-w-[190px] items-center gap-3"
                >
                    <div className="relative">
                        <Avatar
                            username={entry.username}
                            avatarUrl={entry.avatarUrl}
                            size="h-9 w-9"
                        />

                        {isMe && (
                            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#0d1118] bg-blue-400 text-[7px] text-black">
                                ✓
                            </span>
                        )}
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span
                                className={`truncate text-xs font-semibold ${isMe
                                    ? "text-blue-300"
                                    : "text-white"
                                    }`}
                            >
                                {entry.username}
                            </span>

                            {isMe && (
                                <span className="rounded-md bg-blue-400/10 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-wider text-blue-400">
                                    You
                                </span>
                            )}
                        </div>

                        <span className="text-[9px] text-slate-700">
                            CodeRush Developer
                        </span>
                    </div>
                </Link>
            </td>

            {/* XP */}

            <td className="px-4 py-4 text-right sm:px-5">
                <span className="font-mono text-xs font-black text-violet-400">
                    {entry.xp.toLocaleString()} XP
                </span>
            </td>

            {/* Points */}

            <td className="px-4 py-4 text-right sm:px-5">
                <span className="font-mono text-xs font-black text-white">
                    {entry.points.toLocaleString()}
                </span>
            </td>

            {/* Solved */}

            <td className="px-4 py-4 text-right sm:px-5">
                <span className="inline-flex items-center gap-1 rounded-md border border-cyan-400/10 bg-cyan-400/[0.05] px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                    <CheckCircle2 size={11} className="text-cyan-400" />
                    {entry.problemsSolved}
                </span>
            </td>

            {/* Submissions */}

            <td className="hidden px-4 py-4 text-right md:table-cell sm:px-5">
                <div className="flex flex-col items-end">
                    <span className="font-mono text-[11px] font-bold text-slate-400">
                        {entry.totalSubmissions}
                    </span>

                    <span className="mt-0.5 text-[7px] font-bold uppercase tracking-wider text-slate-700">
                        {entry.successfulSubmissions} successful
                    </span>
                </div>
            </td>

            {/* Success */}

            <td className="hidden px-4 py-4 text-right lg:table-cell sm:px-5">
                <div className="flex items-center justify-end gap-2">
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: `${Math.min(
                                    entry.successRate,
                                    100
                                )}%`,
                            }}
                            transition={{ duration: 0.8 }}
                            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-400"
                        />
                    </div>

                    <span className="font-mono text-[10px] font-bold text-slate-500">
                        {entry.successRate}%
                    </span>
                </div>
            </td>
        </motion.tr>
    );
}

/* ================================================================
   MAIN
================================================================ */

export default function LeaderboardPage() {
    const [period, setPeriod] =
        useState<Period>("all");

    const [theme, setTheme] =
        useState<"dark" | "light">("dark");

    const viewer = useQuery(
        api.users.currentUser
    );

    const leaderboard = useQuery(
        api.leaderboard.getLeaderboard,
        {
            period,
            limit: 50,
        }
    );

    /* ================================================================
       THEME
    ================================================================ */

    useEffect(() => {
        // Defer state update to a microtask (react-hooks/set-state-in-effect).
        queueMicrotask(() => {
            const saved =
                window.localStorage.getItem(
                    "coderush-theme"
                );

            if (
                saved === "light" ||
                saved === "dark"
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

    /* ================================================================
       DATA
    ================================================================ */

    const entries =
        leaderboard?.entries ?? [];

    const podium = entries.slice(0, 3);
    const rest = entries.slice(3);

    const totalUsers = entries.length;

    const totalPoints = entries.reduce(
        (sum, entry) => sum + entry.points,
        0
    );

    const totalSolved = entries.reduce(
        (sum, entry) =>
            sum + entry.problemsSolved,
        0
    );

    /* ================================================================
       RENDER
    ================================================================ */

    return (
        <div
            className={`min-h-screen overflow-hidden transition-colors duration-500 ${theme === "dark"
                ? "bg-[#07090d] text-white"
                : "bg-[#f4f6f8] text-black"
                }`}
        >
            {/* ============================================================
          BACKGROUND
      ============================================================ */}

            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div
                    className={`absolute left-1/2 top-[-180px] h-[500px] w-[700px] -translate-x-1/2 rounded-full blur-[120px] ${theme === "dark"
                        ? "bg-blue-600/[0.08]"
                        : "bg-blue-500/[0.06]"
                        }`}
                />

                <div
                    className={`absolute bottom-[-200px] left-[-100px] h-[400px] w-[400px] rounded-full blur-[120px] ${theme === "dark"
                        ? "bg-violet-600/[0.06]"
                        : "bg-violet-500/[0.04]"
                        }`}
                />

                <div
                    className={`absolute right-[-150px] top-[30%] h-[400px] w-[400px] rounded-full blur-[120px] ${theme === "dark"
                        ? "bg-cyan-500/[0.04]"
                        : "bg-cyan-500/[0.03]"
                        }`}
                />

                <div
                    className={`absolute inset-0 ${theme === "dark"
                        ? "opacity-[0.025]"
                        : "opacity-[0.03]"
                        }`}
                    style={{
                        backgroundImage:
                            theme === "dark"
                                ? "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)"
                                : "linear-gradient(rgba(0,0,0,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.35) 1px, transparent 1px)",
                        backgroundSize: "42px 42px",
                    }}
                />
            </div>

            {/* ============================================================
          CONTENT
      ============================================================ */}

            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* ============================================================
            NAVIGATION
        ============================================================ */}

                <motion.div
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
                    <Link
                        href="/dashboard"
                        className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-sm text-slate-400 backdrop-blur-xl transition-all hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white"
                    >
                        <ArrowLeft
                            size={16}
                            className="transition-transform group-hover:-translate-x-1"
                        />

                        Back to dashboard
                    </Link>

                    <div className="flex items-center gap-2">
                        <div className="hidden items-center gap-2 rounded-full border border-blue-400/10 bg-blue-400/[0.04] px-3 py-1.5 sm:flex">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />

                            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-400">
                                Live Rankings
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
                            aria-label="Toggle theme"
                        >
                            {theme === "dark" ? (
                                <Sun size={15} />
                            ) : (
                                <Moon size={15} />
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* ============================================================
            HERO
        ============================================================ */}

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
                    className="mb-12"
                >
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/10 bg-violet-400/[0.05] px-3 py-1.5">
                        <Sparkles
                            size={13}
                            className="text-violet-400"
                        />

                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400">
                            CodeRush Rankings
                        </span>
                    </div>

                    <h1 className="max-w-4xl text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">
                        Compete.
                        <br />

                        <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            Climb the leaderboard.
                        </span>
                    </h1>

                    <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                        See how you rank against the CodeRush
                        community. Solve challenges, execute
                        better code, earn points, and become
                        the top developer.
                    </p>

                    {/* Stats */}

                    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            icon={
                                <Users
                                    size={17}
                                    className="text-blue-400"
                                />
                            }
                            value={totalUsers}
                            label="Ranked Developers"
                            accent="bg-blue-500"
                        />

                        <StatCard
                            icon={
                                <Trophy
                                    size={17}
                                    className="text-violet-400"
                                />
                            }
                            value={totalPoints.toLocaleString()}
                            label="Combined Points"
                            accent="bg-violet-500"
                        />

                        <StatCard
                            icon={
                                <CheckCircle2
                                    size={17}
                                    className="text-cyan-400"
                                />
                            }
                            value={totalSolved.toLocaleString()}
                            label="Problems Solved"
                            accent="bg-cyan-500"
                        />

                        <StatCard
                            icon={
                                <Sparkles
                                    size={17}
                                    className="text-emerald-400"
                                />
                            }
                            value={
                                leaderboard?.me
                                    ? `${leaderboard.me.problemsSolved} Solved`
                                    : "0 Solved"
                            }
                            label="Your Problems Solved"
                            accent="bg-emerald-500"
                        />
                    </div>
                </motion.section>

                {/* ============================================================
            PERIOD FILTER
        ============================================================ */}

                <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">
                            Ranking period
                        </p>

                        <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                            Developer performance
                        </h2>
                    </div>

                    <div
                        className="flex w-full overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-1 sm:w-auto"
                        role="tablist"
                    >
                        {PERIOD_TABS.map((tab) => {
                            const active =
                                period === tab.value;

                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() =>
                                        setPeriod(tab.value)
                                    }
                                    className={`relative flex h-9 flex-1 items-center justify-center rounded-lg px-4 text-[9px] font-black uppercase tracking-[0.13em] transition-all sm:flex-none ${active
                                        ? "bg-white text-black shadow-lg"
                                        : "text-slate-600 hover:text-white"
                                        }`}
                                >
                                    <span className="hidden sm:inline">
                                        {tab.label}
                                    </span>

                                    <span className="sm:hidden">
                                        {tab.short}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* ============================================================
            LEADERBOARD
        ============================================================ */}

                <UiErrorBoundary>
                    {leaderboard === undefined ? (
                        <div className="space-y-6">
                            <div className="grid gap-5 md:grid-cols-3">
                                {[1, 2, 3].map((item) => (
                                    <div
                                        key={item}
                                        className="h-[330px] animate-pulse rounded-3xl border border-white/[0.05] bg-white/[0.025]"
                                    />
                                ))}
                            </div>

                            <div className="overflow-hidden rounded-3xl border border-white/[0.05] bg-white/[0.02]">
                                <SkeletonList count={7} />
                            </div>
                        </div>
                    ) : entries.length === 0 &&
                        !leaderboard.me ? (
                        /* ==========================================================
                           EMPTY
                        ========================================================== */

                        <motion.div
                            initial={{
                                opacity: 0,
                                scale: 0.98,
                            }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                            }}
                            className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] px-6 py-24 text-center"
                        >
                            <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.05] blur-3xl" />

                            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.04]">
                                <Trophy
                                    size={27}
                                    className="text-blue-400"
                                />
                            </div>

                            <h2 className="relative mt-5 text-xl font-bold text-white">
                                The leaderboard is waiting.
                            </h2>

                            <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                Start coding and complete your
                                first successful challenge to earn
                                points and appear on the global
                                rankings.
                            </p>

                            <Link
                                href="/code"
                                className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-black transition hover:-translate-y-0.5"
                            >
                                <Code2 size={14} />
                                Start Coding
                                <ArrowUpRight size={13} />
                            </Link>
                        </motion.div>
                    ) : (
                        <>
                            {/* ======================================================
                  PODIUM
              ====================================================== */}

                            {podium.length > 0 && (
                                <section className="mb-8">
                                    <div className="mb-5 flex items-end justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">
                                                Top performers
                                            </p>

                                            <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                                                The leaders
                                            </h2>
                                        </div>

                                        <div className="hidden items-center gap-2 text-[10px] text-slate-700 sm:flex">
                                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                                            Updated live
                                        </div>
                                    </div>

                                    <div className="grid gap-5 md:grid-cols-3">
                                        {podium.map((entry) => (
                                            <PodiumCard
                                                key={entry.userId}
                                                entry={entry}
                                                position={
                                                    entry.rank as
                                                    | 1
                                                    | 2
                                                    | 3
                                                }
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ======================================================
                  TABLE
              ====================================================== */}

                            {rest.length > 0 && (
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
                                    className="overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0d1118]"
                                >
                                    {/* Header */}

                                    <div className="flex flex-col gap-4 border-b border-white/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
                                                <BarChart3
                                                    size={17}
                                                    className="text-blue-400"
                                                />
                                            </div>

                                            <div>
                                                <h2 className="text-sm font-bold text-white">
                                                    Global Rankings
                                                </h2>

                                                <p className="mt-0.5 text-[9px] text-slate-700">
                                                    Developers ranked by
                                                    performance and points.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="self-start rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.15em] text-slate-600">
                                            {rest.length} ranked
                                        </div>
                                    </div>

                                    {/* Table */}

                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[760px] text-left">
                                            <thead>
                                                <tr className="bg-white/[0.015]">
                                                    <th className="px-4 py-3 text-[7px] font-black uppercase tracking-[0.2em] text-slate-700 sm:px-5">
                                                        Rank
                                                    </th>

                                                    <th className="px-4 py-3 text-[7px] font-black uppercase tracking-[0.2em] text-slate-700 sm:px-5">
                                                        Developer
                                                    </th>

                                                    <th className="px-4 py-3 text-right text-[7px] font-black uppercase tracking-[0.2em] text-slate-700 sm:px-5">
                                                        XP
                                                    </th>

                                                    <th className="px-4 py-3 text-right text-[7px] font-black uppercase tracking-[0.2em] text-slate-700 sm:px-5">
                                                        Points
                                                    </th>

                                                    <th className="px-4 py-3 text-right text-[7px] font-black uppercase tracking-[0.2em] text-slate-700 sm:px-5">
                                                        Solved
                                                    </th>

                                                    <th className="hidden px-4 py-3 text-right text-[7px] font-black uppercase tracking-[0.2em] text-slate-700 md:table-cell sm:px-5">
                                                        Submissions
                                                    </th>

                                                    <th className="hidden px-4 py-3 text-right text-[7px] font-black uppercase tracking-[0.2em] text-slate-700 lg:table-cell sm:px-5">
                                                        Success
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {rest.map((entry) => {
                                                    const isMe =
                                                        viewer != null &&
                                                        entry.username ===
                                                        viewer.username;

                                                    return (
                                                        <LeaderboardRow
                                                            key={
                                                                entry.userId
                                                            }
                                                            entry={entry}
                                                            isMe={isMe}
                                                        />
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.section>
                            )}

                            {/* ======================================================
                  YOUR RANK
              ====================================================== */}

                            {leaderboard.me && (
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
                                        delay: 0.35,
                                    }}
                                    className="relative mt-7 overflow-hidden rounded-3xl border border-blue-400/10 bg-gradient-to-br from-blue-500/[0.08] via-violet-500/[0.05] to-cyan-500/[0.04] p-6"
                                >
                                    <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

                                    <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-400/10">
                                                    <Trophy
                                                        size={15}
                                                        className="text-blue-400"
                                                    />
                                                </div>

                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">
                                                    Your Rank
                                                </span>
                                            </div>

                                            <div className="mt-4 flex items-center gap-4">
                                                <Avatar
                                                    username={
                                                        leaderboard.me
                                                            .username
                                                    }
                                                    avatarUrl={
                                                        leaderboard.me
                                                            .avatarUrl
                                                    }
                                                    size="h-12 w-12"
                                                />

                                                <div>
                                                    <p className="text-base font-bold text-white">
                                                        {
                                                            leaderboard.me
                                                                .username
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-[9px] text-slate-400">
                                                        <span className="font-semibold text-violet-400">
                                                            {
                                                                leaderboard.me
                                                                    .xp
                                                            }{" "}
                                                            XP
                                                        </span>
                                                        <span className="mx-1.5">
                                                            •
                                                        </span>
                                                        <span>
                                                            {
                                                                leaderboard.me
                                                                    .points
                                                            }{" "}
                                                            Points
                                                        </span>
                                                        <span className="mx-1.5">
                                                            •
                                                        </span>
                                                        <span className="font-bold text-cyan-400">
                                                            {
                                                                leaderboard.me
                                                                    .problemsSolved
                                                            }{" "}
                                                            Problems Solved
                                                        </span>
                                                        <span className="mx-1.5">
                                                            •
                                                        </span>
                                                        <span>
                                                            {
                                                                leaderboard.me
                                                                    .successRate
                                                            }
                                                            % Success
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-6 sm:justify-end">
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-700">
                                                    Current position
                                                </p>

                                                <p className="mt-1 text-4xl font-black tracking-tight text-white">
                                                    #
                                                    {
                                                        leaderboard.me
                                                            .rank
                                                    }
                                                </p>
                                            </div>

                                            <Link
                                                href={`/u/${leaderboard.me.username}`}
                                                className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                                            >
                                                Profile

                                                <ArrowUpRight
                                                    size={12}
                                                    className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                                />
                                            </Link>
                                        </div>
                                    </div>
                                </motion.section>
                            )}
                        </>
                    )}
                </UiErrorBoundary>

                {/* ============================================================
            FOOTER
        ============================================================ */}

                <motion.div
                    initial={{
                        opacity: 0,
                    }}
                    animate={{
                        opacity: 1,
                    }}
                    transition={{
                        delay: 0.5,
                    }}
                    className="mt-16 border-t border-white/[0.05] pt-6 text-center"
                >
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-700">
                        CodeRush · Build · Learn · Compete
                    </p>
                </motion.div>
            </div>
        </div>
    );
}