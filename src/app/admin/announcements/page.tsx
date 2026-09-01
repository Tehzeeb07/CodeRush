"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Megaphone,
  AlertCircle,
  Info,
  Wrench,
  Trophy,
} from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warning: "bg-amber-500/20 text-amber-400",
  maintenance: "bg-orange-500/20 text-orange-400",
  update: "bg-emerald-500/20 text-emerald-400",
  contest: "bg-purple-500/20 text-purple-400",
};

const TYPE_ICONS: Record<string, any> = {
  info: Info,
  warning: AlertCircle,
  maintenance: Wrench,
  update: Megaphone,
  contest: Trophy,
};

export default function AdminAnnouncementsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);

  const data = useQuery(api.announcements.adminListAnnouncements, {
    search: search || undefined,
    page,
    pageSize: 10,
  });

  const announcements = data?.announcements ?? [];
  const totalPages = data?.totalPages ?? 0;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>

          <p className="mt-1 text-sm text-slate-400">
            Create and manage platform announcements
          </p>
        </div>

        <button
          onClick={() => setShowCreate((prev) => !prev)}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
        >
          <Plus size={16} />
          New Announcement
        </button>
      </div>

      {/* Create Announcement */}
      {showCreate && (
        <div className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5">
          <h3 className="text-lg font-semibold text-white">
            Create Announcement
          </h3>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Title"
              className="rounded-lg border border-slate-700/50 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />

            <select
              defaultValue="info"
              className="rounded-lg border border-slate-700/50 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="maintenance">Maintenance</option>
              <option value="update">Update</option>
              <option value="contest">Contest</option>
            </select>
          </div>

          <textarea
            placeholder="Message..."
            rows={4}
            className="mt-4 w-full resize-none rounded-lg border border-slate-700/50 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />

          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/50"
            >
              Cancel
            </button>

            <button className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600">
              Publish
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative min-w-[250px] flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-lg border border-slate-700/50 bg-[#1E293B] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-[#3B82F6] focus:outline-none"
          />
        </div>
      </div>

      {/* Loading */}
      {data === undefined && (
        <div className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-8 text-center">
          <p className="text-sm text-slate-400">
            Loading announcements...
          </p>
        </div>
      )}

      {/* Empty State */}
      {data !== undefined && announcements.length === 0 && (
        <div className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-8 text-center">
          <Megaphone
            size={32}
            className="mx-auto mb-3 text-slate-500"
          />

          <h3 className="font-semibold text-white">
            No announcements found
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            {search
              ? "Try searching with another keyword."
              : "Create your first platform announcement."}
          </p>
        </div>
      )}

      {/* Announcement List */}
      <div className="space-y-4">
        {announcements.map((ann: any) => {
          const Icon = TYPE_ICONS[ann.type] ?? Info;

          const typeColor =
            TYPE_COLORS[ann.type] ??
            "bg-slate-500/20 text-slate-400";

          return (
            <div
              key={ann._id}
              className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5 transition-colors hover:border-slate-600/60"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${typeColor}`}
                  >
                    <Icon size={18} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white">
                      {ann.title}
                    </h3>

                    <p className="mt-1 break-words text-sm leading-6 text-slate-400">
                      {ann.message}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span
                        className={`rounded-full px-2 py-0.5 capitalize ${typeColor}`}
                      >
                        {ann.type}
                      </span>

                      <span>
                        {ann.createdAt
                          ? new Date(
                            ann.createdAt
                          ).toLocaleDateString()
                          : "No date"}
                      </span>

                      {ann.published ? (
                        <span className="text-emerald-400">
                          Published
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Draft
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title="Edit announcement"
                    className="flex h-8 w-8 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
                  >
                    <Edit size={14} />
                  </button>

                  <button
                    type="button"
                    title="Delete announcement"
                    className="flex h-8 w-8 items-center justify-center rounded text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Showing {page * 10 + 1} to{" "}
            {Math.min((page + 1) * 10, total)} of {total} announcements
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPage((currentPage) =>
                  Math.max(0, currentPage - 1)
                )
              }
              disabled={page === 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-3 text-sm text-slate-400">
              Page {page + 1} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((currentPage) =>
                  Math.min(
                    totalPages - 1,
                    currentPage + 1
                  )
                )
              }
              disabled={page >= totalPages - 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}