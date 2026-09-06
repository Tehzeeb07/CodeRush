import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Hook that checks if the current user's email is verified.
 * Redirects to the verify-email page only AFTER authentication has fully
 * loaded — never while auth state is loading (prevents redirect loops while
 * the session token is still propagating).
 */
export function useEmailVerification() {
  const router = useRouter();
  const { isLoading: authLoading } = useConvexAuth();
  const isVerified = useQuery(api.emailVerification.isCurrentUserEmailVerified);

  useEffect(() => {
    // Only act once auth loading is done AND the query has resolved.
    if (!authLoading && isVerified === false) {
      router.replace("/verify-email");
    }
  }, [authLoading, isVerified, router]);

  return {
    isVerified,
    isLoading: authLoading || isVerified === undefined,
  };
}
