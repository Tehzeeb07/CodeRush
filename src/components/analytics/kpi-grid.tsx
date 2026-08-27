"use client";

/** KpiGrid — six KPI cards fed by the real analytics payload. */

import type { Kpis } from "./types";
import AnimatedNumber from "./animated-number";

function Delta({ value, suffix }: { value: number; suffix: string }) {
    if (value === 0) return <span className="text-[#64748b]">No change {suffix}</span>;
    const positive = value > 0;
    const cls = positive ? "text-[#22c55e]" : "text-[#ef4444]";
    return (
        <span className={`inline-flex items-center gap-1 font-medium ${cls}`}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={positive ? "" : "rotate-180"} aria-hidden="true">
                <polyline points="18 15 12 9 6 15" />
            </svg>
            {positive ? "+" : ""}{Math.abs(value).toLocaleString("en-US")}{suffix}
        </span>
    );
}

function Card({ icon, title, meta, children }: {
    icon: React.ReactNode; title: string; meta: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <div className="group rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-5 transition-colors duration-200 hover:border-[#ffffff1a] hover:bg-[#111318]/70">
            <div className="flex items-center justify-between">
                <span className="stat-icon h-10 w-10 rounded-xl">{icon}</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"
                    className="text-[#71717a] opacity-0 transition-opacity group-hover:opacity-70" aria-hidden="true">
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 9a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0v-4a1 1 0 0 1 1-1zm0-4a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                </svg>
            </div>
            <div className="mt-4 text-[26px] font-bold leading-none tracking-tight text-white">{children}</div>
            <p className="mt-1.5 text-sm text-[#94a3b8]">{title}</p>
            <div className="mt-2 text-[11px]">{meta}</div>
        </div>
    );
}

function Ring({ rate }: { rate: number }) {
    const r = 22, c = 2 * Math.PI * r, filled = Math.min(Math.max(rate, 0), 100) / 100;
    return (
        <div className="relative h-[52px] w-[52px] shrink-0">
            <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
                <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                <circle cx="26" cy="26" r={r} fill="none" stroke="#22c55e" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={c - filled * c} />
            </svg>
        </div>
    );
}

const codeIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="13" y1="3" x2="11" y2="21" /></svg>
);
const subIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 17 13 12" /><polyline points="22 17 13 12 17 8" /><path d="M3 3v10a5 5 0 0 0 5 5h14" /></svg>
);
const targetIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
);
const flameIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
);
const trophyIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
);
const boltIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
);

export default function KpiGrid({ kpis }: { kpis: Kpis }) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card icon={codeIcon} title="Problems Solved"
                meta={<Delta value={kpis.solvesDelta} suffix=" this period" />}>
                <AnimatedNumber value={kpis.problemsSolved} />
            </Card>

            <div className="rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-5 transition-colors hover:border-[#ffffff1a] hover:bg-[#111318]/70">
                <div className="flex items-center justify-between">
                    <span className="stat-icon h-10 w-10 rounded-xl">{targetIcon}</span>
                    <Ring rate={kpis.acceptanceRate} />
                </div>
                <div className="mt-3 text-[26px] font-bold leading-none text-white">
                    <AnimatedNumber value={kpis.acceptanceRate} suffix="%" />
                </div>
                <p className="mt-1.5 text-sm text-[#94a3b8]">Acceptance Rate</p>
                <div className="mt-2 text-[11px]"><Delta value={kpis.acceptanceDelta} suffix=" pts" /></div>
            </div>

            <Card icon={subIcon} title="Total Submissions"
                meta={<Delta value={kpis.submissionsDelta} suffix=" this period" />}>
                <AnimatedNumber value={kpis.totalSubmissions} />
            </Card>

            <Card icon={flameIcon} title="Current Streak"
                meta={<span className="text-[#f59e0b]">Keep going!</span>}>
                <AnimatedNumber value={kpis.currentStreak} suffix={kpis.currentStreak === 1 ? " day" : " days"} />
            </Card>

            <Card icon={trophyIcon} title="Longest Streak"
                meta={<span className="text-[#94a3b8]">Personal Best</span>}>
                <AnimatedNumber value={kpis.longestStreak} suffix=" days" />
            </Card>

            <Card icon={boltIcon} title="Current XP"
                meta={<Delta value={kpis.xpDelta} suffix=" XP this period" />}>
                <AnimatedNumber value={kpis.totalXp} />
            </Card>
        </div>
    );
}