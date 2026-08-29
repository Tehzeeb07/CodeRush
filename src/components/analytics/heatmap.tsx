"use client";

/** CodingActivityHeatmap — GitHub-style contribution grid for the past year.
 *  Hover shows submission detail; clicking a day selects it. */

import { useState } from "react";
import type { HeatCell } from "./types";

const LEVELS = [
    { min: 10, color: "#34d399" },
    { min: 6, color: "#10b981" },
    { min: 3, color: "#059669" },
    { min: 1, color: "#065f46" },
    { min: 0, color: "#1e293b" },
];

function levelColor(count: number): string {
    const l = LEVELS.find((l) => count >= l.min) ?? LEVELS[LEVELS.length - 1];
    return l.color;
}

const WD = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

export default function ActivityHeatmap({ heatmap }: { heatmap: HeatCell[] }) {
    const [hovered, setHovered] = useState<HeatCell | null>(null);
    const [selected, setSelected] = useState<HeatCell | null>(null);

    const cols: HeatCell[][] = [];
    for (let c = 0; c < 53; c++) {
        const col: HeatCell[] = [];
        for (let row = 0; row < 7; row++) {
            const idx = c * 7 + row;
            if (idx < heatmap.length) col.push(heatmap[idx]);
        }
        cols.push(col);
    }

    const fmtDay = (ts: number) =>
        new Date(ts).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

    const detail = hovered ?? selected;

    return (
        <div className="rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-5 sm:p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Coding Activity</h2>
                <span className="text-xs text-[#94a3b8]">Over the past year</span>
            </div>
            <p className="mt-1 text-sm text-[#94a3b8]">Your coding consistency over the past year.</p>

            {detail && (
                <div className="mt-4 rounded-xl border border-[#ffffff0d] bg-[#0a0d12]/60 px-4 py-3">
                    <p className="text-sm font-semibold text-white">{fmtDay(detail.ts)}</p>
                    <p className="mt-0.5 text-xs text-[#94a3b8]">
                        {detail.count} submission{detail.count === 1 ? "" : "s"} · {detail.accepted} accepted · {detail.rejected} rejected
                    </p>
                </div>
            )}

            <div className="mt-5 overflow-x-auto pb-1">
                <div className="flex gap-1" style={{ minWidth: "max-content" }}>
                    <div className="mr-1 flex w-7 flex-col pr-1 text-[9px] leading-[12px] text-[#64748b]">
                        {WD.map((w, i) => (
                            <span key={i} className="h-[12px]">{w}</span>
                        ))}
                    </div>
                    {cols.map((col, ci) => (
                        <div key={ci} className="flex flex-col gap-[3px]">
                            {col.map((cell) => {
                                const active = hovered?.ts === cell.ts;
                                return (
                                    <button
                                        key={cell.iso}
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => setSelected(cell)}
                                        onMouseEnter={() => setHovered(cell)}
                                        onMouseLeave={() => setHovered(null)}
                                        title={`${fmtDay(cell.ts)} — ${cell.count} submissions`}
                                        aria-label={`${fmtDay(cell.ts)}: ${cell.count} submissions`}
                                        className={`h-[12px] w-[12px] rounded-[3px] transition-transform duration-100 ${active ? "scale-125 ring-1 ring-white/40" : "hover:scale-125"} ${selected?.ts === cell.ts ? "ring-1 ring-[#a5b4fc]" : ""}`}
                                        style={{ background: levelColor(cell.count), opacity: cell.count > 0 ? 1 : 0.7 }}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-[#64748b]">
                Less
                {LEVELS.slice().reverse().map((l) => (
                    <span key={l.min} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: l.color }} />
                ))}
                More
            </div>
        </div>
    );
}