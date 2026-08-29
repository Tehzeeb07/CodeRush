"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Search, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, Trash2, Ban, AlertTriangle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  reviewed: "bg-blue-500/20 text-blue-400",
  resolved: "bg-emerald-500/20 text-emerald-400",
  dismissed: "bg-slate-500/20 text-slate-400",
};

export default function AdminReportsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "pending" | "reviewed" | "resolved" | "dismissed">("ALL");
  const [page, setPage] = useState(0);

  const allReports = useQuery(api.reports.listReports, {
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  });

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = allReports ?? [];
    if (!term) return rows;
    return rows.filter((r) =>
      (r.reason ?? "").toLowerCase().includes(term) ||
      (r.reporterUsername ?? "").toLowerCase().includes(term)
    );
  }, [allReports, search]);

  const total = filteredReports.length;
  const totalPages = Math.max(1, Math.ceil(total / 15));
  const reports = filteredReports.slice(page * 15, (page + 1) * 15);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-400">Review and manage user reports</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full rounded-lg border border-slate-700/50 bg-[#1E293B] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-[#3B82F6] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as "ALL" | "pending" | "reviewed" | "resolved" | "dismissed"); setPage(0); }}
          className="rounded-lg border border-slate-700/50 bg-[#1E293B] px-4 py-2.5 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
        >
          <option value="ALL">All Status</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-[#1E293B]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Reporter</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Reason</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {reports.map((report) => (
                <tr key={report._id} className="hover:bg-slate-700/20">
                  <td className="px-6 py-4 text-sm text-slate-300">{report.reporterUsername ?? "Unknown"}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2.5 py-1 text-xs font-semibold text-slate-300">
                      <AlertTriangle size={12} /> {report.targetType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300 max-w-xs truncate">{report.reason}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[report.status] ?? "bg-slate-500/20 text-slate-400"}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{new Date(report.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-700/50 hover:text-white" title="View"><Eye size={14} /></button>
                      <button className="flex h-7 w-7 items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/10" title="Resolve"><CheckCircle size={14} /></button>
                      <button className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-700/50 hover:text-white" title="Dismiss"><XCircle size={14} /></button>
                      <button className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-500/10" title="Delete Content"><Trash2 size={14} /></button>
                      <button className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-500/10" title="Ban User"><Ban size={14} /></button>
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
              Showing {page * 15 + 1} to {Math.min((page + 1) * 15, total)} of {total} reports
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 hover:bg-slate-700/50 disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-sm text-slate-400">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 hover:bg-slate-700/50 disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
