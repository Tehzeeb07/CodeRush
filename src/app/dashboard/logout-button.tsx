"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

export default function LogoutButton() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-md border border-neutral-700 hover:bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition-colors"
    >
      {loading ? "Logging out…" : "Log out"}
    </button>
  );
}