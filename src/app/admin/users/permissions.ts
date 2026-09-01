/**
 * Shared types, permission rules and formatting helpers for the admin User
 * Management page — single source of truth used by both the table/menu
 * and the action modals, so client-side gating can never drift from the
 * server-side authorization in convex/roles.ts (which remains authoritative;.
 */

import type { Id } from "../../../../convex/_generated/dataModel";

export type AppRole = "USER" | "ADMIN" | "SUPER_ADMIN";

export interface AdminListUser {
  _id: Id<"users">;
  email: string | null | undefined;
  username: string | null;
  role: AppRole;
  isSuspended: boolean;
  isBanned: boolean;
  xp: number;
  avatarUrl: string | null;
  createdAt: number;
}

export const ROLE_COLORS: Record<string, string> = {
  USER: "bg-slate-500/20 text-slate-400",
  ADMIN: "bg-blue-500/20 text-blue-400",
  SUPER_ADMIN: "bg-amber-500/20 text-amber-400",
};

/** Human label used in confirmation copy. */
export function userLabel(user: { username?: string | null; email?: string | null }): string {
  return user.username ?? user.email ?? "this user";
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString();
}

export function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return "Never";
  return new Date(ts).toLocaleString();
}

/**
 * Permission rules (mirrors convex/roles.ts).

 * ADMIN: view any row (SUPER_ADMIN rows are masked server-side); edit USER rows only.
 * SUPER_ADMIN: view any row; edit USER/ADMIN; manage (role/ban/delete) USER/ADMIN.
 * Nobody can manage (edit/role/ban/delete) a SUPER_ADMIN row — enforced server-side too.）
 */
export function canEditUser(caller: AppRole, target: AppRole): boolean {
  if (target === "SUPER_ADMIN") return false;
  return caller === "SUPER_ADMIN" ? target === "USER" || target === "ADMIN" : target === "USER";
}

export function canManageRole(caller: AppRole, target: AppRole): boolean {
  return caller === "SUPER_ADMIN" && target !== "SUPER_ADMIN";
}

export function canToggleBan(caller: AppRole, target: AppRole): boolean {
  return caller === "SUPER_ADMIN" && target !== "SUPER_ADMIN";
}

export function canDeleteUser(caller: AppRole, target: AppRole): boolean {
  return caller === "SUPER_ADMIN" && target !== "SUPER_ADMIN";
}

/** Why an action is blocked for this row (null = allowed). */
export function protectionReason(caller: AppRole, target: AppRole, action: "edit" | "role" | "ban" | "delete"): string | null {
  if (target === "SUPER_ADMIN") return "Super Admin accounts are protected.";
  if (action === "edit" && caller === "ADMIN" && target === "ADMIN") {
    return "Admin accounts are managed by a Super Admin.";
  }
  return null;
}

/** Map backend error prefixes to friendly copy; fallback to a generic message. */
export function friendlyError(err: unknown): string {
  if (!(err instanceof Error)) return "Something went wrong. Please try again.";
  const msg = err.message ?? "";
  const stripped = msg.replace(/^[A-Z_]+:\s*/, "");
  if (stripped.length > 0) return stripped;
  return "Something went wrong. Please try again.";
}