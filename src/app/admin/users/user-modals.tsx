"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Eye,
  Loader2,
  Pen,
  Save,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import {
  ROLE_COLORS,
  AdminListUser,
  formatDate,
  formatDateTime,
  friendlyError,
  userLabel,
} from "./permissions";

export interface AdminUserDetail {
  _id: string;
  email: string | null;
  username: string | null;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  xp: number;
  avatarUrl: string | null;
  bio: string | null;
  isSuspended: boolean;
  isBanned: boolean;
  bannedAt: number | null;
  bannedReason: string | null;
  bannedBy: string | null;
  createdAt: number;
  lastActiveAt: number | null;
}

export type NotifyFn = (message: string, kind?: "success" | "error" | "info") => void;

function ModalShell({ title, icon, onClose, children, footer }: {
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-slate-700/50 bg-[#1E293B] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-700/50 px-5 py-4">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-base font-semibold text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-slate-700/50 px-5 py-4">{footer}</div>}
      </motion.div>
    </div>
  );
}

function InfoTile({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-[#0F172A] p-3">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm text-slate-200 ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* View Profile                                                         */
/* ------------------------------------------------------------------ */

export function ViewProfileModal({ open, user, onClose }: {
  open: boolean;
  user: AdminListUser | null;
  onClose: () => void;
}) {
  const convex = useConvex();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    convex
      .query(api.roles.adminGetUser, { userId: user._id })
      .then((d) => {
        if (!cancelled) setDetail((d ?? null) as AdminUserDetail | null);
      })
      .catch((e) => {
        if (!cancelled) setError(friendlyError(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, user, convex]);

  if (!open || !user) return null;

  const role = (detail?.role ?? user.role) as AdminUserDetail["role"];
  const banned = detail?.isBanned ?? user.isBanned;
  const suspended = detail?.isSuspended ?? user.isSuspended;

  return (
    <ModalShell title="User Profile" icon={<Eye size={16} className="text-blue-400" />} onClose={onClose}>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Loading profile...
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle size={20} className="text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : (
        <div>
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] text-xl font-bold text-white">
              {detail?.avatarUrl ? (
                <img src={detail.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (detail?.username ?? user.username ?? user.email?.[0] ?? "?").toUpperCase().slice(0, 1)
              )}
            </div>
            <p className="mt-3 text-lg font-semibold text-white">{detail?.username ?? user.username ?? "Unnamed"}</p>
            <p className="text-sm text-slate-400">{detail?.email ?? user.email}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_COLORS[role] ?? "bg-slate-500/20 text-slate-400"}`}>
                {role}
              </span>
              {banned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-semibold text-red-400">
                  <Ban size={12} /> Banned
                </span>
              ) : suspended ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-400">
                  Suspended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 size={12} /> Active
                </span>
              )}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoTile label="User ID" value={user._id} mono />
            <InfoTile label="XP" value={String(detail?.xp ?? user.xp ?? 0)} />
            <InfoTile label="Joined" value={formatDate(detail?.createdAt ?? user.createdAt)} />
            <InfoTile label="Last Active" value={formatDateTime(detail?.lastActiveAt ?? null)} />
          </div>
          {detail?.bannedReason ? (
            <div className="mt-3">
              <InfoTile label="Ban Reason" value={detail.bannedReason} />
            </div>
          ) : null}
          {detail?.bio ? (
            <div className="mt-3">
              <InfoTile label="Bio" value={detail.bio} />
            </div>
          ) : null}
        </div>
      )}
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/* Edit User                                                            */
/* ------------------------------------------------------------------ */

export function EditUserModal({ open, user, onClose, onNotify }: {
  open: boolean;
  user: AdminListUser | null;
  onClose: () => void;
  onNotify: NotifyFn;
}) {
  const convex = useConvex();
  const updateUser = useMutation(api.roles.adminUpdateUser);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setUsername(user.username ?? "");
    setBio("");
    setFormError(null);
    setLoadingDetail(true);
    setDetailError(null);
    convex
      .query(api.roles.adminGetUser, { userId: user._id })
      .then((d) => {
        if (cancelled) return;
        const det = (d ?? null) as AdminUserDetail | null;
        setDetail(det);
        if (det) {
          setUsername(det.username ?? user.username ?? "");
          setBio(det.bio ?? "");
        }
      })
      .catch((e) => {
        if (!cancelled) setDetailError(friendlyError(e));
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, user, convex]);

  async function handleSave() {
    if (!user) return;
    setFormError(null);
    const uname = username.trim();
    if (uname.length < 3 || uname.length > 20 || !/^[a-zA-Z0-9_]+$/.test(uname)) {
      setFormError("Username must be 3-20 characters: letters, numbers, underscores only.");
      return;
    }
    if (bio.trim().length > 500) {
      setFormError("Bio must be 500 characters or fewer.");
      return;
    }
    setSubmitting(true);
    try {
      await updateUser({
        userId: user._id,
        username: uname,
        bio: bio.trim() === "" ? "" : bio.trim(),
      });
      onNotify("User profile updated", "success");
      onClose();
    } catch (e) {
      setFormError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !user) return null;

  return (
    <ModalShell
      title="Edit User"
      icon={<Pen size={16} className="text-blue-400" />}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={submitting || loadingDetail}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={14} /> Save Changes
              </>
            )}
          </button>
        </div>
      }
    >
      {loadingDetail ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin" /> Loading user...
        </div>
      ) : detailError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle size={20} className="text-red-400" />
          <p className="text-sm text-red-300">{detailError}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700/50 bg-[#0F172A] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              3-20 characters: letters, numbers, underscores only.

            </p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-slate-700/50 bg-[#0F172A] px-3 py-2 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">{bio.length}/500</p>
          </div>
          {formError ? <ErrorBox message={formError} /> : null}
          <p className="text-xs text-slate-500">
            Role changes are handled separately via “Change Role”.
          </p>
        </div>
      )}
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/* Change Role                                                          */
/* ------------------------------------------------------------------ */

export function ChangeRoleModal({ open, user, onClose, onNotify }: {
  open: boolean;
  user: AdminListUser | null;
  onClose: () => void;
  onNotify: NotifyFn;
}) {
  const changeRole = useMutation(api.roles.updateUserRole);
  const [newRole, setNewRole] = useState<"USER" | "ADMIN">("ADMIN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      setNewRole(user.role === "ADMIN" ? "USER" : "ADMIN");
      setError(null);
    }
  }, [open, user]);

  if (!open || !user) return null;

  const oldRole = user.role as "USER" | "ADMIN";
  const confirmText = `Change ${userLabel(user)}'s role from ${oldRole} to ${newRole}?`;

  async function handleConfirm() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await changeRole({ userId: user._id, role: newRole });
      onNotify(`Role updated: ${newRole}`, "success");
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      title="Change Role"
      icon={<Shield size={16} className="text-blue-400" />}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Changing...
              </>
            ) : (
              "Confirm Role Change"
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-300">{confirmText}</p>
        <div className="grid grid-cols-2 gap-2">
          {(["USER", "ADMIN"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setNewRole(r)}
              className={`rounded-lg border px-3 py-3 text-left transition-colors ${newRole === r
                ? "border-[#3B82F6] bg-blue-500/10"
                : "border-slate-700/50 bg-[#0F172A] hover:border-slate-600"
                }`}
            >
              <p className="text-sm font-semibold text-white">{r}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {r === "ADMIN" ? "Admin dashboard + user management" : "Standard platform access"}
              </p>
            </button>
          ))}
        </div>
        {error ? <ErrorBox message={error} /> : null}
        <p className="text-xs text-slate-500">
          SUPER_ADMIN is never assignable through this menu — it is reserved for
          accounts on the protected super-admin list.
        </p>
      </div>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/* Ban / Unban                                                          */
/* ------------------------------------------------------------------ */

export function BanUnbanModal({ open, user, onClose, onNotify }: {
  open: boolean;
  user: AdminListUser | null;
  onClose: () => void;
  onNotify: NotifyFn;
}) {
  const setBan = useMutation(api.roles.setUserBan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const banning = user ? !user.isBanned : true;

  async function handleConfirm() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await setBan({ userId: user._id, banned: banning });
      onNotify(banning ? "User banned" : "User unbanned", "success");
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open || !user) return null;

  return (
    <ModalShell
      title={banning ? "Ban User" : "Unban User"}
      icon={
        banning ? (
          <Ban size={16} className="text-red-400" />
        ) : (
          <CheckCircle2 size={16} className="text-emerald-400" />
        )
      }
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${banning
              ? "bg-red-600 hover:bg-red-500"
              : "bg-emerald-600 hover:bg-emerald-500"
              }`}
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" /> {banning ? "Banning..." : "Unbanning..."}
              </>
            ) : banning ? (
              "Ban User"
            ) : (
              "Unban User"
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm font-semibold text-white">
          {banning ? `Ban ${userLabel(user)}?` : `Unban ${userLabel(user)}?`}
        </p>
        <p className="text-sm text-slate-400">
          {banning
            ? "This user will no longer be allowed to access protected CodeRush functionality until their account is unbanned."
            : "This user will regain access to protected CodeRush functionality immediately."}
        </p>
        {user.isBanned && user.role !== "SUPER_ADMIN" ? (
          <div className="rounded-lg border border-slate-700/50 bg-[#0F172A] px-3 py-2 text-xs text-slate-400">
            This account is currently banned. Unbanning restores access
            immediately.
          </div>
        ) : null}
        {error ? <ErrorBox message={error} /> : null}
      </div>
    </ModalShell>
  );
}

// __MODALS_DELETE__

/* ------------------------------------------------------------------ */
/* Delete User                                                          */
/* ------------------------------------------------------------------ */

export function DeleteUserModal({ open, user, onClose, onNotify }: {
  open: boolean;
  user: AdminListUser | null;
  onClose: () => void;
  onNotify: NotifyFn;
}) {
  const deleteUser = useMutation(api.roles.deleteUser);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await deleteUser({ userId: user._id });
      onNotify("User deleted", "success");
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open || !user) return null;

  return (
    <ModalShell
      title="Delete User"
      icon={<Trash2 size={16} className="text-red-400" />}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Deleting...
              </>
            ) : (
              "Delete Permanently"
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm font-semibold text-white">
          Delete {userLabel(user)}?
        </p>
        <p className="text-sm text-slate-400">
          This permanently removes the user&apos;s account and their CodeRush
          profile. This action cannot be undone.
        </p>
        {user.role === "SUPER_ADMIN" ? (
          <div className="rounded-lg border border-amber-800 bg-amber-950/40 px-3 py-2 text-xs text-amber-300">
            You are deleting a SUPER_ADMIN account — double-check before
            confirming.
          </div>
        ) : null}
        {error ? <ErrorBox message={error} /> : null}
      </div>
    </ModalShell>
  );
}
