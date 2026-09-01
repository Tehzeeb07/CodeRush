"use client";

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

type SortOption =
    | "recently-added"
    | "oldest"
    | "alphabetical"
    | "recently-updated";

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

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function BookmarkIcon({
    filled = false,
    size = 20,
}: {
    filled?: boolean;
    size?: number;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5V21l-6-3.5L6 21V3.5Z" />
        </svg>
    );
}

function SearchIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
        </svg>
    );
}

function CodeIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
            <line x1="13" y1="3" x2="11" y2="21" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
            <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
    );
}

function ExternalIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M14 3h7v7" />
            <path d="M10 14 21 3" />
            <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
        </svg>
    );
}

function ChevronDownIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}

function SparkIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="m12 3-1.4 5.1L6 10l4.6 1.9L12 17l1.4-5.1L18 10l-4.6-1.9L12 3Z" />
            <path d="m19 15-.7 2.3L16 18l2.3.7L19 21l.7-2.3L22 18l-2.3-.7L19 15Z" />
        </svg>
    );
}

/* -------------------------------------------------------------------------- */
/* Logo                                                                       */
/* -------------------------------------------------------------------------- */

function CodeRushMark() {
    return (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.08)]">
            <CodeIcon />
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                */
/* -------------------------------------------------------------------------- */

function EmptyBookmarks({
    hasFilters,
    onClear,
    onGoToEditor,
}: {
    hasFilters: boolean;
    onClear: () => void;
    onGoToEditor: () => void;
}) {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0a0a] px-6 py-20 text-center shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-white/[0.035] blur-3xl" />
            </div>

            <div className="relative mx-auto flex max-w-md flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white">
                    <BookmarkIcon size={27} />
                </div>

                <h2 className="mt-6 text-xl font-semibold tracking-tight text-white">
                    {hasFilters
                        ? "No bookmarks found"
                        : "Your bookmark collection is empty"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                    {hasFilters
                        ? "Try changing your search or language filter to find what you're looking for."
                        : "Save useful snippets and problems while coding. They'll be available here whenever you need them."}
                </p>

                <div className="mt-7 flex flex-wrap justify-center gap-3">
                    {hasFilters && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-white/20 hover:bg-white/[0.08]"
                        >
                            Clear Filters
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onGoToEditor}
                        className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-neutral-200"
                    >
                        Open Code Editor
                    </button>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Bookmark card                                                              */
/* -------------------------------------------------------------------------- */

function BookmarkCard({
    bookmark,
    removingId,
    onOpen,
    onRemove,
}: {
    bookmark: BookmarkDoc;
    removingId: string | null;
    onOpen: (bookmark: BookmarkDoc) => void;
    onRemove: (id: string) => void;
}) {
    const isRemoving = removingId === bookmark._id;

    return (
        <article
            className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0b] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-[#0e0e0e] hover:shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${isRemoving ? "opacity-50" : ""
                }`}
        >
            {/* Top glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-neutral-300 transition-colors group-hover:border-white/[0.15] group-hover:text-white">
                            <BookmarkIcon filled size={20} />
                        </div>

                        <div className="min-w-0">
                            <button
                                type="button"
                                onClick={() => onOpen(bookmark)}
                                className="block max-w-full truncate text-left text-[15px] font-semibold text-white transition-colors hover:text-neutral-300"
                            >
                                {bookmark.title}
                            </button>

                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                                <span className="rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-0.5 text-neutral-400">
                                    {languageLabel(bookmark.language)}
                                </span>

                                <span className="text-neutral-700">•</span>

                                <span>
                                    Saved {formatDate(bookmark.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="hidden shrink-0 items-center gap-1 sm:flex">
                        <button
                            type="button"
                            onClick={() => onOpen(bookmark)}
                            className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 text-xs font-medium text-neutral-300 transition-all hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white"
                        >
                            <ExternalIcon />
                            Open
                        </button>

                        <button
                            type="button"
                            onClick={() => onRemove(bookmark._id)}
                            disabled={isRemoving}
                            aria-label={`Remove ${bookmark.title}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-neutral-500 transition-all hover:border-red-500/30 hover:bg-red-500/[0.07] hover:text-red-400 disabled:cursor-not-allowed"
                        >
                            <TrashIcon />
                        </button>
                    </div>
                </div>

                {bookmark.description && (
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-neutral-500">
                        {bookmark.description}
                    </p>
                )}

                {/* Code preview */}
                <div className="relative mt-5 overflow-hidden rounded-xl border border-white/[0.07] bg-[#070707]">
                    <div className="flex h-9 items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-3">
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-white/20" />
                            <span className="h-2 w-2 rounded-full bg-white/10" />
                            <span className="h-2 w-2 rounded-full bg-white/[0.06]" />
                        </div>

                        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">
                            {languageLabel(bookmark.language)}
                        </span>
                    </div>

                    <pre className="max-h-32 overflow-hidden p-4 font-mono text-xs leading-6 text-neutral-500">
                        {bookmark.code
                            .split("\n")
                            .slice(0, 6)
                            .join("\n")}
                    </pre>

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#070707] to-transparent" />
                </div>

                {/* Mobile actions */}
                <div className="mt-4 flex gap-2 sm:hidden">
                    <button
                        type="button"
                        onClick={() => onOpen(bookmark)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-neutral-200"
                    >
                        <ExternalIcon />
                        Open
                    </button>

                    <button
                        type="button"
                        onClick={() => onRemove(bookmark._id)}
                        disabled={isRemoving}
                        className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2.5 text-xs font-medium text-neutral-400 transition-all hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
                    >
                        <TrashIcon />
                        Remove
                    </button>
                </div>
            </div>
        </article>
    );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function BookmarksPage() {
    const router = useRouter();
    const { toasts, push } = useToasts();

    const user = useQuery(api.users.currentUser);

    const bookmarks = useQuery(
        api.bookmarks.listBookmarks,
        user ? {} : "skip"
    ) as BookmarkDoc[] | undefined;

    const [search, setSearch] = useState("");
    const [languageFilter, setLanguageFilter] = useState<string>("all");
    const [sortBy, setSortBy] =
        useState<SortOption>("recently-added");

    const [removingId, setRemovingId] = useState<string | null>(null);

    const removeBookmark = useMutation(
        api.bookmarks.removeBookmark
    );

    const availableLanguages = useMemo(() => {
        if (!bookmarks) return [];

        return Array.from(
            new Set(bookmarks.map((bookmark) => bookmark.language))
        ).sort((a, b) =>
            languageLabel(a).localeCompare(languageLabel(b))
        );
    }, [bookmarks]);

    const filtered = useMemo(() => {
        if (!bookmarks) return [];

        const needle = search.trim().toLowerCase();

        const result = bookmarks.filter((bookmark) => {
            if (
                languageFilter !== "all" &&
                bookmark.language !== languageFilter
            ) {
                return false;
            }

            if (!needle) return true;

            return (
                bookmark.title.toLowerCase().includes(needle) ||
                (bookmark.description ?? "")
                    .toLowerCase()
                    .includes(needle) ||
                languageLabel(bookmark.language)
                    .toLowerCase()
                    .includes(needle) ||
                bookmark.language.toLowerCase().includes(needle) ||
                bookmark.code.toLowerCase().includes(needle)
            );
        });

        return [...result].sort((a, b) => {
            switch (sortBy) {
                case "oldest":
                    return a.createdAt - b.createdAt;

                case "alphabetical":
                    return a.title.localeCompare(b.title);

                case "recently-updated":
                    return b.updatedAt - a.updatedAt;

                case "recently-added":
                default:
                    return b.createdAt - a.createdAt;
            }
        });
    }, [
        bookmarks,
        search,
        languageFilter,
        sortBy,
    ]);

    const handleRemove = async (id: string) => {
        setRemovingId(id);

        try {
            await removeBookmark({
                id: id as never,
            });

            push(
                "Bookmark removed successfully.",
                "success"
            );
        } catch {
            push(
                "Could not remove the bookmark. Please try again.",
                "error"
            );
        } finally {
            setRemovingId(null);
        }
    };

    const handleOpen = (bookmark: BookmarkDoc) => {
        router.push(
            `/code?snippet=${encodeURIComponent(bookmark._id)}`
        );
    };

    const clearFilters = () => {
        setSearch("");
        setLanguageFilter("all");
        setSortBy("recently-added");
    };

    const hasFilters =
        search.trim().length > 0 ||
        languageFilter !== "all";

    /* ---------------------------------------------------------------------- */
    /* Loading                                                                */
    /* ---------------------------------------------------------------------- */

    if (
        user === undefined ||
        (user !== null && bookmarks === undefined)
    ) {
        return (
            <Shell>
                <div className="space-y-8">
                    <div>
                        <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
                        <div className="mt-4 h-10 w-64 animate-pulse rounded-xl bg-white/[0.06]" />
                        <div className="mt-3 h-4 w-80 animate-pulse rounded bg-white/[0.04]" />
                    </div>

                    <div className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />

                    <SkeletonList count={4} />
                </div>
            </Shell>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Signed out                                                             */
    /* ---------------------------------------------------------------------- */

    if (user === null) {
        return (
            <Shell>
                <div className="flex min-h-[65vh] items-center justify-center">
                    <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0b0b] p-10 text-center shadow-[0_20px_80px_rgba(0,0,0,0.4)]">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                            <BookmarkIcon size={26} />
                        </div>

                        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
                            Sign in to your bookmarks
                        </h1>

                        <p className="mt-3 text-sm leading-6 text-neutral-500">
                            Your saved snippets and problems are private to
                            your CodeRush account.
                        </p>

                        <Link
                            href="/login"
                            className="mt-7 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-neutral-200"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </Shell>
        );
    }

    /* ---------------------------------------------------------------------- */
    /* Main                                                                    */
    /* ---------------------------------------------------------------------- */

    return (
        <Shell toastSlot={<ToastStack toasts={toasts} />}>
            <div className="space-y-8">
                {/* Header */}
                <header className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0a0a] px-6 py-8 sm:px-8 sm:py-10">
                    <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.025] blur-3xl" />

                    <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
                        <div>
                            <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-600">
                                <CodeRushMark />
                                <span>CodeRush</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                    My Bookmarks
                                </h1>

                                <div className="hidden h-7 items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 text-xs font-medium text-neutral-500 sm:flex">
                                    {bookmarks.length}
                                </div>
                            </div>

                            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500 sm:text-[15px]">
                                Keep your most useful code, solutions, and
                                problems within reach.
                            </p>
                        </div>

                        <Link
                            href="/code"
                            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-all hover:bg-neutral-200"
                        >
                            <CodeIcon />
                            Open Code Editor
                            <span className="transition-transform group-hover:translate-x-0.5">
                                →
                            </span>
                        </Link>
                    </div>
                </header>

                {/* Stats strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <StatCard
                        label="Saved"
                        value={bookmarks.length}
                        icon={<BookmarkIcon />}
                    />

                    <StatCard
                        label="Languages"
                        value={availableLanguages.length}
                        icon={<CodeIcon />}
                    />

                    <div className="col-span-2 sm:col-span-1">
                        <StatCard
                            label="Showing"
                            value={filtered.length}
                            icon={<SparkIcon />}
                        />
                    </div>
                </div>

                {/* Controls */}
                <section className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-3 sm:p-4">
                    <div className="flex flex-col gap-3 lg:flex-row">
                        {/* Search */}
                        <div className="relative flex-1">
                            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600">
                                <SearchIcon />
                            </div>

                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search bookmarks, descriptions, code..."
                                aria-label="Search bookmarks"
                                className="h-12 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-11 pr-4 text-sm text-white outline-none transition-all placeholder:text-neutral-600 focus:border-white/20 focus:bg-white/[0.04]"
                            />
                        </div>

                        {/* Sort */}
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(event) =>
                                    setSortBy(
                                        event.target.value as SortOption
                                    )
                                }
                                aria-label="Sort bookmarks"
                                className="h-12 w-full appearance-none rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 pr-10 text-sm text-neutral-300 outline-none transition-all hover:bg-white/[0.04] focus:border-white/20 sm:w-52"
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                        className="bg-neutral-950"
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>

                            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600">
                                <ChevronDownIcon />
                            </div>
                        </div>
                    </div>

                    {/* Language filters */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
                        <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-neutral-700">
                            Language
                        </span>

                        {["all", ...availableLanguages].map(
                            (language) => {
                                const active =
                                    languageFilter === language;

                                return (
                                    <button
                                        key={language}
                                        type="button"
                                        onClick={() =>
                                            setLanguageFilter(language)
                                        }
                                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${active
                                                ? "border-white/20 bg-white text-black"
                                                : "border-white/[0.07] bg-white/[0.02] text-neutral-500 hover:border-white/[0.14] hover:text-neutral-200"
                                            }`}
                                    >
                                        {language === "all"
                                            ? "All"
                                            : languageLabel(language)}
                                    </button>
                                );
                            }
                        )}

                        {hasFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="ml-auto text-xs font-medium text-neutral-600 transition-colors hover:text-white"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </section>

                {/* Content */}
                <UiErrorBoundary>
                    {bookmarks.length === 0 ? (
                        <EmptyBookmarks
                            hasFilters={false}
                            onClear={clearFilters}
                            onGoToEditor={() =>
                                router.push("/code")
                            }
                        />
                    ) : filtered.length === 0 ? (
                        <EmptyBookmarks
                            hasFilters
                            onClear={clearFilters}
                            onGoToEditor={() =>
                                router.push("/code")
                            }
                        />
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-700">
                                    Saved Code
                                </p>

                                <p className="text-xs text-neutral-600">
                                    {filtered.length}{" "}
                                    {filtered.length === 1
                                        ? "bookmark"
                                        : "bookmarks"}
                                </p>
                            </div>

                            <div className="grid gap-3">
                                {filtered.map((bookmark) => (
                                    <BookmarkCard
                                        key={bookmark._id}
                                        bookmark={bookmark}
                                        removingId={removingId}
                                        onOpen={handleOpen}
                                        onRemove={(id) =>
                                            void handleRemove(id)
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </UiErrorBoundary>

                {/* Bottom hint */}
                {bookmarks.length > 0 && (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-neutral-700">
                        <BookmarkIcon size={14} />
                        <span>
                            Your bookmarks are private to your account
                        </span>
                    </div>
                )}
            </div>
        </Shell>
    );
}

/* -------------------------------------------------------------------------- */
/* Stat card                                                                  */
/* -------------------------------------------------------------------------- */

function StatCard({
    label,
    value,
    icon,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
}) {
    return (
        <div className="group rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-4 transition-all hover:border-white/[0.13]">
            <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-neutral-500 transition-colors group-hover:text-white">
                    {icon}
                </div>

                <span className="text-2xl font-bold tracking-tight text-white">
                    {value}
                </span>
            </div>

            <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-neutral-700">
                {label}
            </p>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */

function Shell({
    children,
    toastSlot,
}: {
    children: React.ReactNode;
    toastSlot?: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Ambient background */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute left-1/2 top-[-300px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-white/[0.018] blur-[120px]" />

                <div
                    className="absolute inset-0 opacity-[0.025]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
                        backgroundSize: "64px 64px",
                    }}
                />
            </div>

            <main className="relative mx-auto w-full max-w-6xl px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:py-10">
                {children}
            </main>

            {toastSlot}
        </div>
    );
}