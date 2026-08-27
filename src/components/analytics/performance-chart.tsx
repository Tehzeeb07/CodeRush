"use client";

/** PerformanceChart — responsive SVG line chart with selectable metric,
 *  hover tooltip and animated draw. */

import { useMemo, useRef, useState } from "react";
import type { AnalyticsData } from "./types";

const METRICS = [
    { key: "acceptance", label: "Acceptance Rate", fmt: (v: number) => `${Math.round(v)}%`, color: "#22c55e" },
    { key: "problems", label: "Problems Solved", fmt: (v: number) => String(Math.round(v)), color: "#a5b4fc" },
    { key: "submissions", label: "Submission Count", fmt: (v: number) => String(Math.round(v)), color: "#38bdf8" },
    { key: "runtime", label: "Average Runtime", fmt: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${v.toFixed(1)}ms`), color: "#f59e0b" },
    { key: "xp", label: "XP Earned", fmt: (v: number) => String(Math.round(v)), color: "#eab308" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

const W = 660, H = 300, PX = 42, PY = 18, PB = 34;

export default function PerformanceChart({ performance }: { performance: AnalyticsData["performance"] }) {
    const [metric, setMetric] = useState<MetricKey>("acceptance");
    const [hover, setHover] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);

    const m = METRICS.find((x) => x.key === metric)!;
    const raw = performance[metric];
    const labels = performance.labels;
    const counts = raw.length;

    const meta = useMemo(() => {
        const max = Math.max(1, ...raw.map((v) => v));
        const top = metric === "acceptance" ? 100 : max * 1.12;
        const innerH = H - PY - PB;
        const x = (i: number) => (counts <= 1 ? W / 2 : PX + (i / (counts - 1)) * (W - PX - 36));
        const y = (v: number) => H - PY - (v / top) * innerH;
        return { top, innerH, x, y };
    }, [raw, metric, counts]);

    const { top, x, y } = meta;
    const line = counts ? raw.map((_, i) => `${x(i).toFixed(1)},${y(raw[i]).toFixed(1)}`).join(" ") : "";
    const area = counts
        ? `M ${x(0).toFixed(1)} ${(H - PB).toFixed(1)} L ${raw.map((_, i) => `${x(i).toFixed(1)},${y(raw[i]).toFixed(1)}`).join(" L ")} L ${x(counts - 1).toFixed(1)} ${(H - PB).toFixed(1)} Z`
        : "";

    const ticks = useMemo(() => {
        const step = Math.max(1, Math.floor(counts / 6));
        const arr: number[] = [];
        for (let i = 0; i < counts; i += step) arr.push(i);
        if (arr[arr.length - 1] !== counts - 1) arr.push(counts - 1);
        return arr;
    }, [counts]);

    const guides = [0, 0.5, 1].map((f) => H - PB - f * (H - PB - PY));

    function onMove(e: React.MouseEvent<SVGSVGElement>) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || counts === 0) return;
        const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setHover(Math.round(frac * (counts - 1)));
    }

    const hx = hover !== null ? x(hover) : 0;
    const hv = hover !== null ? raw[hover] : 0;
    return (
        <div className="rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-white">Performance Over Time</h2>
                </div>
                <div className="flex flex-wrap gap-1">
                    {METRICS.map((mm) => (
                        <button key={mm.key} type="button" onClick={() => setMetric(mm.key)}
                            className={`rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${metric === mm.key ? "bg-[#6366f1]/15 text-[#a5b4fc] shadow-[inset_0_0_0_1px_rgba(99,102,241,0.35)]" : "text-[#94a3b8] hover:bg-white/5 hover:text-white"}`}>
                            {mm.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-5">
                {counts === 0 ? (
                    <div className="flex h-64 items-center justify-center text-sm text-[#64748b]">No activity in this range.</div>
                ) : (
                    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" height="260" role="img"
                        aria-label={`Line chart of ${m.label}`}
                        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
                        <defs>
                            <linearGradient id="crLineFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={m.color} stopOpacity="0.28" />
                                <stop offset="100%" stopColor={m.color} stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {guides.map((gy, i) => (
                            <g key={i}>
                                <line x1={PX} y1={gy} x2={W - 36} y2={gy} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 4" />
                                <text x={PX - 8} y={gy + 3} textAnchor="end" fontSize="9" fill="#64748b">{m.fmt(top * (1 - i * 0.5))}</text>
                            </g>
                        ))}

                        <path d={area} fill="url(#crLineFill)" className="cr-chart-area" />
                        <polyline points={line} fill="none" stroke={m.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" className="cr-chart-line" pathLength={1} />

                        {ticks.map((i) => (
                            <text key={i} x={x(i)} y={H - 12} textAnchor="middle" fontSize="10" fill="#64748b">{labels[i]}</text>
                        ))}

                        {hover !== null && (
                            <g>
                                <line x1={hx} y1={PY} x2={hx} y2={H - PB} stroke="rgba(255,255,255,0.18)" strokeDasharray="2 2" />
                                <circle cx={hx} cy={y(hv)} r="4.5" fill={m.color} stroke="#0d0f12" strokeWidth="1.5" />
                            </g>
                        )}
                    </svg>
                )}
            </div>

            {hover !== null && counts > 0 && (
                <div className="cr-tip" style={{ opacity: 1, transform: "translateY(0)" }}>
                    <p className="text-xs">
                        <span className="font-semibold" style={{ color: m.color }}>{labels[hover]}</span>
                        <span className="text-[#e4e4e7]"> · {m.label}: </span>
                        <span className="font-semibold text-white">{m.fmt(hv)}</span>
                    </p>
                </div>
            )}
        </div>
    );
}