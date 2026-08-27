/**
 * Draft persistence for the problem workspace (requirements §25–27).
 *
 * Drafts live in localStorage keyed by problem + language so a user can
 * leave, come back, or switch languages without losing work. Auto-save is
 * debounced by the caller (never per keystroke); restores are always
 * explicit — the UI asks before overwriting anything.
 */

export interface DraftRecord {
    code: string;
    language: string;
    problemSlug: string;
    savedAt: number;
}

const PREFIX = "coderush:draft";

function key(problemSlug: string, language: string): string {
    return `${PREFIX}:${problemSlug}:${language}`;
}

function storageAvailable(): boolean {
    try {
        return typeof window !== "undefined" && !!window.localStorage;
    } catch {
        return false;
    }
}

export function loadDraft(
    problemSlug: string,
    language: string,
): DraftRecord | null {
    if (!storageAvailable()) return null;
    try {
        const raw = window.localStorage.getItem(key(problemSlug, language));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<DraftRecord>;
        if (
            typeof parsed.code !== "string" ||
            typeof parsed.savedAt !== "number" ||
            parsed.language !== language
        ) {
            return null;
        }
        return {
            code: parsed.code,
            language: parsed.language,
            problemSlug: parsed.problemSlug ?? problemSlug,
            savedAt: parsed.savedAt,
        };
    } catch {
        return null;
    }
}

/** Persist silently; returns the saved timestamp (or null on failure). */
export function saveDraft(draft: Omit<DraftRecord, "savedAt">): number | null {
    if (!storageAvailable()) return null;
    const savedAt = Date.now();
    try {
        window.localStorage.setItem(
            key(draft.problemSlug, draft.language),
            JSON.stringify({ ...draft, savedAt }),
        );
        return savedAt;
    } catch {
        return null;
    }
}

export function clearDraft(problemSlug: string, language: string): void {
    if (!storageAvailable()) return;
    try {
        window.localStorage.removeItem(key(problemSlug, language));
    } catch {
        /* ignore */
    }
}

/** Simple time-ago formatter used in the "✓ Draft saved" indicator. */
export function timeAgo(timestamp: number, now = Date.now()): string {
    const s = Math.max(1, Math.round((now - timestamp) / 1000));
    if (s < 60) return `${s} second${s === 1 ? "" : "s"} ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
    const d = Math.round(h / 24);
    return `${d} day${d === 1 ? "" : "s"} ago`;
}
