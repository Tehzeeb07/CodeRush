"use client";

/** Milestones — coding journey tracker + progress toward the next milestone. */

import type { AnalyticsData } from "./types";
import AnimatedNumber from "./animated-number";

export default function Milestones({ m }: { m: AnalyticsData["milestones"] }) {
    const next = m.next;
    return (
        <div className="rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-5 sm:p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Coding Journey</h2>
                <span className="text-xs text-[#94a3b8]">Milestones</span>
            </div>

            {next ? (
                <div className="mt-4 rounded-xl border border-[#ffffff0d] bg-[#0a0d12]/60 p-4">
                    <div className="flex items-baseline justify-between">
                        <p className="text-[26px] font-bold text-white">
                            <AnimatedNumber value={m.solved} /> / {next.target}
                        </p>
                        <span className="text-xs text-[#94a3b8]">{m.remaining} more to reach</span>
                    </div>
                    <p className="mt-1 text-sm text-[#a5b4fc]">🏆 {next.label}</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ffffff0a]">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#d4af37] to-[#8b5cf6] transition-[width] duration-700 ease-out"
                            style={{ width: `${Math.min(m.percent, 100)}%` }} />
                    </div>
                    <div className="mt-1.5 text-xs text-[#64748b]">{m.percent}% complete</div>
                </div>
            ) : (
                <p className="mt-4 text-sm text-[#22c55e]">All milestones achieved. Legendary!</p>
            )}

            <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {m.stones.map((stone) => (
                    <li key={stone.target}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${stone.isNext ? "bg-[#6366f1]/10 ring-1 ring-[#6366f1]/30" : "bg-white/[0.02]"}`}>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${stone.achieved ? "bg-[#22c55e]/20 text-[#22c55e]" : "border border-[#ffffff1a] text-[#64748b]"}`}>
                            {stone.achieved ? "✓" : ""}
                        </span>
                        <span className={stone.achieved ? "text-[#e4e4e7]" : "text-[#64748b]"}>{stone.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}