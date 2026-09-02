
"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";

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

/* ============================================================
   TYPES
============================================================ */

interface PremiumCardProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

interface SectionHeaderProps {
    number: string;
    eyebrow: string;
    title: string;
    description?: string;
}

/* ============================================================
   ANIMATIONS
============================================================ */

const fadeUp: Variants = {
    hidden: {
        opacity: 0,
        y: 24,
    },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.55,
            ease: [0.16, 1, 0.3, 1],
        },
    },
};

const stagger: Variants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.08,
        },
    },
};

/* ============================================================
   BACKGROUND
============================================================ */

function AnalyticsBackground() {
    return (
        <>
            {/* Base background */}
            <div className="pointer-events-none fixed inset-0 -z-30 bg-[#07090d]" />

            {/* Grid */}
            <div
                className="pointer-events-none fixed inset-0 -z-20 opacity-[0.045]"
                style={{
                    backgroundImage: `
            linear-gradient(
              rgba(96,165,250,.35) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(139,92,246,.35) 1px,
              transparent 1px
            )
          `,
                    backgroundSize: "42px 42px",
                    maskImage:
                        "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
                    WebkitMaskImage:
                        "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
                }}
            />

            {/* Blue glow */}
            <motion.div
                animate={{
                    x: [0, 35, 0],
                    y: [0, 20, 0],
                    scale: [1, 1.08, 1],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="pointer-events-none fixed -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-blue-500/[0.12] blur-[140px]"
            />

            {/* Violet glow */}
            <motion.div
                animate={{
                    x: [0, -30, 0],
                    y: [0, 35, 0],
                    scale: [1, 1.12, 1],
                }}
                transition={{
                    duration: 14,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="pointer-events-none fixed -right-44 top-[12%] -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/[0.10] blur-[150px]"
            />

            {/* Cyan glow */}
            <motion.div
                animate={{
                    x: [0, 25, 0],
                    y: [0, -25, 0],
                }}
                transition={{
                    duration: 11,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="pointer-events-none fixed bottom-[-180px] left-[35%] -z-10 h-[450px] w-[450px] rounded-full bg-cyan-400/[0.07] blur-[140px]"
            />

            {/* Center glow */}
            <div className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[650px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500/[0.04] via-violet-500/[0.08] to-cyan-400/[0.04] blur-[130px]" />
        </>
    );
}

/* ============================================================
   PREMIUM CARD
============================================================ */

function PremiumCard({
    children,
    className = "",
    delay = 0,
}: PremiumCardProps) {
    return (
        <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{
                once: true,
                amount: 0.08,
            }}
            transition={{
                delay,
            }}
            whileHover={{
                y: -4,
                transition: {
                    duration: 0.25,
                },
            }}
            className={`group relative overflow-hidden rounded-3xl border border-white/[0.075] bg-[#0b0e14]/70 shadow-[0_25px_90px_rgba(0,0,0,.35)] backdrop-blur-2xl transition-all duration-300 hover:border-blue-400/[0.18] hover:shadow-[0_30px_100px_rgba(37,99,235,.12)] ${className}`}
        >
            {/* Top highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-60" />

            {/* Top right glow */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-blue-500/[0.06] blur-3xl transition-all duration-500 group-hover:bg-violet-500/[0.10]" />

            {/* Bottom left glow */}
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-40 w-40 rounded-full bg-cyan-400/[0.035] blur-3xl transition-all duration-500 group-hover:bg-cyan-400/[0.07]" />

            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
    number,
    eyebrow,
    title,
    description,
}: SectionHeaderProps) {
    return (
        <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{
                once: true,
            }}
            className="mb-6 flex items-end justify-between gap-4"
        >
            <div>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold tracking-[0.28em] text-blue-400/50">
                        {number}
                    </span>

                    <span className="h-px w-7 bg-gradient-to-r from-blue-400/40 to-violet-400/20" />

                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/35">
                        {eyebrow}
                    </span>
                </div>

                <h2 className="mt-2 bg-gradient-to-r from-white via-white to-white/55 bg-clip-text text-[18px] font-bold tracking-[-0.03em] text-transparent sm:text-[20px]">
                    {title}
                </h2>

                {description && (
                    <p className="mt-1 text-[11px] leading-5 text-white/30">
                        {description}
                    </p>
                )}
            </div>

            <div className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] sm:flex">
                <ArrowIcon />
            </div>
        </motion.div>
    );
}

/* ============================================================
   HERO
============================================================ */

function AnalyticsHero({
    hasSubmissions,
}: {
    hasSubmissions: boolean;
}) {
    return (
        <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="group relative mb-7 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#090c12]/75 px-5 py-7 shadow-[0_35px_120px_rgba(0,0,0,.4)] backdrop-blur-2xl sm:px-8 sm:py-9 lg:px-10"
        >
            {/* Top line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />

            {/* Hero glow */}
            <div className="pointer-events-none absolute -right-32 -top-40 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-blue-500/[0.12] via-violet-500/[0.08] to-cyan-400/[0.05] blur-[100px]" />

            {/* Rotating ring */}
            <motion.div
                animate={{
                    rotate: 360,
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "linear",
                }}
                className="pointer-events-none absolute -right-[100px] -top-[100px] h-[300px] w-[300px] rounded-full border border-blue-400/[0.08]"
            />

            <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
                <div>
                    {/* Status */}
                    <div className="mb-4 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,.8)]" />

                        <span className="text-[9px] font-black uppercase tracking-[0.35em] text-blue-300/60">
                            Developer Intelligence
                        </span>
                    </div>

                    {/* Heading */}
                    <h1 className="text-[32px] font-black tracking-[-0.06em] text-white sm:text-[42px] lg:text-[48px]">
                        Your Coding{" "}
                        <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
                            Intelligence
                        </span>
                    </h1>

                    <p className="mt-4 max-w-2xl text-[12px] leading-6 text-white/35 sm:text-[13px]">
                        Measure your progress, understand your coding behavior, and turn
                        every submission into measurable improvement.
                    </p>

                    {/* Tags */}
                    <div className="mt-5 flex flex-wrap gap-2">
                        {["REAL-TIME", "PERFORMANCE", "SKILLS", "PROGRESS"].map(
                            (item) => (
                                <span
                                    key={item}
                                    className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[8px] font-bold tracking-[0.18em] text-white/35"
                                >
                                    {item}
                                </span>
                            ),
                        )}
                    </div>
                </div>

                {/* Status card */}
                <div className="relative flex shrink-0 items-center gap-3 rounded-2xl border border-blue-400/[0.12] bg-gradient-to-br from-blue-500/[0.08] via-violet-500/[0.05] to-cyan-400/[0.04] px-4 py-3 shadow-[0_20px_60px_rgba(37,99,235,.08)]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/[0.15] bg-blue-400/[0.07] text-blue-300">
                        <ActivityIcon />
                    </div>

                    <div>
                        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/25">
                            System Status
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.9)]" />

                            <span className="text-[10px] font-semibold text-white/65">
                                {hasSubmissions
                                    ? "Analytics Active"
                                    : "Awaiting Activity"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scan line */}
            <div className="relative mt-8 h-px overflow-hidden bg-white/[0.05]">
                <motion.div
                    animate={{
                        x: ["-100%", "500%"],
                    }}
                    transition={{
                        duration: 3.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute left-0 top-0 h-full w-32 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent"
                />
            </div>

            <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[7px] uppercase tracking-[0.3em] text-white/15">
                    CODERUSH / ANALYTICS / LIVE
                </span>

                <span className="font-mono text-[7px] text-blue-300/20">
                    V2.0
                </span>
            </div>
        </motion.div>
    );
}

/* ============================================================
   SKELETON
============================================================ */

function SkeletonBlock({
    className = "",
}: {
    className?: string;
}) {
    return (
        <div
            className={`relative overflow-hidden rounded-xl bg-white/[0.035] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent ${className}`}
        />
    );
}

function AnalyticsSkeleton() {
    return (
        <div className="space-y-8">
            {/* Hero */}
            <div className="rounded-3xl border border-white/[0.06] bg-[#0b0e14]/70 p-8">
                <SkeletonBlock className="h-3 w-40" />
                <SkeletonBlock className="mt-5 h-12 w-80" />
                <SkeletonBlock className="mt-4 h-4 w-full max-w-xl" />
                <SkeletonBlock className="mt-8 h-px w-full" />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div
                        key={index}
                        className="rounded-3xl border border-white/[0.06] bg-[#0b0e14]/70 p-6"
                    >
                        <SkeletonBlock className="h-10 w-10" />
                        <SkeletonBlock className="mt-6 h-8 w-28" />
                        <SkeletonBlock className="mt-3 h-3 w-20" />
                        <SkeletonBlock className="mt-5 h-2 w-24" />
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                    <div
                        key={index}
                        className="rounded-3xl border border-white/[0.06] bg-[#0b0e14]/70 p-6"
                    >
                        <SkeletonBlock className="h-5 w-40" />
                        <SkeletonBlock className="mt-6 h-60 w-full" />
                    </div>
                ))}
            </div>

            {/* Large chart */}
            <div className="rounded-3xl border border-white/[0.06] bg-[#0b0e14]/70 p-6">
                <SkeletonBlock className="h-5 w-40" />
                <SkeletonBlock className="mt-6 h-64 w-full" />
            </div>
        </div>
    );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyAnalytics() {
    return (
        <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0e14]/75 px-6 py-24 text-center shadow-[0_30px_100px_rgba(0,0,0,.35)] backdrop-blur-2xl"
        >
            {/* Glow */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500/[0.08] via-violet-500/[0.07] to-cyan-400/[0.05] blur-[110px]" />

            {/* Rings */}
            <motion.div
                animate={{
                    rotate: [0, 180, 360],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "linear",
                }}
                className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-blue-400/[0.12]"
            >
                <div className="absolute inset-3 rounded-full border border-violet-400/[0.12]" />

                <div className="absolute inset-7 rounded-full border border-cyan-400/[0.14]" />

                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/[0.15] bg-gradient-to-br from-blue-500/[0.12] to-violet-500/[0.08] text-blue-300">
                    <CodeIcon />
                </div>
            </motion.div>

            <div className="relative">
                <p className="mt-8 text-[8px] font-black uppercase tracking-[0.4em] text-blue-300/40">
                    Analytics Engine
                </p>

                <h2 className="mt-3 text-[26px] font-black tracking-[-0.04em] text-white">
                    Start Your Coding Journey
                </h2>

                <p className="mx-auto mt-3 max-w-lg text-[12px] leading-6 text-white/30">
                    Submit your first solution and CodeRush will begin building your
                    personalized coding intelligence profile.
                </p>

                <Link
                    href="/challenges"
                    className="group relative mt-8 inline-flex h-11 items-center gap-3 overflow-hidden rounded-xl border border-blue-400/[0.25] bg-gradient-to-r from-blue-500/[0.15] via-violet-500/[0.13] to-cyan-400/[0.10] px-6 text-[11px] font-bold text-white shadow-[0_15px_50px_rgba(37,99,235,.15)] transition-all duration-300 hover:border-cyan-300/[0.35] hover:shadow-[0_20px_65px_rgba(139,92,246,.2)]"
                >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.10] to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                    <span className="relative">Explore Problems</span>

                    <ArrowIcon />
                </Link>
            </div>
        </motion.div>
    );
}

/* ============================================================
   SIGNED OUT
============================================================ */

function SignedOutState() {
    return (
        <div className="flex min-h-[70vh] items-center justify-center px-4">
            <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0e14]/80 p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,.5)] backdrop-blur-2xl"
            >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/[0.12] bg-gradient-to-br from-blue-500/[0.10] to-violet-500/[0.08] text-blue-300">
                    <LockIcon />
                </div>

                <p className="mt-6 text-[8px] font-black uppercase tracking-[0.35em] text-blue-300/40">
                    Authentication Required
                </p>

                <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                    Not signed in
                </h1>

                <p className="mt-3 text-[12px] leading-6 text-white/30">
                    Sign in to access your personalized CodeRush analytics workspace.
                </p>

                <Link
                    href="/login"
                    className="mt-7 inline-flex h-11 items-center justify-center rounded-xl border border-blue-400/[0.20] bg-gradient-to-r from-blue-500/[0.12] to-violet-500/[0.10] px-6 text-[11px] font-bold text-white transition-all hover:border-blue-300/[0.35] hover:bg-blue-500/[0.18]"
                >
                    Continue to Login
                </Link>
            </motion.div>
        </div>
    );
}

/* ============================================================
   SECTION WRAPPER
============================================================ */

function AnalyticsSection({
    number,
    eyebrow,
    title,
    description,
    children,
}: SectionHeaderProps & {
    children: ReactNode;
}) {
    return (
        <section>
            <SectionHeader
                number={number}
                eyebrow={eyebrow}
                title={title}
                description={description}
            />

            {children}
        </section>
    );
}

/* ============================================================
   FOOTER
============================================================ */

function AnalyticsFooter() {
    return (
        <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{
                once: true,
            }}
            className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-7 sm:flex-row"
        >
            <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.9)]" />

                <span className="font-mono text-[7px] uppercase tracking-[0.25em] text-white/20">
                    Analytics engine synchronized
                </span>
            </div>

            <span className="font-mono text-[7px] uppercase tracking-[0.25em] text-blue-300/15">
                CodeRush Developer Intelligence
            </span>
        </motion.div>
    );
}

/* ============================================================
   MAIN ANALYTICS VIEW
============================================================ */

export default function AnalyticsView() {
    const [range, setRange] =
        useState<AnalyticsRange>("30d");

    const [refreshing, setRefreshing] =
        useState(false);

    /* User */
    const user = useQuery(api.users.currentUser);

    /* Analytics */
    const data = useQuery(api.analytics.getAnalytics, {
        range,
    }) as AnalyticsData | null | undefined;

    /* Refresh */
    const handleRefresh = () => {
        setRefreshing(true);

        window.setTimeout(() => {
            setRefreshing(false);
        }, 700);
    };

    /* ==========================================================
       SIGNED OUT
    ========================================================== */

    if (user === null) {
        return (
            <main className="analytics-page min-h-screen">
                <AnalyticsBackground />
                <SignedOutState />
            </main>
        );
    }

    /* ==========================================================
       LOADING
    ========================================================== */

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

    /* ==========================================================
       DATA
    ========================================================== */

    return (
        <main className="analytics-page min-h-screen">
            <AnalyticsBackground />

            <div className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-7 sm:px-6 lg:px-8 lg:pt-9">
                {/* HERO */}
                <AnalyticsHero
                    hasSubmissions={data.hasSubmissions}
                />

                {/* ANALYTICS HEADER */}
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="relative mb-8 overflow-hidden rounded-3xl border border-white/[0.07] bg-[#0b0e14]/65 p-2 shadow-[0_20px_70px_rgba(0,0,0,.25)] backdrop-blur-2xl"
                >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

                    <AnalyticsHeader
                        range={range}
                        onRange={setRange}
                        onRefresh={handleRefresh}
                        refreshing={refreshing}
                    />
                </motion.div>

                {/* EMPTY STATE */}
                {!data.hasSubmissions ? (
                    <EmptyAnalytics />
                ) : (
                    <div className="space-y-10">
                        {/* ==================================================
                01 — OVERVIEW
            ================================================== */}

                        <AnalyticsSection
                            number="01"
                            eyebrow="Overview"
                            title="Performance Snapshot"
                            description="A high-level view of your current coding performance."
                        >
                            <motion.div
                                variants={stagger}
                                initial="hidden"
                                whileInView="show"
                                viewport={{
                                    once: true,
                                    amount: 0.05,
                                }}
                            >
                                <KpiGrid kpis={data.kpis} />
                            </motion.div>
                        </AnalyticsSection>

                        {/* ==================================================
                02 — DISTRIBUTION
            ================================================== */}

                        <AnalyticsSection
                            number="02"
                            eyebrow="Distribution"
                            title="Problem & Language Intelligence"
                            description="Understand what you solve and how you solve it."
                        >
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <PremiumCard>
                                    <ProblemStats
                                        problems={data.problems}
                                        solved={data.kpis.problemsSolved}
                                    />
                                </PremiumCard>

                                <PremiumCard delay={0.08}>
                                    <LanguageDonut
                                        languages={data.languages}
                                        total={data.languagesTotal}
                                    />
                                </PremiumCard>
                            </div>
                        </AnalyticsSection>

                        {/* ==================================================
                03 — ACTIVITY
            ================================================== */}

                        <AnalyticsSection
                            number="03"
                            eyebrow="Activity"
                            title="Coding Consistency"
                            description="Track the rhythm and consistency of your development activity."
                        >
                            <PremiumCard className="p-1">
                                <ActivityHeatmap
                                    heatmap={data.heatmap}
                                />
                            </PremiumCard>
                        </AnalyticsSection>

                        {/* ==================================================
                04 — PERFORMANCE
            ================================================== */}

                        <AnalyticsSection
                            number="04"
                            eyebrow="Performance"
                            title="Execution Intelligence"
                            description="Analyze your progress and execution performance over time."
                        >
                            <PremiumCard className="p-1">
                                <PerformanceChart
                                    performance={data.performance}
                                />
                            </PremiumCard>
                        </AnalyticsSection>

                        {/* ==================================================
                05 — DEVELOPMENT
            ================================================== */}

                        <AnalyticsSection
                            number="05"
                            eyebrow="Development"
                            title="Growth & Skill Progress"
                            description="See your latest activity and the skills you're developing."
                        >
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <PremiumCard>
                                    <RecentActivity
                                        recent={data.recent}
                                    />
                                </PremiumCard>

                                <PremiumCard delay={0.08}>
                                    <SkillProgress
                                        skills={data.skills}
                                    />
                                </PremiumCard>
                            </div>
                        </AnalyticsSection>

                        {/* ==================================================
                06 — INTELLIGENCE
            ================================================== */}

                        <AnalyticsSection
                            number="06"
                            eyebrow="Intelligence"
                            title="Insights & Milestones"
                            description="Personalized signals generated from your coding history."
                        >
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <PremiumCard>
                                    <Insights
                                        insights={data.insights}
                                    />
                                </PremiumCard>

                                <PremiumCard delay={0.08}>
                                    <Milestones
                                        m={data.milestones}
                                    />
                                </PremiumCard>
                            </div>
                        </AnalyticsSection>

                        {/* FOOTER */}
                        <AnalyticsFooter />
                    </div>
                )}
            </div>

            {/* ========================================================
          GLOBAL CSS
      ======================================================== */}

            <style jsx global>{`
        .analytics-page {
          position: relative;
          min-height: 100vh;
          color: white;
          isolation: isolate;
          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(59, 130, 246, 0.07),
              transparent 34%
            ),
            #07090d;
        }

        .analytics-page ::selection {
          background: rgba(96, 165, 250, 0.25);
          color: white;
        }

        .analytics-page button:focus-visible,
        .analytics-page a:focus-visible {
          outline: 1px solid rgba(96, 165, 250, 0.6);
          outline-offset: 3px;
        }

        .analytics-page ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .analytics-page ::-webkit-scrollbar-track {
          background: transparent;
        }

        .analytics-page ::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
        }

        .analytics-page ::-webkit-scrollbar-thumb:hover {
          background: rgba(96, 165, 250, 0.25);
        }

        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .analytics-page *,
          .analytics-page *::before,
          .analytics-page *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        @media (max-width: 640px) {
          .analytics-page {
            background:
              radial-gradient(
                circle at 50% -5%,
                rgba(59, 130, 246, 0.09),
                transparent 40%
              ),
              #07090d;
          }
        }
      `}</style>
        </main>
    );
}

/* ============================================================
   ICONS
============================================================ */

function ActivityIcon() {
    return (
        <svg
            width="18"
            height="18"
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

function ArrowIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-300/50"
            aria-hidden="true"
        >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
        </svg>
    );
}

function CodeIcon() {
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
            <line x1="13" y1="3" x2="11" y2="21" />
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
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
    );
}
