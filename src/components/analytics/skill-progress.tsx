"use client";

/** SkillProgress — topic progress bars, clickable to browse problems. */

import Link from "next/link";
import type { Skill } from "./types";

export default function SkillProgress({ skills }: { skills: Skill[] }) {
    if (skills.length === 0) {
        return (
            <div className="rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-5">
                <h2 className="text-lg font-semibold text-white">Skill Progress</h2>
                <p className="mt-4 text-sm text-[#64748b]">
                    Solve tagged problems to unlock topic-level progress here.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-[#ffffff0d] bg-[#0d0f12]/60 p-5 sm:p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Skill Progress</h2>
                <span className="text-xs text-[#94a3b8]">By topic</span>
            </div>

            <ul className="mt-5 space-y-4">
                {skills.map((s) => (
                    <li key={s.name}>
                        <Link
                            href="/challenges"
                            className="block rounded-lg px-1 py-1 transition-colors hover:bg-white/[0.03]"
                            title={`${s.percent}% · ${s.solved} of ${s.total} solved`}
                        >
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-[#e4e4e7]">{s.name}</span>
                                <span className="text-[#94a3b8]">{s.percent}%</span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ffffff0a]">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] transition-[width] duration-700 ease-out"
                                    style={{ width: `${Math.min(s.percent, 100)}%` }}
                                />
                            </div>
                            <div className="mt-1 text-[11px] text-[#64748b]">{s.solved} / {s.total} solved</div>
                        </Link>
                    </li>
                ))}
                </ul>
        </div>
    );
}