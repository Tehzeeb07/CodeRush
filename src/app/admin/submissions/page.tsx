"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Code2,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  accepted: "bg-emerald-500/20 text-emerald-400",
  wrong_answer: "bg-red-500/20 text-red-400",
  compilation_error: "bg-orange-500/20 text-orange-400",
  runtime_error: "bg-pink-500/20 text-pink-400",
  time_limit_exceeded: "bg-amber-500/20 text-amber-400",
  memory_limit_exceeded: "bg-purple-500/20 text-purple-400",
  pending: "bg-slate-500/20 text-slate-400",
};

export default function AdminSubmissionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(0);

  const data = useQuery(api.judgeSubmissions.adminListSubmissions, {
    search: search || undefined,
    outcome: statusFilter !== "ALL" ? statusFilter : undefined,
    page,
    pageSize: 15,
  });

  const submissions = data?.submissions ?? [];
  const totalPages = data?.totalPages ?? 0;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Submission Management</h1>
        <p className="mt-1 text-sm text-slate-400">Monitor and review all user submissions</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user or problem..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full rounded-lg border border-slate-700/50 bg-[#1E293B] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-[#3B82F6] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-slate-700/50 bg-[#1E293B] px-4 py-2.5 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="accepted">Accepted</option>
          <option value="wrong_answer">Wrong Answer</option>
          <option value="compilation_error">Compilation Error</option>
          <option value="runtime_error">Runtime Error</option>
          <option value="time_limit_exceeded">Time Limit Exceeded</option>
          <option value="memory_limit_exceeded">Memory Limit Exceeded</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-[#1E293B]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Problem</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Language</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Runtime</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Memory</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {submissions.map((sub) => (
                <tr key={sub._id} className="transition-colors hover:bg-slate-700/20">
                  <td className="px-6 py-4 text-sm text-slate-300">{sub.userEmail ?? "Unknown"}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{sub.problemTitle ?? "Unknown"}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[sub.status] ?? "bg-slate-500/20 text-slate-400"}`}>
                      {sub.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{sub.language}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{sub.runtimeMs ? `${sub.runtimeMs}ms` : "-"}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{sub.memoryKb ? `${sub.memoryKb}KB` : "-"}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{new Date(sub.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white" title="View Code">
                        <Code2 size={14} />
                      </button>
                      <button className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white" title="View Details">
                        <Eye size={14} />
                      </button>
                      <button className="flex h-7 w-7 items-center justify-center rounded text-red-400 transition-colors hover:bg-red-500/10" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-700/50 px-6 py-4">
            <p className="text-sm text-slate-400">
              Showing {page * 15 + 1} to {Math.min((page + 1) * 15, total)} of {total} submissions
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 transition-colors hover:bg-slate-700/50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-sm text-slate-400">Page {page + 1} of {totalPages}</span>
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
    </div>
  );
}

