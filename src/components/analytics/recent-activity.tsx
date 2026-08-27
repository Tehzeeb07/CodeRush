"use client";

/** RecentActivity — latest submission timeline with status indicators. */

import Link from "next/link";
import { languageLabel, type RecentItem } from "./types";

function timeAgo(ts: number): string {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min${m === 1 ? "" : "s"} ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
    const d = Math.floor(h / 24);
    if (d === 1) return "yesterday";
    if (d < 30) return `${d} days ago`;
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    success: { label: "Solved", icon: "✓", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    runtime_error: { label: "Runtime error", icon: "✕", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
    compilation_error: { label: "Compilation error", icon: "!", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    timeout: { label: "Time limit exceeded", icon: "⏱", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
    failed: { label: "Failed", icon: "✕", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
    internal_error: { label: "Internal error", icon: "⚠", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    stopped: { label: "Stopped", icon: "■", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

const met = (s: string) =>
    STATUS[s] ?? { label: s, icon: "•", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" };

export default function RecentActivity({ recent }: { recent: RecentItem[] }) {
    return (
        <div className="rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-5 sm:p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                <span className="text-xs text-[#94a3b8]">Latest first</span>
            </div>

            {recent.length === 0 ? (
                <p className="mt-5 text-sm text-[#64748b]">No submissions yet.</p>
            ) : (
                <ul className="mt-5 space-y-1">
                    {recent.map((r, i) => {
                        const st = met(r.status);
                        return (
                            <li key={i}>
                                <Link href="/code" className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]">
                                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                        style={{ color: st.color, background: st.bg }}>
                                        {st.icon}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm text-[#e4e4e7]">
                                            <span className="font-medium">{st.label}</span>
                                            <span className="text-[#64748b]"> · {languageLabel(r.language)}</span>
                                            {r.executionTime !== null && (
                                                <span className="text-[#64748b]"> · {(r.executionTime / 1000).toFixed(2)}s</span>
                                            )}
                                        </p>
                                        <p className="text-[11px] text-[#64748b]">{timeAgo(r.createdAt)}</p>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}