"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import DashboardView from "./dashboard-view";
import { AdminRoleRedirect } from "@/components/AdminRoleRedirect";
import { api } from "../../../convex/_generated/api";

export default function DashboardPage() {
  const router = useRouter();

  // Distinguish auth LOADING from authenticated/unauthenticated:
  // never redirect while auth state is still loading — this was the root
  // cause of the "dashboard flashes, then bounces back to login" bug (the
  // verification query resolved as false for an unauthenticated session
  // before the auth token had propagated).
  const { isLoading: authLoading } = useConvexAuth();
  const isVerified = useQuery(api.emailVerification.isCurrentUserEmailVerified);

  // Only trust the verification result once auth has finished loading.
  const verificationLoading = authLoading || isVerified === undefined;

  // Client-side enforcement: redirect to verify-email if not verified.
  useEffect(() => {
    if (!authLoading && isVerified === false) {
      router.replace("/verify-email");
    }
  }, [authLoading, isVerified, router]);

  if (authLoading || verificationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard content if not verified.
  if (isVerified === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-neutral-400">Redirecting to email verification...</p>
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
