"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Ban,
  CheckCircle,
  Loader2,
  Users,
} from "lucide-react";
import { ROLE_COLORS, formatDate, type AdminListUser, type AppRole } from "./permissions";
import { UserMenuPopover, type MenuAction } from "./user-menu";
import {
  BanUnbanModal,
  ChangeRoleModal,
  DeleteUserModal,
  EditUserModal,
  ViewProfileModal,
} from "./user-modals";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [page, setPage] = useState(0);
  const [menuState, setMenuState] = useState<{ user: AdminListUser; anchor: { x: number; y: number } } | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminListUser | null>(null);
  const [modal, setModal] = useState<MenuAction | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" | "info" } | null>(null);

  const me = useQuery(api.roles.me);
  const usersData = useQuery(api.admin.adminListUsers, {
    search: search || undefined,
    roleFilter: roleFilter as any,
    page,
    pageSize: 10,
  });

  const users = usersData?.users ?? [];
  const total = usersData?.total ?? 0;
  const totalPages = usersData?.totalPages ?? 0;
  const isLoading = usersData === undefined;
  const callerRole: AppRole = (me?.role as AppRole | undefined) ?? "USER";

  function notify(message: string, kind: "success" | "error" | "info" = "info") {
    setToast({ message, kind });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function handleAction(action: MenuAction) {
    if (!menuState) return;
    setSelectedUser(menuState.user);
    setMenuState(null);
    setModal(action);
  }

  function closeModal() {
    setModal(null);
    setSelectedUser(null);
  }

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
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin" /> Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Users size={28} className="text-slate-600" />
            <p className="text-sm font-medium text-slate-300">No users found</p>
            <p className="text-xs text-slate-500">
              {search || roleFilter !== "ALL"
                ? "Try adjusting your search or role filter."
                : "No users have registered yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3 font-semibold">User</th>
                  <th className="px-6 py-3 font-semibold">Role</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">XP</th>
                  <th className="px-6 py-3 font-semibold">Joined</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={String(u._id)}
                    className="border-b border-slate-800/50 transition-colors last:border-0 hover:bg-slate-800/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-sm font-bold text-white">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (u.username ?? u.email ?? "?").slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {u.username ?? "Unnamed"}
                          </p>
                          <p className="truncate text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          ROLE_COLORS[u.role] ?? "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.isBanned ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-400">
                          <Ban size={12} /> Banned
                        </span>
                      ) : u.isSuspended ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-400">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                          <CheckCircle size={12} /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{u.xp.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{formatDate(u.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        data-menu-trigger
                        aria-label={`Actions for ${u.username ?? u.email ?? "user"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuState((current) =>
                            current?.user._id === u._id
                              ? null
                              : { user: u, anchor: { x: rect.right, y: rect.bottom + 4 } }
                          );
                        }}
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
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-700/50 px-6 py-4">
            <p className="text-sm text-slate-400">
              Showing page {page + 1} of {totalPages} — {total} user{total === 1 ? "" : "s"} total
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(0, page - 1))}
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
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 transition-colors hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Row action menu */}
      <AnimatePresence>
        {menuState && (
          <UserMenuPopover
            user={menuState.user}
            callerRole={callerRole}
            anchor={menuState.anchor}
            onClose={() => setMenuState(null)}
            onAction={handleAction}
          />
        )}
      </AnimatePresence>

      {/* Action modals */}
      <ViewProfileModal open={modal === "view"} user={selectedUser} onClose={closeModal} />
      <EditUserModal open={modal === "edit"} user={selectedUser} onClose={closeModal} onNotify={notify} />
      <ChangeRoleModal open={modal === "role"} user={selectedUser} onClose={closeModal} onNotify={notify} />
      <BanUnbanModal open={modal === "ban"} user={selectedUser} onClose={closeModal} onNotify={notify} />
      <DeleteUserModal open={modal === "delete"} user={selectedUser} onClose={closeModal} onNotify={notify} />

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={`fixed bottom-6 right-6 z-[80] rounded-lg border px-4 py-3 text-sm shadow-xl ${
              toast.kind === "success"
                ? "border-emerald-700/50 bg-emerald-950/90 text-emerald-300"
                : toast.kind === "error"
                  ? "border-red-800 bg-red-950/90 text-red-300"
                  : "border-slate-700/50 bg-[#1E293B] text-slate-200"
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}