/**
 * Audit Logs â€” read-only query for admin panel.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";

export const listAuditLogs = query({
  args: {
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const page = Math.max(args.page ?? 0, 0);
    const pageSize = Math.min(args.pageSize ?? 50, 200);
    const search = args.search?.trim().toLowerCase() ?? "";

    const all = await ctx.db.query("auditLogs")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    let filtered = all;
    if (search) {
      filtered = all.filter(
        (l) =>
          (l.action ?? "").toLowerCase().includes(search) ||
          (l.adminEmail ?? "").toLowerCase().includes(search) ||
          (l.target ?? "").toLowerCase().includes(search)
      );
    }

    const start = page * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    // Enrich with usernames
    const enriched = await Promise.all(paged.map(async (l) => {
      const adminProfile = await ctx.db
        .query("profiles").withIndex("by_userId", (q) => q.eq("userId", l.adminId)).unique();
      return {
        ...l,
        adminUsername: adminProfile?.username ?? null,
      };
    }));

    return {
      logs: enriched,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    };
  },
});
