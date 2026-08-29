"use client";

/** AnalyticsView — composes the full CodeRush Analytics dashboard from the
 *  server-side payload. Handles loading (skeleton), signed-out and empty
 *  states, and the time-range selector. */

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { AnalyticsData, AnalyticsRange } from "../../components/analytics/types";
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

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
    return <div className={`rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-5 sm:p-6 ${className}`}>{children}</div>;
}

function Skeleton() {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-5">
                    <div className="skeleton h-10 w-10 rounded-xl" />
                    <div className="skeleton mt-4 h-7 w-24" />
                    <div className="skeleton mt-2 h-4 w-20" />
                    <div className="skeleton mt-3 h-3 w-16" />
                </div>
            ))}
        </div>
    );
}

function SkeletonCard() {
    return (
        <Card>
            <div className="skeleton h-5 w-36" />
            <div className="skeleton mt-4 h-40 w-full" />
        </Card>
    );
}

function CodeGlyph() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="13" y1="3" x2="11" y2="21" />
        </svg>
    );
}

export default function AnalyticsView() {
    const [range, setRange] = useState<AnalyticsRange>("30d");
    const [refreshing, setRefreshing] = useState(false);

    const user = useQuery(api.users.currentUser);
    const data = useQuery(api.analytics.getAnalytics, { range }) as AnalyticsData | null | undefined;

    const onRefresh = () => {
        setRefreshing(true);
        window.setTimeout(() => setRefreshing(false), 700);
    };

    // Signed out
    if (user === null) {
        return (
            <div className="cr-shell flex min-h-screen items-center justify-center px-4">
                <div className="w-full max-w-sm rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/70 p-8 text-center">
                    <h1 className="text-xl font-semibold text-white">Not signed in</h1>
                    <p className="mt-2 text-sm text-[#94a3b8]">Sign in to view your personalized analytics.</p>
                    <Link href="/login" className="primary-button mt-6">Go to login</Link>
                </div>
            </div>
        );
    }

    // Loading
    if (user === undefined || data === undefined || data === null) {
        return (
            <div className="cr-shell">
                <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
                    <div className="skeleton h-8 w-48" />
                    <div className="skeleton mt-3 h-4 w-72" />
                    <div className="mt-8"><Skeleton /></div>
                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <SkeletonCard /><SkeletonCard />
                    </div>
                    <div className="mt-6"><SkeletonCard /></div>
                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <SkeletonCard /><SkeletonCard />
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="cr-shell">
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
                <AnalyticsHeader range={range} onRange={setRange} onRefresh={onRefresh} refreshing={refreshing} />

                {!data.hasSubmissions ? (
                    <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/50 px-6 py-20 text-center">
                        <span className="stat-icon flex h-14 w-14 items-center justify-center rounded-2xl"><CodeGlyph /></span>
                        <h2 className="mt-5 text-2xl font-bold text-white">Start Your Coding Journey</h2>
                        <p className="mt-2 max-w-md text-sm text-[#94a3b8]">
                            You haven&apos;t submitted any solutions yet. Solve your first problem to start
                            generating your personalized analytics.
                        </p>
                        <Link href="/challenges" className="primary-button mt-6">Explore Problems</Link>
                    </div>
                ) : (
                    <div className="mt-8 space-y-6">
                        <KpiGrid kpis={data.kpis} />

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <ProblemStats problems={data.problems} solved={data.kpis.problemsSolved} />
                            <LanguageDonut languages={data.languages} total={data.languagesTotal} />
                        </div>

                        <ActivityHeatmap heatmap={data.heatmap} />
                        <PerformanceChart performance={data.performance} />

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <RecentActivity recent={data.recent} />
                            <SkillProgress skills={data.skills} />
                        </div>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <Insights insights={data.insights} />
                            <Milestones m={data.milestones} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}