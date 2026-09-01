
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Medal,
  Award,
  RefreshCw,
  Users,
  Zap,
  Target,
  Flame,
  Crown,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    if (rank === 1) {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
          <Trophy size={17} className="text-amber-400" />
        </div>
      );
    }

    if (rank === 2) {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300/20 bg-slate-300/10">
          <Medal size={17} className="text-slate-300" />
        </div>
      );
    }

    if (rank === 3) {
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/10">
          <Award size={17} className="text-orange-400" />
        </div>
      );
    }

    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.025]">
        <span className="text-xs font-semibold text-slate-500">
          #{rank}
        </span>
      </div>
    );
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-400">
          <Crown size={10} />
          Champion
        </span>
      );
    }

    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/15 bg-slate-300/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-300">
          <Medal size={10} />
          Runner Up
        </span>
      );
    }

    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/20 bg-orange-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-orange-400">
          <Award size={10} />
          Top 3
        </span>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 pb-10">
      {/* =========================================================
          HEADER
      ========================================================== */}

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="
          relative overflow-hidden
          rounded-2xl
          border border-white/[0.06]
          bg-gradient-to-br from-[#111827] via-[#111827] to-[#15152A]
          p-5 sm:p-6
        "
      >
        {/* Background glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/10 bg-amber-400/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-400">
              <Sparkles size={11} />
              Competitive Rankings
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Leaderboard Management
            </h1>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
              Monitor platform rankings, XP, solved problems, streaks and
              user activity across CodeRush.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-3 py-2.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
              Rankings Live
            </span>
          </div>
        </div>
      </motion.section>

      {/* =========================================================
          MINI STATS
      ========================================================== */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="
            rounded-2xl
            border border-white/[0.06]
            bg-[#111827]
            p-4
          "
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Ranked Users
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
                {total}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Users size={18} className="text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="
            rounded-2xl
            border border-white/[0.06]
            bg-[#111827]
            p-4
          "
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Top Rank
              </p>

              <p className="mt-2 text-2xl font-bold text-amber-400">
                #1
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Trophy size={18} className="text-amber-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="
            rounded-2xl
            border border-white/[0.06]
            bg-[#111827]
            p-4
          "
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Current Page
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
                {totalPages > 0 ? page + 1 : 0}
                <span className="ml-1 text-sm font-medium text-slate-600">
                  / {totalPages}
                </span>
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Zap size={18} className="text-violet-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* =========================================================
          SEARCH + ACTIONS
      ========================================================== */}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="relative w-full sm:max-w-md">
          <Search
            size={16}
            className="
              absolute left-3.5 top-1/2
              -translate-y-1/2
              text-slate-600
            "
          />

          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="
              h-11 w-full
              rounded-xl
              border border-white/[0.06]
              bg-[#111827]
              pl-10 pr-4
              text-sm text-white
              outline-none
              placeholder:text-slate-600
              transition-all
              focus:border-blue-500/30
              focus:bg-[#151E2E]
              focus:ring-2
              focus:ring-blue-500/10
            "
          />
        </div>

        <button
          type="button"
          className="
            inline-flex h-11 items-center justify-center gap-2
            rounded-xl
            border border-white/[0.06]
            bg-[#111827]
            px-4
            text-xs font-semibold text-slate-300
            transition-all
            hover:border-white/[0.1]
            hover:bg-white/[0.05]
            hover:text-white
            active:scale-[0.98]
          "
          onClick={() => {
            setSearch("");
            setPage(0);
          }}
        >
          <RefreshCw size={15} />
          Reset Filters
        </button>
      </motion.div>

      {/* =========================================================
          TABLE
      ========================================================== */}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="
          overflow-hidden
          rounded-2xl
          border border-white/[0.06]
          bg-[#111827]
          shadow-[0_10px_40px_rgba(0,0,0,0.12)]
        "
      >
        {/* Table Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Global Rankings
            </h2>

            <p className="mt-1 text-[10px] text-slate-600">
              Sorted by leaderboard performance
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.025] px-2.5 py-1.5 sm:flex">
            <Target size={12} className="text-slate-500" />

            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              {total} Players
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.015]">
                <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
                  Rank
                </th>

                <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
                  User
                </th>

                <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
                  XP
                </th>

                <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
                  Solved
                </th>

                <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
                  Streak
                </th>

                <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-600">
                  Last Active
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.04]">
              <AnimatePresence mode="popLayout">
                {entries.length > 0 ? (
                  entries.map((entry, idx: number) => {
                    const rank = page * 20 + idx + 1;

                    return (
                      <motion.tr
                        key={entry._id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.2,
                          delay: idx * 0.015,
                        }}
                        className="
                          group
                          transition-colors
                          hover:bg-white/[0.025]
                        "
                      >
                        {/* Rank */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {getRankIcon(rank)}

                            {getRankBadge(rank)}
                          </div>
                        </td>

                        {/* User */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div
                                className={`
                                  flex h-10 w-10
                                  items-center justify-center
                                  rounded-xl
                                  text-xs font-bold text-white
                                  shadow-lg
                                  ${rank === 1
                                    ? "bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 shadow-amber-500/10"
                                    : rank === 2
                                      ? "bg-gradient-to-br from-slate-300 to-slate-500 shadow-slate-400/10"
                                      : rank === 3
                                        ? "bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-500/10"
                                        : "bg-gradient-to-br from-blue-500 to-violet-600 shadow-blue-500/10"
                                  }
                                `}
                              >
                                {entry.userEmail?.[0]?.toUpperCase() ?? "?"}
                              </div>

                              {rank <= 3 && (
                                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#111827] bg-white/[0.08]">
                                  <Sparkles
                                    size={8}
                                    className={
                                      rank === 1
                                        ? "text-amber-400"
                                        : "text-slate-300"
                                    }
                                  />
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[220px] truncate text-sm font-semibold text-white">
                                {entry.username ?? "Unnamed User"}
                              </p>

                              <p className="mt-0.5 max-w-[240px] truncate text-[11px] text-slate-600">
                                {entry.userEmail ?? "No email available"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* XP */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10">
                              <Zap size={12} className="text-amber-400" />
                            </div>

                            <span className="text-sm font-bold text-amber-400">
                              {(entry.xp ?? 0).toLocaleString()}
                            </span>
                          </div>
                        </td>

                        {/* Solved */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10">
                              <Target
                                size={12}
                                className="text-emerald-400"
                              />
                            </div>

                            <span className="text-sm font-semibold text-slate-300">
                              {entry.problemsSolved ?? 0}
                            </span>
                          </div>
                        </td>

                        {/* Streak */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-400/10">
                              <Flame
                                size={12}
                                className="text-orange-400"
                              />
                            </div>

                            <span className="text-sm font-semibold text-slate-300">
                              {entry.streak ?? 0}
                            </span>

                            <span className="text-[10px] text-slate-600">
                              days
                            </span>
                          </div>
                        </td>

                        {/* Last Active */}
                        <td className="px-5 py-4">
                          <span className="text-xs text-slate-500">
                            {entry.lastActive
                              ? new Date(
                                entry.lastActive
                              ).toLocaleDateString()
                              : "Never"}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                        <Search
                          size={20}
                          className="text-slate-600"
                        />
                      </div>

                      <p className="mt-4 text-sm font-medium text-slate-400">
                        No users found
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        Try changing your search query.
                      </p>
                    </td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* =======================================================
            PAGINATION
        ======================================================== */}

        {totalPages > 0 && (
          <div className="flex flex-col gap-3 border-t border-white/[0.05] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-[11px] text-slate-600">
              Showing{" "}
              <span className="font-semibold text-slate-400">
                {total === 0 ? 0 : page * 20 + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-400">
                {Math.min((page + 1) * 20, total)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-400">
                {total}
              </span>{" "}
              users
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="
                  flex h-9 w-9 items-center justify-center
                  rounded-xl
                  border border-white/[0.06]
                  bg-white/[0.025]
                  text-slate-500
                  transition-all
                  hover:bg-white/[0.06]
                  hover:text-white
                  disabled:pointer-events-none
                  disabled:opacity-30
                "
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex h-9 items-center rounded-xl border border-white/[0.06] bg-white/[0.025] px-3">
                <span className="text-[11px] font-semibold text-slate-400">
                  Page {page + 1}{" "}
                  <span className="text-slate-700">
                    / {totalPages}
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPage(Math.min(totalPages - 1, page + 1))
                }
                disabled={page >= totalPages - 1}
                className="
                  flex h-9 w-9 items-center justify-center
                  rounded-xl
                  border border-white/[0.06]
                  bg-white/[0.025]
                  text-slate-500
                  transition-all
                  hover:bg-white/[0.06]
                  hover:text-white
                  disabled:pointer-events-none
                  disabled:opacity-30
                "
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
