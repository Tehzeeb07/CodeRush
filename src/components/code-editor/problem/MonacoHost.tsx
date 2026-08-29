"use client";

/**
 * Monaco editor host for the problem workspace.
 *
 * Wires together:
 *   - CodeRush themes + completion providers + quick-fix provider
 *   - live user settings (requirement §7)
 *   - compiler diagnostics → markers/squiggles/gutter icons (§19)
 *   - editor-scope keyboard shortcuts (Shift+Alt+F, Ctrl+/ …)
 */

import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";

import {
    applyErrorMarker,
    defineEditorThemes,
    registerQuickFixProvider,
    stageQuickFix,
} from "@/lib/editor/monaco-setup";
import { registerCompletionProviders } from "@/lib/editor/completions";
import type { EditorSettings } from "@/lib/editor/settings";
import type { ParsedError } from "@/lib/error-parsing/types";
import type { LanguageId } from "@/lib/code-execution/types";

export interface MonacoHostProps {
    language: LanguageId;
    value: string;
    onChange: (v: string) => void;
    settings: EditorSettings;
    /** Current structured diagnostic to mark inside the editor. */
    error: ParsedError | null;
    /** External formatter action (Shift+Alt+F or toolbar button). */
    onFormat: () => void;
    /** Toggle comment via editor action. */
    onToggleComment: () => void;

    /** Capture instances so the workspace can drive navigation/etc. */
    bindInstances: (
        editor: import("monaco-editor").editor.IStandaloneCodeEditor | null,
        monaco: typeof import("monaco-editor") | null,
    ) => void;
}

export default function MonacoHost({
    language,
    value,
    onChange,
    settings,
    error,
    onFormat,
    onToggleComment,
    bindInstances,
}: MonacoHostProps) {
    const editorRef =
        useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(
            null,
        );
    const monacoRef = useRef<typeof import("monaco-editor") | null>(null);

    // Latest callbacks without re-binding commands.
    const formatRef = useRef(onFormat);
    const commentRef = useRef(onToggleComment);

    useEffect(() => {
        formatRef.current = onFormat;
        commentRef.current = onToggleComment;
    }, [onFormat, onToggleComment]);

    const handleMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco as unknown as typeof import("monaco-editor");
        bindInstances(editor, monacoRef.current);

        editor.addCommand(
            monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
            () => formatRef.current(),
        );
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash,
            () => commentRef.current(),
        );
        // Keep browser save out of the editor entirely (Ctrl+S = Save Draft).
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            /* handled globally — swallow here to avoid a dialog */
        });
    };

    // Diagnostics tracking: marker + staged quick fix whenever `error` flips.
    useEffect(() => {
        const monaco = monacoRef.current;
        const editor = editorRef.current;
        if (!monaco || !editor) return;
        const model = editor.getModel();
        if (!model) return;
        applyErrorMarker(
            monaco as unknown as typeof import("monaco-editor"),
            model,
            error,
        );
        stageQuickFix(model, error!, language);
    }, [error, language]);

    return (
        <div className="h-full min-h-[320px] w-full" data-theme={settings.theme}>
            <Editor
                language={language}
                value={value}
                theme={settings.theme === "dark" ? "coderush-dark" : "coderush-light"}
                onChange={(v) => onChange(v ?? "")}
                beforeMount={(monaco) => {
                    defineEditorThemes(monaco);
                    registerCompletionProviders(
                        monaco as unknown as typeof import("monaco-editor"),
                    );
                    registerQuickFixProvider(
                        monaco as unknown as typeof import("monaco-editor"),
                    );
                }}
                onMount={handleMount}
                loading={
                    <span className="text-sm text-neutral-500">
                        Loading editor…
                    </span>
                }
                options={{
                    fontSize: settings.fontSize,
                    fontFamily:
                        "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    fontLigatures: true,
                    lineNumbers: settings.lineNumbers ? "on" : "off",
                    minimap: { enabled: settings.minimap },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: settings.tabSize,
                    insertSpaces: true,
                    autoIndent: "full",
                    matchBrackets: "always",
                    bracketPairColorization: {
                        enabled: settings.bracketPairColorization,
                    },
                    autoClosingBrackets: settings.autoClosingBrackets
                        ? "languageDefined"
                        : "never",
                    autoClosingQuotes: settings.autoClosingBrackets
                        ? "languageDefined"
                        : "never",
                    wordWrap: settings.wordWrap ? "on" : "off",
                    renderWhitespace: "selection",
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    padding: { top: 12, bottom: 12 },
                    scrollbar: { verticalScrollbarSize: 10 },
                    fixedOverflowWidgets: true,
                    quickSuggestions: true,
                    suggestSelection: "first",
                }}
            />
        </div>
    );
}
