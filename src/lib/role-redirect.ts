/**
 * Role-aware post-authentication routing.
 *
 * The SUPER_ADMIN role itself is resolved server-side in
 * convex/roles.ts (email list check — gb8585438@gmail.com by default),
 * so no role data is ever trusted from the client. These helpers only
 * decide WHERE to send an already-verified identity.
 */

import type { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

export type AppRole = "USER" | "ADMIN" | "SUPER_ADMIN";

export interface AppIdentity {
  email?: string;
  role: AppRole;
  username?: string | null;
}

/** Where should this role land after sign-in? */
export function destinationForRole(role: string | null | undefined): string {
  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return "/admin/dashboard";
  }
  return "/dashboard";
}

/**
 * After a Convex Auth signIn resolves, the auth token propagates to the
 * React client asynchronously (the signup flow already waits ~300ms
 * before calling createProfile). Rather than a fixed sleep, poll
 * `roles.me` until the identity resolves, with a bounded attempt budget.
 */
export async function fetchIdentityWithRetry(
  client: ConvexReactClient,
  attempts = 8,
  delayMs = 250,
): Promise<AppIdentity | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const identity = await client.query(api.roles.me);
      if (identity) return identity;
    } catch {
      // Identity not resolvable yet — retry until the budget is spent.
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}