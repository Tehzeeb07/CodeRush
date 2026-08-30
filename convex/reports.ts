/**
 * Reports System â€” content reporting and admin moderation.
 */
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";

export const listReports = query({
  args: {
    status: v.optional(
      v.union(v.literal("pending"), v.literal("reviewed"), v.literal("dismissed"), v.literal("resolved"), v.literal("ALL"))
    ),
    targetType: v.optional(
      v.union(v.literal("user"), v.literal("showcase"), v.literal("comment"), v.literal("submission"), v.literal("ALL"))
    ),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    let reports;
    if (args.status && args.status !== "ALL") {
      const status = args.status;
      reports = await ctx.db.query("reports")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    } else {
      reports = await ctx.db.query("reports").collect();
    }

    if (args.targetType && args.targetType !== "ALL") {
      reports = reports.filter((r) => r.targetType === args.targetType);
    }

    const enriched = await Promise.all(reports.map(async (r) => {
      const reporterProfile = await ctx.db
        .query("profiles").withIndex("by_userId", (q) => q.eq("userId", r.reporterId)).unique();
      const resolverId = r.resolvedBy;
      const resolverProfile = resolverId
        ? await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", resolverId)).unique()
        : null;
      return {
        ...r,
        reporterUsername: reporterProfile?.username ?? "unknown",
        resolverUsername: resolverProfile?.username ?? null,
      };
    }));

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const reviewReport = mutation({
  args: {
    reportId: v.id("reports"),
    status: v.union(v.literal("reviewed"), v.literal("dismissed"), v.literal("resolved")),
    resolution: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    await ctx.db.patch(args.reportId, {
      status: args.status,
      resolvedBy: callerId,
      resolvedAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: `report_${args.status}`,
      target: "report",
      targetId: args.reportId,
      details: args.resolution ?? undefined,
      ip: undefined,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

export const submitReport = mutation({
  args: {
    targetType: v.union(v.literal("user"), v.literal("showcase"), v.literal("comment"), v.literal("submission")),
    targetId: v.string(),
    reason: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    await ctx.db.insert("reports", {
      reporterId: callerId,
      targetType: args.targetType,
      targetId: args.targetId,
      reason: args.reason,
      description: args.description,
      status: "pending",
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});
