"use client";

/**
 * CodeRush — Ultra Premium Leaderboard
 *
 * Features:
 * - Premium black / white glassmorphism UI
 * - Light / Dark mode
 * - Persistent theme using localStorage
 * - Premium top-3 podium
 * - Animated ranking cards
 * - Premium leaderboard table
 * - Current-user highlighting
 * - Your Rank section
 * - Responsive mobile layout
 * - Loading skeletons
 * - Convex leaderboard logic preserved
 * - Existing authentication/viewer logic preserved
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
   ICONS
================================================================ */

function TrophyIcon({
    size = 20,
}: {
    size?: number;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M6 4H4a2 2 0 0 0 0 4h2" />
            <path d="M18 4h2a2 2 0 0 1 0 4h-2" />
            <path d="M6 4h12v5a6 6 0 0 1-12 0V4Z" />
            <path d="M12 15v4" />
            <path d="M8 22h8" />
            <path d="M9 19h6" />
        </svg>
    );
}

function CrownIcon({
    size = 20,
}: {
    size?: number;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="m3 7 4 4 5-7 5 7 4-4-2 13H5L3 7Z" />
            <path d="M5 20h14" />
        </svg>
    );
}

function ArrowIcon({
    size = 15,
    className = "",
}: {
    size?: number;
    className?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <line
                x1="5"
                y1="12"
                x2="19"
                y2="12"
            />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}

function CodeIcon({
    size = 18,
}: {
    size?: number;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
        </svg>
    );
}

function SunIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z" />
        </svg>
    );
}

function ChartIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M4 19V5" />
            <path d="M4 19h17" />
            <path d="m7 15 4-4 3 2 5-7" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function UsersIcon() {
    return (
        <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

/* ================================================================
   AVATAR
================================================================ */

function Avatar({
    username,
    avatarUrl,
    size = "h-10 w-10",
    ring = false,
}: {
    username: string;
    avatarUrl: string | null;
    size?: string;
    ring?: boolean;
}) {
    if (avatarUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatarUrl}
                alt={`${username}'s avatar`}
                className={`${size} rounded-full object-cover ${ring
                        ? "ring-2 ring-black/10 dark:ring-white/10"
                        : ""
                    }`}
                onError={(event) => {
                    event.currentTarget.style.display =
                        "none";
                }}
            />
        );
    }

    return (
        <div
            className={`${size} flex items-center justify-center rounded-full border border-black/10 bg-gradient-to-br from-neutral-900 via-neutral-700 to-neutral-400 text-sm font-black text-white shadow-lg dark:border-white/10 dark:from-white dark:via-white/70 dark:to-white/20 dark:text-black ${ring
                    ? "ring-2 ring-black/10 dark:ring-white/10"
                    : ""
                }`}
        >
            {username.charAt(0).toUpperCase()}
        </div>
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
    const isFirst = position === 1;

    return (
        <Link
            href={`/u/${entry.username}`}
            className={`group relative overflow-hidden rounded-[26px] border p-5 text-center transition-all duration-500 hover:-translate-y-2 ${isFirst
                    ? "min-h-[285px] border-black/[0.12] bg-black text-white shadow-[0_30px_80px_rgba(0,0,0,.22)] dark:border-white/[0.14] dark:bg-white dark:text-black"
                    : "min-h-[250px] border-black/[0.08] bg-black/[0.035] text-black backdrop-blur-xl hover:border-black/[0.18] hover:bg-black/[0.055] dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-white dark:hover:border-white/[0.16] dark:hover:bg-white/[0.055]"
                }`}
        >
            {/* Ambient glow */}

            <div
                className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${isFirst
                        ? "bg-white/10 dark:bg-black/10"
                        : "bg-black/5 dark:bg-white/5"
                    }`}
            />

            <div
                className={`pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full blur-3xl ${isFirst
                        ? "bg-white/5 dark:bg-black/5"
                        : "bg-black/5 dark:bg-white/5"
                    }`}
            />

            {/* Rank */}

            <div className="relative flex items-center justify-between">
                <span
                    className={`font-mono text-[9px] font-bold uppercase tracking-[0.25em] ${isFirst
                            ? "text-white/35 dark:text-black/35"
                            : "text-black/25 dark:text-white/25"
                        }`}
                >
                    Rank
                </span>

                <span
                    className={`font-mono text-[11px] font-bold ${isFirst
                            ? "text-white/50 dark:text-black/50"
                            : "text-black/40 dark:text-white/40"
                        }`}
                >
                    0{position}
                </span>
            </div>

            {/* Crown */}

            <div
                className={`relative mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-2xl ${isFirst
                        ? "border border-white/10 bg-white/10 dark:border-black/10 dark:bg-black/10"
                        : "border border-black/10 bg-black/[0.035] dark:border-white/10 dark:bg-white/[0.035]"
                    }`}
            >
                <CrownIcon size={21} />
            </div>

            {/* Avatar */}

            <div className="relative mx-auto mt-4 w-fit">
                <div
                    className={`absolute -inset-2 rounded-full blur-xl ${isFirst
                            ? "bg-white/10 dark:bg-black/10"
                            : "bg-black/5 dark:bg-white/5"
                        }`}
                />

                <div className="relative">
                    <Avatar
                        username={entry.username}
                        avatarUrl={entry.avatarUrl}
                        size={
                            isFirst
                                ? "h-16 w-16"
                                : "h-14 w-14"
                        }
                        ring
                    />
                </div>
            </div>

            {/* Username */}

            <p className="relative mt-4 truncate text-[15px] font-black tracking-[-0.02em]">
                {entry.username}
            </p>

            {/* Points */}

            <p
                className={`relative mt-1 text-xl font-black tracking-[-0.04em] ${isFirst
                        ? "text-white dark:text-black"
                        : "text-black dark:text-white"
                    }`}
            >
                {entry.points.toLocaleString()}
                <span
                    className={`ml-1 text-[9px] font-bold uppercase tracking-[0.18em] ${isFirst
                            ? "text-white/35 dark:text-black/35"
                            : "text-black/30 dark:text-white/30"
                        }`}
                >
                    pts
                </span>
            </p>

            {/* Stats */}

            <div
                className={`relative mx-auto mt-4 flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.16em] ${isFirst
                        ? "bg-white/10 text-white/45 dark:bg-black/10 dark:text-black/45"
                        : "bg-black/[0.04] text-black/35 dark:bg-white/[0.04] dark:text-white/35"
                    }`}
            >
                <span>
                    {entry.problemsSolved} solved
                </span>

                <span className="opacity-30">
                    •
                </span>

                <span>
                    {entry.successRate}% success
                </span>
            </div>
        </Link>
    );
}

/* ================================================================
   STAT CARD
================================================================ */

function StatCard({
    label,
    value,
    icon,
}: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
}) {
    return (
        <div className="group relative overflow-hidden rounded-2xl border border-black/[0.07] bg-black/[0.025] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-black/[0.14] hover:bg-black/[0.045] dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.045]">
            <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-black/[0.035] blur-2xl dark:bg-white/[0.035]" />

            <div className="relative flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.07] bg-black/[0.035] text-black/50 dark:border-white/[0.07] dark:bg-white/[0.035] dark:text-white/50">
                    {icon}
                </span>

                <div>
                    <p className="text-lg font-black tracking-[-0.03em] text-black dark:text-white">
                        {value}
                    </p>

                    <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-black/30 dark:text-white/30">
                        {label}
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ================================================================
   TABLE RANK BADGE
================================================================ */

function RankBadge({
    rank,
}: {
    rank: number;
}) {
    if (rank <= 3) {
        return (
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-black/[0.04] px-2 font-mono text-[10px] font-black text-black/60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/60">
                {rank === 1
                    ? "01"
                    : rank === 2
                        ? "02"
                        : "03"}
            </span>
        );
    }

    return (
        <span className="font-mono text-[10px] font-bold text-black/30 dark:text-white/30">
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
        <tr
            className={`group border-t border-black/[0.06] transition-all duration-300 dark:border-white/[0.06] ${isMe
                    ? "bg-black/[0.045] dark:bg-white/[0.055]"
                    : "hover:bg-black/[0.025] dark:hover:bg-white/[0.025]"
                }`}
        >
            {/* Rank */}

            <td className="px-4 py-4 sm:px-5">
                <RankBadge rank={entry.rank} />
            </td>

            {/* User */}

            <td className="px-4 py-4 sm:px-5">
                <Link
                    href={`/u/${entry.username}`}
                    className="group/user flex min-w-[170px] items-center gap-3"
                >
                    <div className="relative">
                        <Avatar
                            username={entry.username}
                            avatarUrl={entry.avatarUrl}
                            size="h-9 w-9"
                        />

                        {isMe && (
                            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-black text-white dark:border-black dark:bg-white dark:text-black">
                                <CheckIcon />
                            </span>
                        )}
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span
                                className={`truncate text-[11px] font-bold transition ${isMe
                                        ? "text-black dark:text-white"
                                        : "text-black/75 group-hover/user:text-black dark:text-white/75 dark:group-hover/user:text-white"
                                    }`}
                            >
                                {entry.username}
                            </span>

                            {isMe && (
                                <span className="rounded-md border border-black/10 bg-black px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.14em] text-white dark:border-white/10 dark:bg-white dark:text-black">
                                    You
                                </span>
                            )}
                        </div>

                        <span className="text-[8px] text-black/30 dark:text-white/30">
                            CodeRush Developer
                        </span>
                    </div>
                </Link>
            </td>

            {/* Problems */}

            <td className="px-4 py-4 text-right sm:px-5">
                <span className="font-mono text-[11px] font-bold text-black/60 dark:text-white/60">
                    {entry.problemsSolved}
                </span>
            </td>

            {/* Submissions */}

            <td className="px-4 py-4 text-right sm:px-5">
                <div className="flex flex-col items-end">
                    <span className="font-mono text-[11px] font-bold text-black/60 dark:text-white/60">
                        {entry.totalSubmissions}
                    </span>

                    <span className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-black/25 dark:text-white/25">
                        {entry.successfulSubmissions} successful
                    </span>
                </div>
            </td>

            {/* Success */}

            <td className="hidden px-4 py-4 text-right md:table-cell sm:px-5">
                <div className="flex items-center justify-end gap-2">
                    <div className="h-1 w-14 overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.07]">
                        <div
                            className="h-full rounded-full bg-black transition-all dark:bg-white"
                            style={{
                                width: `${Math.min(
                                    entry.successRate,
                                    100
                                )}%`,
                            }}
                        />
                    </div>

                    <span className="font-mono text-[10px] font-bold text-black/50 dark:text-white/50">
                        {entry.successRate}%
                    </span>
                </div>
            </td>

            {/* Points */}

            <td className="px-4 py-4 text-right sm:px-5">
                <span className="font-mono text-[12px] font-black text-black dark:text-white">
                    {entry.points.toLocaleString()}
                </span>
            </td>
        </tr>
    );
}

/* ================================================================
   MAIN PAGE
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

    /* ============================================================
       THEME
    ============================================================ */

    useEffect(() => {
        const saved =
            window.localStorage.getItem(
                "coderush-theme"
            );

        if (
            saved === "light" ||
            saved === "dark"
        ) {
            setTheme(saved);
        } else {
            const prefersLight =
                window.matchMedia(
                    "(prefers-color-scheme: light)"
                ).matches;

            setTheme(
                prefersLight
                    ? "light"
                    : "dark"
            );
        }
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
       DATA
    ============================================================ */

    const entries =
        leaderboard?.entries ?? [];

    const podium = entries.slice(0, 3);

    const rest = entries.slice(3);

    const totalUsers =
        entries.length;

    const totalPoints =
        entries.reduce(
            (sum, entry) =>
                sum + entry.points,
            0
        );

    const totalSolved =
        entries.reduce(
            (sum, entry) =>
                sum +
                entry.problemsSolved,
            0
        );

    /* ============================================================
       RENDER
    ============================================================ */

    return (
        <div
            className={`relative min-h-screen overflow-hidden transition-colors duration-500 ${theme === "dark"
                    ? "bg-[#030303] text-white"
                    : "bg-[#f6f6f4] text-black"
                }`}
        >
            {/* ====================================================
                BACKGROUND
            ==================================================== */}

            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                {/* Top glow */}

                <div
                    className={`absolute left-1/2 top-[-220px] h-[500px] w-[700px] -translate-x-1/2 rounded-full blur-[120px] ${theme === "dark"
                            ? "bg-white/[0.035]"
                            : "bg-black/[0.035]"
                        }`}
                />

                {/* Left glow */}

                <div
                    className={`absolute left-[-180px] top-[35%] h-[400px] w-[400px] rounded-full blur-[130px] ${theme === "dark"
                            ? "bg-white/[0.018]"
                            : "bg-black/[0.025]"
                        }`}
                />

                {/* Right glow */}

                <div
                    className={`absolute bottom-[-180px] right-[-160px] h-[450px] w-[450px] rounded-full blur-[130px] ${theme === "dark"
                            ? "bg-white/[0.02]"
                            : "bg-black/[0.025]"
                        }`}
                />

                {/* Grid */}

                <div
                    className="absolute inset-0 opacity-[0.025] dark:opacity-[0.025]"
                    style={{
                        backgroundImage:
                            theme === "dark"
                                ? "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)"
                                : "linear-gradient(rgba(0,0,0,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.5) 1px, transparent 1px)",
                        backgroundSize:
                            "70px 70px",
                    }}
                />
            </div>

            {/* ====================================================
                MAIN
            ==================================================== */}

            <main className="relative mx-auto w-full max-w-[1450px] px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-10">
                {/* =================================================
                    HEADER
                ================================================= */}

                <section className="relative overflow-hidden rounded-[28px] border border-black/[0.08] bg-white/50 p-5 shadow-[0_30px_100px_rgba(0,0,0,.04)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.025] dark:shadow-[0_30px_100px_rgba(0,0,0,.25)] sm:p-7 lg:p-8">
                    {/* Header reflection */}

                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/15 to-transparent dark:via-white/20" />

                    {/* Header glow */}

                    <div className="pointer-events-none absolute -right-20 -top-32 h-72 w-72 rounded-full bg-black/[0.025] blur-3xl dark:bg-white/[0.025]" />

                    <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
                        {/* Title */}

                        <div>
                            <div className="mb-4 flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-black text-white dark:border-white/10 dark:bg-white dark:text-black">
                                    <TrophyIcon size={15} />
                                </span>

                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-black/35 dark:text-white/35">
                                    CodeRush Rankings
                                </span>
                            </div>

                            <h1 className="text-3xl font-black tracking-[-0.055em] text-black dark:text-white sm:text-4xl lg:text-5xl">
                                Global
                                <span className="text-black/20 dark:text-white/20">
                                    {" "}
                                    Leaderboard
                                </span>
                            </h1>

                            <p className="mt-3 max-w-xl text-sm leading-6 text-black/40 dark:text-white/35">
                                Compete with developers,
                                solve problems, execute
                                better code, and climb the
                                CodeRush rankings.
                            </p>
                        </div>

                        {/* Controls */}

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            {/* Theme */}

                            <button
                                type="button"
                                onClick={() =>
                                    setTheme(
                                        theme ===
                                            "dark"
                                            ? "light"
                                            : "dark"
                                    )
                                }
                                aria-label={`Switch to ${theme ===
                                        "dark"
                                        ? "light"
                                        : "dark"
                                    } mode`}
                                className="group flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-black/[0.035] px-4 text-black/50 transition-all duration-300 hover:border-black/20 hover:bg-black/[0.06] hover:text-black dark:border-white/10 dark:bg-white/[0.035] dark:text-white/50 dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-white"
                            >
                                <span className="transition-transform duration-500 group-hover:rotate-12">
                                    {theme ===
                                        "dark" ? (
                                        <SunIcon />
                                    ) : (
                                        <MoonIcon />
                                    )}
                                </span>

                                <span className="text-[9px] font-black uppercase tracking-[0.16em]">
                                    {theme ===
                                        "dark"
                                        ? "Light"
                                        : "Dark"}
                                </span>
                            </button>

                            {/* Editor */}

                            <Link
                                href="/code"
                                className="group flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-[9px] font-black uppercase tracking-[0.16em] text-white shadow-[0_10px_30px_rgba(0,0,0,.15)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_15px_40px_rgba(0,0,0,.2)] dark:bg-white dark:text-black"
                            >
                                <CodeIcon size={15} />

                                Open Editor

                                <ArrowIcon
                                    size={12}
                                    className="opacity-50 transition group-hover:translate-x-1"
                                />
                            </Link>
                        </div>
                    </div>

                    {/* =================================================
                        STATS
                    ================================================= */}

                    <div className="relative mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <StatCard
                            label="Ranked Developers"
                            value={totalUsers}
                            icon={
                                <UsersIcon />
                            }
                        />

                        <StatCard
                            label="Combined Points"
                            value={totalPoints.toLocaleString()}
                            icon={
                                <TrophyIcon size={17} />
                            }
                        />

                        <StatCard
                            label="Problems Solved"
                            value={totalSolved.toLocaleString()}
                            icon={
                                <CheckIcon />
                            }
                        />
                    </div>
                </section>

                {/* =================================================
                    PERIOD FILTER
                ================================================= */}

                <section className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-black/30 dark:text-white/30">
                            Ranking Period
                        </p>

                        <p className="mt-1 text-xs text-black/35 dark:text-white/30">
                            Select a timeframe to compare
                            developer performance.
                        </p>
                    </div>

                    <div
                        className="flex w-full overflow-x-auto rounded-xl border border-black/[0.07] bg-black/[0.025] p-1 dark:border-white/[0.07] dark:bg-white/[0.025] sm:w-auto"
                        role="tablist"
                        aria-label="Leaderboard period"
                    >
                        {PERIOD_TABS.map(
                            (tab) => {
                                const active =
                                    period ===
                                    tab.value;

                                return (
                                    <button
                                        key={
                                            tab.value
                                        }
                                        type="button"
                                        role="tab"
                                        aria-selected={
                                            active
                                        }
                                        onClick={() =>
                                            setPeriod(
                                                tab.value
                                            )
                                        }
                                        className={`relative flex h-9 flex-1 items-center justify-center rounded-lg px-3 text-[9px] font-black uppercase tracking-[0.13em] transition-all duration-300 sm:flex-none ${active
                                                ? "bg-black text-white shadow-lg dark:bg-white dark:text-black"
                                                : "text-black/35 hover:text-black dark:text-white/35 dark:hover:text-white"
                                            }`}
                                    >
                                        <span className="hidden sm:inline">
                                            {
                                                tab.label
                                            }
                                        </span>

                                        <span className="sm:hidden">
                                            {
                                                tab.short
                                            }
                                        </span>
                                    </button>
                                );
                            }
                        )}
                    </div>
                </section>

                {/* =================================================
                    LEADERBOARD CONTENT
                ================================================= */}

                <UiErrorBoundary>
                    {leaderboard ===
                        undefined ? (
                        <div className="mt-7 space-y-6">
                            {/* Podium skeleton */}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {[1, 2, 3].map(
                                    (item) => (
                                        <div
                                            key={
                                                item
                                            }
                                            className="h-[280px] animate-pulse rounded-[26px] border border-black/[0.06] bg-black/[0.035] dark:border-white/[0.06] dark:bg-white/[0.035]"
                                        />
                                    )
                                )}
                            </div>

                            {/* Table skeleton */}

                            <div className="overflow-hidden rounded-[26px] border border-black/[0.07] bg-black/[0.025] dark:border-white/[0.07] dark:bg-white/[0.025]">
                                <SkeletonList count={7} />
                            </div>
                        </div>
                    ) : entries.length ===
                        0 &&
                        !leaderboard.me ? (
                        /* ==========================================
                           EMPTY STATE
                        ========================================== */

                        <div className="relative mt-7 overflow-hidden rounded-[28px] border border-black/[0.08] bg-black/[0.025] px-6 py-24 text-center dark:border-white/[0.08] dark:bg-white/[0.025]">
                            <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/[0.035] blur-3xl dark:bg-white/[0.035]" />

                            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-black/10 bg-black text-white shadow-xl dark:border-white/10 dark:bg-white dark:text-black">
                                <TrophyIcon
                                    size={25}
                                />
                            </div>

                            <h2 className="relative mt-6 text-2xl font-black tracking-[-0.04em] text-black dark:text-white">
                                The leaderboard is
                                waiting.
                            </h2>

                            <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-black/40 dark:text-white/35">
                                Start coding and run
                                your first successful
                                program to earn points
                                and appear on the global
                                rankings.
                            </p>

                            <Link
                                href="/code"
                                className="relative mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-[9px] font-black uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-black"
                            >
                                <CodeIcon size={15} />
                                Start Coding
                                <ArrowIcon size={12} />
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* ======================================
                                PODIUM
                            ====================================== */}

                            {podium.length >
                                0 && (
                                    <section className="mt-7">
                                        <div className="mb-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-black/30 dark:text-white/30">
                                                    Top Performers
                                                </p>

                                                <p className="mt-1 text-xs text-black/35 dark:text-white/30">
                                                    The developers
                                                    leading the
                                                    board.
                                                </p>
                                            </div>

                                            <span className="hidden items-center gap-2 rounded-full border border-black/[0.07] bg-black/[0.025] px-3 py-1.5 text-[7px] font-bold uppercase tracking-[0.15em] text-black/30 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-white/30 sm:flex">
                                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black dark:bg-white" />
                                                Live Rankings
                                            </span>
                                        </div>

                                        <div
                                            className={`grid grid-cols-1 gap-4 ${podium.length ===
                                                    3
                                                    ? "md:grid-cols-3"
                                                    : podium.length ===
                                                        2
                                                        ? "md:grid-cols-2"
                                                        : ""
                                                }`}
                                        >
                                            {podium.map(
                                                (
                                                    entry
                                                ) => (
                                                    <PodiumCard
                                                        key={
                                                            entry.userId
                                                        }
                                                        entry={
                                                            entry
                                                        }
                                                        position={
                                                            entry.rank as
                                                            | 1
                                                            | 2
                                                            | 3
                                                        }
                                                    />
                                                )
                                            )}
                                        </div>
                                    </section>
                                )}

                            {/* ======================================
                                TABLE
                            ====================================== */}

                            {rest.length >
                                0 && (
                                    <section className="mt-7 overflow-hidden rounded-[26px] border border-black/[0.08] bg-white/40 shadow-[0_25px_80px_rgba(0,0,0,.04)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.02] dark:shadow-[0_25px_80px_rgba(0,0,0,.2)]">
                                        {/* Table header */}

                                        <div className="flex flex-col gap-4 border-b border-black/[0.06] p-5 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-black/[0.04] text-black/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60">
                                                        <ChartIcon />
                                                    </div>

                                                    <h2 className="text-sm font-black tracking-[-0.02em] text-black dark:text-white">
                                                        Global
                                                        Rankings
                                                    </h2>
                                                </div>

                                                <p className="mt-1 pl-10 text-[8px] font-medium text-black/30 dark:text-white/30">
                                                    Developers ranked
                                                    by successful
                                                    executions.
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 self-start rounded-full border border-black/[0.07] bg-black/[0.025] px-3 py-1.5 dark:border-white/[0.07] dark:bg-white/[0.025]">
                                                <span className="h-1.5 w-1.5 rounded-full bg-black dark:bg-white" />

                                                <span className="text-[7px] font-black uppercase tracking-[0.15em] text-black/30 dark:text-white/30">
                                                    {rest.length}{" "}
                                                    ranked
                                                </span>
                                            </div>
                                        </div>

                                        {/* Table */}

                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[760px] text-left">
                                                <thead>
                                                    <tr className="bg-black/[0.025] dark:bg-white/[0.025]">
                                                        <th className="px-4 py-3 text-[7px] font-black uppercase tracking-[0.2em] text-black/25 dark:text-white/25 sm:px-5">
                                                            Rank
                                                        </th>

                                                        <th className="px-4 py-3 text-[7px] font-black uppercase tracking-[0.2em] text-black/25 dark:text-white/25 sm:px-5">
                                                            Developer
                                                        </th>

                                                        <th className="px-4 py-3 text-right text-[7px] font-black uppercase tracking-[0.2em] text-black/25 dark:text-white/25 sm:px-5">
                                                            Solved
                                                        </th>

                                                        <th className="px-4 py-3 text-right text-[7px] font-black uppercase tracking-[0.2em] text-black/25 dark:text-white/25 sm:px-5">
                                                            Submissions
                                                        </th>

                                                        <th className="hidden px-4 py-3 text-right text-[7px] font-black uppercase tracking-[0.2em] text-black/25 dark:text-white/25 md:table-cell sm:px-5">
                                                            Success
                                                        </th>

                                                        <th className="px-4 py-3 text-right text-[7px] font-black uppercase tracking-[0.2em] text-black/25 dark:text-white/25 sm:px-5">
                                                            Points
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {rest.map(
                                                        (
                                                            entry
                                                        ) => {
                                                            const isMe =
                                                                viewer !=
                                                                null &&
                                                                entry.username ===
                                                                viewer.username;

                                                            return (
                                                                <LeaderboardRow
                                                                    key={
                                                                        entry.userId
                                                                    }
                                                                    entry={
                                                                        entry
                                                                    }
                                                                    isMe={
                                                                        isMe
                                                                    }
                                                                />
                                                            );
                                                        }
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                )}

                            {/* ======================================
                                YOUR RANK
                            ====================================== */}

                            {leaderboard.me && (
                                <section className="relative mt-7 overflow-hidden rounded-[26px] border border-black/[0.1] bg-black p-5 text-white shadow-[0_25px_80px_rgba(0,0,0,.15)] dark:border-white/[0.12] dark:bg-white dark:text-black sm:p-6">
                                    {/* Glow */}

                                    <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-3xl dark:bg-black/10" />

                                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white dark:bg-black/10 dark:text-black">
                                                    <TrophyIcon
                                                        size={
                                                            15
                                                        }
                                                    />
                                                </span>

                                                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/40 dark:text-black/40">
                                                    Your Rank
                                                </span>
                                            </div>

                                            <div className="mt-4 flex items-center gap-4">
                                                <Avatar
                                                    username={
                                                        leaderboard
                                                            .me
                                                            .username
                                                    }
                                                    avatarUrl={
                                                        leaderboard
                                                            .me
                                                            .avatarUrl
                                                    }
                                                    size="h-12 w-12"
                                                    ring
                                                />

                                                <div>
                                                    <p className="text-base font-black">
                                                        {
                                                            leaderboard
                                                                .me
                                                                .username
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-[9px] text-white/40 dark:text-black/40">
                                                        {
                                                            leaderboard
                                                                .me
                                                                .points
                                                        }{" "}
                                                        Points
                                                        <span className="mx-1.5">
                                                            •
                                                        </span>
                                                        {
                                                            leaderboard
                                                                .me
                                                                .problemsSolved
                                                        }{" "}
                                                        Problems
                                                        <span className="mx-1.5">
                                                            •
                                                        </span>
                                                        {
                                                            leaderboard
                                                                .me
                                                                .successRate
                                                        }
                                                        % Success
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-6 sm:justify-end">
                                            <div>
                                                <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 dark:text-black/30">
                                                    Current Position
                                                </p>

                                                <p className="mt-1 text-3xl font-black tracking-[-0.05em]">
                                                    #
                                                    {
                                                        leaderboard
                                                            .me
                                                            .rank
                                                    }
                                                </p>
                                            </div>

                                            <Link
                                                href={`/u/${leaderboard.me.username}`}
                                                className="group flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 text-[8px] font-black uppercase tracking-[0.14em] transition hover:bg-white/15 dark:border-black/10 dark:bg-black/10 dark:hover:bg-black/15"
                                            >
                                                Profile

                                                <ArrowIcon
                                                    size={
                                                        12
                                                    }
                                                    className="transition group-hover:translate-x-1"
                                                />
                                            </Link>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </UiErrorBoundary>

                {/* =================================================
                    FOOTER
                ================================================= */}

                <div className="mt-10 flex flex-col items-center justify-center gap-2 text-center">
                    <div className="flex items-center gap-2">
                        <span className="h-px w-8 bg-black/10 dark:bg-white/10" />

                        <span className="text-[7px] font-black uppercase tracking-[0.3em] text-black/20 dark:text-white/20">
                            CodeRush Developer OS
                        </span>

                        <span className="h-px w-8 bg-black/10 dark:bg-white/10" />
                    </div>

                    <p className="text-[7px] uppercase tracking-[0.15em] text-black/15 dark:text-white/15">
                        Build • Execute • Compete • Improve
                    </p>
                </div>
            </main>

            {/* ====================================================
                GLOBAL STYLES
            ==================================================== */}

            <style jsx global>{`
                * {
                    scrollbar-width: thin;
                    scrollbar-color: ${theme === "dark"
                    ? "rgba(255,255,255,.12) transparent"
                    : "rgba(0,0,0,.12) transparent"
                };
                }

                ::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }

                ::-webkit-scrollbar-track {
                    background: transparent;
                }

                ::-webkit-scrollbar-thumb {
                    background: ${theme === "dark"
                    ? "rgba(255,255,255,.1)"
                    : "rgba(0,0,0,.1)"
                };
                    border-radius: 999px;
                }

                ::-webkit-scrollbar-thumb:hover {
                    background: ${theme === "dark"
                    ? "rgba(255,255,255,.18)"
                    : "rgba(0,0,0,.18)"
                };
                }

                ::selection {
                    background: ${theme === "dark"
                    ? "rgba(255,255,255,.2)"
                    : "rgba(0,0,0,.15)"
                };
                }

                @media (prefers-reduced-motion: reduce) {
                    *,
                    *::before,
                    *::after {
                        scroll-behavior: auto !important;
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }
                }
            `}</style>
        </div>
    );
}