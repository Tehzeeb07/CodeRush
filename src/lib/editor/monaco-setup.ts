/**
 * Monaco integration layer:
 *   - CodeRush dark + light editor themes (requirement §8)
 *   - error → gutter/squiggly markers (requirement §19)
 *   - deterministic Quick Fix code actions (requirement §24)
 *   - navigation helper ("Go to Error")
 *
 * Must only be imported from client components.
 */

import type { Monaco } from "@monaco-editor/react";

export const CODERUSH_DARK = "coderush-dark";
export const CODERUSH_LIGHT = "coderush-light";
const MARKER_OWNER = "coderush-diagnostic";

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export function defineEditorThemes(monaco: Monaco): void {
    monaco.editor.defineTheme(CODERUSH_DARK, {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "comment", foreground: "6b7280", fontStyle: "italic" },
            { token: "keyword", foreground: "c084fc" },
            { token: "string", foreground: "34d399" },
            { token: "number", foreground: "fbbf24" },
            { token: "type", foreground: "60a5fa" },
            { token: "delimiter.bracket", foreground: "a1a1aa" },
            { token: "identifier", foreground: "e5e7eb" },
        ],
        colors: {
            "editor.background": "#101218",
            "editor.foreground": "#e5e7eb",
            "editorLineNumber.foreground": "#4b5163",
            "editorLineNumber.activeForeground": "#9ca3af",
            "editor.selectionBackground": "#31364850",
            "editor.lineHighlightBackground": "#171b23",
            "editorCursor.foreground": "#34d399",
            "editorIndentGuide.background1": "#232833",
            "editorIndentGuide.activeBackground1": "#3c4457",
            "editorWidget.background": "#15181f",
            "editorWidget.border": "#2a2f3a",
            "editorSuggestWidget.background": "#15181f",
            "scrollbarSlider.background": "#33333355",
        },
    });

    monaco.editor.defineTheme(CODERUSH_LIGHT, {
        base: "vs",
        inherit: true,
        rules: [
            { token: "comment", foreground: "94a3b8", fontStyle: "italic" },
            { token: "keyword", foreground: "7c3aed" },
            { token: "string", foreground: "059669" },
            { token: "number", foreground: "d97706" },
            { token: "type", foreground: "2563eb" },
        ],
        colors: {
            "editor.background": "#fbfbfd",
            "editor.foreground": "#1e293b",
            "editorLineNumber.foreground": "#cbd5e1",
            "editorLineNumber.activeForeground": "#64748b",
            "editor.selectionBackground": "#dbeafe",
            "editor.lineHighlightBackground": "#f1f5f9",
            "editorCursor.foreground": "#0ea569",
                        "editorIndentGuide.background1": "#e2e8f0",
            "editorIndentGuide.activeBackground1": "#cbd5e1",
            "editorWidget.background": "#ffffff",
            "editorWidget.border": "#e2e8f0",
            "editorSuggestWidget.background": "#ffffff",
            "scrollbarSlider.background": "#94a3b855",
        },
    });
}

// ---------------------------------------------------------------------------
// Diagnostics markers (requirement §19)
// ---------------------------------------------------------------------------

import type { ParsedError } from "@/lib/error-parsing/types";

/** Map of model uri → last structured error (used by quick fixes). */
const lastErrorByModel = new Map<string, ParsedError>();

export function applyErrorMarker(
    monaco: Monaco,
    model: import("monaco-editor").editor.ITextModel,
    error: ParsedError | null,
): void {
    lastErrorByModel.delete(model.uri.toString());
    if (error) {
        lastErrorByModel.set(model.uri.toString(), error);
    }

    if (!error || error.line === null) {
        monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
        return;
    }

    const line = Math.max(1, Math.min(error.line, model.getLineCount()));
    const column = Math.max(1, error.column ?? 1);
    // Highlight the rest of the line when no precise column exists.
    const endColumn =
        error.column !== null
            ? column + 1
            : Math.max(column + 1, model.getLineMaxColumn(line));

    monaco.editor.setModelMarkers(model, MARKER_OWNER, [
        {
            startLineNumber: line,
            endLineNumber: line,
            startColumn: column,
            endColumn,
            message: `${error.title}\n\n${error.explanation}${
                error.suggestedFix.length > 0
                    ? `\n\nHow to fix:\n${error.suggestedFix
                          .map((f) => `• ${f}`)
                          .join("\n")}`
                    : ""
            }`,
            severity:
                error.severity === "warning"
                    ? 4
                    : (monaco.MarkerSeverity?.Error ?? 8),
            source: "CodeRush",
        },
    ]);
}

/** Navigate an editor to a specific line ("Go to Error" button). */
export function goToLine(
    editor: import("monaco-editor").editor.IStandaloneCodeEditor,
    line: number,
): void {
    editor.revealLineInCenter(line);
    editor.setPosition({ lineNumber: line, column: 1 });
    editor.focus();
}

            

// ---------------------------------------------------------------------------
// Quick Fix code actions (requirement §24)
//
// Only mechanical, safe edits are offered. Monaco requires an explicit
// user click to apply one, which satisfies "never modify user's code
// without permission".
// ---------------------------------------------------------------------------

interface QuickFixContext {
    error: ParsedError;
    language: string;
}

const pendingQuickFixes = new Map<string, QuickFixContext>();

export function stageQuickFix(
    model: import("monaco-editor").editor.ITextModel,
    error: ParsedError | null,
    language: string,
): void {
    if (error?.quickFix) {
        pendingQuickFixes.set(model.uri.toString(), { error, language });
    } else {
        pendingQuickFixes.delete(model.uri.toString());
    }
}

export function registerQuickFixProvider(monaco: Monaco): void {
    for (const lang of ["cpp", "python", "java", "javascript", "typescript"]) {
        monaco.languages.registerCodeActionProvider(lang, {
            provideCodeActions(
                model: import("monaco-editor").editor.ITextModel,
                range: import("monaco-editor").Range,
            ) {
                const ctx = pendingQuickFixes.get(model.uri.toString());
                if (!ctx?.error.quickFix) return { actions: [], dispose() {} };

                const qf = ctx.error.quickFix;
                const target =
                    qf.kind === "insert-text" && qf.column >= 1e9
                        ? model.getLineMaxColumn(qf.line)
                        : qf.column;
                const nearLine =
                    Math.abs(range.startLineNumber - qf.line) <= 1;
                if (!nearLine) return { actions: [], dispose() {} };

                let edit: import("monaco-editor").languages.IWorkspaceTextEdit;
                if (qf.kind === "replace-line") {
                    edit = {
                        resource: model.uri,
                        versionId: undefined,
                        textEdit: {
                            range: {
                                startLineNumber: qf.line,
                                endLineNumber: qf.line,
                                startColumn: 1,
                                endColumn: model.getLineMaxColumn(qf.line),
                            },
                            text: qf.text,
                        },
                    };
                } else {
                    edit = {
                        resource: model.uri,
                        versionId: undefined,
                        textEdit: {
                            range: {
                                startLineNumber: qf.line,
                                endLineNumber: qf.line,
                                startColumn: target,
                                endColumn: target,
                            },
                            text: qf.text,
                        },
                    };
                }

                return {
                    actions: [
                        {
                            title: `${qf.label} — from compiler: "${ctx.error.title}"`,
                            kind: "quickfix",
                            isPreferred: true,
                            edit: { edits: [edit] },
                        },
                    ],
                    dispose() {},
                };
            },
        });
    }
}
