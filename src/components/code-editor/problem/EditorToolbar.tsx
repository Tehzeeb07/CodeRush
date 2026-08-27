"use client";

/**
 * Workspace top bar (requirement §1/§9/§10):
 * language selector · Save-Draft state · Format · Settings · Fullscreen.
 * Every action exposes its keyboard shortcut through the title tooltip.
 */

import { useState } from "react";
import LanguageSelector from "@/components/code-editor/LanguageSelector";
import type { LanguageId } from "@/lib/code-execution/types";
import type { EditorSettings } from "@/lib/editor/settings";
import SettingsMenu from "./SettingsMenu";

export interface EditorToolbarProps {
    language: LanguageId;
    onLanguageChange: (l: LanguageId) => void;
    running: boolean;

    /** Draft indicator: idle | dirty | saving | saved */
    draftState: "idle" | "dirty" | "saving" | "saved";
    savedAtLabel: string | null;
    onSaveDraft: () => void;
    onFormat: () => void;

    fullscreen: boolean;
    onToggleFullscreen: () => void;

    settings: EditorSettings;
    updateSettings: (patch: Partial<EditorSettings>) => void;
    resetSettings: () => void;
}

const DRAFT_LABELS: Record<EditorToolbarProps["draftState"], string> = {
    idle: "",
    dirty: "",
    saving: "Auto-saving…",
    saved: "✓ Saved",
};

export default function EditorToolbar({
    language,
    onLanguageChange,
    running,
    draftState,
    savedAtLabel,
    onSaveDraft,
    onFormat,
    fullscreen,
    onToggleFullscreen,
    settings,
    updateSettings,
    resetSettings,
}: EditorToolbarProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 bg-[var(--bg-secondary,#0d0f12)] px-3 py-2">
            <span className="hidden font-mono text-sm font-bold tracking-tight text-indigo-400 sm:inline">
                CodeRush
            </span>

            <LanguageSelector value={language} onChange={onLanguageChange} disabled={running} />

            <div className="ml-auto flex items-center gap-2">
                {/* Draft indicator */}
                <button
                    type="button"
                    onClick={onSaveDraft}
                    title="Save Draft (Ctrl+S)"
                    aria-live="polite"
                    className={`rounded-md px-2 py-1 text-xs transition-colors ${
                        draftState === "saved"
                            ? "text-emerald-400"
                            : draftState === "saving"
                              ? "text-amber-300"
                              : draftState === "dirty"
                                ? "text-neutral-300 hover:text-white"
                                : "text-neutral-500 hover:text-neutral-300"
                    }`}
                >
                    <span role="status">
                        {DRAFT_LABELS[draftState] || ""}
                        {draftState === "saved" && savedAtLabel
                            ? ` ${savedAtLabel}`
                            : ""}
                    </span>
                    {DRAFT_LABELS[draftState] === "" && (
                        <>💾 Save</>
                    )}
                </button>

                <button
                    type="button"
                    onClick={onFormat}
                    disabled={running}
                    title="Format Code (Shift+Alt+F)"
                    className="hidden rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white disabled:opacity-50 sm:block"
                >
                    ✨ Format
                </button>

                <SettingsWrapper
                    settings={settings}
                    updateSettings={updateSettings}
                    resetSettings={resetSettings}
                />

                <button
                    type="button"
                    onClick={onToggleFullscreen}
                    title={
                        fullscreen
                            ? "Exit Fullscreen (Esc)"
                            : "Enter Fullscreen (F11)"
                    }
                    aria-label={
                        fullscreen ? "Exit fullscreen" : "Enter fullscreen"
                    }
                    className="rounded-md border border-neutral-700 px-2.5 py-1.5 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
                >
                    {fullscreen ? "🗗 Exit Fullscreen" : "⛶ Fullscreen"}
                </button>
            </div>
        </div>
    );
}

/** Settings gear + popover (kept local to the toolbar). */
function SettingsWrapper({
    settings,
    updateSettings,
    resetSettings,
}: {
    settings: EditorSettings;
    updateSettings: (patch: Partial<EditorSettings>) => void;
    resetSettings: () => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="dialog"
                title="Editor Settings"
                aria-label="Editor settings"
                className="rounded-md border border-neutral-700 px-2.5 py-1.5 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
            >
                ⚙
            </button>
            <SettingsMenu
                open={open}
                onClose={() => setOpen(false)}
                settings={settings}
                update={updateSettings}
                reset={resetSettings}
            />
        </div>
    );
}
