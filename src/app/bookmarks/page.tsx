"use client";

/**
 * /bookmarks — the signed-in user's private saved snippets.
 *
 * Search (title / description / language), language filters and sorting
 * run client-side over the user's own bookmark list, which is always
 * fetched through a userId-filtered Convex index query. Deletion and
 * opening are wired to secure per-user mutations/queries.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { LANGUAGE_LIST } from "@/lib/code-execution/languages";
import { ToastStack, useToasts } from "@/components/ui/Toast";
import {
    SkeletonList,
    UiErrorBoundary,
} from "@/components/ui/states";

type SortOption = "recently-added" | "oldest" | "alphabetical" | "recently-updated";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "recently-added", label: "Recently Added" },
    { value: "oldest", label: "Oldest" },
    { value: "alphabetical", label: "Alphabetical" },
    { value: "recently-updated", label: "Recently Updated" },
];

interface BookmarkDoc {
    _id: string;
    title: string;
    description?: string;
    code: string;
    language: string;
    problemId?: string;
    createdAt: number;
    updatedAt: number;
}

function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function languageLabel(id: string): string {
    return LANGUAGE_LIST.find((l) => l.id === id)?.label ?? id;
}

export default function BookmarksPage() {
    const router = useRouter();
    const { toasts, push } = useToasts();

    const user = useQuery(api.users.currentUser);
    // undefined while loading; null when signed out.
    const bookmarks = useQuery(api.bookmarks.listBookmarks, user ? {} : "skip") as
        | BookmarkDoc[]
        | undefined;

    const [search, setSearch] = useState("");
    const [languageFilter, setLanguageFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<SortOption>("recently-added");

    const removeBookmark = useMutation(api.bookmarks.removeBookmark);
    const [removingId, setRemovingId] = useState<string | null>(null);

    // Languages present in the user's bookmarks (grows automatically).
    const availableLanguages = useMemo(() => {
        if (!bookmarks) return [];
        return Array.from(new Set(bookmarks.map((b) => b.language)));
    }, [bookmarks]);

    const filtered = useMemo(() => {
        if (!bookmarks) return [];
        const needle = search.trim().toLowerCase();
        const result = bookmarks.filter((b) => {
            if (languageFilter !== "all" && b.language !== languageFilter) {
                return false;
            }
            if (needle.length === 0) return true;
            return (
                b.title.toLowerCase().includes(needle) ||
                (b.description ?? "").toLowerCase().includes(needle) ||
                languageLabel(b.language).toLowerCase().includes(needle) ||
                b.language.toLowerCase().includes(needle)
            );
        });

        return result.sort((a, b) => {
            switch (sortBy) {
                case "oldest":
                    return a.createdAt - b.createdAt;
                case "alphabetical":
                    return a.title.localeCompare(b.title);
                case "recently-updated":
                    return b.updatedAt - a.updatedAt;
                default:
                    return b.createdAt - a.createdAt;
            }
        });
    }, [bookmarks, search, languageFilter, sortBy]);

    const handleRemove = async (id: string) => {
        setRemovingId(id);
        try {
            await removeBookmark({ id: id as never });
            push("Bookmark removed successfully.", "success");
        } catch {
            push("Could not remove the bookmark. Please try again.", "error");
        } finally {
            setRemovingId(null);
        }
    };

    const handleOpen = (bookmark: BookmarkDoc) => {
        router.push(`/code?snippet=${encodeURIComponent(bookmark._id)}`);
    };

    // --- Render -----------------------------------------------------------

    if (user === undefined || (user !== null && bookmarks === undefined)) {
        return (
            <Shell>
                <div className="h-8 w-40 animate-pulse rounded bg-neutral-800" />
                <SkeletonList count={4} />
            </Shell>
        );
    }

    if (user === null) {
        return (
            <Shell>
                <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-10 text-center">
                    <p className="text-white">Please sign in to see your bookmarks.</p>
                    <Link
                        href="/login"
                        className="mt-4 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                    >
                        Sign in
                    </Link>
                </div>
            </Shell>
        );
    }

    return (
        <Shell toastSlot={<ToastStack toasts={toasts} />}>
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">My Bookmarks</h1>
                    <p className="mt-1 text-sm text-neutral-400">
                        Your private collection of saved code.
                    </p>
                </div>
                <Link
                    href="/code"
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                    Go to Code Editor
                </Link>
            </div>

            {/* Search + sort */}
            <div className="flex flex-col gap-3 sm:flex-row">
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search bookmarks..."
                    aria-label="Search bookmarks"
                    className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-emerald-600 focus:outline-none"
                />
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Sort bookmarks"
                    className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-emerald-600 focus:outline-none"
                >
                    {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Language filters (derived from saved bookmarks — extensible) */}
            <div className="flex flex-wrap gap-2">
                {["all", ...availableLanguages].map((lang) => (
                    <button
                        key={lang}
                        type="button"
                        onClick={() => setLanguageFilter(lang)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            languageFilter === lang
                                ? "border-emerald-600 bg-emerald-950 text-emerald-300"
                                : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"
                        }`}
                    >
                        {lang === "all" ? "All" : languageLabel(lang)}
                    </button>
                ))}
            </div>

            <UiErrorBoundary>
                {/* Empty states */}
                {bookmarks !== undefined && bookmarks.length === 0 ? (
                    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-10 text-center">
                        <p className="font-medium text-white">No bookmarks yet.</p>
                        <p className="mt-2 text-sm text-neutral-400">
                            Save your favorite code or problems to access them later.
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push("/code")}
                            className="mt-4 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                        >
                            Go to Code Editor
                        </button>
                    </div>
                ) : bookmarks !== undefined && filtered.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/60 p-10 text-center">
                        <p className="text-sm text-neutral-400">
                            No bookmarks match your search or filters.
                        </p>
                    </div>
                ) : (
                    /* Bookmark cards */
                    <ul className="space-y-3">
                        {(filtered ?? []).map((bookmark) => (
                            <li
                                key={bookmark._id}
                                className={`flex items-start justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4 transition-opacity ${
                                    removingId === bookmark._id ? "opacity-50" : ""
                                }`}
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-white">
                                        {bookmark.title}
                                    </p>
                                    <p className="mt-0.5 text-xs text-neutral-500">
                                        {languageLabel(bookmark.language)} · Bookmarked:{" "}
                                        {formatDate(bookmark.createdAt)}
                                    </p>
                                    {bookmark.description && (
                                        <p className="mt-1 line-clamp-2 text-sm text-neutral-400">
                                            {bookmark.description}
                                        </p>
                                    )}
                                    <pre className="mt-2 max-h-16 overflow-hidden whitespace-pre-wrap rounded bg-neutral-950 p-2 font-mono text-xs text-neutral-500">
                                        {bookmark.code.split("\n").slice(0, 3).join("\n")}
                                    </pre>
                                </div>
                                <div className="flex shrink-0 flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleOpen(bookmark)}
                                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
                                    >
                                        Open
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleRemove(bookmark._id)}
                                        disabled={removingId === bookmark._id}
                                        className="rounded-md border border-red-800 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:border-red-500 disabled:opacity-50"
                                    >
                                        {removingId === bookmark._id ? "Removing…" : "Remove"}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </UiErrorBoundary>
        </Shell>
    );
}

function Shell({
    children,
    toastSlot,
}: {
    children: React.ReactNode;
    toastSlot?: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            <header className="border-b border-neutral-800 px-4 py-3">
                <div className="mx-auto flex max-w-4xl items-center justify-between">
                    <Link href="/dashboard" className="text-lg font-bold tracking-tight">
                        Code<span className="text-emerald-400">Rush</span>
                    </Link>
                    <nav className="flex items-center gap-3 text-sm">
                        <Link href="/code" className="rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white">
                            Editor
                        </Link>
                        <Link href="/leaderboard" className="rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white">
                            Leaderboard
                        </Link>
                        <Link href="/dashboard" className="rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white">
                            Dashboard
                        </Link>
                    </nav>
                </div>
            </header>
            <main className="mx-auto w-full max-w-4xl space-y-6 p-4 pb-16">
                {children}
            </main>
            {toastSlot}
        </div>
    );
}

