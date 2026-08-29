"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Shield, ShieldCheck, Crown, User, Edit, Users } from "lucide-react";

const ROLE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  USER: User,
  ADMIN: Shield,
  SUPER_ADMIN: Crown,
};

const ROLE_COLORS: Record<string, string> = {
  USER: "from-slate-500/20 to-slate-600/20 text-slate-400",
  ADMIN: "from-blue-500/20 to-blue-600/20 text-blue-400",
  SUPER_ADMIN: "from-amber-500/20 to-amber-600/20 text-amber-400",
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  USER: [
    "Solve problems",
    "Submit code",
    "View leaderboard",
    "Use bookmarks",
    "Use showcase",
    "Participate in contests",
  ],
  ADMIN: [
    "Manage users",
    "Manage problems",
    "Manage submissions",
    "Manage showcase",
    "View analytics",
    "Moderate content",
    "Manage announcements",
    "Review reports",
  ],
  SUPER_ADMIN: [
    "Full platform control",
    "Manage admins",
    "Change platform settings",
    "Manage roles",
    "View audit logs",
    "Delete any content",
    "Configure execution services",
    "Access all analytics",
  ],
};

export default function AdminRolesPage() {
  const admins = useQuery(api.roles.listAdmins);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-slate-400">Manage user roles and their permissions</p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => {
          const Icon = ROLE_ICONS[role] ?? Shield;
          return (
            <div key={role} className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${ROLE_COLORS[role]}`}>
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{role.replace(/_/g, " ")}</h3>
                  <p className="text-xs text-slate-400">{perms.length} permissions</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {perms.map((perm) => (
                  <div key={perm} className="flex items-center gap-2 text-sm text-slate-300">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    {perm}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Admins List */}
      <div className="rounded-xl border border-slate-700/50 bg-[#1E293B]">
        <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Administrators</h2>
          </div>
        </div>
        <div className="divide-y divide-slate-700/50">
          {admins?.map((admin) =>
            admin ? (
            <div key={admin._id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white">
                  {admin.email?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="font-medium text-white">{admin.username ?? "Admin"}</p>
                  <p className="text-sm text-slate-400">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_COLORS[admin.role]?.replace("/20", "/20")}`}>
                  {admin.role}
                </span>
                {admin.role !== "SUPER_ADMIN" && (
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white">
                    <Edit size={14} />
                  </button>
                )}
              </div>
            </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}

