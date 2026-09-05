/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as academy from "../academy.js";
import type * as academyAdmin from "../academyAdmin.js";
import type * as academySeedData from "../academySeedData.js";
import type * as achievements from "../achievements.js";
import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as announcements from "../announcements.js";
import type * as auditLogs from "../auditLogs.js";
import type * as auth from "../auth.js";
import type * as bookmarks from "../bookmarks.js";
import type * as challenges from "../challenges.js";
import type * as emailVerification from "../emailVerification.js";
import type * as executionLogs from "../executionLogs.js";
import type * as executions from "../executions.js";
import type * as follows from "../follows.js";
import type * as http from "../http.js";
import type * as judgeSubmissions from "../judgeSubmissions.js";
import type * as leaderboard from "../leaderboard.js";
import type * as likes from "../likes.js";
import type * as notifications from "../notifications.js";
import type * as problems from "../problems.js";
import type * as reports from "../reports.js";
import type * as roles from "../roles.js";
import type * as settings from "../settings.js";
import type * as showcase from "../showcase.js";
import type * as submissions from "../submissions.js";
import type * as talentConnectPosts from "../talentConnectPosts.js";
import type * as talentConnectSubmissions from "../talentConnectSubmissions.js";
import type * as teams from "../teams.js";
import type * as users from "../users.js";
import type * as webSubmissions from "../webSubmissions.js";
import type * as xp from "../xp.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  academy: typeof academy;
  academyAdmin: typeof academyAdmin;
  academySeedData: typeof academySeedData;
  achievements: typeof achievements;
  admin: typeof admin;
  analytics: typeof analytics;
  announcements: typeof announcements;
  auditLogs: typeof auditLogs;
  auth: typeof auth;
  bookmarks: typeof bookmarks;
  challenges: typeof challenges;
  emailVerification: typeof emailVerification;
  executionLogs: typeof executionLogs;
  executions: typeof executions;
  follows: typeof follows;
  http: typeof http;
  judgeSubmissions: typeof judgeSubmissions;
  leaderboard: typeof leaderboard;
  likes: typeof likes;
  notifications: typeof notifications;
  problems: typeof problems;
  reports: typeof reports;
  roles: typeof roles;
  settings: typeof settings;
  showcase: typeof showcase;
  submissions: typeof submissions;
  talentConnectPosts: typeof talentConnectPosts;
  talentConnectSubmissions: typeof talentConnectSubmissions;
  teams: typeof teams;
  users: typeof users;
  webSubmissions: typeof webSubmissions;
  xp: typeof xp;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
