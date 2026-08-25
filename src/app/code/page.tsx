"use client";

/**
 * CodeRush coding workspace (interactive editor).
 *
 * Run Code starts a LIVE sandboxed process and streams its output to
 * the terminal in real time. When the program waits for stdin, the
 * terminal input lets the user type a line and press Enter to send it
 * while the process keeps running. A Stop button terminates the program.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";

import CodeEditor from "@/components/code-editor/CodeEditor";
import LanguageSelector from "@/components/code-editor/LanguageSelector";
import RunButton from "@/components/code-editor/RunButton";
import Terminal, {
    type TerminalSegment,
} from "@/components/code-editor/Terminal";
import BookmarkButton from "@/components/bookmarks/BookmarkButton";
import { ToastStack, type ToastItem } from "@/components/ui/Toast";

import { getLanguage } from "@/lib/code-execution/languages";
import {
    InteractiveRun,
    startInteractiveRun,
} from "@/lib/code-execution/interactive-client";

import type { LanguageId } from "@/lib/code-execution/types";

function storageKey(language: LanguageId): string {
    return `coderush-code-${language}`;
}

function exitReasonLabel(reason: string): string {
    switch (reason) {
        case "stopped":
            return "Program stopped.";
        case "timeout":
            return "Program reached the time limit and was terminated.";
        case "idle_timeout":
            return "Program was idle too long and was terminated.";
        default:
            return "Program finished.";
    }
}

export default function CodePage() {
    const [language, setLanguage] = useState<LanguageId>("javascript");
    const [codeByLang, setCodeByLang] = useState<Record<string, string>>({});
    const [hydrated, setHydrated] = useState(false);

    const [run, setRun] = useState<InteractiveRun | null>(null);
    const [output, setOutput] = useState<TerminalSegment[]>([]);
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const toastSeq = useRef(0);

    const convex = useConvex();

    const runRef = useRef<InteractiveRun | null>(null);
    const runFnRef = useRef<() => void>(() => {});

    // ------------------------------------------------------------
    // Toasts (shared bridge with the BookmarkButton component)
    // ------------------------------------------------------------

    useEffect(() => {
        function onToast(event: Event) {
            const detail = (event as CustomEvent).detail as
                | { message: string; kind: ToastItem["kind"] }
                | undefined;
            if (!detail) return;
            const id = ++toastSeq.current;
            setToasts((prev) => [...prev, { id, ...detail }]);
            window.setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 3000);
        }
        window.addEventListener("coderush:toast", onToast);
        return () => window.removeEventListener("coderush:toast", onToast);
    }, []);

    // ------------------------------------------------------------
    // Open a bookmarked snippet (/code?snippet=<bookmarkId>)
    // ------------------------------------------------------------

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const snippetId = params.get("snippet");
        if (!snippetId) return;

        let cancelled = false;
        convex
            .query(api.bookmarks.getBookmark, { id: snippetId as never })
            .then((bookmark) => {
                if (cancelled || !bookmark) {
                    if (!bookmark) {
                        // Missing content / someone else's bookmark — ignore silently.
                        console.warn("Snippet could not be loaded.");
                    }
                    return;
                }
                setLanguage(bookmark.language as LanguageId);
                setCodeByLang((prev) => ({
                    ...prev,
                    [bookmark.language]: bookmark.code,
                }));
                setHydrated(true);
            })
            .catch(() => {
                /* transient error — editor keeps its current state */
            });
        return () => {
            cancelled = true;
        };
    }, [convex]);

    // Record a finished interactive run as a submission. The Convex
    // mutation resolves the user server-side and updates stats/points.
    //
    // Duplicate-award guard: each interactive session has a unique
    // sessionId; a session is submitted to the backend at most once,
    // no matter how often React re-renders or how the stream callback
    // fires. (The exit event itself only ever fires once per stream.)
    const recordedSessionsRef = useRef<Set<string>>(new Set());
    const recordSubmission = useCallback(
        async (
            status: "success" | "runtime_error" | "timeout",
            sessionLanguage: LanguageId,
            startedAtMs: number,
            exitCode: number | null,
            sessionId?: string,
        ) => {
            if (sessionId) {
                if (recordedSessionsRef.current.has(sessionId)) {
                    console.warn(
                        `[CodeRush] Submission for session ${sessionId} already recorded — skipping.`,
                    );
                    return;
                }
                recordedSessionsRef.current.add(sessionId);
            }

            try {
                const result = await convex.mutation(api.leaderboard.recordSubmission, {
                    language: sessionLanguage,
                    status,
                    executionTime: Math.max(0, Date.now() - startedAtMs),
                    exitCode: exitCode ?? undefined,
                });
                console.info(
                    `[CodeRush] Recorded ${status} run — points awarded: ${result.pointsAwarded}`,
                );
                if ((result.pointsAwarded ?? 0) > 0) {
                    const id = ++toastSeq.current;
                    setToasts((prev) => [
                        ...prev,
                        { id, message: `+${result.pointsAwarded} points for a successful run!`, kind: "success" },
                    ]);
                    window.setTimeout(() => {
                        setToasts((prev) => prev.filter((t) => t.id !== id));
                    }, 3000);
                }
            } catch (err) {
                // Stats recording must never break the coding experience.
                console.error("[CodeRush] Could not record this run:", err);
            }
        },
        [convex],
    );

    // ------------------------------------------------------------
    // Restore + save code to localStorage
    // ------------------------------------------------------------

    useEffect(() => {
        try {
            const drafts: Record<string, string> = {};
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith("coderush-code-")) {
                    drafts[key.replace("coderush-code-", "")] =
                        localStorage.getItem(key) ?? "";
                }
            }
            setCodeByLang(drafts);
        } finally {
            setHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem(storageKey(language), codeByLang[language] ?? "");
    }, [codeByLang, language, hydrated]);

    const code = hydrated
        ? codeByLang[language] ?? getLanguage(language).starterCode
        : "";

    const setCode = useCallback(
        (value: string) => {
            setCodeByLang((prev) => ({ ...prev, [language]: value }));
        },
        [language],
    );

    // Keep the current session reachable from async callbacks.
    useEffect(() => {
        runRef.current = run;
    }, [run]);

    const appendOutput = useCallback((segments: TerminalSegment[]) => {
        setOutput((prev) => [...prev, ...segments]);
    }, []);

    const running = run !== null;

    // ------------------------------------------------------------
    // Stopping / language change / reset
    // ------------------------------------------------------------

    const stopAndClear = useCallback(() => {
        const current = runRef.current;
        runRef.current = null;
        setRun(null);
        if (current) void current.stop();
    }, []);

    const handleLanguageChange = useCallback(
        (next: LanguageId) => {
            setLanguage(next);
            stopAndClear();
            setOutput([]);
        },
        [stopAndClear],
    );

    const handleReset = useCallback(() => {
        stopAndClear();
        setCode(getLanguage(language).starterCode);
        setOutput([]);
    }, [language, setCode, stopAndClear]);

    const handleClearOutput = useCallback(() => {
        setOutput([]);
    }, []);

    // ------------------------------------------------------------
    // Run code — start a live interactive session
    // ------------------------------------------------------------

    const handleRun = useCallback(async () => {
        if (runRef.current || code.trim().length === 0) return;

        setOutput([]);
        runRef.current = null;
        setRun(null);
        const sessionCode = code;
        const sessionLanguage = language;
        const startedAtMs = Date.now();

        try {
            const interactive = await startInteractiveRun(
                sessionLanguage,
                sessionCode,
            );

            runRef.current = interactive;
            setRun(interactive);

            await interactive.stream((event) => {
                if (event.kind === "stdout") {
                    appendOutput([{ kind: "stdout", text: event.text }]);
                } else if (event.kind === "stderr") {
                    appendOutput([{ kind: "stderr", text: event.text }]);
                } else if (event.kind === "exit") {
                    runRef.current = null;
                    setRun(null);
                    appendOutput([
                        {
                            kind: "meta",
                            text: `\n[${exitReasonLabel(event.reason)}]\n`,
                        },
                    ]);
                    // Record the finished run: exit code 0 = success (+10
                    // points), non-zero = runtime error, timeout = timeout.
                    // User-initiated stops are not counted as submissions.
                    if (event.reason !== "stopped") {
                        const status =
                            event.reason === "timeout" || event.reason === "idle_timeout"
                                ? ("timeout" as const)
                                : (event.exitCode ?? 1) === 0
                                    ? ("success" as const)
                                    : ("runtime_error" as const);
                        void recordSubmission(
                            status,
                            sessionLanguage,
                            startedAtMs,
                            event.exitCode,
                            interactive.sessionId,
                        );
                    }
                } else if (event.kind === "error") {
                    runRef.current = null;
                    setRun(null);
                    appendOutput([
                        { kind: "stderr", text: `\n[${event.message}]\n` },
                    ]);
                }
            });
        } catch (err) {
            runRef.current = null;
            setRun(null);
            const message =
                err instanceof Error
                    ? err.message
                    : "Failed to start the program.";
            appendOutput([{ kind: "stderr", text: `\n[${message}]\n` }]);
        }
    }, [code, language, appendOutput, recordSubmission]);

    // Latest run for Monaco's Ctrl/Cmd+Enter shortcut.
    useEffect(() => {
        runFnRef.current = handleRun;
    });

    // Stop the sandboxed program when navigating away (unmount).
    useEffect(() => {
        return () => {
            const active = runRef.current;
            if (active) void active.stop();
        };
    }, []);

    // Echo submitted input lines back onto the terminal.
    const handleInputSent = useCallback(
        (line: string) => {
            appendOutput([{ kind: "stdout", text: line + "\n" }]);
        },
        [appendOutput],
    );

    // ------------------------------------------------------------
    // UI
    // ------------------------------------------------------------

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-neutral-950 text-white">
            {/* =====================================================
                HEADER
            ====================================================== */}

            <header className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-3">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="text-lg font-bold tracking-tight"
                    >
                        Code
                        <span className="text-emerald-400">Rush</span>
                    </Link>

                    <span className="hidden text-xs text-neutral-500 sm:inline">
                        Coding Workspace
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <LanguageSelector
                        value={language}
                        onChange={handleLanguageChange}
                        disabled={running}
                    />

                    <BookmarkButton
                        language={language}
                        code={code}
                        disabled={running || !hydrated || code.trim().length === 0}
                    />

                    <Link
                        href="/leaderboard"
                        className="hidden rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white sm:inline-block"
                    >
                        Leaderboard
                    </Link>

                    <Link
                        href="/bookmarks"
                        className="hidden rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white sm:inline-block"
                    >
                        Bookmarks
                    </Link>

                    <Link
                        href="/dashboard"
                        className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
                    >
                        Dashboard
                    </Link>
                </div>
            </header>

            {/* =====================================================
                MAIN WORKSPACE
            ====================================================== */}

            <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 overflow-hidden p-4">
                {/* =================================================
                    EDITOR + PROBLEM PANEL
                ================================================== */}

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
                        <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-2">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                Editor
                            </h2>

                            <span className="text-xs text-neutral-600">
                                Ctrl/Cmd + Enter to run
                            </span>
                        </div>

                        <div className="min-h-0 flex-1 overflow-hidden">
                            <CodeEditor
                                language={getLanguage(language).monacoLanguage}
                                value={code}
                                onChange={setCode}
                                onRun={() => void runFnRef.current()}
                            />
                        </div>
                    </section>

                    <aside className="min-h-0 overflow-auto rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                            Problem Description
                        </h2>

                        <p className="text-sm text-neutral-400">
                            No challenge selected — you are in free
                            practice mode. Write any program and run it
                            against the sandbox. Your program may read
                            input interactively from the terminal below.
                        </p>

                        <p className="mt-3 text-sm text-neutral-500">
                            Coding challenges, test cases, judging and
                            XP rewards will appear here.
                        </p>
                    </aside>
                </div>

                {/* =================================================
                    BOTTOM CONTROLS
                ================================================== */}

                <div className="shrink-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <RunButton
                            onClick={() => void runFnRef.current()}
                            running={running}
                            disabled={!hydrated || code.trim().length === 0}
                        />

                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={running}
                            className="rounded-md border border-neutral-700 px-4 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Reset Code
                        </button>
                    </div>

                    <div className="max-h-96">
                        <Terminal
                            run={run}
                            output={output}
                            onClear={handleClearOutput}
                            onInput={handleInputSent}
                        />
                    </div>
                </div>
            </main>

            <ToastStack toasts={toasts} />
        </div>
    );
}