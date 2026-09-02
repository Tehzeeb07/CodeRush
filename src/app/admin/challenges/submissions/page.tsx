"use client";

/**
 * Admin → Challenges → Web Submissions.
 * Lists Web Development challenge submissions (in-browser editor output) with
 * user / challenge / submitted-at / status, linking to the review page.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Search, ChevronLeft, ChevronRight, Eye, Globe, Loader2 } from "lucide-react";

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/20 text-amber-400",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-500/20 text-emerald-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/20 text-red-400",
  },
};

export default function AdminWebSubmissionsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(0);

  const data = useQuery(api.webSubmissions.listWebSubmissionsAdmin, {
    status:
      statusFilter === "ALL"
        ? undefined
        : (statusFilter as "pending" | "approved" | "rejected"),
    search: search || undefined,
    page,
    pageSize: 15,
  });

  const submissions = data?.submissions ?? [];
  const totalPages = data?.totalPages ?? 0;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Globe size={22} className="text-cyan-400" />
          Web Development Submissions
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Review solutions built in the in-browser HTML / CSS / JS editor.
          Approvals grant the challenge&apos;s XP once.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative min-w-[250px] flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by user or challenge…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-lg border border-slate-700/50 bg-[#1E293B] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-[#3B82F6] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-slate-700/50 bg-[#1E293B] px-4 py-2.5 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
{data === undefined ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-700/50 bg-[#1E293B] py-16 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin" />
          Loading submissions…
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-[#1E293B]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Challenge
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Submitted
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {submissions.map((sub) => {
                  const meta = STATUS_META[sub.status] ?? STATUS_META.pending;
                  return (
                    <tr
                      key={sub._id}
                      className="transition-colors hover:bg-slate-700/20"
                    >
                      <td className="px-6 py-4 text-sm text-slate-300">
                        <div className="font-medium text-white">
                          {sub.username}
                        </div>
                        <div className="text-xs text-slate-500">
                          {sub.userEmail ?? ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        {sub.challengeTitle}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {new Date(sub.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/admin/challenges/submissions/${sub._id}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400"
                        >
                          <Eye size={14} />
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {submissions.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-16 text-center text-sm text-slate-500"
                    >
                      No Web Development submissions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-700/50 px-6 py-4">
              <p className="text-sm text-slate-400">
                Showing {page * 15 + 1} to{" "}
                {Math.min((page + 1) * 15, total)} of {total} submissions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 transition-colors hover:bg-slate-700/50 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 text-sm text-slate-400">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 transition-colors hover:bg-slate-700/50 disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}