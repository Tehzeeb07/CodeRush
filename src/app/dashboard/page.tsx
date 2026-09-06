"use client";

import { useConvexAuth } from "convex/react";
import DashboardView from "./dashboard-view";
import { AdminRoleRedirect } from "@/components/AdminRoleRedirect";

export default function DashboardPage() {
  const { isLoading: authLoading } = useConvexAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminRoleRedirect>
      <DashboardView />
    </AdminRoleRedirect>
  );
}
