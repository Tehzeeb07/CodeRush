"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface AdminGuardProps {
  children: ReactNode;
  requiredRole?: "ADMIN" | "SUPER_ADMIN";
}

export function AdminGuard({ children, requiredRole = "ADMIN" }: AdminGuardProps) {
  const router = useRouter();
  const identity = useQuery(api.roles.me);

  // Access state is derived from the query result — no setState needed.
  // identity === undefined → still loading, identity === null → signed out.
  const isLoading = identity === undefined;

  // Banned callers are locked out of the admin area entirely — BanGate renders
  // the full-screen suspension screen globally, so here we just avoid rendering
  // the admin shell for them.
  const isBanned = identity?.isBanned === true;

  const authorized =
    isBanned === false &&
    identity != null &&
    (requiredRole === "SUPER_ADMIN"
      ? identity.role === "SUPER_ADMIN"
      : identity.role === "ADMIN" || identity.role === "SUPER_ADMIN");

  // Redirects are external-system updates (router), which is what effects are for.
  useEffect(() => {
    if (isLoading) return;
    if (identity === null) {
      router.push("/login");
      return;
    }
    if (!authorized) {
      router.push("/dashboard");
    }
  }, [isLoading, identity, isBanned, authorized, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F172A]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#3B82F6] border-t-transparent" />
          <p className="text-sm text-slate-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F172A]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="mt-2 text-slate-400">You do not have permission to access this area.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}