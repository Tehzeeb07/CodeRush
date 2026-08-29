/**
 * Editor settings (requirement §7–8).
 *
 * User preferences are persisted in localStorage per browser. Defaults
 * target the CodeRush dark developer theme; a clean light theme is
 * available too (scoped to the editor workspace so the rest of the app
 * keeps its design system).
 */

"use client";

import { useCallback, useState } from "react";

export type EditorTheme = "dark" | "light";

export interface EditorSettings {
    /** Application-wide UI + Monaco theme. */
    theme: EditorTheme;
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    lineNumbers: boolean;
    bracketPairColorization: boolean;
    autoClosingBrackets: boolean;
}

export const EDITOR_SETTINGS_KEY = "coderush:editor-settings:v1";

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
    theme: "dark",
    fontSize: 14,
    tabSize: 4,
    wordWrap: false,
    minimap: false,
    lineNumbers: true,
    bracketPairColorization: true,
    autoClosingBrackets: true,
};

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

/** Merge persisted settings over defaults defensively. */
export function hydrateEditorSettings(raw: unknown): EditorSettings {
    if (!isRecord(raw)) return { ...DEFAULT_EDITOR_SETTINGS };
    return {
        theme: raw.theme === "light" ? "light" : "dark",
        fontSize:
            typeof raw.fontSize === "number" &&
            [12, 14, 16, 18, 20].includes(raw.fontSize)
                ? raw.fontSize
                : DEFAULT_EDITOR_SETTINGS.fontSize,
        tabSize:
            typeof raw.tabSize === "number" && [2, 4, 8].includes(raw.tabSize)
                ? raw.tabSize
                : DEFAULT_EDITOR_SETTINGS.tabSize,
        wordWrap: typeof raw.wordWrap === "boolean" ? raw.wordWrap : false,
        minimap: typeof raw.minimap === "boolean" ? raw.minimap : false,
        lineNumbers:
            typeof raw.lineNumbers === "boolean"
                ? raw.lineNumbers
                : true,
        bracketPairColorization:
            typeof raw.bracketPairColorization === "boolean"
                ? raw.bracketPairColorization
                : true,
        autoClosingBrackets:
            typeof raw.autoClosingBrackets === "boolean"
                ? raw.autoClosingBrackets
                : true,
    };
}

interface StoredSettings {
    settings: EditorSettings | null;
    loaded: boolean;
}

let cache: StoredSettings = {
    settings: null,
    loaded: false,
};

/** Read settings once per session (SSR-safe). */
function readSettings(): EditorSettings {
    if (cache.loaded) return cache.settings ?? { ...DEFAULT_EDITOR_SETTINGS };
    try {
        const raw = window.localStorage.getItem(EDITOR_SETTINGS_KEY);
        cache = {
            settings: raw
                ? hydrateEditorSettings(JSON.parse(raw))
                : { ...DEFAULT_EDITOR_SETTINGS },
            loaded: true,
        };
    } catch {
        cache = { settings: { ...DEFAULT_EDITOR_SETTINGS }, loaded: true };
    }
    return cache.settings!;
}

/**
 * Settings with localStorage persistence. The hook lazily initializes on
 * the first client render so SSR markup stays deterministic.
 */
export function useEditorSettings(): {
    settings: EditorSettings;
    update: (patch: Partial<EditorSettings>) => void;
    reset: () => void;
} {
    const [settings, setSettings] = useState<EditorSettings>(() => {
        if (typeof window === "undefined") {
            return { ...DEFAULT_EDITOR_SETTINGS };
        }
        return readSettings();
    });

    const persist = useCallback((next: EditorSettings) => {
        cache = { settings: next, loaded: true };
        try {
            window.localStorage.setItem(
                EDITOR_SETTINGS_KEY,
                JSON.stringify(next),
            );
        } catch {
            /* storage full/private — preferences simply stay in-memory */
        }
    }, []);

    const update = useCallback(
        (patch: Partial<EditorSettings>) => {
            setSettings((prev) => {
                const next = { ...prev, ...patch };
                persist(next);
                return next;
            });
        },
        [persist],
    );

    const reset = useCallback(() => {
        setSettings({ ...DEFAULT_EDITOR_SETTINGS });
        persist({ ...DEFAULT_EDITOR_SETTINGS });
    }, [persist]);

    return { settings, update, reset };
}
