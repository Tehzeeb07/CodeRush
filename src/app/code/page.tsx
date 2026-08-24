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

import CodeEditor from "@/components/code-editor/CodeEditor";
import LanguageSelector from "@/components/code-editor/LanguageSelector";
import RunButton from "@/components/code-editor/RunButton";
import Terminal, {
    type TerminalSegment,
} from "@/components/code-editor/Terminal";

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

    const runRef = useRef<InteractiveRun | null>(null);
    const runFnRef = useRef<() => void>(() => {});
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
    }, [code, language, appendOutput]);

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
        </div>
    );
}