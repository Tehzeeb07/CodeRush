import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!args.name.trim()) throw new Error("Team name is required");

    const teamId = await ctx.db.insert("teams", {
      ...args,
      ownerId: userId,
      createdAt: Date.now(),
    });

    // Owner is automatically an accepted member of their own team.
    await ctx.db.insert("teamMembers", {
      teamId,
      userId,
      status: "accepted",
      requestedAt: Date.now(),
    });

    return teamId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();

    return await Promise.all(
      teams.map(async (team) => {
        const members = await ctx.db
          .query("teamMembers")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .filter((q) => q.eq(q.field("status"), "accepted"))
          .collect();

        const owner = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", team.ownerId))
          .unique();

        return {
          ...team,
          ownerUsername: owner?.username ?? "unknown",
          memberCount: members.length,
        };
      })
    );
  },
});

export const get = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    const userId = await getAuthUserId(ctx);
    const team = await ctx.db.get(teamId);
    if (!team) return null;

    const allMembers = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();

    const withUsernames = await Promise.all(
      allMembers.map(async (m) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", m.userId))
          .unique();
        return { ...m, username: profile?.username ?? "unknown" };
      })
    );

    const isOwner = userId === team.ownerId;
    const myMembership = userId
      ? withUsernames.find((m) => m.userId === userId) ?? null
      : null;

    return {
      ...team,
      isOwner,
      myStatus: myMembership?.status ?? null, // null | "pending" | "accepted"
      accepted: withUsernames.filter((m) => m.status === "accepted"),
      // Pending requests are only meaningful (and only shown) to the owner
      pending: isOwner ? withUsernames.filter((m) => m.status === "pending") : [],
    };
  },
});

export const requestToJoin = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, { teamId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const team = await ctx.db.get(teamId);
    if (!team) throw new Error("Team not found");

    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", teamId).eq("userId", userId)
      )
      .unique();
    if (existing) throw new Error("You've already requested or joined this team");

    await ctx.db.insert("teamMembers", {
      teamId,
      userId,
      status: "pending",
      requestedAt: Date.now(),
    });
  },
});

export const respondToRequest = mutation({
  args: {
    teamId: v.id("teams"),
    applicantUserId: v.id("users"),
    accept: v.boolean(),
  },
  handler: async (ctx, { teamId, applicantUserId, accept }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const team = await ctx.db.get(teamId);
    if (!team) throw new Error("Team not found");
    if (team.ownerId !== userId) throw new Error("Only the team owner can do this");

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_user", (q) =>
        q.eq("teamId", teamId).eq("userId", applicantUserId)
      )
      .unique();
    if (!membership) throw new Error("Request not found");

    if (accept) {
      await ctx.db.patch(membership._id, { status: "accepted" });
    } else {
      await ctx.db.delete(membership._id);
    }
  },
});

export const myTeams = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    return await Promise.all(
      memberships.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        return team;
      })
    );
  },
});