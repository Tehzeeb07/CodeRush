"use client";

/**
 * CodeRush - Notification Bell (user navbar)
 *
 * Premium glassmorphism notification dropdown rendered inside the global
 * SiteNavbar, next to the user menu. Data comes exclusively from Convex
 * reactive queries, so new announcements appear / the badge updates
 * automatically without any page refresh.
 *
 * Accessibility: aria-expanded on the trigger, Escape to close,
 * click-outside handling, fully keyboard-navigable (all items are buttons).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

type Notification = Doc<"notifications">;

/** Per-announcement-type icon + accent colors (matches admin palette). */
const ANNOUNCEMENT_TYPE_STYLE: Record<
    string,
    { icon: string; ring: string }
> = {
    info: { icon: "📢", ring: "bg-blue-500/15 text-blue-300" },
    warning: { icon: "⚠️", ring: "bg-amber-500/15 text-amber-300" },
    maintenance: { icon: "🔧", ring: "bg-orange-500/15 text-orange-300" },
    update: { icon: "🚀", ring: "bg-emerald-500/15 text-emerald-300" },
    contest: { icon: "🏆", ring: "bg-purple-500/15 text-purple-300" },
};

function typeStyle(n: Notification) {
    if (n.type === "achievement") {
        return { icon: "🏅", ring: "bg-yellow-500/15 text-yellow-300" };
    }
    if (n.type === "system") {
        return { icon: "⚙️", ring: "bg-slate-500/15 text-slate-300" };
    }
    return ANNOUNCEMENT_TYPE_STYLE[n.announcementType ?? "info"] ??
        ANNOUNCEMENT_TYPE_STYLE.info;
}

/** Relative timestamp, e.g. "2 minutes ago". */
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

function notificationHref(n: Notification): string {
    if (n.link) return n.link;
    if (n.announcementId) return `/announcements/${n.announcementId}`;
    return "/notifications";
}

export default function NotificationBell() {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const bellButtonRef = useRef<HTMLButtonElement>(null);

    // Reactive queries - the badge and the list update automatically
    // the moment an admin publishes an announcement.
    const unreadCount = useQuery(api.notifications.getUnreadNotificationCount);
    const notifications = useQuery(api.notifications.getUserNotifications, {
        limit: 10,
    });

    const markAsRead = useMutation(api.notifications.markNotificationAsRead);
    const markAllAsRead = useMutation(
        api.notifications.markAllNotificationsAsRead
    );

    // Click-outside + Escape-key closing.
    useEffect(() => {
        function onPointerDown(event: PointerEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
                bellButtonRef.current?.focus();
            }
        }

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    async function handleNotificationClick(n: Notification) {
        if (!n.read) {
            try {
                await markAsRead({ id: n._id });
            } catch {
                // Non-fatal - still navigate to the details page.
            }
        }
        setOpen(false);
        router.push(notificationHref(n));
    }

    async function handleMarkAllRead() {
        try {
            await markAllAsRead({});
        } catch {
            // Ignore - reactive query will re-render actual state.
        }
    }

    const count = unreadCount ?? 0;
    const isLoading = notifications === undefined;
    const items = notifications ?? [];
    const unreadInView = items.filter((n) => !n.read).length;

    return (
        <div className="relative" ref={containerRef}>
            {/* Bell trigger */}
            <button
                ref={bellButtonRef}
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={
                    count > 0
                        ? `Notifications, ${count} unread`
                        : "Notifications"
                }
                className="icon-btn relative"
            >
                <Bell size={16} />

                <AnimatePresence>
                    {count > 0 && (
                        <motion.span
                            key={count}
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.4, opacity: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 22,
                            }}
                            className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] px-[3px] text-[9px] font-bold leading-none text-white shadow-[0_0_10px_rgba(99,102,241,0.7)]"
                        >
                            {count > 99 ? "99+" : count}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        role="menu"
                        aria-label="Notifications"
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        style={{
                            background: "rgba(9, 9, 11, 0.92)",
                            backdropFilter: "blur(18px)",
                            WebkitBackdropFilter: "blur(18px)",
                        }}
                        className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-[#ffffff14] shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#ffffff0d] px-4 py-3">
                            <div>
                                <h3 className="text-sm font-semibold text-white">
                                    Notifications
                                </h3>
                                <p className="mt-0.5 text-xs text-[#71717a]">
                                    {count === 0
                                        ? "You're all caught up"
                                        : `${count} unread notification${count === 1 ? "" : "s"}`}
                                </p>
                            </div>

                            {unreadInView > 0 && (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={handleMarkAllRead}
                                    className="flex items-center gap-1.5 rounded-lg border border-[#ffffff14] bg-[#ffffff06] px-2.5 py-1.5 text-xs font-medium text-[#a1a1aa] transition-colors hover:border-[#818cf8]/50 hover:text-white"
                                >
                                    <CheckCheck size={13} />
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[320px] overflow-y-auto">
                            {isLoading ? (
                                <div className="space-y-2 p-3">
                                    {[0, 1, 2].map((i) => (
                                        <div
                                            key={i}
                                            className="flex items-start gap-3 rounded-xl px-2 py-2.5"
                                        >
                                            <div className="skeleton h-8 w-8 shrink-0 rounded-lg" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="skeleton h-3 w-3/4" />
                                                <div className="skeleton h-2.5 w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : items.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                                    <span className="text-2xl">🔔</span>
                                    <p className="text-sm font-medium text-[#a1a1aa]">
                                        No notifications yet
                                    </p>
                                    <p className="text-xs text-[#71717a]">
                                        Announcements and updates will show up
                                        here.
                                    </p>
                                </div>
                            ) : (
                                items.map((n) => (
                                    <NotificationRow
                                        key={n._id}
                                        notification={n}
                                        onOpen={handleNotificationClick}
                                        onMarkRead={markAsRead}
                                    />
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-[#ffffff0d] p-2">
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setOpen(false);
                                    router.push("/notifications");
                                }}
                                className="w-full rounded-xl bg-gradient-to-r from-[#6366f1]/20 to-[#8b5cf6]/20 px-4 py-2.5 text-sm font-semibold text-[#c7d2fe] transition-colors hover:from-[#6366f1]/30 hover:to-[#8b5cf6]/30 hover:text-white"
                            >
                                View All Notifications
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface NotificationRowProps {
    notification: Notification;
    onOpen: (n: Notification) => void;
    onMarkRead: (args: { id: Id<"notifications"> }) => Promise<unknown>;
}

function NotificationRow({ notification, onOpen, onMarkRead }: NotificationRowProps) {
    const style = typeStyle(notification);
    const n = notification;

    return (
        <div
            role="menuitem"
            tabIndex={0}
            onClick={() => onOpen(n)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(n);
                }
            }}
            className={`flex w-full cursor-pointer items-start gap-3 border-b border-[#ffffff08] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#ffffff0d] focus:bg-[#ffffff0d] focus:outline-none ${
                n.read ? "" : "bg-[#6366f1]/[0.07]"
            }`}
        >
            <span
                aria-hidden="true"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${style.ring}`}
            >
                {style.icon}
            </span>

            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                    <span
                        className={`truncate text-[13px] font-semibold ${n.read ? "text-[#a1a1aa]" : "text-white"}`}
                    >
                        {n.title}
                    </span>
                    {!n.read && (
                        <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#818cf8]"
                        />
                    )}
                </span>

                <span className="mt-0.5 line-clamp-2 block text-xs text-[#71717a]">
                    {n.message}
                </span>

                <span className="mt-1 block text-[11px] text-[#52525b]">
                    {relativeTime(n.createdAt)}
                </span>
            </span>

            {!n.read && (
                <button
                    type="button"
                    aria-label="Mark as read"
                    title="Mark as read"
                    onClick={(e) => {
                        e.stopPropagation();
                        void onMarkRead({ id: n._id });
                    }}
                    className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#71717a] transition-colors hover:bg-[#ffffff14] hover:text-emerald-400"
                >
                    <Check size={13} />
                </button>
            )}
        </div>
    );
}
