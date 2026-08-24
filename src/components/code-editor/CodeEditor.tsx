"use client";

/**
 * Monaco-based code editor with a dark developer theme.
 *
 * Features: syntax highlighting, line numbers, bracket matching,
 * automatic indentation, auto-closing brackets, minimap off,
 * and Ctrl/Cmd+Enter to run code.
 */

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback } from "react";

export interface CodeEditorProps {
    /** Monaco language id (e.g. "javascript", "python", "cpp", "java"). */
    language: string;
    value: string;
    onChange: (value: string) => void;
    /** Invoked when the user presses Ctrl/Cmd+Enter inside the editor. */
    onRun?: () => void;
}

/** Custom dark theme tuned for the CodeRush neutral palette. */
const CODERUSH_THEME = "coderush-dark";

function defineTheme(monaco: typeof import("monaco-editor")) {
    monaco.editor.defineTheme(CODERUSH_THEME, {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "comment", foreground: "6b7280", fontStyle: "italic" },
            { token: "keyword", foreground: "c084fc" },
            { token: "string", foreground: "34d399" },
            { token: "number", foreground: "fbbf24" },
            { token: "type", foreground: "60a5fa" },
            { token: "identifier", foreground: "e5e7eb" },
        ],
        colors: {
            "editor.background": "#0a0a0a",
            "editor.foreground": "#e5e7eb",
            "editorLineNumber.foreground": "#525252",
            "editorLineNumber.activeForeground": "#a3a3a3",
            "editor.selectionBackground": "#27272a",
            "editor.lineHighlightBackground": "#171717",
            "editorCursor.foreground": "#34d399",
            "editorIndentGuide.background1": "#262626",
            "editorIndentGuide.activeBackground1": "#404040",
            "editorWidget.background": "#171717",
            "editorWidget.border": "#333333",
            "scrollbarSlider.background": "#33333380",
        },
    });
}

export default function CodeEditor({
    language,
    value,
    onChange,
    onRun,
}: CodeEditorProps) {
    const handleMount = useCallback<OnMount>(
        (editor, monaco) => {
            // Ctrl/Cmd + Enter runs the code from anywhere in the editor.
            editor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                () => onRun?.(),
            );
        },
        [onRun],
    );

    return (
        <div className="h-full min-h-[320px] w-full">
            <Editor
                language={language}
                value={value}
                theme={CODERUSH_THEME}
                onChange={(v) => onChange(v ?? "")}
                beforeMount={defineTheme}
                onMount={handleMount}
                loading={
                    <span className="text-sm text-neutral-500">
                        Loading editor…
                    </span>
                }
                options={{
                    fontSize: 14,
                    fontFamily:
                        "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    fontLigatures: true,
                    lineNumbers: "on",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    insertSpaces: true,
                    autoIndent: "full",
                    formatOnPaste: true,
                    matchBrackets: "always",
                    autoClosingBrackets: "languageDefined",
                    autoClosingQuotes: "languageDefined",
                    renderWhitespace: "selection",
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    padding: { top: 12, bottom: 12 },
                    scrollbar: { verticalScrollbarSize: 10 },
                    fixedOverflowWidgets: true,
                }}
            />
        </div>
    );
}