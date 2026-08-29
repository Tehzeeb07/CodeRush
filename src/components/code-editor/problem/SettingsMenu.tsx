"use client";

/**
 * Editor settings popover (requirement §7).
 * Preferences persist immediately through useEditorSettings.
 */

import { useEffect, useRef } from "react";
import type { EditorSettings, EditorTheme } from "@/lib/editor/settings";

export interface SettingsMenuProps {
    open: boolean;
    onClose: () => void;
    settings: EditorSettings;
    update: (patch: Partial<EditorSettings>) => void;
    reset: () => void;
}

function ToggleRow({
    label,
    hint,
    value,
    onChange,
}: {
    label: string;
    hint: string;
    value: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-6 py-2">
            <span className="text-sm text-neutral-200" title={hint}>
                {label}
            </span>
            <button
                type="button"
                role="switch"
                aria-checked={value}
                aria-label={`${label} — ${value ? "on" : "off"}`}
                onClick={() => onChange(!value)}
                className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
                    value
                        ? "border-indigo-400/60 bg-indigo-500/80"
                        : "border-neutral-600 bg-neutral-700"
                }`}
            >
                <span
                    className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all ${
                        value ? "left-[18px]" : "left-0.5"
                    }`}
                />
            </button>
        </label>
    );
}

const FONT_SIZES = [12, 14, 16, 18, 20] as const;
const TAB_SIZES = [2, 4, 8] as const;

export default function SettingsMenu({
    open,
    onClose,
    settings,
    update,
    reset,
}: SettingsMenuProps) {
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click / Escape.
    useEffect(() => {
        if (!open) return;
        function onPointerDown(e: PointerEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            ref={ref}
            role="dialog"
            aria-label="Editor settings"
            className="animate-[crScaleIn_160ms_ease] absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-neutral-800 bg-neutral-950/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur"
        >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Appearance
            </p>

            <div className="mb-2 flex items-center justify-between gap-6 py-2">
                <span className="text-sm text-neutral-200">Theme</span>
                <div
                    className="flex rounded-lg border border-neutral-700 p-0.5"
                    role="group"
                    aria-label="Color theme"
                >
                    {(["dark", "light"] as EditorTheme[]).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => update({ theme: t })}
                            aria-pressed={settings.theme === t}
                            className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                                settings.theme === t
                                    ? "bg-indigo-500 text-white"
                                    : "text-neutral-400 hover:text-neutral-200"
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <ToggleRow label="Word wrap" hint="Wrap long lines instead of horizontal scrolling" value={settings.wordWrap} onChange={(v) => update({ wordWrap: v })} />
            <ToggleRow label="Minimap" hint="Show the code overview minimap" value={settings.minimap} onChange={(v) => update({ minimap: v })} />
            <ToggleRow label="Line numbers" hint="Show line numbers in the gutter" value={settings.lineNumbers} onChange={(v) => update({ lineNumbers: v })} />
            <ToggleRow label="Bracket colors" hint="Colorize matching bracket pairs" value={settings.bracketPairColorization} onChange={(v) => update({ bracketPairColorization: v })} />
            <ToggleRow label="Auto-closing brackets" hint="Insert the closing bracket automatically" value={settings.autoClosingBrackets} onChange={(v) => update({ autoClosingBrackets: v })} />

            <hr className="my-3 border-neutral-800" />
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Editing
            </p>

            <div className="flex items-center justify-between gap-6 py-2">
                <span className="text-sm text-neutral-200">Font size</span>
                <select
                    aria-label="Font size"
                    title="Font size"
                    value={settings.fontSize}
                    onChange={(e) => update({ fontSize: Number(e.target.value) })}
                    className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
                >
                    {FONT_SIZES.map((s) => (
                        <option key={s} value={s}>{s}px</option>
                    ))}
                </select>
            </div>

            <div className="flex items-center justify-between gap-6 py-2">
                <span className="text-sm text-neutral-200">Tab size</span>
                <select
                    aria-label="Tab size"
                    title="Tab size"
                    value={settings.tabSize}
                    onChange={(e) => update({ tabSize: Number(e.target.value) })}
                    className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100"
                >
                    {TAB_SIZES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>

            <button
                type="button"
                onClick={reset}
                className="mt-3 w-full rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
            >
                Reset to defaults
            </button>
        </div>
        );
}

