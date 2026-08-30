"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";

import MonacoHost from "@/components/code-editor/problem/MonacoHost";
import ErrorDetailsCard from "@/components/code-editor/problem/ErrorDetailsCard";
import EditorToolbar from "@/components/code-editor/problem/EditorToolbar";
import Terminal, {
    type TerminalSegment,
} from "@/components/code-editor/Terminal";
import BookmarkButton from "@/components/bookmarks/BookmarkButton";
import { ToastStack, type ToastItem, useToasts } from "@/components/ui/Toast";

import { getLanguage } from "@/lib/code-execution/languages";
import {
    InteractiveRun,
    startInteractiveRun,
} from "@/lib/code-execution/interactive-client";

import type { LanguageId } from "@/lib/code-execution/types";
import { parseError, makeInternalError } from "@/lib/error-parsing";
import type { ParsedError } from "@/lib/error-parsing/types";
import { useEditorSettings } from "@/lib/editor/settings";
import { formatCode } from "@/lib/editor/formatting";
import { saveDraft, clearDraft, timeAgo } from "@/lib/editor/drafts";
import { applyErrorMarker, stageQuickFix } from "@/lib/editor/monaco-setup";
import { ConfirmDialog } from "@/components/code-editor/problem/Dialogs";

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
    const { push, toasts: customToasts } = useToasts();
    const { settings, update: updateSettings, reset: resetSettings } =
        useEditorSettings();

    const [language, setLanguage] = useState<LanguageId>("javascript");
    const [codeByLang, setCodeByLang] = useState<Record<string, string>>({});
    const [hydrated, setHydrated] = useState(false);

    const [run, setRun] = useState<InteractiveRun | null>(null);
    const [output, setOutput] = useState<TerminalSegment[]>([]);
    const [parsedError, setParsedError] = useState<ParsedError | null>(null);
    const [activeTab, setActiveTab] = useState<"terminal" | "error">("terminal");

    const [draftState, setDraftState] =
        useState<"idle" | "dirty" | "saving" | "saved">("idle");
    const [savedAtLabel, setSavedAtLabel] = useState<string | null>(null);
    const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
    const [resetOpen, setResetOpen] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);

    const [legacyToasts, setLegacyToasts] = useState<ToastItem[]>([]);
    const toastSeq = useRef(0);

    const convex = useConvex();
    const runRef = useRef<InteractiveRun | null>(null);
    const runFnRef = useRef<() => void>(() => {});
    const recordedSessionsRef = useRef<Set<string>>(new Set());
    const logSequenceRef = useRef(0);

    const editorRef =
        useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(
            null,
        );
    const monacoRef = useRef<typeof import("monaco-editor") | null>(null);

    const bindInstances = useCallback(
        (
            editor: import("monaco-editor").editor.IStandaloneCodeEditor | null,
            monaco: typeof import("monaco-editor") | null,
        ) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
        },
        [],
    );

    // ------------------------------------------------------------
    // Legacy Toast Listener
    // ------------------------------------------------------------
    useEffect(() => {
        function onToast(event: Event) {
            const detail =
                (event as CustomEvent).detail as
                    | {
                          message: string;
                          kind: ToastItem["kind"];
                      }
                    | undefined;
            if (!detail) return;
            const id = ++toastSeq.current;
            setLegacyToasts((prev) => [...prev, { id, ...detail }]);
            window.setTimeout(() => {
                setLegacyToasts((prev) => prev.filter((t) => t.id !== id));
            }, 3000);
        }
        window.addEventListener("coderush:toast", onToast);
        return () => window.removeEventListener("coderush:toast", onToast);
    }, []);

    // ------------------------------------------------------------
    // Open bookmarked snippet
    // ------------------------------------------------------------
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const snippetId = params.get("snippet");
        if (!snippetId) return;

        let cancelled = false;
        convex
            .query(api.bookmarks.getBookmark, { id: snippetId as never })
            .then((bookmark) => {
                if (cancelled || !bookmark) return;
                setLanguage(bookmark.language as LanguageId);
                setCodeByLang((prev) => ({
                    ...prev,
                    [bookmark.language]: bookmark.code,
                }));
                setHydrated(true);
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [convex]);

    // ------------------------------------------------------------
    // Restore code & drafts
    // ------------------------------------------------------------
    useEffect(() => {
        try {
            const drafts: Record<string, string> = {};
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith("coderush-code-")) {
                    const l = key.replace("coderush-code-", "");
                    drafts[l] = localStorage.getItem(key) ?? "";
                }
            }
            setCodeByLang(drafts);
        } finally {
            setHydrated(true);
        }
    }, []);

    const code = hydrated
        ? codeByLang[language] ?? getLanguage(language).starterCode
        : "";

    const setCode = useCallback(
        (value: string) => {
            setCodeByLang((prev) => ({
                ...prev,
                [language]: value,
            }));
            setDraftState("dirty");
        },
        [language],
    );

    // Autosave draft
    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem(
            storageKey(language),
            codeByLang[language] ?? "",
        );

        const timer = window.setTimeout(() => {
            setDraftState("saving");
            const savedAt = saveDraft({
                code: codeByLang[language] ?? "",
                language,
                problemSlug: "workspace",
            });
            if (savedAt !== null) {
                setDraftSavedAt(savedAt);
                setDraftState("saved");
                setSavedAtLabel(timeAgo(savedAt));
            } else {
                setDraftState("dirty");
            }
        }, 1200);

        return () => window.clearTimeout(timer);
    }, [codeByLang, language, hydrated]);

    // Keep "N seconds ago" fresh
    useEffect(() => {
        if (draftState !== "saved" || draftSavedAt === null) return;
        const t = window.setInterval(
            () => setSavedAtLabel(timeAgo(draftSavedAt)),
            30_000,
        );
        return () => window.clearInterval(t);
    }, [draftState, draftSavedAt]);

    useEffect(() => {
        runRef.current = run;
    }, [run]);

    const appendOutput = useCallback((segments: TerminalSegment[]) => {
        setOutput((prev) => [...prev, ...segments]);
    }, []);

    const running = run !== null;

    // ------------------------------------------------------------
    // Save execution log & Leaderboard
    // ------------------------------------------------------------
    const saveExecutionLog = useCallback(
        async (
            executionId: string,
            type: "stdout" | "stderr" | "stdin" | "system",
            data: string,
        ) => {
            try {
                const execution = await convex.query(
                    api.executions.getExecution,
                    { executionId },
                );
                if (!execution) return;

                await convex.mutation(api.executionLogs.addLog, {
                    executionId: execution._id,
                    type,
                    data,
                    sequence: logSequenceRef.current++,
                    timestamp: Date.now(),
                });
            } catch (error) {
                console.error("[CodeRush] Failed to save execution log:", error);
            }
        },
        [convex],
    );

    const recordSubmission = useCallback(
        async (
            status: "success" | "runtime_error" | "timeout",
            sessionLanguage: LanguageId,
            startedAtMs: number,
            exitCode: number | null,
            sessionId?: string,
        ) => {
            if (sessionId) {
                if (recordedSessionsRef.current.has(sessionId)) return;
                recordedSessionsRef.current.add(sessionId);
            }

            try {
                const result = await convex.mutation(
                    api.leaderboard.recordSubmission,
                    {
                        language: sessionLanguage,
                        status,
                        executionTime: Math.max(0, Date.now() - startedAtMs),
                        exitCode: exitCode ?? undefined,
                    },
                );

                if ((result.pointsAwarded ?? 0) > 0) {
                    push(
                        `+${result.pointsAwarded} points for a successful run!`,
                        "success",
                    );
                }
            } catch (err) {
                console.error("[CodeRush] Could not record this run:", err);
            }
        },
        [convex, push],
    );

    // ------------------------------------------------------------
    // Actions
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
            setParsedError(null);
            setActiveTab("terminal");
        },
        [stopAndClear],
    );

    const handleReset = useCallback(() => {
        stopAndClear();
        setCode(getLanguage(language).starterCode);
        clearDraft("workspace", language);
        setOutput([]);
        setParsedError(null);
        setActiveTab("terminal");
        push("Code reset to template", "info");
    }, [language, setCode, stopAndClear, push]);

    const handleFormat = useCallback(() => {
        const formatted = formatCode(code, language as never, settings.tabSize);
        setCode(formatted);
        push("Code formatted", "info");
    }, [code, language, settings.tabSize, setCode, push]);

    const toggleComment = useCallback(() => {
        editorRef.current?.getAction("editor.action.commentLine")?.run();
    }, []);

    const goToErrorLine = useCallback((line: number) => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.revealLineInCenter(line);
        editor.setPosition({ lineNumber: line, column: 1 });
        editor.focus();
    }, []);

    const applyQuickFix = useCallback(() => {
        const qf = parsedError?.quickFix;
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!qf || !editor || !monaco) return;
        const model = editor.getModel();
        if (!model) return;

        const col =
            qf.kind === "insert-text" && qf.column >= 1e9
                ? model.getLineMaxColumn(qf.line)
                : qf.column;
        editor.executeEdits("coderush-quickfix", [
            {
                range: new monaco.Range(
                    qf.line,
                    col,
                    qf.line,
                    qf.kind === "replace-line"
                        ? model.getLineMaxColumn(qf.line)
                        : col,
                ),
                text: qf.kind === "replace-line" ? `${qf.text}\n` : qf.text,
            },
        ]);
        applyErrorMarker(monaco, model, null);
        stageQuickFix(
            model,
            { ...parsedError!, quickFix: undefined },
            language,
        );
        push("Quick fix applied", "success");
    }, [parsedError, language, push]);

    // ------------------------------------------------------------
    // Run Code with Live Error Parsing
    // ------------------------------------------------------------
    const handleRun = useCallback(async () => {
        if (runRef.current || code.trim().length === 0) return;

        setOutput([]);
        setParsedError(null);
        setActiveTab("terminal");
        runRef.current = null;
        setRun(null);

        const sessionCode = code;
        const sessionLanguage = language;
        const startedAtMs = Date.now();

        let stdoutCollector = "";
        let stderrCollector = "";

        try {
            const interactive = await startInteractiveRun(
                sessionLanguage,
                sessionCode,
            );
            const executionId = interactive.sessionId;
            logSequenceRef.current = 0;

            await convex.mutation(api.executions.createExecution, {
                executionId,
                language: sessionLanguage,
            });

            await saveExecutionLog(
                executionId,
                "system",
                "Program started.",
            );

            runRef.current = interactive;
            setRun(interactive);

            await interactive.stream((event) => {
                if (event.kind === "stdout") {
                    stdoutCollector += event.text;
                    appendOutput([{ kind: "stdout", text: event.text }]);
                    void saveExecutionLog(executionId, "stdout", event.text);
                } else if (event.kind === "stderr") {
                    stderrCollector += event.text;
                    appendOutput([{ kind: "stderr", text: event.text }]);
                    void saveExecutionLog(executionId, "stderr", event.text);
                } else if (event.kind === "exit") {
                    runRef.current = null;
                    setRun(null);

                    appendOutput([
                        {
                            kind: "meta",
                            text: `\n[${exitReasonLabel(event.reason)}]\n`,
                        },
                    ]);

                    const status =
                        event.reason === "timeout" ||
                        event.reason === "idle_timeout"
                            ? "timeout"
                            : event.reason === "stopped"
                              ? "stopped"
                              : (event.exitCode ?? 1) === 0
                                ? "success"
                                : "runtime_error";

                    void convex.mutation(api.executions.updateExecution, {
                        executionId,
                        status,
                        completedAt: Date.now(),
                        exitCode: event.exitCode ?? undefined,
                        executionTime: Math.max(0, Date.now() - startedAtMs),
                    });

                    void saveExecutionLog(
                        executionId,
                        "system",
                        `Program finished: ${status}`,
                    );

                    if (event.reason !== "stopped") {
                        void recordSubmission(
                            status === "success"
                                ? "success"
                                : status === "timeout"
                                  ? "timeout"
                                  : "runtime_error",
                            sessionLanguage,
                            startedAtMs,
                            event.exitCode,
                            interactive.sessionId,
                        );
                    }

                    // Parse error if non-zero exit code or stderr present
                    if (event.exitCode !== 0 || stderrCollector.length > 0) {
                        const parsed = parseError({
                            language: sessionLanguage,
                            stderr: stderrCollector || null,
                            stdout: stdoutCollector,
                            exitCode: event.exitCode,
                        });
                        if (parsed) {
                            setParsedError(parsed);
                            setActiveTab("error");
                            push(`Error detected: ${parsed.title}`, "error");
                        }
                    } else {
                        setParsedError(null);
                        push("✓ Program completed successfully", "success");
                    }
                } else if (event.kind === "error") {
                    runRef.current = null;
                    setRun(null);

                    appendOutput([
                        {
                            kind: "stderr",
                            text: `\n[${event.message}]\n`,
                        },
                    ]);

                    void convex.mutation(api.executions.updateExecution, {
                        executionId,
                        status: "internal_error",
                        completedAt: Date.now(),
                        errorMessage: event.message,
                        executionTime: Math.max(0, Date.now() - startedAtMs),
                    });

                    void saveExecutionLog(
                        executionId,
                        "stderr",
                        event.message,
                    );

                    const parsed =
                        parseError({
                            language: sessionLanguage,
                            stderr: event.message,
                            stdout: stdoutCollector,
                            exitCode: 1,
                        }) || makeInternalError(event.message);

                    setParsedError(parsed);
                    setActiveTab("error");
                    push(`Execution failed: ${event.message}`, "error");
                }
            });
        } catch (err) {
            runRef.current = null;
            setRun(null);
            const msg = err instanceof Error ? err.message : String(err);
            appendOutput([{ kind: "stderr", text: `\n[Failed to start: ${msg}]\n` }]);
            const parsed = makeInternalError(msg);
            setParsedError(parsed);
            setActiveTab("error");
            push("Could not start execution sandbox.", "error");
        }
    }, [code, language, convex, appendOutput, recordSubmission, saveExecutionLog, push]);

    useEffect(() => {
        runFnRef.current = handleRun;
    }, [handleRun]);

    // Keyboard shortcuts
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            const mod = e.ctrlKey || e.metaKey;
            if (e.key === "F11") {
                e.preventDefault();
                setFullscreen((v) => !v);
                return;
            }
            if (e.key === "Escape" && fullscreen) {
                setFullscreen(false);
                return;
            }
            if (!mod) return;
            if (e.key === "Enter") {
                e.preventDefault();
                void handleRun();
                return;
            }
            if (e.shiftKey && e.altKey && e.key.toLowerCase() === "f") {
                e.preventDefault();
                handleFormat();
                return;
            }
            if (e.key.toLowerCase() === "s") {
                e.preventDefault();
                const savedAt = saveDraft({
                    code,
                    language,
                    problemSlug: "workspace",
                });
                if (savedAt !== null) {
                    setDraftSavedAt(savedAt);
                    setDraftState("saved");
                    setSavedAtLabel(timeAgo(savedAt));
                    push("✓ Draft saved", "success");
                }
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [handleRun, handleFormat, fullscreen, code, language, push]);

    const handleInputSent = useCallback(
        (line: string) => {
            appendOutput([{ kind: "stdout", text: line + "\n" }]);
            const current = runRef.current;
            if (current) {
                void saveExecutionLog(current.sessionId, "stdin", line);
            }
        },
        [appendOutput, saveExecutionLog],
    );

    return (
        <div
            data-theme={settings.theme}
            className={
                fullscreen
                    ? "fixed inset-0 z-[70] flex flex-col bg-[var(--bg-primary,#09090b)] text-white"
                    : "flex h-screen flex-col overflow-hidden bg-[var(--bg-primary,#09090b)] text-white"
            }
        >
            {/* Header */}
            {!fullscreen && (
                <header className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-2.5">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="text-lg font-bold tracking-tight text-white"
                        >
                            Code<span className="text-emerald-400">Rush</span>
                        </Link>
                        <span className="hidden text-xs text-neutral-500 sm:inline">
                            Interactive Coding Workspace
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <BookmarkButton
                            language={language}
                            code={code}
                            disabled={running || !hydrated || code.trim().length === 0}
                        />
                        <Link
                            href="/leaderboard"
                            className="hidden rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white sm:inline-block"
                        >
                            Leaderboard
                        </Link>
                        <Link
                            href="/problems"
                            className="hidden rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white sm:inline-block"
                        >
                            Problems
                        </Link>
                        <Link
                            href="/dashboard"
                            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
                        >
                            Dashboard
                        </Link>
                    </div>
                </header>
            )}

            {/* Main Area */}
            <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3 overflow-hidden p-3">
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                    {/* Code Editor Column */}
                    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-neutral-800 bg-[var(--bg-card,#14171d)]">
                        <EditorToolbar
                            language={language}
                            onLanguageChange={handleLanguageChange}
                            running={running}
                            draftState={draftState}
                            savedAtLabel={savedAtLabel}
                            onSaveDraft={() => {
                                const savedAt = saveDraft({
                                    code,
                                    language,
                                    problemSlug: "workspace",
                                });
                                if (savedAt !== null) {
                                    setDraftSavedAt(savedAt);
                                    setDraftState("saved");
                                    setSavedAtLabel(timeAgo(savedAt));
                                    push("✓ Draft saved", "success");
                                }
                            }}
                            onFormat={handleFormat}
                            fullscreen={fullscreen}
                            onToggleFullscreen={() => setFullscreen((v) => !v)}
                            settings={settings}
                            updateSettings={updateSettings}
                            resetSettings={resetSettings}
                        />

                        <div className="min-h-0 flex-1">
                            <MonacoHost
                                language={language}
                                value={code}
                                onChange={setCode}
                                settings={settings}
                                error={parsedError}
                                onFormat={handleFormat}
                                onToggleComment={toggleComment}
                                bindInstances={bindInstances}
                            />
                        </div>

                        {/* Action Bar */}
                        <div className="flex shrink-0 items-center justify-between border-t border-neutral-800 bg-[var(--bg-secondary,#0d0f12)] px-4 py-2.5">
                            <div className="flex items-center gap-3">
                                {running ? (
                                    <button
                                        type="button"
                                        onClick={stopAndClear}
                                        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
                                    >
                                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        ■ Stop Program
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => void handleRun()}
                                        disabled={!hydrated || code.trim().length === 0}
                                        title="Run Code (Ctrl+Enter)"
                                        className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
                                    >
                                        ▶ Run Code
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setResetOpen(true)}
                                    disabled={running}
                                    className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white disabled:opacity-50"
                                >
                                    Reset Code
                                </button>
                            </div>

                            {parsedError && (
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("error")}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:underline"
                                >
                                    <span>❌</span>
                                    <span>{parsedError.title}</span>
                                    {parsedError.line !== null && (
                                        <span className="font-mono text-neutral-400">
                                            (Line {parsedError.line})
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                    </section>

                    {/* Right Info Column */}
                    <aside className="hidden min-h-0 flex-col overflow-auto rounded-xl border border-neutral-800 bg-[var(--bg-card,#14171d)] p-4 lg:flex">
                        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                            Coding Workspace
                        </h2>
                        <p className="text-xs leading-relaxed text-neutral-400">
                            Write any program in C++, Python, Java, or JavaScript and run it interactively against the isolated sandbox.
                        </p>

                        <hr className="my-4 border-neutral-800" />

                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                            Keyboard Shortcuts
                        </h3>
                        <div className="space-y-1.5 text-xs text-neutral-400">
                            <div className="flex justify-between">
                                <span>Run Code</span>
                                <kbd className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-200">
                                    Ctrl+Enter
                                </kbd>
                            </div>
                            <div className="flex justify-between">
                                <span>Format Code</span>
                                <kbd className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-200">
                                    Shift+Alt+F
                                </kbd>
                            </div>
                            <div className="flex justify-between">
                                <span>Save Draft</span>
                                <kbd className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-200">
                                    Ctrl+S
                                </kbd>
                            </div>
                            <div className="flex justify-between">
                                <span>Toggle Comment</span>
                                <kbd className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-200">
                                    Ctrl+/
                                </kbd>
                            </div>
                            <div className="flex justify-between">
                                <span>Fullscreen</span>
                                <kbd className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-neutral-200">
                                    F11
                                </kbd>
                            </div>
                        </div>

                        <hr className="my-4 border-neutral-800" />

                        <div className="mt-auto rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-indigo-200">
                            <p className="font-medium text-indigo-300">
                                Ready for Challenges?
                            </p>
                            <p className="mt-1 text-[11px] text-neutral-400">
                                Practice LeetCode-style algorithm problems with automated judging:
                            </p>
                            <Link
                                href="/problems"
                                className="mt-2 inline-block font-semibold text-indigo-400 hover:underline"
                            >
                                Browse Problem Arena →
                            </Link>
                        </div>
                    </aside>
                </div>

                {/* Bottom Result & Diagnostics Section */}
                <div className="flex max-h-[38vh] min-h-[140px] shrink-0 flex-col overflow-hidden rounded-xl border border-neutral-800 bg-[var(--bg-card,#14171d)]">
                    <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-1.5">
                        <button
                            type="button"
                            onClick={() => setActiveTab("terminal")}
                            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                                activeTab === "terminal"
                                    ? "border-b-2 border-indigo-500 text-white"
                                    : "text-neutral-400 hover:text-neutral-200"
                            }`}
                        >
                            Live Terminal
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("error")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                                activeTab === "error"
                                    ? "border-b-2 border-indigo-500 text-white"
                                    : "text-neutral-400 hover:text-neutral-200"
                            }`}
                        >
                            <span>Intelligent Diagnostics</span>
                            {parsedError && (
                                <span className="h-2 w-2 rounded-full bg-red-400" />
                            )}
                        </button>

                        <div className="ml-auto flex items-center gap-2">
                            {activeTab === "terminal" && output.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setOutput([])}
                                    className="text-[11px] text-neutral-500 hover:text-neutral-300"
                                >
                                    Clear Terminal
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto p-2">
                        {activeTab === "terminal" && (
                            <Terminal
                                run={run}
                                output={output}
                                onClear={() => setOutput([])}
                                onInput={handleInputSent}
                            />
                        )}

                        {activeTab === "error" && (
                            <div className="p-2">
                                {parsedError ? (
                                    <ErrorDetailsCard
                                        error={parsedError}
                                        problemTitle="Interactive Workspace"
                                        onGoToError={
                                            parsedError.line !== null
                                                ? () => goToErrorLine(parsedError.line as number)
                                                : undefined
                                        }
                                        onApplyQuickFix={
                                            parsedError.quickFix ? applyQuickFix : undefined
                                        }
                                    />
                                ) : (
                                    <div className="flex h-32 flex-col items-center justify-center text-center text-xs text-neutral-500">
                                        <span className="text-lg text-emerald-400 mb-1">✓</span>
                                        <p>No errors detected in current run.</p>
                                        <p className="text-[11px] text-neutral-600 mt-1">
                                            When a syntax or runtime error occurs, full structured diagnostics with AI help will appear here.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={resetOpen}
                title="Reset your code?"
                body="This will replace your current code with the default template for this language."
                confirmLabel="Reset"
                destructive
                onConfirm={() => {
                    handleReset();
                    setResetOpen(false);
                }}
                onCancel={() => setResetOpen(false)}
            />

            <ToastStack toasts={[...customToasts, ...legacyToasts]} />
        </div>
    );
}
