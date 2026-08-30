"use client";

/**
 * CodeRush - Announcement Details Page (/announcements/[id])
 *
 * Public (authenticated) details view for a published announcement. Data
 * comes from the getAnnouncementForUser Convex query, which only exposes
 * published announcements to regular users (drafts remain admin-only) and
 * includes author information resolved server-side.
 */

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, UserRound } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const TYPE_BADGE: Record<string, { label: string; icon: string; classes: string }> = {
    info: {
        label: "Info",
        icon: "📢",
        classes: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    },
    warning: {
        label: "Warning",
        icon: "⚠️",
        classes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    },
    maintenance: {
        label: "Maintenance",
        icon: "🔧",
        classes: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    },
    update: {
        label: "Platform Update",
        icon: "🚀",
        classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    },
    contest: {
        label: "Contest",
        icon: "🏆",
        classes: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    },
};

function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function formatDateTime(ts: number): string {
    return new Date(ts).toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function AnnouncementDetailsPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;

    const announcement = useQuery(
        api.announcements.getAnnouncementForUser,
        id ? { id: id as Id<"announcements"> } : "skip"
    );

    const badge = announcement
        ? (TYPE_BADGE[announcement.type] ?? TYPE_BADGE.info)
        : null;

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
            {/* Back */}
            <div className="flex items-center gap-3">
                <Link
                    href="/notifications"
                    className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#ffffff14] bg-[#ffffff06] text-[#a1a1aa] transition-colors hover:border-[#818cf8]/50 hover:text-white"
                    aria-label="Back to notifications"
                >
                    <ArrowLeft size={16} />
                </Link>
                <span className="text-sm text-[#71717a]">
                    Back to Notifications
                </span>
            </div>

            {announcement === undefined ? (
                <div className="mt-8 rounded-2xl border border-[#ffffff0d] bg-[#ffffff04] p-8">
                    <div className="skeleton h-6 w-1/3" />
                    <div className="mt-4 space-y-2">
                        <div className="skeleton h-4 w-2/3" />
                        <div className="skeleton h-4 w-1/2" />
                        <div className="skeleton h-4 w-3/4" />
                    </div>
                </div>
            ) : announcement === null ? (
                <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-[#ffffff0d] bg-[#ffffff04] px-6 py-16 text-center">
                    <span className="text-3xl">🔎</span>
                    <p className="text-base font-semibold text-[#a1a1aa]">
                        Announcement not found
                    </p>
                    <p className="text-sm text-[#71717a]">
                        It may have been removed, or it is a draft only visible
                        to admins.
                    </p>
                    <Link
                        href="/notifications"
                        className="mt-2 rounded-xl bg-gradient-to-r from-[#6366f1]/20 to-[#8b5cf6]/20 px-5 py-2.5 text-sm font-semibold text-[#c7d2fe] transition-colors hover:from-[#6366f1]/30 hover:to-[#8b5cf6]/30 hover:text-white"
                    >
                        Back to Notifications
                    </Link>
                </div>
            ) : (
                <motion.article
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="mt-8 overflow-hidden rounded-2xl border border-[#ffffff14] bg-gradient-to-b from-[#ffffff08] to-[#ffffff03] shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
                >
                    {/* Type banner */}
                    <div className="flex items-center justify-between gap-3 border-b border-[#ffffff0d] px-6 py-5 sm:px-8">
                        <span
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${badge!.classes}`}
                        >
                            <span aria-hidden="true">{badge!.icon}</span>
                            {badge!.label}
                        </span>

                        {!announcement.published && (
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                                Draft
                            </span>
                        )}
                    </div>

                    {/* Body */}
                    <div className="px-6 py-7 sm:px-8">
                        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            {announcement.title}
                        </h1>

                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#71717a]">
                            <span className="inline-flex items-center gap-1.5">
                                <Calendar size={14} />
                                Published {formatDate(announcement.publishedAt)}
                            </span>

                            {announcement.authorUsername && (
                                <span className="inline-flex items-center gap-1.5">
                                    <UserRound size={14} />
                                    {announcement.authorUsername}
                                    {announcement.authorRole === "SUPER_ADMIN"
                                        ? " · Super Admin"
                                        : announcement.authorRole === "ADMIN"
                                            ? " · Admin"
                                            : ""}
                                </span>
                            )}
                        </div>

                        <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-[#d4d4d8]">
                            {announcement.message}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[#ffffff0d] px-6 py-4 text-xs text-[#52525b] sm:px-8">
                        Last updated {formatDateTime(announcement.createdAt)}
                    </div>
                </motion.article>
            )}
        </div>
    );
}
