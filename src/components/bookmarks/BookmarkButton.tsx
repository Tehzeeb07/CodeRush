"use client";

/**
 * Bookmark toggle button for the CodeRush editor header.
 *
 *  - Filled bookmark  → snippet already saved (click removes it).
 *  - Outline bookmark → not saved yet (click saves a snapshot).
 *
 * The current bookmark state is checked once per language switch via a
 * one-shot Convex query (not a live subscription) so typing in the
 * editor does not spam the backend. Duplicate protection is enforced
 * again server-side inside `bookmarks.createBookmark`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface BookmarkButtonProps {
    /** Current editor language id (e.g. "javascript", "cpp"). */
    language: string;
    /** Current editor code snapshot. */
    code: string;
    disabled?: boolean;
}

/** Derive a human-friendly default title from the code's first line. */
function deriveTitle(code: string, language: string): string {
    const label =
        language.charAt(0).toUpperCase() + language.slice(1);
    const firstLine = code
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line.length > 0 && !line.startsWith("//") && !line.startsWith("#"));

    const base =
        firstLine && firstLine.length > 3
            ? firstLine.slice(0, 60)
            : `Untitled ${label} snippet`;

    return `${base} · ${label}`;
}

export default function BookmarkButton({
    language,
    code,
    disabled = false,
}: BookmarkButtonProps) {
    const convex = useConvex();
    const [bookmarkId, setBookmarkId] = useState<Id<"bookmarks"> | null>(null);
    const [busy, setBusy] = useState(false);

    // Latest values reachable from async callbacks.
    const codeRef = useRef(code);
    const langRef = useRef(language);

    useEffect(() => {
        codeRef.current = code;
    }, [code]);

    useEffect(() => {
        langRef.current = language;
    }, [language]);

    // Re-check saved state when the language changes (and on mount).
    useEffect(() => {
        let cancelled = false;
        convex
            .query(api.bookmarks.findMineByCode, {
                language,
                code: codeRef.current,
            })
            .then((result) => {
                if (!cancelled) setBookmarkId(result ? result.id : null);
            })
            .catch(() => {
                /* offline / auth hiccup — leave previous state */
            });
        return () => {
            cancelled = true;
        };
    }, [convex, language]);

    const handleToggle = useCallback(async () => {
        if (busy || disabled) return;
        setBusy(true);
        try {
            if (bookmarkId) {
                await convex.mutation(api.bookmarks.removeBookmark, {
                    id: bookmarkId,
                });
                setBookmarkId(null);
                window.dispatchEvent(
                    new CustomEvent("coderush:toast", {
                        detail: { message: "Removed from bookmarks", kind: "info" },
                    }),
                );
            } else {
                const result = await convex.mutation(api.bookmarks.createBookmark, {
                    title: deriveTitle(codeRef.current, langRef.current),
                    code: codeRef.current,
                    language: langRef.current,
                });
                setBookmarkId(result.id);
                window.dispatchEvent(
                    new CustomEvent("coderush:toast", {
                        detail: {
                            message: result.created
                                ? "Bookmarked"
                                : "Already in your bookmarks",
                            kind: "success",
                        },
                    }),
                );
            }
        } catch {
            window.dispatchEvent(
                new CustomEvent("coderush:toast", {
                    detail: {
                        message: "Could not update the bookmark. Please try again.",
                        kind: "error",
                    },
                }),
            );
        } finally {
            setBusy(false);
        }
    }, [bookmarkId, busy, disabled, convex]);

    const saved = bookmarkId !== null;

    return (
        <button
            type="button"
            onClick={() => void handleToggle()}
            disabled={disabled || busy || code.trim().length === 0}
            title={saved ? "Remove bookmark" : "Bookmark this code"}
            aria-pressed={saved}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                saved
                    ? "border-emerald-600 bg-emerald-950 text-emerald-300 hover:border-emerald-500"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white"
            }`}
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={saved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {saved ? "Bookmarked" : "Bookmark"}
        </button>
    );
}
