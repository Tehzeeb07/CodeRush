
"use client";

/** InsightCard — "Your Progress" section with dynamic, data-derived insights. */

import type { AnalyticsData } from "./types";

export default function Insights({
    insights,
}: {
    insights: AnalyticsData["insights"];
}) {
    return (
        <div className="rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">
                Your Progress
            </h2>

            <ul className="mt-4 space-y-3">
                {insights.length === 0 ? (
                    <li className="text-sm text-[#64748b]">
                        Keep coding — insights will appear as you go.
                    </li>
                ) : (
                    insights.map((ins, i) => (
                        <li
                            key={i}
                            className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm text-[#cbd5e1]"
                        >
                            {/* Progress icon */}
                            <span
                                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-400/20 bg-blue-400/5 text-[11px] leading-none text-blue-300"
                                aria-hidden="true"
                            >
                                ◐
                            </span>

                            <span>{ins.text}</span>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}
