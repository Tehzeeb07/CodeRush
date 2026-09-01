
"use client";

/**
 * CodeRush — Ultra Premium Analytics Dashboard
 *
 * Keeps the existing:
 * - Convex analytics query
 * - Authentication handling
 * - AnalyticsHeader
 * - KPI Grid
 * - Problem Stats
 * - Language Donut
 * - Activity Heatmap
 * - Performance Chart
 * - Skill Progress
 * - Recent Activity
 * - Insights
 * - Milestones
 *
 * Redesigned with:
 * - Premium black glass UI
 * - Ambient 3D lighting
 * - Animated grid background
 * - Floating glow effects
 * - Glass cards
 * - Premium section headers
 * - Smooth hover depth
 * - Responsive layout
 * - Light/dark-mode friendly CSS variables
 */

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

import type {
    AnalyticsData,
    AnalyticsRange,
} from "../../components/analytics/types";

import AnalyticsHeader from "../../components/analytics/analytics-header";
import KpiGrid from "../../components/analytics/kpi-grid";
import ProblemStats from "../../components/analytics/problem-stats";
import LanguageDonut from "../../components/analytics/language-donut";
import ActivityHeatmap from "../../components/analytics/heatmap";
import PerformanceChart from "../../components/analytics/performance-chart";
import SkillProgress from "../../components/analytics/skill-progress";
import RecentActivity from "../../components/analytics/recent-activity";
import Insights from "../../components/analytics/insights";
import Milestones from "../../components/analytics/milestones";

/* ================================================================
   PREMIUM CARD
================================================================ */

function PremiumCard({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`
                analytics-premium-card
                group
                relative
                overflow-hidden
                rounded-[24px]
                border
                border-white/[0.075]
                bg-[#08090b]/75
                shadow-[0_25px_80px_rgba(0,0,0,.28)]
                backdrop-blur-[24px]
                transition-all
                duration-500
                hover:-translate-y-[2px]
                hover:border-white/[0.14]
                hover:shadow-[0_35px_100px_rgba(0,0,0,.42)]
                ${className}
            `}
        >
            {/* Top reflection */}

            <div
                className="
                    pointer-events-none
                    absolute
                    left-1/2
                    top-0
                    h-px
                    w-1/2
                    -translate-x-1/2
                    bg-gradient-to-r
                    from-transparent
                    via-white/20
                    to-transparent
                    opacity-60
                "
            />

            {/* Corner glow */}

            <div
                className="
                    pointer-events-none
                    absolute
                    -right-20
                    -top-20
                    h-40
                    w-40
                    rounded-full
                    bg-white/[0.025]
                    blur-3xl
                    transition-all
                    duration-700
                    group-hover:bg-white/[0.045]
                "
            />

            <div className="relative">
                {children}
            </div>
        </div>
    );
}

/* ================================================================
   SECTION HEADER
================================================================ */

function SectionHeader({
    eyebrow,
    title,
    description,
    number,
}: {
    eyebrow: string;
    title: string;
    description?: string;
    number: string;
}) {
    return (
        <div className="mb-5 flex items-end justify-between gap-4">
            <div>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[8px] font-bold tracking-[0.3em] text-white/20">
                        {number}
                    </span>

                    <span className="h-px w-5 bg-white/10" />

                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/25">
                        {eyebrow}
                    </span>
                </div>

                <h2 className="mt-2 text-[17px] font-bold tracking-[-0.025em] text-white sm:text-[19px]">
                    {title}
                </h2>

                {description && (
                    <p className="mt-1 text-[11px] leading-5 text-white/25">
                        {description}
                    </p>
                )}
            </div>

            <div className="hidden h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] sm:flex">
                <MiniArrowIcon />
            </div>
        </div>
    );
}

/* ================================================================
   HERO BACKGROUND
================================================================ */

function AnalyticsBackground() {
    return (
        <>
            {/* Main ambient lights */}

            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div
                    className="
                        absolute
                        left-[8%]
                        top-[8%]
                        h-[420px]
                        w-[420px]
                        rounded-full
                        bg-white/[0.018]
                        blur-[120px]
                    "
                />

                <div
                    className="
                        absolute
                        right-[5%]
                        top-[22%]
                        h-[360px]
                        w-[360px]
                        rounded-full
                        bg-white/[0.015]
                        blur-[110px]
                    "
                />

                <div
                    className="
                        absolute
                        bottom-[5%]
                        left-[40%]
                        h-[400px]
                        w-[400px]
                        rounded-full
                        bg-white/[0.012]
                        blur-[130px]
                    "
                />
            </div>

            {/* Fine grid */}

            <div
                className="
                    pointer-events-none
                    fixed
                    inset-0
                    -z-20
                    opacity-[0.035]
                "
                style={{
                    backgroundImage: `
                        linear-gradient(
                            rgba(255,255,255,.4) 1px,
                            transparent 1px
                        ),
                        linear-gradient(
                            90deg,
                            rgba(255,255,255,.4) 1px,
                            transparent 1px
                        )
                    `,
                    backgroundSize: "42px 42px",
                    maskImage:
                        "linear-gradient(to bottom, black, transparent 80%)",
                    WebkitMaskImage:
                        "linear-gradient(to bottom, black, transparent 80%)",
                }}
            />
        </>
    );
}

/* ================================================================
   PREMIUM HERO
================================================================ */

function AnalyticsHero({
    hasSubmissions,
}: {
    hasSubmissions: boolean;
}) {
    return (
        <div className="relative mb-7 overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#070809]/80 px-5 py-7 shadow-[0_30px_100px_rgba(0,0,0,.3)] backdrop-blur-[28px] sm:px-7 sm:py-8 lg:px-9">
            {/* Large glow */}

            <div
                className="
                    pointer-events-none
                    absolute
                    -right-24
                    -top-32
                    h-72
                    w-72
                    rounded-full
                    bg-white/[0.035]
                    blur-[80px]
                "
            />

            <div
                className="
                    pointer-events-none
                    absolute
                    -bottom-32
                    left-[25%]
                    h-64
                    w-64
                    rounded-full
                    bg-white/[0.018]
                    blur-[80px]
                "
            />

            {/* Top line */}

            <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
                <div>
                    <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,.7)]" />

                        <span className="text-[8px] font-black uppercase tracking-[0.35em] text-white/30">
                            Developer Intelligence
                        </span>
                    </div>

                    <h1 className="text-[30px] font-black tracking-[-0.055em] text-white sm:text-[38px] lg:text-[44px]">
                        Your Coding
                        <span className="text-white/25">
                            {" "}
                            Intelligence
                        </span>
                    </h1>

                    <p className="mt-3 max-w-xl text-[12px] leading-6 text-white/30 sm:text-[13px]">
                        Measure your progress, understand your coding
                        behavior, and turn every submission into
                        measurable improvement.
                    </p>
                </div>

                {/* Status */}

                <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                        <ActivityIcon />
                    </div>

                    <div>
                        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/20">
                            System Status
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.8)]" />

                            <span className="text-[10px] font-semibold text-white/60">
                                {hasSubmissions
                                    ? "Analytics Active"
                                    : "Awaiting Activity"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Decorative data line */}

            <div className="relative mt-7 h-px overflow-hidden bg-white/[0.05]">
                <div className="analytics-scan-line absolute left-0 top-0 h-full w-24 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </div>

            <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[7px] uppercase tracking-[0.3em] text-white/10">
                    CODERUSH / ANALYTICS / LIVE
                </span>

                <span className="font-mono text-[7px] text-white/10">
                    v2.0
                </span>
            </div>
        </div>
    );
}

/* ================================================================
   LOADING SKELETON
================================================================ */

function SkeletonBlock({
    className = "",
}: {
    className?: string;
}) {
    return (
        <div
            className={`
                analytics-skeleton
                rounded-xl
                bg-white/[0.035]
                ${className}
            `}
        />
    );
}

function SkeletonKPI() {
    return (
        <div className="relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-[#090a0c]/70 p-5">
            <SkeletonBlock className="h-9 w-9" />

            <SkeletonBlock className="mt-5 h-7 w-28" />

            <SkeletonBlock className="mt-2 h-3 w-20" />

            <SkeletonBlock className="mt-4 h-2 w-16" />
        </div>
    );
}

function SkeletonChart() {
    return (
        <div className="relative overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#090a0c]/70 p-6">
            <SkeletonBlock className="h-5 w-36" />

            <SkeletonBlock className="mt-5 h-[240px] w-full" />
        </div>
    );
}

function AnalyticsSkeleton() {
    return (
        <div className="space-y-6">
            {/* Hero */}

            <div className="rounded-[28px] border border-white/[0.06] bg-[#08090b]/70 p-7">
                <SkeletonBlock className="h-3 w-40" />

                <SkeletonBlock className="mt-4 h-10 w-72" />

                <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />

                <SkeletonBlock className="mt-8 h-px w-full" />
            </div>

            {/* KPI */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map(
                    (_, index) => (
                        <SkeletonKPI key={index} />
                    )
                )}
            </div>

            {/* Charts */}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SkeletonChart />
                <SkeletonChart />
            </div>

            <SkeletonChart />

            <SkeletonChart />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SkeletonChart />
                <SkeletonChart />
            </div>
        </div>
    );
}

/* ================================================================
   EMPTY STATE
================================================================ */

function EmptyAnalytics() {
    return (
        <div className="relative overflow-hidden rounded-[30px] border border-white/[0.07] bg-[#08090b]/80 px-6 py-24 text-center shadow-[0_30px_100px_rgba(0,0,0,.3)] backdrop-blur-[25px]">
            {/* Ambient glow */}

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.025] blur-[100px]" />

            {/* Decorative rings */}

            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-white/[0.06]" />

                <div className="absolute inset-3 rounded-full border border-white/[0.05]" />

                <div className="absolute inset-6 rounded-full border border-white/[0.08]" />

                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-white/60 shadow-[0_15px_50px_rgba(255,255,255,.05)]">
                    <CodeGlyph />
                </div>
            </div>

            <div className="relative">
                <div className="mt-8 text-[8px] font-black uppercase tracking-[0.4em] text-white/20">
                    Analytics Engine
                </div>

                <h2 className="mt-3 text-[25px] font-black tracking-[-0.04em] text-white">
                    Start Your Coding Journey
                </h2>

                <p className="mx-auto mt-3 max-w-lg text-[12px] leading-6 text-white/30">
                    Your analytics workspace is ready. Submit your
                    first solution and CodeRush will begin building
                    your personalized coding intelligence profile.
                </p>

                <Link
                    href="/challenges"
                    className="
                        group
                        relative
                        mt-8
                        inline-flex
                        h-11
                        items-center
                        gap-3
                        overflow-hidden
                        rounded-xl
                        border
                        border-white/[0.12]
                        bg-white/[0.07]
                        px-5
                        text-[11px]
                        font-bold
                        text-white
                        shadow-[0_15px_40px_rgba(0,0,0,.3)]
                        transition-all
                        duration-300
                        hover:border-white/[0.2]
                        hover:bg-white/[0.11]
                        hover:shadow-[0_20px_55px_rgba(0,0,0,.45)]
                    "
                >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                    <span className="relative">
                        Explore Problems
                    </span>

                    <ArrowRightIcon />
                </Link>
            </div>

            <div className="relative mx-auto mt-10 max-w-md border-t border-white/[0.05] pt-4">
                <span className="font-mono text-[7px] uppercase tracking-[0.3em] text-white/10">
                    No submission data detected
                </span>
            </div>
        </div>
    );
}

/* ================================================================
   SIGNED OUT
================================================================ */

function SignedOutState() {
    return (
        <div className="flex min-h-[70vh] items-center justify-center px-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#08090b]/85 p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,.5)] backdrop-blur-[30px]">
                <div className="pointer-events-none absolute left-1/2 top-0 h-px w-32 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-white/60">
                    <LockIcon />
                </div>

                <p className="mt-6 text-[8px] font-black uppercase tracking-[0.35em] text-white/20">
                    Authentication Required
                </p>

                <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                    Not signed in
                </h1>

                <p className="mt-3 text-[12px] leading-6 text-white/30">
                    Sign in to access your personalized CodeRush
                    analytics workspace.
                </p>

                <Link
                    href="/login"
                    className="
                        mt-7
                        inline-flex
                        h-11
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-white/[0.12]
                        bg-white/[0.07]
                        px-6
                        text-[11px]
                        font-bold
                        text-white
                        transition-all
                        hover:border-white/[0.2]
                        hover:bg-white/[0.11]
                    "
                >
                    Continue to Login
                </Link>
            </div>
        </div>
    );
}

/* ================================================================
   MAIN ANALYTICS VIEW
================================================================ */

export default function AnalyticsView() {
    const [range, setRange] =
        useState<AnalyticsRange>("30d");

    const [refreshing, setRefreshing] =
        useState(false);

    const user = useQuery(
        api.users.currentUser
    );

    const data = useQuery(
        api.analytics.getAnalytics,
        { range }
    ) as AnalyticsData | null | undefined;

    function onRefresh() {
        setRefreshing(true);

        window.setTimeout(() => {
            setRefreshing(false);
        }, 700);
    }

    /* ============================================================
       SIGNED OUT
    ============================================================ */

    if (user === null) {
        return (
            <main className="analytics-page min-h-screen">
                <AnalyticsBackground />

                <SignedOutState />
            </main>
        );
    }

    /* ============================================================
       LOADING
    ============================================================ */

    if (
        user === undefined ||
        data === undefined ||
        data === null
    ) {
        return (
            <main className="analytics-page min-h-screen">
                <AnalyticsBackground />

                <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
                    <AnalyticsSkeleton />
                </div>
            </main>
        );
    }

    /* ============================================================
       DATA
    ============================================================ */

    return (
        <main className="analytics-page min-h-screen">
            <AnalyticsBackground />

            <div className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-7 sm:px-6 lg:px-8 lg:pt-9">
                {/* =================================================
                    PREMIUM HERO
                ================================================= */}

                <AnalyticsHero
                    hasSubmissions={
                        data.hasSubmissions
                    }
                />

                {/* =================================================
                    EXISTING ANALYTICS HEADER
                ================================================= */}

                <div className="relative mb-7 overflow-hidden rounded-[22px] border border-white/[0.06] bg-[#08090b]/65 p-3 shadow-[0_20px_70px_rgba(0,0,0,.2)] backdrop-blur-[20px]">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    <AnalyticsHeader
                        range={range}
                        onRange={setRange}
                        onRefresh={onRefresh}
                        refreshing={refreshing}
                    />
                </div>

                {/* =================================================
                    EMPTY STATE
                ================================================= */}

                {!data.hasSubmissions ? (
                    <EmptyAnalytics />
                ) : (
                    <div className="space-y-9">
                        {/* =================================================
                            KPI OVERVIEW
                        ================================================= */}

                        <section>
                            <SectionHeader
                                number="01"
                                eyebrow="Overview"
                                title="Performance Snapshot"
                                description="A high-level view of your current coding performance."
                            />

                            <div className="analytics-section-shell">
                                <KpiGrid
                                    kpis={data.kpis}
                                />
                            </div>
                        </section>

                        {/* =================================================
                            PROBLEM + LANGUAGE
                        ================================================= */}

                        <section>
                            <SectionHeader
                                number="02"
                                eyebrow="Distribution"
                                title="Problem & Language Intelligence"
                                description="Understand what you solve and how you solve it."
                            />

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <PremiumCard>
                                    <ProblemStats
                                        problems={
                                            data.problems
                                        }
                                        solved={
                                            data.kpis
                                                .problemsSolved
                                        }
                                    />
                                </PremiumCard>

                                <PremiumCard>
                                    <LanguageDonut
                                        languages={
                                            data.languages
                                        }
                                        total={
                                            data.languagesTotal
                                        }
                                    />
                                </PremiumCard>
                            </div>
                        </section>

                        {/* =================================================
                            ACTIVITY
                        ================================================= */}

                        <section>
                            <SectionHeader
                                number="03"
                                eyebrow="Activity"
                                title="Coding Consistency"
                                description="Track the rhythm and consistency of your development activity."
                            />

                            <PremiumCard className="p-1">
                                <ActivityHeatmap
                                    heatmap={
                                        data.heatmap
                                    }
                                />
                            </PremiumCard>
                        </section>

                        {/* =================================================
                            PERFORMANCE
                        ================================================= */}

                        <section>
                            <SectionHeader
                                number="04"
                                eyebrow="Performance"
                                title="Execution Intelligence"
                                description="Analyze your progress and execution performance over time."
                            />

                            <PremiumCard className="p-1">
                                <PerformanceChart
                                    performance={
                                        data.performance
                                    }
                                />
                            </PremiumCard>
                        </section>

                        {/* =================================================
                            RECENT + SKILLS
                        ================================================= */}

                        <section>
                            <SectionHeader
                                number="05"
                                eyebrow="Development"
                                title="Growth & Skill Progress"
                                description="See your latest activity and the skills you're developing."
                            />

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <PremiumCard>
                                    <RecentActivity
                                        recent={
                                            data.recent
                                        }
                                    />
                                </PremiumCard>

                                <PremiumCard>
                                    <SkillProgress
                                        skills={
                                            data.skills
                                        }
                                    />
                                </PremiumCard>
                            </div>
                        </section>

                        {/* =================================================
                            INSIGHTS + MILESTONES
                        ================================================= */}

                        <section>
                            <SectionHeader
                                number="06"
                                eyebrow="Intelligence"
                                title="Insights & Milestones"
                                description="Personalized signals generated from your coding history."
                            />

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <PremiumCard>
                                    <Insights
                                        insights={
                                            data.insights
                                        }
                                    />
                                </PremiumCard>

                                <PremiumCard>
                                    <Milestones
                                        m={
                                            data.milestones
                                        }
                                    />
                                </PremiumCard>
                            </div>
                        </section>

                        {/* =================================================
                            FOOTER STATUS
                        ================================================= */}

                        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.05] pt-6 sm:flex-row">
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.8)]" />

                                <span className="font-mono text-[7px] uppercase tracking-[0.25em] text-white/15">
                                    Analytics engine synchronized
                                </span>
                            </div>

                            <span className="font-mono text-[7px] uppercase tracking-[0.25em] text-white/10">
                                CodeRush Developer Intelligence
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* =========================================================
                PREMIUM ANALYTICS CSS
            ========================================================= */}

            <style jsx global>{`
                .analytics-page {
                    position: relative;
                    background:
                        radial-gradient(
                            circle at 50% -10%,
                            rgba(255, 255, 255, 0.035),
                            transparent 35%
                        ),
                        #050607;
                    color: white;
                    isolation: isolate;
                }

                .analytics-premium-card {
                    transform: translateZ(0);
                }

                .analytics-section-shell {
                    position: relative;
                }

                .analytics-skeleton {
                    position: relative;
                    overflow: hidden;
                }

                .analytics-skeleton::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    transform: translateX(-100%);
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255,255,255,.045),
                        transparent
                    );
                    animation: analyticsSkeleton 1.7s infinite;
                }

                .analytics-scan-line {
                    animation: analyticsScan 3.5s
                        cubic-bezier(.16,1,.3,1)
                        infinite;
                }

                @keyframes analyticsSkeleton {
                    100% {
                        transform: translateX(100%);
                    }
                }

                @keyframes analyticsScan {
                    0% {
                        transform: translateX(-150%);
                        opacity: 0;
                    }

                    20% {
                        opacity: 1;
                    }

                    70% {
                        opacity: 1;
                    }

                    100% {
                        transform: translateX(1100%);
                        opacity: 0;
                    }
                }

                /* Better selection */

                .analytics-page ::selection {
                    background: rgba(255,255,255,.18);
                    color: white;
                }

                /* Premium focus */

                .analytics-page
                    button:focus-visible,
                .analytics-page
                    a:focus-visible {
                    outline: 1px solid
                        rgba(255,255,255,.35);
                    outline-offset: 3px;
                }

                /* Scrollbar */

                .analytics-page
                    ::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }

                .analytics-page
                    ::-webkit-scrollbar-track {
                    background: transparent;
                }

                .analytics-page
                    ::-webkit-scrollbar-thumb {
                    border-radius: 999px;
                    background: rgba(255,255,255,.08);
                }

                .analytics-page
                    ::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,.15);
                }

                /* Reduced motion */

                @media (
                    prefers-reduced-motion: reduce
                ) {
                    .analytics-page *,
                    .analytics-page
                        *::before,
                    .analytics-page
                        *::after {
                        animation-duration:
                            .01ms !important;
                        animation-iteration-count:
                            1 !important;
                        transition-duration:
                            .01ms !important;
                    }
                }

                /* Small screens */

                @media (max-width: 640px) {
                    .analytics-page {
                        background:
                            radial-gradient(
                                circle at 50% -5%,
                                rgba(255,255,255,.04),
                                transparent 38%
                            ),
                            #050607;
                    }
                }
            `}</style>
        </main>
    );
}

/* ================================================================
   ICONS
================================================================ */

function CodeGlyph() {
    return (
        <svg
            width="21"
            height="21"
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
            <line
                x1="13"
                y1="3"
                x2="11"
                y2="21"
            />
        </svg>
    );
}

function ActivityIcon() {
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
            <polyline points="3 12 7 12 10 4 14 20 17 12 21 12" />
        </svg>
    );
}

function MiniArrowIcon() {
    return (
        <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/30"
            aria-hidden="true"
        >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
        </svg>
    );
}

function ArrowRightIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
        </svg>
    );
}

function LockIcon() {
    return (
        <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <rect
                x="4"
                y="10"
                width="16"
                height="11"
                rx="2"
            />

            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
    );
}
