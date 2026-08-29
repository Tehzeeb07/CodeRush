"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Client-side role gate for the normal user dashboard: ADMIN and
 * SUPER_ADMIN accounts are transparently routed to the admin dashboard.
 * USER accounts render children untouched. This is a UX convenience —
 * all privileged data remains protected by server-side RBAC.
 */
export function AdminRoleRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const identity = useQuery(api.roles.me);

  useEffect(() => {
    if (identity && (identity.role === "ADMIN" || identity.role === "SUPER_ADMIN")) {
      router.replace("/admin/dashboard");
    }
  }, [identity, router]);

  return <>{children}</>;
}