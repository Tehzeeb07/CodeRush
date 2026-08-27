"use client";

/** LanguageUsageChart — premium donut chart of submission share by language.
 *  Hovering a segment highlights it and shows a detailed tooltip. */

import { useState } from "react";
import { languageLabel, languageColor, type LanguageShare } from "./types";

function polar(cx: number, cy: number, r: number, angle: number) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function segmentPath(cx: number, cy: number, R: number, r: number, a0: number, a1: number) {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p1 = polar(cx, cy, R, a0);
    const p2 = polar(cx, cy, R, a1);
    const p3 = polar(cx, cy, r, a1);
    const p4 = polar(cx, cy, r, a0);
    return `M ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y}
             L ${p3.x} ${p3.y} A ${r} ${r} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

export default function LanguageDonut({ languages, total }: {
    languages: LanguageShare[];
    total: number;
}) {
    const [active, setActive] = useState<number | null>(null);
    const cx = 100, cy = 100, R = 92, r = 60;
    const sum = languages.reduce((a, l) => a + l.total, 0) || 1;

    // Compute each segment's start/end angle without mutating an outer
    // variable (keeps the component pure + lint-clean).
    const spanOf = (l: LanguageShare) => (l.total / sum) * 2 * Math.PI;
    const ends: number[] = [];
    languages.reduce((acc, l) => {
        const v = acc + spanOf(l);
        ends.push(v);
        return v;
    }, -Math.PI / 2);

    const segs = languages.map((l, i) => {
        const span = spanOf(l);
        const pad = languages.length > 1 && span > 0.02 ? 0.022 : 0;
        const startRaw = i === 0 ? -Math.PI / 2 : ends[i - 1];
        return {
            ...l,
            i,
            a0: startRaw + pad / 2,
            a1: startRaw + span - pad / 2,
            color: languageColor(l.language),
            label: languageLabel(l.language),
        };
    });

    const act = active !== null ? segs[active] : null;

    return (
        <div className="rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-5 sm:p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Language Usage</h2>
                <span className="text-xs text-[#94a3b8]">{total} submissions</span>
            </div>

            <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <div className="relative shrink-0">
                    <div className="cr-tip"
                        style={{
                            opacity: act ? 1 : 0,
                            transform: act ? "translateY(0)" : "translateY(-4px)",
                        }}
                    >
                        {act && (
                            <p className="whitespace-nowrap text-center">
                                <span className="text-xs font-semibold" style={{ color: act.color }}>{act.label}</span>
                                <span className="text-[#e4e4e7]"> · {act.total} submission{act.total === 1 ? "" : "s"} · {act.percent}%</span>
                            </p>
                        )}
                    </div>
                    <svg width="200" height="200" viewBox="0 0 200 200" onMouseLeave={() => setActive(null)} aria-label="Language usage donut chart">
                        {segs.length === 0 ? (
                            <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="20" />
                        ) : (
                            segs.map((s) => (
                                <path
                                    key={s.language}
                                    d={segmentPath(cx, cy, R, r, s.a0, s.a1)}
                                    fill={s.color}
                                    opacity={active === null || active === s.i ? 1 : 0.22}
                                    className="cursor-pointer transition-opacity duration-150"
                                    onMouseEnter={() => setActive(s.i)}
                                    onFocus={() => setActive(s.i)}
                                    tabIndex={0}
                                />
                            ))
                        )}
                        <text x={cx} y={cy - 2} textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="700">{total.toLocaleString("en-US")}</text>
                        <text x={cx} y={cy + 16} textAnchor="middle" fill="#94a3b8" fontSize="9">SUBMISSIONS</text>
                    </svg>
                </div>

                <ul className="w-full min-w-0 space-y-2.5">
                    {segs.length === 0 ? (
                        <li className="py-6 text-center text-sm text-[#64748b]">No submissions to show yet.</li>
                    ) : (
                        segs.map((s) => (
                            <li key={s.language}
                                onMouseEnter={() => setActive(s.i)}
                                className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors ${active === s.i ? "bg-white/[0.04]" : ""}`}>
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                                <span className="flex-1 truncate text-[#e4e4e7]">{s.label}</span>
                                <span className="text-[#94a3b8]">{s.total}</span>
                                <span className="w-11 text-right font-medium text-[#e4e4e7]">{s.percent}%</span>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}