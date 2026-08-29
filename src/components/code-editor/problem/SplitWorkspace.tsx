"use client";

/**
 * Split-screen workspace (requirement §11).
 *
 *   Desktop  : Problem | Editor side by side, divider draggable (25–75%),
 *              persisted per browser.
 *   Tablet/Mobile: tab bar [Problem | Code | Input | Output] — stacked,
 *              zero horizontal overflow.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type WorkspaceTab = "problem" | "code" | "input" | "output";

const SPLIT_KEY = "coderush:split-percent:v1";
const MIN_PCT = 25;
const MAX_PCT = 75;

interface SplitWorkspaceProps {
    problemSlot: React.ReactNode;
    codeSlot: React.ReactNode;
    inputSlot: React.ReactNode;
    outputSlot: React.ReactNode;
}

function useIsMobile(): boolean {
    const [mobile, setMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 1023px)");
        const update = () => setMobile(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);
    return mobile;
}

export default function SplitWorkspace({
    problemSlot,
    codeSlot,
    inputSlot,
    outputSlot,
}: SplitWorkspaceProps) {
    const isMobile = useIsMobile();
    const [percent, setPercent] = useState<number>(() => {
        if (typeof window === "undefined") return 40;
        try {
            const saved = window.localStorage.getItem(SPLIT_KEY);
            if (saved) {
                const p = Number(saved);
                if (!Number.isNaN(p)) return Math.min(MAX_PCT, Math.max(MIN_PCT, p));
            }
        } catch { /* ignore */ }
        return 40;
    });
    const draggingRef = useRef(false);

    const onPointerDown = useCallback(() => {
        draggingRef.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    }, []);

    useEffect(() => {
        function move(e: PointerEvent) {
            if (!draggingRef.current) return;
            const container =
                document.getElementById("cr-split-container");
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            setPercent(Math.min(MAX_PCT, Math.max(MIN_PCT, pct)));
        }
        function up() {
            if (!draggingRef.current) return;
            draggingRef.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            setPercent((p) => {
                try {
                    window.localStorage.setItem(SPLIT_KEY, String(Math.round(p)));
                } catch { /* ignore */ }
                return p;
            });
        }
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
    }, []);

    if (isMobile) {
        return <MobileTabs problemSlot={problemSlot} codeSlot={codeSlot} inputSlot={inputSlot} outputSlot={outputSlot} />;
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div
                id="cr-split-container"
                className="flex min-h-0 flex-1"
                role="group"
                aria-label="Problem and editor split view"
            >
                {/* Left — problem */}
                <div
                    style={{ width: `${percent}%` }}
                    className="min-w-0 overflow-hidden border-r border-neutral-800"
                >
                    {problemSlot}
                </div>

                {/* Divider */}
                <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize problem panel"
                    title="Drag to resize"
                    tabIndex={0}
                    onPointerDown={onPointerDown}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowLeft") setPercent((p) => Math.max(MIN_PCT, p - 2));
                        if (e.key === "ArrowRight") setPercent((p) => Math.min(MAX_PCT, p + 2));
                    }}
                    className="group relative w-px cursor-col-resize bg-neutral-800 transition-colors hover:bg-indigo-500/70 focus-visible:bg-indigo-500"
                >
                    <span className="absolute inset-y-0 -left-1.5 -right-1.5" />
                    <span className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-700 group-hover:bg-indigo-400" />
                </div>

                {/* Right — editor */}
                <div style={{ width: `${100 - percent}%` }} className="min-w-0 overflow-hidden">
                    {codeSlot}
                </div>
            </div>

            {/* Bottom row: custom input + results across full width */}
            <div className="flex shrink-0 flex-col">
                {inputSlot}
                {outputSlot}
            </div>
        </div>
    );
}


/** Mobile layout: tabbed single column (requirement §35). */
function MobileTabs({
    problemSlot,
    codeSlot,
    inputSlot,
    outputSlot,
}: SplitWorkspaceProps) {
    const [tab, setTab] = useState<WorkspaceTab>("code");

    const TABS: Array<{ id: WorkspaceTab; label: string; content: React.ReactNode }> = [
        { id: "problem", label: "Problem", content: problemSlot },
        { id: "code", label: "Code", content: codeSlot },
        { id: "input", label: "Input", content: inputSlot },
        { id: "output", label: "Output", content: outputSlot },
    ];

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden">
            <div
                role="tablist"
                aria-label="Workspace sections"
                className="grid grid-cols-4 border-b border-neutral-800 bg-[var(--bg-secondary,#0d0f12)]"
            >
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={`py-2.5 text-sm font-medium transition-colors ${
                            tab === t.id
                                ? "border-b-2 border-indigo-500 text-white"
                                : "text-neutral-400 hover:text-neutral-200"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                {TABS.find((t) => t.id === tab)?.content}
            </div>
        </div>
    );
}
