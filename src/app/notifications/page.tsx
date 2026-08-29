"use client";

/**
 * CodeRush - Notifications Page (/notifications)
 *
 * Full notification centre for the currently authenticated user. All data
 * is fetched through Convex reactive queries that derive the user from
 * server-side auth - the client never specifies a userId.
 *
 * Features: All / Unread / Announcement filters, mark as read, mark all as
 * read, click-through to announcement details, load-more pagination,
 * loading skeletons, empty states and the premium CodeRush dark UI.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { Bell, Check, CheckCheck, ChevronLeft } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

type Notification = Doc<"notifications">;
type Filter = "all" | "unread" | "announcement";

const PAGE_SIZE = 20;

const TYPE_STYLE: Record<string, { icon: string; ring: string }> = {
    info: { icon: "📢", ring: "bg-blue-500/15 text-blue-300" },
    warning: { icon: "⚠️", ring: "bg-amber-500/15 text-amber-300" },
    maintenance: { icon: "🔧", ring: "bg-orange-500/15 text-orange-300" },
    update: { icon: "🚀", ring: "bg-emerald-500/15 text-emerald-300" },
    contest: { icon: "🏆", ring: "bg-purple-500/15 text-purple-300" },
};

function styleFor(n: Notification) {
    if (n.type === "achievement") {
        return { icon: "🏅", ring: "bg-yellow-500/15 text-yellow-300" };
    }
    if (n.type === "system") {
        return { icon: "⚙️", ring: "bg-slate-500/15 text-slate-300" };
    }
    return TYPE_STYLE[n.announcementType ?? "info"] ?? TYPE_STYLE.info;
}

function relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return "just now";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    return new Date(ts).toLocaleDateString();
}

function hrefFor(n: Notification): string {
    if (n.link) return n.link;
    if (n.announcementId) return `/announcements/${n.announcementId}`;
    return "/notifications";
}

const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "announcement", label: "Announcements" },
];

export default function NotificationsPage() {
    const router = useRouter();
    const [filter, setFilter] = useState<Filter>("all");
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const unreadCount = useQuery(api.notifications.getUnreadNotificationCount);

    const all = useQuery(api.notifications.getUserNotifications, {
        limit: 200,
    });
    const announcements = useQuery(api.notifications.getUserNotifications, {
        type: "announcement",
        limit: 200,
    });

    const markAsRead = useMutation(api.notifications.markNotificationAsRead);
    const markAllAsRead = useMutation(
        api.notifications.markAllNotificationsAsRead
    );

    const loading = all === undefined || announcements === undefined;
    const totalUnread = unreadCount ?? 0;

    const items = useMemo<Notification[]>(() => {
        if (loading) return [];
        const source = filter === "announcement" ? announcements! : all!;
        return filter === "unread" ? source.filter((n) => !n.read) : source;
    }, [loading, filter, all, announcements]);

    const visible = items.slice(0, visibleCount);

    async function openNotification(n: Notification) {
        if (!n.read) {
            try {
                await markAsRead({ id: n._id });
            } catch {
                // Non-fatal.
            }
        }
        router.push(hrefFor(n));
    }

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard"
                        aria-label="Back to dashboard"
                        className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#ffffff14] bg-[#ffffff06] text-[#a1a1aa] transition-colors hover:border-[#818cf8]/50 hover:text-white"
                    >
                        <ChevronLeft size={16} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Notifications
                        </h1>
                        <p className="mt-0.5 text-sm text-[#71717a]">
                            {loading
                                ? "Loading…"
                                : totalUnread === 0
                                    ? "You're all caught up"
                                    : `${totalUnread} unread notification${totalUnread === 1 ? "" : "s"}`}
                        </p>
                    </div>
                </div>

                {totalUnread > 0 && (
                    <button
                        type="button"
                        onClick={() => void markAllAsRead({})}
                        className="flex items-center gap-2 rounded-lg border border-[#ffffff14] bg-[#ffffff06] px-3.5 py-2 text-sm font-medium text-[#a1a1aa] transition-colors hover:border-[#818cf8]/50 hover:text-white"
                    >
                        <CheckCheck size={15} />
                        Mark all as read
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="mt-6 flex items-center gap-2">
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        type="button"
                        onClick={() => {
                            setFilter(f.key);
                            setVisibleCount(PAGE_SIZE);
                        }}
                        aria-pressed={filter === f.key}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                            filter === f.key
                                ? "bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)]"
                                : "border border-[#ffffff14] bg-[#ffffff06] text-[#a1a1aa] hover:text-white"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="mt-6 space-y-3">
                {loading ? (
                    [0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="flex items-start gap-4 rounded-2xl border border-[#ffffff0d] bg-[#ffffff04] p-5"
                        >
                            <div className="skeleton h-10 w-10 shrink-0 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <div className="skeleton h-4 w-1/2" />
                                <div className="skeleton h-3 w-3/4" />
                                <div className="skeleton h-2.5 w-1/4" />
                            </div>
                        </div>
                    ))
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#ffffff0d] bg-[#ffffff04] px-6 py-16 text-center">
                        <Bell size={36} className="text-[#52525b]" />
                        <p className="text-base font-semibold text-[#a1a1aa]">
                            No notifications here
                        </p>
                        <p className="max-w-sm text-sm text-[#71717a]">
                            {filter === "unread"
                                ? "You have read everything. New announcements will appear when they are published."
                                : "When admins publish announcements you will be notified automatically."}
                        </p>
                    </div>
                ) : (
                    visible.map((n, index) => {
                        const style = styleFor(n);
                        return (
                            <motion.div
                                key={n._id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                                role="button"
                                tabIndex={0}
                                onClick={() => void openNotification(n)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        void openNotification(n);
                                    }
                                }}
                                className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-5 transition-colors hover:border-[#818cf8]/40 hover:bg-[#ffffff0a] focus:outline-none focus-visible:border-[#818cf8] ${
                                    n.read
                                        ? "border-[#ffffff0d] bg-[#ffffff04]"
                                        : "border-[#6366f1]/30 bg-[#6366f1]/[0.06]"
                                }`}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${style.ring}`}
                                >
                                    {style.icon}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3
                                            className={`truncate text-[15px] font-semibold ${n.read ? "text-[#a1a1aa]" : "text-white"}`}
                                        >
                                            {n.title}
                                        </h3>
                                        {!n.read && (
                                            <span
                                                aria-label="Unread"
                                                className="h-2 w-2 shrink-0 rounded-full bg-[#818cf8]"
                                            />
                                        )}
                                    </div>

                                    <p className="mt-1 line-clamp-2 text-sm text-[#71717a]">
                                        {n.message}
                                    </p>

                                    <p className="mt-2 text-xs text-[#52525b]">
                                        {relativeTime(n.createdAt)}
                                    </p>
                                </div>

                                {!n.read && (
                                    <button
                                        type="button"
                                        aria-label="Mark as read"
                                        title="Mark as read"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void markAsRead({ id: n._id });
                                        }}
                                        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#ffffff14] text-[#71717a] transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
                                    >
                                        <Check size={14} />
                                    </button>
                                )}
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Load more */}
            {!loading && items.length > visibleCount && (
                <div className="mt-8 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                        className="rounded-xl bg-gradient-to-r from-[#6366f1]/20 to-[#8b5cf6]/20 px-6 py-2.5 text-sm font-semibold text-[#c7d2fe] transition-colors hover:from-[#6366f1]/30 hover:to-[#8b5cf6]/30 hover:text-white"
                    >
                        Load more
                    </button>
                </div>
            )}
        </div>
    );
}
