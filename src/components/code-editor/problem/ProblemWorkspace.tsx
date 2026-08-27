"use client";

/**
 * ProblemWorkspace — orchestrates the whole judging experience:
 * split layout, Monaco host, custom input, result tabs, drafts,
 * shortcuts, fullscreen (requirements §1–§40).
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { useToasts, ToastStack } from "@/components/ui/Toast";

import { getLanguage } from "@/lib/code-execution/languages";
import type { LanguageId } from "@/lib/code-execution/types";

import { makeInternalError } from "@/lib/error-parsing";
import { applyErrorMarker, stageQuickFix } from "@/lib/editor/monaco-setup";

import type {
    JudgeMode,
    JudgeResponse,
    SanitizedProblem,
    SubmissionSummary,
} from "@/lib/judge/types";

import {
    clearDraft,
    loadDraft,
    saveDraft,
    timeAgo,
} from "@/lib/editor/drafts";
import { useEditorSettings } from "@/lib/editor/settings";
import { formatCode } from "@/lib/editor/formatting";

import SplitWorkspace from "./SplitWorkspace";
import ProblemPanel from "./ProblemPanel";
import MonacoHost from "./MonacoHost";
import EditorToolbar from "./EditorToolbar";
import ResultPanel, { type ResultTab } from "./ResultPanel";
import CustomInputSection from "./CustomInputSection";
import {
    ConfirmDialog,
    RestoreDraftDialog,
    SubmitConfirmDialog,
    ViewCodeDialog,
    LoadingHint,
} from "./Dialogs";

const AUTOSAVE_DEBOUNCE_MS = 1200;
const CUSTOM_INPUT_LIMIT = 10_000;

export interface ProblemWorkspaceProps {
    problem: SanitizedProblem;
    signedIn: boolean;
}

type DraftPhase = "checking" | "ask-restore" | "none";

/** Loads and shows a stored submission's code (§31). */
function SubmissionCodeView({ id }: { id: string }) {
    const doc = useQuery(api.judgeSubmissions.getOwnSubmissionCode, {
        submissionId: id as never,
    });
    if (!doc) return <LoadingHint />;
    return (
        <div>
            <p className="mb-2 text-xs text-neutral-500">
                {getLanguage(doc.language as LanguageId)?.label ?? doc.language} ·{" "}
                {new Date(doc.createdAt).toLocaleString()}
            </p>
            <pre className="max-h-[50vh] overflow-auto rounded-lg bg-black/40 p-3 font-mono text-xs leading-relaxed text-neutral-200">
                {doc.code}
            </pre>
        </div>
    );
}

export default function ProblemWorkspace({ problem, signedIn }: ProblemWorkspaceProps) {
    const { push, toasts } = useToasts();
    const { settings, update: updateSettings, reset: resetSettings } =
        useEditorSettings();

    // ---------------------------------------------------------------
    // Core editor state
    // ---------------------------------------------------------------
    const [language, setLanguage] = useState<LanguageId>("cpp");

    const [code, setCode] = useState<string>(() => {
        const draft = typeof window !== "undefined" ? loadDraft(problem.slug, "cpp") : null;
        if (draft && draft.code !== getLanguage("cpp").starterCode) {
            return draft.code;
        }
        return getLanguage("cpp").starterCode;
    });

    const [customInput, setCustomInput] = useState("");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<JudgeResponse | null>(null);
    const [tab, setTab] = useState<ResultTab>("tests");
    const [fullscreen, setFullscreen] = useState(false);

    const [resetOpen, setResetOpen] = useState(false);
    const [submitOpen, setSubmitOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [draftPhase, setDraftPhase] = useState<DraftPhase>(() => {
        const draft = typeof window !== "undefined" ? loadDraft(problem.slug, "cpp") : null;
        if (draft && draft.code !== getLanguage("cpp").starterCode) {
            return "ask-restore";
        }
        return "none";
    });

    const [draftSavedAt, setDraftSavedAt] = useState<number | null>(() => {
        const draft = typeof window !== "undefined" ? loadDraft(problem.slug, "cpp") : null;
        return draft ? draft.savedAt : null;
    });

    const [draftState, setDraftState] = useState<"idle" | "dirty" | "saving" | "saved">(() => {
        const draft = typeof window !== "undefined" ? loadDraft(problem.slug, "cpp") : null;
        return draft ? "saved" : "idle";
    });

    const [savedAtLabel, setSavedAtLabel] = useState<string | null>(null);

    const [viewingSubmissionId, setViewingSubmissionId] = useState<string | null>(null);

    /** Instances captured from MonacoHost. */
    const editorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof import("monaco-editor") | null>(null);

    const codeRef = useRef(code);
    useEffect(() => {
        codeRef.current = code;
    }, [code]);

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

    // ---------------------------------------------------------------
    // Switch language with draft awareness (requirements §25–27, §29)
    // ---------------------------------------------------------------
    const handleLanguageChange = useCallback((newLang: LanguageId) => {
        setLanguage(newLang);
        const draft = loadDraft(problem.slug, newLang);
        if (draft && draft.code !== getLanguage(newLang).starterCode) {
            setCode(draft.code);
            setDraftSavedAt(draft.savedAt);
            setDraftState("saved");
            setDraftPhase("ask-restore");
        } else {
            setCode(getLanguage(newLang).starterCode);
            setDraftSavedAt(null);
            setDraftState("idle");
            setDraftPhase("none");
        }
    }, [problem.slug]);

    /** Reset editor to the language template. */
    const resetToStarter = useCallback(() => {
        setCode(getLanguage(language).starterCode);
        clearDraft(problem.slug, language);
        setDraftSavedAt(null);
        setDraftState("idle");
        setSavedAtLabel(null);
    }, [language, problem.slug]);

    // ---------------------------------------------------------------
    // Autosave: debounced, never per keystroke (requirement §26)
    // ---------------------------------------------------------------
    const autosaveTimer = useRef<number | null>(null);

    useEffect(() => {
        if (draftPhase === "checking" || code === "") return;

        if (autosaveTimer.current !== null) {
            window.clearTimeout(autosaveTimer.current);
        }
        autosaveTimer.current = window.setTimeout(() => {
            setDraftState("saving");
            const savedAt = saveDraft({
                code,
                language,
                problemSlug: problem.slug,
            });
            if (savedAt === null) {
                setDraftState("dirty");
                return;
            }
            setDraftSavedAt(savedAt);
            setDraftState("saved");
            setSavedAtLabel(timeAgo(savedAt));
        }, AUTOSAVE_DEBOUNCE_MS);
        return () => {
            if (autosaveTimer.current !== null) {
                window.clearTimeout(autosaveTimer.current);
                autosaveTimer.current = null;
            }
        };
    }, [code, draftPhase, language, problem.slug]);

    // Keep "N seconds ago" fresh.
    useEffect(() => {
        if (draftState !== "saved" || draftSavedAt === null) return;
        const t = window.setInterval(
            () => setSavedAtLabel(timeAgo(draftSavedAt)),
            30_000,
        );
        return () => window.clearInterval(t);
    }, [draftState, draftSavedAt]);

    // ---------------------------------------------------------------
    // Execution — Run / Custom / Submit all funnel through /api/judge
    // ---------------------------------------------------------------
    const execute = useCallback(
        async (mode: JudgeMode) => {
            if (running || codeRef.current.trim().length === 0) return;
            setRunning(true);
            if (mode === "submit") {
                setSubmitOpen(true);
                return; // dialog confirm() continues via doSubmit
            }
            try {
                const res = await fetch("/api/judge", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        mode,
                        problemSlug: problem.slug,
                        language,
                        code: codeRef.current,
                        customInput:
                            mode === "custom" ? customInput : undefined,
                    }),
                });
                if (!res.ok) {
                    const data = (await res.json().catch(() => null)) as {
                        error?: string;
                    } | null;
                    push(data?.error ?? "Execution failed.", "error");
                    setResult({
                        ok: false,
                        outcome: "internal_error",
                        mode,
                        problemSlug: problem.slug,
                        language,
                        error: makeInternalError(
                            data?.error ?? `HTTP ${res.status}`,
                        ),
                        testResults: [],
                        passedCount: 0,
                        totalCount: 0,
                        totalRuntimeMs: 0,
                        maxMemoryKb: null,
                        custom:
                            mode === "custom"
                                ? {
                                      stdout: "",
                                      stderr: "",
                                      exitCode: null,
                                      executionTimeMs: 0,
                                      memoryUsageKb: null,
                                  }
                                : null,
                        submissionId: null,
                        createdAt: null,
                    });
                    setTab("errors");
                    return;
                }
                const data = (await res.json()) as JudgeResponse;
                setResult(data);
                setTab(
                    data.error && data.error.type !== "wrong_answer"
                        ? "errors"
                        : data.outcome === "wrong_answer"
                          ? "tests"
                          : data.mode === "custom"
                            ? "output"
                            : "tests",
                );
                if (data.ok && mode !== "custom") {
                    push("✓ All tests passed", "success");
                } else if (
                    data.custom &&
                    mode === "custom" &&
                    data.custom.exitCode === 0
                ) {
                    push("Custom run finished", "info");
                } else if (!data.ok) {
                    push(
                        `✗ ${data.outcome.replace(/_/g, " ")}`,
                        "error",
                    );
                }
            } catch {
                push("Network error — could not reach the judge.", "error");
            } finally {
                setRunning(false);
            }
        },
        [running, language, problem.slug, customInput, push],
    );

    const doSubmit = useCallback(async () => {
        setSubmitting(true);
        setSubmitOpen(false);
        try {
            const res = await fetch("/api/judge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: "submit",
                    problemSlug: problem.slug,
                    language,
                    code: codeRef.current,
                }),
            });
            if (res.status === 401) {
                push("Sign in to submit solutions.", "error");
                return;
            }
            if (!res.ok) {
                const data = (await res.json().catch(() => null)) as {
                    error?: string;
                } | null;
                push(data?.error ?? "Submission failed.", "error");
                return;
            }
            const data = (await res.json()) as JudgeResponse;
            setResult(data);
            setTab(
                data.outcome === "accepted"
                    ? "tests"
                    : data.error
                      ? "errors"
                      : "tests",
            );
            push(
                data.outcome === "accepted"
                    ? "✓ Accepted"
                    : `✗ ${data.outcome.replace(/_/g, " ")}`,
                data.outcome === "accepted" ? "success" : "error",
            );
        } catch {
            push("Network error — could not reach the judge.", "error");
        } finally {
            setSubmitting(false);
            setRunning(false);
        }
    }, [language, problem.slug, push]);

    // ---------------------------------------------------------------
    // Editor actions
    // ---------------------------------------------------------------
    const format = useCallback(() => {
        const formatted = formatCode(codeRef.current, language as never, settings.tabSize);
        setCode(formatted);
        push("Code formatted", "info");
    }, [language, settings.tabSize, push]);

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

    /** Quick fixes are explicitly user-approved by clicking the button. */
    const applyQuickFix = useCallback(() => {
        const qf = result?.error?.quickFix;
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
                text:
                    qf.kind === "replace-line"
                        ? `${qf.text}\n`
                        : qf.text,
            },
        ]);
        applyErrorMarker(monaco, model, null);
        stageQuickFix(model, { ...result!.error!, quickFix: undefined }, language);
        push("Quick fix applied", "success");
    }, [result, language, push]);

    // ---------------------------------------------------------------
    // Submission history (requirement §31)
    // ---------------------------------------------------------------
    const submissions = useQuery(
        api.judgeSubmissions.listRecentForUser,
        signedIn ? { problemSlug: problem.slug, limit: 15 } : "skip",
    );

    // ---------------------------------------------------------------
    // Keyboard shortcuts (requirement §9)
    // ---------------------------------------------------------------
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
                if (e.shiftKey && e.ctrlKey) {
                    if (!signedIn) {
                        push("Sign in to submit solutions.", "error");
                        return;
                    }
                    if (submitting || running) return;
                    setSubmitOpen(true);
                    setRunning(true);
                } else {
                    void execute("run");
                }
                return;
            }
            if (e.shiftKey && e.altKey && e.key.toLowerCase() === "f") {
                e.preventDefault();
                format();
                return;
            }
            if (e.key.toLowerCase() === "s") {
                e.preventDefault();
                const savedAt = saveDraft({
                    code: codeRef.current,
                    language,
                    problemSlug: problem.slug,
                });
                if (savedAt !== null) {
                    setDraftSavedAt(savedAt);
                    setDraftState("saved");
                    setSavedAtLabel(timeAgo(savedAt));
                    push("✓ Draft saved", "success");
                }
                return;
            }
            if (e.key.toLowerCase() === "f") {
                if (
                    document.activeElement &&
                    document
                        .getElementById("cr-editor-host")
                        ?.contains(document.activeElement)
                ) {
                    return;
                }
                e.preventDefault();
                editorRef.current?.getAction("actions.find")?.run();
                editorRef.current?.focus();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [execute, format, fullscreen, language, problem.slug, push, running, signedIn, submitting]);

    // ---------------------------------------------------------------
    // Layout slots
    // ---------------------------------------------------------------
    const problemSlot = (
        <ProblemPanel problem={problem} />
    );

    const codeSlot = (
        <div id="cr-editor-host" className="flex h-full flex-col">
            <EditorToolbar
                language={language}
                onLanguageChange={handleLanguageChange}
                running={running || submitting}
                draftState={draftState}
                savedAtLabel={savedAtLabel}
                onSaveDraft={() => {
                    const savedAt = saveDraft({ code, language, problemSlug: problem.slug });
                    if (savedAt !== null) {
                        setDraftSavedAt(savedAt);
                        setDraftState("saved");
                        setSavedAtLabel(timeAgo(savedAt));
                        push("✓ Draft saved", "success");
                    }
                }}
                onFormat={format}
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
                    onChange={(v) => setCode(v)}
                    settings={settings}
                    error={result?.error ?? null}
                    onFormat={format}
                    onToggleComment={toggleComment}
                    bindInstances={bindInstances}
                />
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-3 border-t border-neutral-800 px-4 py-2.5">
                <button
                    type="button"
                    onClick={() => void execute("run")}
                    disabled={running || submitting}
                    title="Run Code (Ctrl+Enter)"
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
                >
                    {running ? "⟳ Running…" : "▶ Run"}
                </button>
                <button
                    type="button"
                    onClick={() => void execute("submit")}
                    disabled={running || submitting}
                    title="Submit (Ctrl+Shift+Enter)"
                    className="primary-button !py-1.5 !text-sm"
                >
                    {submitting ? "⟳ Evaluating…" : "Submit"}
                </button>
                {!signedIn && (
                    <Link
                        href="/login"
                        className="text-xs text-indigo-300 underline-offset-2 hover:underline"
                        title="Submitting requires an account"
                    >
                        Sign in to record submissions →
                    </Link>
                )}
                <button
                    type="button"
                    onClick={() => setResetOpen(true)}
                    disabled={running || submitting}
                    title="Reset to the starter template"
                    className="ml-auto rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white disabled:opacity-40"
                >
                    Reset Code
                </button>
            </div>
        </div>
    );

    const inputSlot = (
        <CustomInputSection
            value={customInput}
            onChange={setCustomInput}
            onRun={() => void execute("custom")}
            running={running}
            maxBytes={CUSTOM_INPUT_LIMIT}
        />
    );

    const outputSlot = (
        <ResultPanel
            result={result}
            running={running}
            tab={tab}
            onTabChange={setTab}
            problemTitle={problem.title}
            submissions={(submissions as SubmissionSummary[] | undefined) ?? null}
            submissionsLoading={signedIn && submissions === undefined}
            signedIn={signedIn}
            onSelectSubmission={(id) => setViewingSubmissionId(id)}
            onGoToError={goToErrorLine}
            onApplyQuickFix={applyQuickFix}
        />
    );

    return (
        <div
            data-theme={settings.theme}
            className={
                fullscreen
                    ? "fixed inset-0 z-[70] flex flex-col bg-[var(--bg-primary,#09090b)]"
                    : "relative flex min-h-[calc(100vh-3.5rem)] flex-col"
            }
        >
            <div className="flex min-h-0 flex-1 flex-col">
                <SplitWorkspace
                    problemSlot={problemSlot}
                    codeSlot={codeSlot}
                    inputSlot={fullscreen ? null : inputSlot}
                    outputSlot={outputSlot}
                />
            </div>

            {/* ------------------------------------------------------- */}
            {/* Dialogs */}
            {/* ------------------------------------------------------- */}
            <ConfirmDialog
                open={resetOpen}
                title="Reset your code?"
                body="This will replace your current code with the default template. Your saved draft for this language is also cleared."
                confirmLabel="Reset"
                destructive
                onConfirm={() => {
                    resetToStarter();
                    setResetOpen(false);
                    push("Code reset to template", "info");
                }}
                onCancel={() => setResetOpen(false)}
            />

            <RestoreDraftDialog
                open={draftPhase === "ask-restore"}
                savedAtLabel={draftSavedAt ? timeAgo(draftSavedAt) : "recently"}
                onRestore={() => setDraftPhase("none")}
                onDiscard={() => {
                    resetToStarter();
                    setDraftPhase("none");
                }}
            />

            <SubmitConfirmDialog
                open={submitOpen}
                language={getLanguage(language).label}
                problemTitle={problem.title}
                hiddenCount={problem.counts.hidden}
                submitting={submitting}
                onSubmit={() => void doSubmit()}
                onCancel={() => {
                    setSubmitOpen(false);
                    if (running) setRunning(false);
                }}
            />

            <ViewCodeDialog
                open={viewingSubmissionId !== null}
                title="Submitted Code"
                onClose={() => setViewingSubmissionId(null)}
            >
                {viewingSubmissionId !== null && (
                    <SubmissionCodeView id={viewingSubmissionId} />
                )}
            </ViewCodeDialog>

            <ToastStack toasts={toasts} />
        </div>
    );
}
