"use client";

/** ProblemStats — Easy / Medium / Hard progress cards + total summary.
 *  Clicking a difficulty navigates to filtered challenges. */

import Link from "next/link";
import type { DifficultyBucket } from "./types";
import AnimatedNumber from "./animated-number";

const META: Record<string, { name: string; total: number; href: string; bar: string; text: string }> = {
    easy: { name: "Easy", total: 60, href: "/challenges?difficulty=beginner", bar: "#22c55e", text: "text-[#22c55e]" },
    medium: { name: "Medium", total: 80, href: "/challenges?difficulty=intermediate", bar: "#f59e0b", text: "text-[#f59e0b]" },
    hard: { name: "Hard", total: 50, href: "/challenges?difficulty=advanced", bar: "#ef4444", text: "text-[#ef4444]" },
};

export default function ProblemStats({ problems, solved }: {
    problems: DifficultyBucket[];
    solved: number;
}) {
    const practice = problems.find((p) => p.difficulty === "practice");
    const pct = solved > 0 ? Math.min(100, (solved / 190) * 100) : 0;

    return (
        <div className="rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-5 sm:p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Problem Statistics</h2>
                <span className="text-xs text-[#94a3b8]">{solved} / 190 · {pct.toFixed(1)}%</span>
            </div>

            <div className="mt-5 space-y-4">
                {(["easy", "medium", "hard"] as const).map((k) => {
                    const m = META[k];
                    const d = problems.find((p) => p.difficulty === k);
                    const done = d?.solved ?? 0;
                    const barPct = d?.percent ?? 0;
                    return (
                        <Link key={k} href={m.href} className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.03]">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-[#e4e4e7]">{m.name}</span>
                                <span className="text-[#94a3b8]">
                                    <AnimatedNumber value={done} /> / {m.total}
                                </span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ffffff0a]">
                                <div
                                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                                    style={{ width: `${barPct}%`, background: m.bar }}
                                />
                            </div>
                            <div className={`mt-1.5 text-xs ${m.text}`}>{barPct}% completed</div>
                        </Link>
                    );
                })}
            </div>

            {practice && practice.solved > 0 && (
                <Link href="/code" className="mt-4 flex items-center justify-between rounded-lg border border-dashed border-[#ffffff14] px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.03]">
                    <span className="font-medium text-[#e4e4e7]">Practice runs</span>
                    <span className="text-[#94a3b8]">{practice.solved} solved</span>
                </Link>
            )}

            <div className="mt-4 rounded-xl border border-[#ffffff0d] bg-[#0a0d12]/50 p-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-white">Total Problems Solved</span>
                    <span className="text-[#a5b4fc]">{solved} / 190</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ffffff0a]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] transition-[width] duration-700 ease-out" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="mt-1.5 text-xs text-[#94a3b8]">{pct.toFixed(1)}%</div>
            </div>
        </div>
    );
}