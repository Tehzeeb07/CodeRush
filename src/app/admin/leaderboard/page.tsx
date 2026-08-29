"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Search, ChevronLeft, ChevronRight, Trophy, Medal, Award, RefreshCw } from "lucide-react";

export default function AdminLeaderboardPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const data = useQuery(api.leaderboard.getAdminLeaderboard, {
    search: search || undefined,
    page,
    pageSize: 20,
  });

  const entries = data?.entries ?? [];
  const totalPages = data?.totalPages ?? 0;
  const total = data?.total ?? 0;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={16} className="text-amber-400" />;
    if (rank === 2) return <Medal size={16} className="text-slate-300" />;
    if (rank === 3) return <Award size={16} className="text-amber-600" />;
    return <span className="text-sm text-slate-400">#{rank}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leaderboard Management</h1>
          <p className="mt-1 text-sm text-slate-400">View and manage user rankings</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-[#1E293B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700/50">
          <RefreshCw size={16} /> Reset Rankings
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users..."
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
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Rank</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">XP</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Solved</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Streak</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {entries.map((entry, idx: number) => (
                <tr key={entry._id} className="hover:bg-slate-700/20">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon((page * 20) + idx + 1)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-xs font-bold text-white">
                        {entry.userEmail?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{entry.username ?? "Unnamed"}</p>
                        <p className="text-xs text-slate-400">{entry.userEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-amber-400">{entry.xp ?? 0}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{entry.problemsSolved ?? 0}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{entry.streak ?? 0} days</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{new Date(entry.lastActive).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-700/50 px-6 py-4">
            <p className="text-sm text-slate-400">
              Showing {page * 20 + 1} to {Math.min((page + 1) * 20, total)} of {total} users
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

