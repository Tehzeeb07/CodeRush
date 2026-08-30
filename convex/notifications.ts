/**
 * Notifications â€” user notifications query and bulk send for announcements.
 */
import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";

export const listNotifications = query({
  args: {
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const limit = Math.min(args.limit ?? 50, 200);
    const q = ctx.db
      .query("notifications")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", callerId))
      .order("desc");

    const all = await q.collect();

    let filtered = all;
    if (args.unreadOnly) {
      filtered = all.filter((n) => !n.read);
    }

    const enriched = await Promise.all(filtered.slice(0, limit).map(async (n) => {
      return { ...n };
    }));

    return enriched;
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.id);
    if (!notification || notification.userId !== callerId) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.id, { read: true });
    return { ok: true };
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", callerId).eq("read", false))
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }

    return { marked: unread.length };
  },
});

/** Broadcast an announcement to all users as notifications (admin+). */
export const broadcastNotification = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("announcement"), v.literal("system")),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await resolveIdentity(ctx, callerId);
    if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
      throw new Error("Insufficient permissions");
    }

    const now = Date.now();
    const users = await ctx.db.query("users").collect();

    for (const u of users) {
      await ctx.db.insert("notifications", {
        userId: u._id,
        type: args.type,
        title: args.title,
        message: args.message,
        read: false,
        link: args.link,
        createdAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      adminId: callerId,
      adminEmail: caller.email ?? "[unknown]",
      action: "notification_broadcast",
      target: "notifications",
      details: `Broadcast to ${users.length} users`,
      ip: undefined,
      createdAt: now,
    });

    return { sent: users.length };
  },
});

/* =====================================================================
 * Announcement notification pipeline
 * =====================================================================
 *
 * The canonical named API required by the product spec:
 *   - getUserNotifications        (server-filtered by authenticated user)
 *   - getUnreadNotificationCount
 *   - markNotificationAsRead
 *   - markAllNotificationsAsRead
 *
 * The older listNotifications / markRead / markAllRead / unreadCount
 * functions above are kept untouched so existing consumers
 * (e.g. AdminHeader) continue to work.
 * ===================================================================== */

/**
 * All notifications for the CURRENTLY AUTHENTICATED user only.
 * The userId is always derived from Convex auth - the client can never
 * specify (or even influence) whose notifications it reads.
 */
export const getUserNotifications = query({
  args: {
    unreadOnly: v.optional(v.boolean()),
    type: v.optional(
      v.union(
        v.literal("announcement"),
        v.literal("achievement"),
        v.literal("system")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) return [];

    const limit = Math.min(args.limit ?? 50, 200);

    let notifications;
    if (args.type) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", callerId).eq("type", args.type!)
        )
        .order("desc")
        .collect();
    } else {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_createdAt", (q) => q.eq("userId", callerId))
        .order("desc")
        .collect();
    }

    return notifications
      .filter((n) => (args.unreadOnly ? !n.read : true))
      .slice(0, limit);
  },
});

/** Legacy unread count used by AdminHeader — kept for compatibility. */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", callerId).eq("read", false)
      )
      .collect();

    return unread.length;
  },
});

/** Unread notification count for the currently authenticated user. */
export const getUnreadNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", callerId).eq("read", false)
      )
      .collect();

    return unread.length;
  },
});

/**
 * Mark a single notification as read. Ownership is verified server-side:
 * the notification is only patched when it belongs to the authenticated
 * caller, so a user can never mutate another user's notifications.
 */
export const markNotificationAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.id);
    if (!notification || notification.userId !== callerId) {
      throw new Error("Notification not found");
    }

    if (!notification.read) {
      await ctx.db.patch(args.id, { read: true });
    }
    return { ok: true };
  },
});

/** Mark every unread notification of the authenticated user as read. */
export const markAllNotificationsAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", callerId).eq("read", false)
      )
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }

    return { marked: unread.length };
  },
});

const FANOUT_BATCH_SIZE = 200;

/**
 * INTERNAL - server-side fanout of an announcement to every registered
 * user. Never reachable from the client (internalMutation) and never
 * called from the frontend; publish mutations schedule it via
 * ctx.scheduler so large user bases don't blow the single-transaction
 * write limit - this function processes one page of users per
 * transaction and re-schedules itself until done.
 *
 * Duplicate safety: on the FIRST chunk only (cursor === undefined) it
 * checks whether notifications for this announcement already exist and
 * exits immediately if so, so an accidental double-publish never
 * creates duplicate notifications.
 */
export const fanoutAnnouncementNotifications = internalMutation({
  args: {
    announcementId: v.id("announcements"),
    announcementType: v.optional(
      v.union(
        v.literal("info"),
        v.literal("warning"),
        v.literal("maintenance"),
        v.literal("update"),
        v.literal("contest")
      )
    ),
    title: v.string(),
    message: v.string(),
    link: v.string(),
    cursor: v.optional(v.string()),
    sent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Duplicate guard - only meaningful on the first chunk, because the
    // guard itself relies on notifications that later chunks insert.
    if (args.cursor === undefined) {
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_announcement", (q) =>
          q.eq("announcementId", args.announcementId)
        )
        .first();
      if (existing) return { sent: 0, duplicate: true };
    }

    const now = Date.now();
    const page = await ctx.db
      .query("users")
      .paginate({ numItems: FANOUT_BATCH_SIZE, cursor: args.cursor ?? null });

    let sent = args.sent ?? 0;
    for (const user of page.page) {
      await ctx.db.insert("notifications", {
        userId: user._id,
        type: "announcement",
        title: args.title,
        message: args.message,
        announcementId: args.announcementId,
        announcementType: args.announcementType,
        read: false,
        link: args.link,
        createdAt: now,
      });
      sent += 1;
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.fanoutAnnouncementNotifications,
        {
          announcementId: args.announcementId,
          announcementType: args.announcementType,
          title: args.title,
          message: args.message,
          link: args.link,
          cursor: page.continueCursor,
          sent,
        }
      );
    }

    return { sent, duplicate: false };
  },
});
