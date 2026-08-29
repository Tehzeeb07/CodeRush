"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Search, ChevronLeft, ChevronRight, Shield } from "lucide-react";

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const data = useQuery(api.auditLogs.listAuditLogs, {
    search: search || undefined,
    page,
    pageSize: 20,
  });

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 0;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-400">Track all administrative actions and security events</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full rounded-lg border border-slate-700/50 bg-[#1E293B] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-[#3B82F6] focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-[#1E293B]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Admin</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Action</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Target</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">IP</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-700/20">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-blue-400" />
                      <span className="text-sm text-slate-300">{log.adminEmail}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-slate-700/50 px-2.5 py-1 text-xs font-semibold text-slate-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{log.target ?? "-"}</td>
                  <td className="px-6 py-4 text-sm text-slate-400 max-w-xs truncate">{log.details ?? "-"}</td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-400">{log.ip ?? "-"}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-700/50 px-6 py-4">
            <p className="text-sm text-slate-400">
              Showing {page * 20 + 1} to {Math.min((page + 1) * 20, total)} of {total} logs
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

