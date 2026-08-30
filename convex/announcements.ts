/**
 * Announcements â€” platform-wide announcements CRUD.
 */
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";

/** Admin query: list announcements with pagination, search and filters. */
export const adminListAnnouncements = query({
  args: {
    search: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    type: v.optional(
      v.union(
        v.literal("info"),
        v.literal("warning"),
        v.literal("maintenance"),
        v.literal("update"),
        v.literal("contest")
      )
    ),
    status: v.optional(
      v.union(v.literal("published"), v.literal("draft"))
    ),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const page = Math.max(args.page ?? 0, 0);
    const pageSize = Math.min(args.pageSize ?? 20, 100);
    const search = args.search?.trim().toLowerCase() ?? "";

    const all = await ctx.db.query("announcements").order("desc").collect();

    let filtered = all;
    if (search) {
      filtered = filtered.filter((a) =>
        (a.title ?? "").toLowerCase().includes(search) ||
        (a.message ?? "").toLowerCase().includes(search)
      );
    }
    if (args.type) {
      filtered = filtered.filter((a) => a.type === args.type);
    }
    if (args.status) {
      filtered = filtered.filter((a) =>
        args.status === "published"
          ? (a.published ?? a.isActive) === true
          : (a.published ?? a.isActive) !== true
      );
    }

    const sorted = filtered.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const start = page * pageSize;
    const paged = sorted.slice(start, start + pageSize);

    return {
      announcements: paged,
      total: sorted.length,
      page,
      pageSize,
      totalPages: Math.ceil(sorted.length / pageSize),
    };
  },
});

export const listAnnouncements = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    if (args.includeInactive) {
      return await ctx.db.query("announcements").order("desc").collect();
    }

    return await ctx.db
      .query("announcements")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();
  },
});

export const getAnnouncement = query({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }
    return await ctx.db.get(args.id);
  },
});

export const createAnnouncement = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("info"), v.literal("warning"), v.literal("maintenance"), v.literal("update"), v.literal("contest")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    expiresAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    /**
     * When true the announcement is published immediately: published is
     * set to true, the publishing timestamp is recorded and a
     * notification is automatically created for every registered user
     * (server-side fanout, duplicates prevented).
     */
    publish: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    // Validation before anything is written.
    const title = args.title.trim();
    const message = args.message.trim();
    if (title.length < 3) throw new Error("Title must be at least 3 characters");
    if (title.length > 120) throw new Error("Title must be at most 120 characters");
    if (message.length < 3) throw new Error("Message must be at least 3 characters");

    const publish = args.publish ?? false;
    const now = Date.now();
    const annId = await ctx.db.insert("announcements", {
      title,
      message,
      type: args.type,
      priority: args.priority,
      expiresAt: args.expiresAt,
      isActive: publish,
      published: publish,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy: callerId,
    });

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: publish ? "announcement_published" : "announcement_created",
      target: "announcement",
      targetId: annId,
      details: title,
      ip: undefined,
      createdAt: now,
    });

    let notificationsQueued = false;
    if (publish) {
      // Schedule the server-side fanout (internal mutation, batched).
      notificationsQueued = true;
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.fanoutAnnouncementNotifications,
        {
          announcementId: annId,
          announcementType: args.type,
          title,
          message,
          link: `/announcements/${annId}`,
        }
      );
    }

    return { announcementId: annId, published: publish, notificationsQueued };
  },
});

/**
 * Publish an existing (draft) announcement: sets published = true, records
 * the publishing timestamp and automatically creates one notification per
 * registered user. Re-publishing an already-published announcement is a
 * no-op for notifications (duplicate prevention via the by_announcement
 * index).
 */
export const publishAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const announcement = await ctx.db.get(args.id);
    if (!announcement) throw new Error("Announcement not found");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      published: true,
      isActive: true,
      publishedAt: announcement.publishedAt || now,
      updatedAt: now,
    });

    // Duplicate prevention: if notifications for this announcement were
    // already generated, do not schedule the fanout again.
    const existingNotification = await ctx.db
      .query("notifications")
      .withIndex("by_announcement", (q) =>
        q.eq("announcementId", args.id)
      )
      .first();

    let notificationsQueued = false;
    if (!existingNotification) {
      notificationsQueued = true;
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.fanoutAnnouncementNotifications,
        {
          announcementId: args.id,
          announcementType: announcement.type,
          title: announcement.title,
          message: announcement.message,
          link: `/announcements/${args.id}`,
        }
      );
    }

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "announcement_published",
      target: "announcement",
      targetId: args.id,
      details: announcement.title,
      ip: undefined,
      createdAt: now,
    });

    return {
      announcementId: args.id,
      published: true,
      notificationsQueued,
      alreadyPublished: existingNotification !== null,
    };
  },
});

export const updateAnnouncement = mutation({
  args: {
    id: v.id("announcements"),
    title: v.optional(v.string()),
    message: v.optional(v.string()),
    type: v.optional(v.union(v.literal("info"), v.literal("warning"), v.literal("maintenance"), v.literal("update"), v.literal("contest"))),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    isActive: v.optional(v.boolean()),
    /** Mirror of isActive; when provided it takes precedence. */
    published: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    if (args.title !== undefined && args.title.trim().length < 3) {
      throw new Error("Title must be at least 3 characters");
    }
    if (args.message !== undefined && args.message.trim().length < 3) {
      throw new Error("Message must be at least 3 characters");
    }

    const { id, published, ...updates } = args;
    // `isActive` and `published` are always kept in sync.
    const publishFlag = published ?? updates.isActive;
    const patch: Record<string, unknown> = { ...updates, updatedAt: Date.now() };
    if (publishFlag !== undefined) {
      patch.isActive = publishFlag;
      patch.published = publishFlag;
    }
    if (args.title !== undefined) patch.title = args.title.trim();
    if (args.message !== undefined) patch.message = args.message.trim();

    await ctx.db.patch(id, patch);

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "announcement_updated",
      target: "announcement",
      targetId: id,
      details: JSON.stringify(updates),
      ip: undefined,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

/**
 * Details query for the public announcement page (/announcements/[id]).
 * Any authenticated user may read PUBLISHED announcements; drafts are only
 * visible to ADMIN / SUPER_ADMIN. Includes author info for display.
 */
export const getAnnouncementForUser = query({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const announcement = await ctx.db.get(args.id);
    if (!announcement) return null;

    const isPublished = (announcement.published ?? announcement.isActive) === true;
    if (!isPublished) {
      const caller = await resolveIdentity(ctx, callerId);
      if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
        return null;
      }
    }

    const author = await resolveIdentity(ctx, announcement.createdBy);

    return {
      _id: announcement._id,
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      priority: announcement.priority,
      published: isPublished,
      publishedAt: announcement.publishedAt,
      createdAt: announcement.createdAt,
      authorUsername: author?.username ?? null,
      authorRole: author?.role ?? null,
    };
  },
});

export const deleteAnnouncement = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "announcement_deleted",
      target: "announcement",
      targetId: args.id,
      ip: undefined,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});


