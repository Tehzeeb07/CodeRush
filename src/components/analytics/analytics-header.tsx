"use client";

/** AnalyticsHeader — page title, subtitle, time-range selector + refresh. */

import { RANGE_OPTIONS, type AnalyticsRange } from "./types";

export default function AnalyticsHeader({
    range,
    onRange,
    onRefresh,
    refreshing,
}: {
    range: AnalyticsRange;
    onRange: (r: AnalyticsRange) => void;
    onRefresh: () => void;
    refreshing: boolean;
}) {
    return (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
                <p className="eyebrow mb-2">CodeRush</p>
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Analytics
                </h1>
                <p className="mt-2 max-w-xl text-sm text-[#94a3b8]">
                    Track your coding progress, performance, consistency, and
                    problem-solving growth.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div
                    role="group"
                    aria-label="Time range"
                    className="flex flex-wrap items-center gap-1 rounded-xl border border-[#ffffff12] bg-[#0d0f12]/70 p-1"
                >
                    {RANGE_OPTIONS.map((o) => {
                        const active = o.value === range;
                        return (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => onRange(o.value)}
                                aria-pressed={active}
                                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                                    active
                                        ? "bg-[#6366f1]/15 text-[#a5b4fc] shadow-[inset_0_0_0_1px_rgba(99,102,241,0.35)]"
                                        : "text-[#94a3b8] hover:bg-white/5 hover:text-white"
                                }`}
                            >
                                {o.label}
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={refreshing}
                    aria-label="Refresh analytics"
                    title="Refresh"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#ffffff12] bg-[#0d0f12]/70 text-[#94a3b8] transition-colors hover:border-[#6366f1]/50 hover:text-white disabled:opacity-60"
                >
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={refreshing ? "animate-spin" : ""}
                        aria-hidden="true"
                    >
                        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                        <polyline points="21 3 21 9 15 9" />
                    </svg>
                </button>
            </div>
        </div>
    );
}