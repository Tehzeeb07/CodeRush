"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Edit,
  Shield,
  Trash2,
  Ban,
  CheckCircle,
} from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  USER: "bg-slate-500/20 text-slate-400",
  ADMIN: "bg-blue-500/20 text-blue-400",
  SUPER_ADMIN: "bg-amber-500/20 text-amber-400",
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [page, setPage] = useState(0);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const usersData = useQuery(api.admin.adminListUsers, {
    search: search || undefined,
    roleFilter: roleFilter as "USER" | "ADMIN" | "SUPER_ADMIN" | "ALL",
    page,
    pageSize: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="mt-1 text-sm text-slate-400">Manage users, roles, and permissions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full rounded-lg border border-slate-700/50 bg-[#1E293B] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-[#3B82F6] focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
          className="rounded-lg border border-slate-700/50 bg-[#1E293B] px-4 py-2.5 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
        >
          <option value="ALL">All Roles</option>
          <option value="USER">Users</option>
          <option value="ADMIN">Admins</option>
          <option value="SUPER_ADMIN">Super Admins</option>
        </select>
      </div>

      {/* Users table */}
      <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-[#1E293B]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">XP</th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Joined</th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {usersData?.users.map((user) => (
                <tr key={user._id} className="transition-colors hover:bg-slate-700/20">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-sm font-bold text-white">
                        {user.email?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.username ?? "Unnamed"}</p>
                        <p className="text-sm text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_COLORS[user.role] ?? "bg-slate-500/20 text-slate-400"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isBanned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-400">
                        <Ban size={12} /> Banned
                      </span>
                    ) : user.isSuspended ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-400">
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle size={12} /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{user.xp ?? 0}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setActionMenu(actionMenu === user._id ? null : user._id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {usersData && usersData.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-700/50 px-6 py-4">
            <p className="text-sm text-slate-400">
              Showing {page * 10 + 1} to {Math.min((page + 1) * 10, usersData.total)} of {usersData.total} users
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
                Page {page + 1} of {usersData.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(usersData.totalPages - 1, page + 1))}
                disabled={page >= usersData.totalPages - 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 transition-colors hover:bg-slate-700/50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action menu dropdown */}
      <AnimatePresence>
        {actionMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed right-6 top-32 z-50 w-48 rounded-lg border border-slate-700/50 bg-[#1E293B] p-1 shadow-xl"
          >
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50">
              <Eye size={14} /> View Profile
            </button>
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50">
              <Edit size={14} /> Edit User
            </button>
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50">
              <Shield size={14} /> Change Role
            </button>
            <hr className="my-1 border-slate-700/50" />
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
              <Ban size={14} /> Ban
            </button>
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
              <Trash2 size={14} /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
