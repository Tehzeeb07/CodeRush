"use client";

/**
 * CodeRush — Premium Dashboard
 *
 * Connects to the existing CodeRush pages. All statistics come from
 * the real backend:
 *   - api.users.currentUser                       → profile (name/bio/avatar)
 *   - api.leaderboard.getUserPublicStats          → rank, points, problems
 *                                                   solved, success rate,
 *                                                   recent activity (real)
 *
 * The streak is derived from the user's own successful submissions in
 * recent activity — never hardcoded. No Convex logic is modified here.
 */

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

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

/** Consecutive calendar days (ending today or yesterday) with a successful run. */
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

    const start = days.has(today) ? today : today - 86400000;

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
        <div className="cr-shell">
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">

                {/* -------------------------------------------------------
                    Page Header
                ------------------------------------------------------- */}

                <header className="dashboard-card flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">

                    <div>
                        <p className="eyebrow mb-2">
                            CodeRush
                        </p>

                        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            Welcome back,{" "}
                            <span className="text-gradient">
                                {username}
                            </span>
                        </h1>

                        <p className="mt-2 max-w-xl text-sm text-[#a1a1aa]">
                            {user.bio
                                ? user.bio
                                : "Practice coding, ship projects, and climb the leaderboard."}
                        </p>
                    </div>

                    <Link
                        href="/code"
                        className="primary-button shrink-0"
                    >
                        <CodeGlyph size={15} />
                        Open Code Editor
                    </Link>

                </header>

                {/* -------------------------------------------------------
                    Developer Overview
                ------------------------------------------------------- */}

                <section
                    className="dashboard-card stagger-1 mt-8"
                    aria-label="Developer overview"
                >
                    <div className="premium-card p-5 sm:p-6">

                        <p className="eyebrow mb-4">
                            Developer Overview
                        </p>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">

                            <StatCell
                                icon={<ProblemsGlyph />}
                                label="Problems Solved"
                                loading={loading}
                                value={formatNumber(
                                    stats?.problemsSolved
                                )}
                            />

                            <StatCell
                                icon={<BoltGlyph />}
                                label="XP Earned"
                                loading={loading}
                                value={`${formatNumber(
                                    stats?.points
                                )} XP`}
                            />

                            <StatCell
                                icon={<TrophyGlyph />}
                                label="Global Rank"
                                loading={loading}
                                value={
                                    stats
                                        ? `#${formatNumber(
                                            stats.rank
                                        )}`
                                        : "—"
                                }
                            />

                            <StatCell
                                icon={<FlameGlyph />}
                                label="Day Streak"
                                loading={loading}
                                value={`${streak}${loading
                                    ? ""
                                    : streak === 1
                                        ? " day"
                                        : " days"
                                    }`}
                            />

                        </div>
                    </div>
                </section>

                {/* -------------------------------------------------------
                    Profile Summary
                ------------------------------------------------------- */}

                <section
                    className="dashboard-card stagger-2 mt-6"
                    aria-label="Your profile"
                >
                    <div className="premium-card flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

                        <div className="flex items-center gap-4">

                            <AvatarBadge
                                avatarUrl={user.avatarUrl}
                                username={user.username}
                                size={64}
                            />

                            <div>

                                <h2 className="text-lg font-semibold text-white">
                                    {user.username ??
                                        "Your account"}
                                </h2>

                                <p className="text-sm text-[#a1a1aa]">
                                    {user.email}
                                </p>

                                <p className="mt-1 text-xs text-[#71717a]">
                                    Competitive Developer
                                </p>

                            </div>

                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">

                            <MiniStat
                                label="Solved"
                                value={
                                    loading
                                        ? "…"
                                        : formatNumber(
                                            stats?.problemsSolved
                                        )
                                }
                            />

                            <MiniStat
                                label="Submissions"
                                value={
                                    loading
                                        ? "…"
                                        : formatNumber(
                                            stats?.totalSubmissions
                                        )
                                }
                            />

                            <MiniStat
                                label="Success"
                                value={
                                    loading
                                        ? "…"
                                        : `${stats?.successRate ?? 0}%`
                                }
                            />

                        </div>

                        <div className="flex flex-wrap gap-3">

                            <Link
                                href={profileHref}
                                className="secondary-button flex-1 lg:flex-none"
                            >
                                <UserGlyph size={15} />
                                View Profile
                            </Link>

                            <Link
                                href="/profile"
                                className="secondary-button flex-1 lg:flex-none"
                            >
                                <EditGlyph size={15} />
                                Edit Profile
                            </Link>

                        </div>

                    </div>
                </section>

                {/* -------------------------------------------------------
                    Feature Destinations
                ------------------------------------------------------- */}

                <section
                    className="mt-8"
                    aria-label="Explore CodeRush"
                >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                        <FeatureCard
                            className="stagger-3"
                            href="/challenges"
                            icon={
                                <CodeGlyph size={18} />
                            }
                            title="Challenges"
                            description="Improve your coding skills with curated programming challenges."
                            cta="Explore Challenges"
                        />

                        <FeatureCard
                            className="stagger-4"
                            href="/showcase"
                            icon={
                                <ShowcaseGlyph size={18} />
                            }
                            title="Showcase"
                            description="Discover projects, solutions, and work from the CodeRush community."
                            cta="Explore Showcase"
                        />

                        <FeatureCard
                            className="stagger-5"
                            href="/leaderboard"
                            icon={
                                <TrophyGlyph size={18} />
                            }
                            title="Leaderboard"
                            description="See how you rank against the CodeRush community."
                            cta="View Leaderboard"
                        />

                        <FeatureCard
                            className="stagger-6"
                            href="/bookmarks"
                            icon={
                                <BookmarkGlyph size={18} />
                            }
                            title="Bookmarks"
                            description="Quickly access your saved challenges and coding resources."
                            cta="Open Bookmarks"
                        />
                        <FeatureCard
                            className="stagger-6"
                            href="/teams"
                            icon={<TeamsGlyph size={18} />}
                            title="Teams"
                            description="Create or join a team and build hackathon projects together."
                            cta="View Teams"
                        />

                        <FeatureCard
                            className="stagger-6"
                            href="/analytics"
                            icon={<AnalyticsGlyph size={18} />}
                            title="Analytics"
                            description="Track your coding performance, submissions, success rate, and progress."
                            cta="View Analytics"
                        />

                    </div>
                </section>

                {/* -------------------------------------------------------
                    Quick Actions
                ------------------------------------------------------- */}

                <section
                    className="dashboard-card stagger-6 mt-8"
                    aria-label="Quick actions"
                >
                    <div className="premium-card p-5 sm:p-6">
                        <p className="eyebrow mb-4">Quick Actions</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
                            <QuickAction href="/challenges" label="Challenges" icon={<BoltGlyph size={15} />} />
                            <QuickAction href="/leaderboard" label="Leaderboard" icon={<TrophyGlyph size={15} />} />
                            <QuickAction href="/bookmarks" label="Bookmarks" icon={<BookmarkGlyph size={15} />} />
                            <QuickAction href="/showcase" label="Showcase" icon={<ShowcaseGlyph size={15} />} />
                            <QuickAction href="/teams" label="Teams" icon={<TeamsGlyph size={15} />} />
                            <QuickAction href="/analytics" label="Analytics" icon={<AnalyticsGlyph size={15} />} />
                            <QuickAction href={profileHref} label="View Profile" icon={<UserGlyph size={15} />} />
                            <QuickAction href="/profile" label="Edit Profile" icon={<EditGlyph size={15} />} />
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}

/* ================================================================
   Loading State
================================================================ */

function LoadingState() {
    return (
        <div className="cr-shell flex items-center justify-center">

            <div className="w-full max-w-7xl px-4 py-10 sm:px-6">

                <div className="skeleton h-8 w-72" />

                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">

                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="premium-card p-5"
                        >
                            <div className="skeleton h-10 w-10" />

                            <div className="skeleton mt-4 h-5 w-16" />
                        </div>
                    ))}

                </div>

            </div>
        </div>
    );
}

/* ================================================================
   Signed Out State
================================================================ */

function SignedOutState() {
    return (
        <div className="cr-shell flex items-center justify-center px-4">

            <div className="premium-card max-w-sm p-8 text-center">

                <h1 className="text-xl font-semibold text-white">
                    Not signed in
                </h1>

                <p className="mt-2 text-sm text-[#a1a1aa]">
                    Sign in to access your CodeRush dashboard.
                </p>

                <Link
                    href="/login"
                    className="primary-button mt-6"
                >
                    Go to login
                </Link>

            </div>

        </div>
    );
}

/* ================================================================
   Stat Cell
================================================================ */

interface StatCellProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    loading: boolean;
}

function StatCell({
    icon,
    label,
    value,
    loading,
}: StatCellProps) {
    return (
        <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-4">

            <div className="flex items-center gap-3">

                <span className="stat-icon">
                    {icon}
                </span>

                {loading ? (
                    <div className="skeleton h-7 w-20" />
                ) : (
                    <p className="text-xl font-bold text-white sm:text-2xl">
                        {value}
                    </p>
                )}

            </div>

            <p className="mt-3 text-xs uppercase tracking-wide text-[#71717a]">
                {label}
            </p>

        </div>
    );
}

/* ================================================================
   Mini Stat
================================================================ */

function MiniStat({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-[#ffffff0d] bg-[#0d0f12]/60 px-3 py-2.5">

            <p className="text-base font-bold text-white">
                {value}
            </p>

            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[#71717a]">
                {label}
            </p>

        </div>
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
                className="rounded-full border border-[#ffffff14] object-cover"
                style={{
                    width: size,
                    height: size,
                }}
                onError={(e) =>
                (e.currentTarget.style.display =
                    "none")
                }
            />
        );
    }

    return (
        <span
            className="flex items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-xl font-semibold text-white"
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
   Feature Card
================================================================ */

interface FeatureCardProps {
    href: string;
    className?: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    cta: string;
}

function FeatureCard({
    href,
    className = "",
    icon,
    title,
    description,
    cta,
}: FeatureCardProps) {
    return (
        <Link
            href={href}
            className={`card-link premium-card premium-card-hover dashboard-card group p-6 ${className}`}
        >

            <span className="stat-icon">
                {icon}
            </span>

            <h3 className="mt-4 text-lg font-semibold text-white">
                {title}
            </h3>

            <p className="mt-1.5 text-sm leading-relaxed text-[#a1a1aa]">
                {description}
            </p>

            <span className="hover-arrow mt-4 text-sm font-medium text-[#818cf8]">

                {cta}

                <ArrowGlyph />

            </span>

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
            className="flex items-center justify-center gap-2 rounded-xl border border-[#ffffff0d] bg-[#0d0f12]/50 px-3 py-3 text-sm font-medium text-[#d4d4d8] transition-colors hover:border-[#6366f1]/50 hover:bg-[#6366f1]/10 hover:text-white"
        >

            <span className="text-[#818cf8]">
                {icon}
            </span>

            {label}

        </Link>
    );
}

/* ================================================================
   Inline Icons
================================================================ */

/* Code */

function CodeGlyph({
    size = 16,
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
        </svg>
    );
}

/* Problems */

function ProblemsGlyph({
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="m8 6-5 6 5 6" />
            <path d="m16 6 5 6-5 6" />
            <line
                x1="13"
                y1="3"
                x2="11"
                y2="21"
            />
        </svg>
    );
}

/* Bolt */

function BoltGlyph({
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}

/* Trophy */

function TrophyGlyph({
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
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

/* Flame */

function FlameGlyph({
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
    );
}

/* Showcase */

function ShowcaseGlyph({
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
    );
}

/* Bookmark */

function BookmarkGlyph({
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
    );
}

function TeamsGlyph({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    );
}

/* User */

function UserGlyph({
    size = 16,
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle
                cx="12"
                cy="7"
                r="4"
            />
        </svg>
    );
}

/* Edit */

function EditGlyph({
    size = 16,
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

/* Arrow */

function ArrowGlyph({
    size = 14,
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
            strokeWidth="2.2"
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