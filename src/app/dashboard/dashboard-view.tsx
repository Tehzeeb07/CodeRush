
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Premium3DBackground from "@/components/background/Premium3DBackground";

interface Activity {
    status: string;
    createdAt: number;
}

interface UserStats {
    rank: number;
    points: number;
    totalSubmissions: number;
    successfulSubmissions: number;
    problemsSolved: number;
    successRate: number;
    recentActivity: Activity[];
}

/* ================================================================
   Helpers
================================================================ */

function computeStreak(activity?: Activity[]): number {
    if (!activity || activity.length === 0) return 0;

    const days = new Set<number>();

    for (const a of activity) {
        if (a.status !== "success") continue;

        const d = new Date(a.createdAt);

        days.add(
            Date.UTC(
                d.getUTCFullYear(),
                d.getUTCMonth(),
                d.getUTCDate()
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

    for (let d = start; days.has(d); d -= 86400000) {
        streak += 1;
    }

    return streak;
}

function formatNumber(n?: number | null): string {
    if (n === undefined || n === null) return "—";
    return n.toLocaleString("en-US");
}

/* ================================================================
   Main Dashboard
================================================================ */

export default function DashboardView() {
    const user = useQuery(api.users.currentUser);

    const stats = useQuery(
        api.leaderboard.getUserPublicStats,
        user?.username
            ? { username: user.username }
            : "skip"
    ) as UserStats | null | undefined;

    if (user === undefined) {
        return <LoadingState />;
    }

    if (user === null) {
        return <SignedOutState />;
    }

    const loading =
        stats === undefined && user.username !== null;

    const username = user.username ?? "there";

    const streak = computeStreak(
        stats?.recentActivity
    );

    const profileHref = user.username
        ? `/u/${user.username}`
        : "/profile";

    return (
        <div className="relative min-h-screen overflow-hidden bg-black text-white">
            {/* =====================================================
                3D BACKGROUND
            ===================================================== */}

            <Premium3DBackground />

            {/* Ambient overlays */}

            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[140px]" />

                <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-indigo-500/[0.035] blur-[150px]" />

                <div className="absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-purple-500/[0.025] blur-[150px]" />
            </div>

            <main className="relative z-10 mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">

                {/* =================================================
                    TOP NAV / HEADER
                ================================================= */}

                <header className="mb-8">

                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

                        <div>

                            <div className="mb-4 flex items-center gap-3">

                                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]">
                                    <CodeGlyph size={15} />
                                </span>

                                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
                                    CodeRush / Dashboard
                                </span>

                                <span className="hidden h-1 w-1 rounded-full bg-white/30 sm:block" />

                                <span className="hidden text-[10px] uppercase tracking-[0.2em] text-emerald-400/70 sm:block">
                                    Online
                                </span>

                            </div>

                            <h1 className="max-w-4xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">

                                Welcome back,

                                <span className="ml-2 bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
                                    {username}
                                </span>

                                <span className="text-white/20">.</span>

                            </h1>

                            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
                                {user.bio ||
                                    "Practice coding, build projects, sharpen your skills, and climb the CodeRush leaderboard."}
                            </p>

                        </div>

                        <Link
                            href="/code"
                            className="group relative inline-flex h-12 shrink-0 items-center justify-center gap-3 overflow-hidden rounded-xl border border-white/15 bg-white px-6 text-sm font-bold text-black shadow-[0_0_40px_rgba(255,255,255,0.08)] transition-all duration-300 hover:-translate-y-1 hover:bg-white/90"
                        >

                            <span className="relative z-10">
                                Open Code Editor
                            </span>

                            <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-1">
                                <ArrowGlyph size={16} />
                            </span>

                            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                        </Link>

                    </div>

                </header>

                {/* =================================================
                    STATISTICS
                ================================================= */}

                <section className="mb-6">

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                        <PremiumStat
                            number={
                                loading
                                    ? "..."
                                    : formatNumber(stats?.problemsSolved)
                            }
                            label="Problems Solved"
                            icon={<ProblemsGlyph size={20} />}
                            index="01"
                        />

                        <PremiumStat
                            number={
                                loading
                                    ? "..."
                                    : `${formatNumber(stats?.points)}`
                            }
                            label="XP Earned"
                            suffix="XP"
                            icon={<BoltGlyph size={20} />}
                            index="02"
                        />

                        <PremiumStat
                            number={
                                loading
                                    ? "..."
                                    : stats
                                        ? `#${formatNumber(stats.rank)}`
                                        : "—"
                            }
                            label="Global Rank"
                            icon={<TrophyGlyph size={20} />}
                            index="03"
                        />

                        <PremiumStat
                            number={
                                loading
                                    ? "..."
                                    : `${streak}`
                            }
                            label={
                                streak === 1
                                    ? "Day Streak"
                                    : "Day Streak"
                            }
                            suffix={
                                loading
                                    ? ""
                                    : streak === 1
                                        ? "DAY"
                                        : "DAYS"
                            }
                            icon={<FlameGlyph size={20} />}
                            index="04"
                        />

                    </div>

                </section>

                {/* =================================================
                    PROFILE + PERFORMANCE
                ================================================= */}

                <section className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">

                    {/* Profile */}

                    <div className="premium-panel group relative overflow-hidden">

                        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-white/[0.035] blur-[80px]" />

                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.035] via-transparent to-transparent opacity-70" />

                        <div className="relative p-6 sm:p-8">

                            <div className="mb-8 flex items-start justify-between">

                                <div>

                                    <p className="section-label">
                                        Developer Profile
                                    </p>

                                    <p className="mt-2 text-xs text-white/30">
                                        Your CodeRush identity
                                    </p>

                                </div>

                                <span className="text-[10px] font-bold tracking-[0.25em] text-white/15">
                                    PROFILE
                                </span>

                            </div>

                            <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">

                                <div className="flex items-center gap-5">

                                    <div className="relative">

                                        <div className="absolute -inset-2 rounded-full bg-white/[0.06] blur-md" />

                                        <AvatarBadge
                                            avatarUrl={user.avatarUrl}
                                            username={user.username}
                                            size={76}
                                        />

                                        <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] border-[#090909] bg-emerald-400" />

                                    </div>

                                    <div>

                                        <h2 className="text-xl font-bold tracking-tight text-white">
                                            {user.username ||
                                                "Your account"}
                                        </h2>

                                        <p className="mt-1 text-sm text-white/40">
                                            {user.email}
                                        </p>

                                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/45">
                                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                                            Competitive Developer
                                        </div>

                                    </div>

                                </div>

                                <div className="flex gap-2">

                                    <Link
                                        href={profileHref}
                                        className="premium-outline-button"
                                    >
                                        <UserGlyph size={15} />
                                        Profile
                                    </Link>

                                    <Link
                                        href="/profile"
                                        className="premium-outline-button"
                                    >
                                        <EditGlyph size={15} />
                                        Edit
                                    </Link>

                                </div>

                            </div>

                        </div>

                    </div>

                    {/* Performance */}

                    <div className="premium-panel relative overflow-hidden">

                        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/[0.06] blur-3xl" />

                        <div className="relative p-6">

                            <div className="mb-6 flex items-center justify-between">

                                <div>

                                    <p className="section-label">
                                        Performance
                                    </p>

                                    <p className="mt-2 text-xs text-white/30">
                                        Current statistics
                                    </p>

                                </div>

                                <AnalyticsGlyph size={18} />

                            </div>

                            <div className="space-y-5">

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

                    </div>

                </section>

                {/* =================================================
                    EXPLORE
                ================================================= */}

                <section className="mb-6">

                    <div className="mb-5 flex items-end justify-between">

                        <div>

                            <p className="section-label">
                                Explore CodeRush
                            </p>

                            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                                Your workspace
                            </h2>

                        </div>

                        <span className="hidden text-[10px] uppercase tracking-[0.2em] text-white/20 sm:block">
                            06 destinations
                        </span>

                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                        <FeatureCard
                            href="/challenges"
                            number="01"
                            icon={<CodeGlyph size={22} />}
                            title="Challenges"
                            description="Solve curated programming problems and improve your competitive coding skills."
                        />

                        <FeatureCard
                            href="/showcase"
                            number="02"
                            icon={<ShowcaseGlyph size={22} />}
                            title="Showcase"
                            description="Discover projects, solutions, and impressive work from the CodeRush community."
                        />

                        <FeatureCard
                            href="/leaderboard"
                            number="03"
                            icon={<TrophyGlyph size={22} />}
                            title="Leaderboard"
                            description="Track your global position and compete with developers across CodeRush."
                        />

                        <FeatureCard
                            href="/bookmarks"
                            number="04"
                            icon={<BookmarkGlyph size={22} />}
                            title="Bookmarks"
                            description="Keep your favorite challenges and coding resources one click away."
                        />

                        <FeatureCard
                            href="/teams"
                            number="05"
                            icon={<TeamsGlyph size={22} />}
                            title="Teams"
                            description="Collaborate with developers and build projects together."
                        />

                        <FeatureCard
                            href="/analytics"
                            number="06"
                            icon={<AnalyticsGlyph size={22} />}
                            title="Analytics"
                            description="Understand your coding performance and monitor your progress."
                        />

                    </div>

                </section>

                {/* =================================================
                    QUICK ACTIONS
                ================================================= */}

                <section className="premium-panel overflow-hidden">

                    <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

                        <div>

                            <p className="section-label">
                                Quick Actions
                            </p>

                            <p className="mt-2 text-sm text-white/35">
                                Jump directly into your workspace.
                            </p>

                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

                            <QuickAction
                                href="/code"
                                label="Code Editor"
                                icon={<CodeGlyph size={15} />}
                            />

                            <QuickAction
                                href="/challenges"
                                label="Challenges"
                                icon={<BoltGlyph size={15} />}
                            />

                            <QuickAction
                                href="/leaderboard"
                                label="Leaderboard"
                                icon={<TrophyGlyph size={15} />}
                            />

                            <QuickAction
                                href="/analytics"
                                label="Analytics"
                                icon={<AnalyticsGlyph size={15} />}
                            />

                        </div>

                    </div>

                </section>

            </main>

            {/* =====================================================
                CUSTOM DASHBOARD STYLES
            ===================================================== */}

            <style jsx global>{`

                .premium-panel {
                    position: relative;
                    border: 1px solid rgba(255,255,255,0.08);
                    background:
                        linear-gradient(
                            135deg,
                            rgba(255,255,255,0.055),
                            rgba(255,255,255,0.018)
                        );
                    border-radius: 22px;
                    box-shadow:
                        0 20px 60px rgba(0,0,0,0.35),
                        inset 0 1px 0 rgba(255,255,255,0.035);
                    backdrop-filter: blur(22px);
                    -webkit-backdrop-filter: blur(22px);
                }

                .section-label {
                    color: rgba(255,255,255,0.45);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.24em;
                    text-transform: uppercase;
                }

                .premium-outline-button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    height: 38px;
                    padding: 0 14px;
                    border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.035);
                    color: rgba(255,255,255,0.65);
                    font-size: 12px;
                    font-weight: 600;
                    transition:
                        transform 200ms ease,
                        background 200ms ease,
                        border-color 200ms ease,
                        color 200ms ease;
                }

                .premium-outline-button:hover {
                    transform: translateY(-2px);
                    border-color: rgba(255,255,255,0.22);
                    background: rgba(255,255,255,0.08);
                    color: white;
                }

                @media (prefers-reduced-motion: reduce) {
                    .premium-outline-button {
                        transition: none;
                    }
                }

            `}</style>

        </div>
    );
}

/* ================================================================
   Premium Stat
================================================================ */

function PremiumStat({
    number,
    label,
    suffix,
    icon,
    index,
}: {
    number: string;
    label: string;
    suffix?: string;
    icon: React.ReactNode;
    index: string;
}) {
    return (
        <div className="group relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.16] hover:bg-white/[0.045]">

            <div className="absolute right-4 top-4 text-[9px] font-bold tracking-[0.2em] text-white/10">
                {index}
            </div>

            <div className="mb-7 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.045] text-white/65 transition-all duration-300 group-hover:scale-105 group-hover:bg-white/[0.08] group-hover:text-white">
                {icon}
            </div>

            <div className="flex items-end gap-2">

                <span className="text-3xl font-black tracking-[-0.04em] text-white">
                    {number}
                </span>

                {suffix && (
                    <span className="mb-1 text-[9px] font-bold tracking-[0.15em] text-white/30">
                        {suffix}
                    </span>
                )}

            </div>

            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
                {label}
            </p>

        </div>
    );
}

/* ================================================================
   Performance Row
================================================================ */

function PerformanceRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 last:border-0 last:pb-0">

            <span className="text-xs text-white/35">
                {label}
            </span>

            <span className="text-sm font-bold text-white">
                {value}
            </span>

        </div>
    );
}

/* ================================================================
   Feature Card
================================================================ */

function FeatureCard({
    href,
    number,
    icon,
    title,
    description,
}: {
    href: string;
    number: string;
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <Link
            href={href}
            className="group relative min-h-[235px] overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-6 transition-all duration-500 hover:-translate-y-2 hover:border-white/[0.17] hover:bg-white/[0.045] hover:shadow-[0_25px_70px_rgba(0,0,0,0.4)]"
        >

            {/* Number */}

            <span className="absolute right-5 top-5 text-[10px] font-bold tracking-[0.2em] text-white/10 transition-colors duration-300 group-hover:text-white/25">
                {number}
            </span>

            {/* Glow */}

            <span className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/[0.045] blur-3xl transition-all duration-500 group-hover:bg-white/[0.08]" />

            {/* Icon */}

            <span className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.045] text-white/60 transition-all duration-500 group-hover:scale-110 group-hover:border-white/[0.18] group-hover:bg-white/[0.08] group-hover:text-white">
                {icon}
            </span>

            {/* Content */}

            <div className="relative">

                <h3 className="mt-7 text-lg font-bold tracking-tight text-white">
                    {title}
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-white/35">
                    {description}
                </p>

            </div>

            {/* CTA */}

            <div className="absolute bottom-6 left-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 transition-all duration-300 group-hover:gap-3 group-hover:text-white/75">

                Explore

                <ArrowGlyph size={13} />

            </div>

        </Link>
    );
}

/* ================================================================
   Quick Action
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
            className="group flex h-10 items-center justify-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-[11px] font-semibold text-white/45 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.15] hover:bg-white/[0.07] hover:text-white"
        >
            <span className="text-white/35 transition-colors group-hover:text-white">
                {icon}
            </span>

            {label}
        </Link>
    );
}

/* ================================================================
   Avatar
================================================================ */

function AvatarBadge({
    avatarUrl,
    username,
    size,
}: {
    avatarUrl: string | null;
    username: string | null;
    size: number;
}) {
    if (avatarUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatarUrl}
                alt=""
                className="relative rounded-full border border-white/15 object-cover"
                style={{
                    width: size,
                    height: size,
                }}
                onError={(e) => {
                    e.currentTarget.style.display = "none";
                }}
            />
        );
    }

    return (
        <span
            className="relative flex items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-white via-white/80 to-white/20 text-2xl font-black text-black shadow-[0_0_30px_rgba(255,255,255,0.08)]"
            style={{
                width: size,
                height: size,
            }}
        >
            {username?.[0]?.toUpperCase() ?? "?"}
        </span>
    );
}

/* ================================================================
   Loading
================================================================ */

function LoadingState() {
    return (
        <div className="min-h-screen bg-black px-4 py-10">

            <div className="mx-auto max-w-7xl">

                <div className="h-4 w-32 animate-pulse rounded bg-white/10" />

                <div className="mt-6 h-14 w-96 max-w-full animate-pulse rounded bg-white/10" />

                <div className="mt-4 h-5 w-80 max-w-full animate-pulse rounded bg-white/5" />

                <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">

                    {[1, 2, 3, 4].map((item) => (
                        <div
                            key={item}
                            className="h-40 animate-pulse rounded-[20px] border border-white/[0.06] bg-white/[0.025]"
                        />
                    ))}

                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">

                    <div className="h-64 animate-pulse rounded-[22px] bg-white/[0.025]" />

                    <div className="h-64 animate-pulse rounded-[22px] bg-white/[0.025]" />

                </div>

            </div>

        </div>
    );
}

/* ================================================================
   Signed Out
================================================================ */

function SignedOutState() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-black px-4">

            <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-white/[0.03] p-10 text-center shadow-2xl">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                    <UserGlyph size={22} />
                </div>

                <h1 className="mt-6 text-2xl font-bold text-white">
                    Not signed in
                </h1>

                <p className="mt-3 text-sm leading-6 text-white/40">
                    Sign in to access your CodeRush dashboard.
                </p>

                <Link
                    href="/login"
                    className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-black transition hover:bg-white/90"
                >
                    Go to Login
                </Link>

            </div>

        </div>
    );
}

/* ================================================================
   Icons
================================================================ */

function CodeGlyph({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
        </svg>
    );
}

function ProblemsGlyph({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m8 6-5 6 5 6" />
            <path d="m16 6 5 6-5 6" />
            <line x1="13" y1="3" x2="11" y2="21" />
        </svg>
    );
}

function BoltGlyph({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}

function TrophyGlyph({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    );
}

function FlameGlyph({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
    );
}

function ShowcaseGlyph({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    );
}

function BookmarkGlyph({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
    );
}

function TeamsGlyph({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function AnalyticsGlyph({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    );
}

function UserGlyph({ size = 16 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function EditGlyph({ size = 16 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

function ArrowGlyph({ size = 14 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}
