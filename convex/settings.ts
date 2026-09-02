/**
 * Settings â€” key-value platform settings (SUPER_ADMIN only write).
 */
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";

/** Default settings. */
const DEFAULT_SETTINGS = [
  { key: "siteName", value: "CodeRush", type: "string" as const, description: "Platform name shown in the header" },
  { key: "siteLogo", value: "", type: "string" as const, description: "Custom site logo URL" },
  { key: "registrationEnabled", value: true, type: "boolean" as const, description: "Allow new user registration" },
  { key: "leaderboardEnabled", value: true, type: "boolean" as const, description: "Enable/disable the leaderboard" },
  { key: "showcaseEnabled", value: true, type: "boolean" as const, description: "Enable/disable the showcase" },
  { key: "maintenanceMode", value: false, type: "boolean" as const, description: "Enable maintenance mode" },
  { key: "notificationsEnabled", value: true, type: "boolean" as const, description: "Allow announcements to create notifications" },
  { key: "supportedLanguages", value: ["python", "cpp", "java", "javascript"], type: "json" as const, description: "Languages supported in the code editor" },
  { key: "executionServiceUrl", value: "", type: "string" as const, description: "Base URL of the code execution service" },
  { key: "maxExecutionTimeMs", value: 10000, type: "number" as const, description: "Maximum execution time per code run" },
  { key: "maxExecutionMemoryMb", value: 256, type: "number" as const, description: "Maximum memory per code execution" },
  { key: "rateLimitPerMinute", value: 30, type: "number" as const, description: "Rate limit for code executions per client per minute" },
  { key: "xpPerTestCase", value: 10, type: "number" as const, description: "XP awarded per newly passed test case on a judged submission" },
];

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("settings").collect();
    const map: Record<string, unknown> = {};
    for (const s of all) {
      map[s.key] = s.value;
    }
    return map;
  },
});

/** Admin-only helper that seeds default rows then returns all settings. */
export const listSettingsAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    // Ensure defaults exist
    const existing = await ctx.db.query("settings").collect();
    const existingKeys = new Set(existing.map((s) => s.key));
    const now = Date.now();
    for (const def of DEFAULT_SETTINGS) {
      if (!existingKeys.has(def.key)) {
        await ctx.db.insert("settings", {
          ...def,
          updatedBy: undefined,
          updatedAt: now,
        });
      }
    }

    const all = await ctx.db.query("settings").collect();
    return all;
  },
});

export const updateSetting = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    type: v.optional(v.union(v.literal("string"), v.literal("number"), v.literal("boolean"), v.literal("json"))),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "SUPER_ADMIN")) {
      throw new Error("Only SUPER_ADMIN can change settings");
    }

    const existing = await ctx.db
      .query("settings").withIndex("by_key", (q) => q.eq("key", args.key)).unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        type: args.type ?? "string",
        description: args.description,
        updatedBy: callerId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("settings", {
        key: args.key,
        value: args.value,
        type: args.type ?? "string",
        description: args.description,
        updatedBy: callerId,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "settings_updated",
      target: "settings",
      targetId: args.key,
      details: JSON.stringify({ key: args.key, value: args.value }),
      ip: undefined,
      createdAt: now,
    });

    return { ok: true };
  },
});
