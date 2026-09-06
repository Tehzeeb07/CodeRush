"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Ban, CheckCircle2, Edit, Eye, Shield, Trash2 } from "lucide-react";
import {
  AdminListUser,
  AppRole,
  canDeleteUser,
  canEditUser,
  canManageRole,
  canToggleBan,
  protectionReason,
} from "./permissions";

export type MenuAction = "view" | "edit" | "role" | "ban" | "delete";

interface UserMenuPopoverProps {
  user: AdminListUser;
  callerRole: AppRole;
  anchor: { x: number; y: number };
  onClose: () => void;
  onAction: (action: MenuAction) => void;
}

const ITEM_CLASS = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50";
const ITEM_DISABLED = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 cursor-not-allowed opacity-60";
const ITEM_DANGER = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-red-500/10";
const ITEM_DANGER_DISABLED = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500/60 cursor-not-allowed opacity-60";

export function UserMenuPopover({ user, callerRole, anchor, onClose, onAction }: UserMenuPopoverProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const firstItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    firstItemRef.current?.focus();

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (rootRef.current?.contains(target)) return;
      // Allow the three-dot trigger itself to toggle the menu.

      if (target?.closest("[data-menu-trigger]")) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onReposition = () => onClose();

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [onClose]);

  const editReason = protectionReason(callerRole, user.role, "edit");
  const canEdit = editReason === null && canEditUser(callerRole, user.role);
  const roleReason = protectionReason(callerRole, user.role, "role");
  const canRole = roleReason === null && canManageRole(callerRole, user.role);
  const banReason = protectionReason(callerRole, user.role, "ban");
  const canBan = banReason === null && canToggleBan(callerRole, user.role);
  const delReason = protectionReason(callerRole, user.role, "delete");
  const canDelete = delReason === null && canDeleteUser(callerRole, user.role);

  const manageVisible = callerRole === "SUPER_ADMIN";
  const unban = user.isBanned;

  // Right-align the menu under the trigger, clamped inside the viewport.


  const menuWidth = 192;
  const menuHeight = 300;
  const left = Math.max(8, Math.min(anchor.x - menuWidth, window.innerWidth - menuWidth - 8));
  const top = Math.max(8, Math.min(anchor.y, window.innerHeight - menuHeight - 8));

  return (
    <motion.div
      ref={rootRef}
      role="menu"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ left, top }}
      className="fixed z-[60] w-48 rounded-lg border border-slate-700/50 bg-[#1E293B] p-1 shadow-2xl"
    >
      <button
        ref={firstItemRef}
        type="button"
        role="menuitem"
        onClick={(e) => {
          e.stopPropagation();
          onAction("view");
        }}
        className={ITEM_CLASS}
      >
        <Eye size={14} /> View Profile
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!canEdit}
        title={canEdit ? undefined : (editReason ?? undefined)}
        onClick={(e) => {
          e.stopPropagation();
          if (canEdit) onAction("edit");
        }}
        className={canEdit ? ITEM_CLASS : ITEM_DISABLED}
      >
        <Edit size={14} /> Edit User
      </button>
      {manageVisible && (
        <button
          type="button"
          role="menuitem"
          disabled={!canRole}
          title={canRole ? undefined : (roleReason ?? undefined)}
          onClick={(e) => {
            e.stopPropagation();
            if (canRole) onAction("role");
          }}
          className={canRole ? ITEM_CLASS : ITEM_DISABLED}
        >
          <Shield size={14} /> Change Role
        </button>
      )}
      <hr className="my-1 border-slate-700/50" />
      {manageVisible && (
        <button
          type="button"
          role="menuitem"
          disabled={!canBan}
          title={canBan ? undefined : (banReason ?? undefined)}
          onClick={(e) => {
            e.stopPropagation();
            if (canBan) onAction("ban");
          }}
          className={canBan ? ITEM_DANGER : ITEM_DANGER_DISABLED}
        >
          {unban ? <CheckCircle2 size={14} /> : <Ban size={14} />}
          {unban ? "Unban" : "Ban"}
        </button>
      )}
      {manageVisible && (
        <button
          type="button"
          role="menuitem"
          disabled={!canDelete}
          title={canDelete ? undefined : (delReason ?? undefined)}
          onClick={(e) => {
            e.stopPropagation();
            if (canDelete) onAction("delete");
          }}
          className={canDelete ? ITEM_DANGER : ITEM_DANGER_DISABLED}
        >
          <Trash2 size={14} /> Delete
        </button>
      )}
    </motion.div>
  );
}