/**
 * CodeRush - Code Academy admin backend.
 *
 * Every mutation resolves the caller identity server-side via
 * `resolveIdentity` and requires ADMIN or SUPER_ADMIN. Queries used by the
 * admin panel are gated the same way. Cascading deletes keep the hierarchy
 * (technology > course > module > lesson > exercise/quiz) consistent.
 */
import { v } from "convex/values";
import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveIdentity } from "./roles";
import type { Doc, Id } from "./_generated/dataModel";
import { ACADEMY_XP } from "./academy";
import { buildSeedCurriculum } from "./academySeedData";

const difficultyValidator = v.union(
  v.literal("beginner"),
  v.literal("intermediate"),
  v.literal("advanced")
);

/** Require an admin caller; throws otherwise. Returns the caller identity. */
async function requireAdmin(ctx: QueryCtx) {
  const callerId = await getAuthUserId(ctx);
  if (!callerId) throw new Error("Not authenticated");
  const caller = await resolveIdentity(ctx, callerId);
  if (!caller || (caller.role !== "ADMIN" && caller.role !== "SUPER_ADMIN")) {
    throw new Error("Insufficient permissions");
  }
  return { callerId, caller };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ================================================================
   TECHNOLOGIES
   ================================================================ */

export const upsertTechnology = mutation({
  args: {
    id: v.optional(v.id("academyTechnologies")),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = slugify(args.slug || args.name);
    if (!slug) throw new Error("Slug is required");

    const clash = await ctx.db
      .query("academyTechnologies")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (clash && clash._id !== args.id) {
      throw new Error("A technology with this slug already exists");
    }

    const t = Date.now();
    if (args.id) {
      await ctx.db.patch(args.id, {
        name: args.name,
        slug,
        description: args.description,
        ...(args.icon !== undefined ? { icon: args.icon } : {}),
        ...(args.color !== undefined ? { color: args.color } : {}),
        ...(args.sortOrder !== undefined ? { sortOrder: args.sortOrder } : {}),
        ...(args.isActive !== undefined ? { isActive: args.isActive } : {}),
        updatedAt: t,
      });
      return args.id;
    }
    const maxRow = await ctx.db.query("academyTechnologies").order("desc").first();
    return await ctx.db.insert("academyTechnologies", {
      name: args.name,
      slug,
      description: args.description,
      icon: args.icon,
      color: args.color,
      sortOrder: args.sortOrder ?? (maxRow ? maxRow.sortOrder + 1 : 0),
      isActive: args.isActive ?? true,
      createdAt: t,
      updatedAt: t,
    });
  },
});

export const deleteTechnology = mutation({
  args: { id: v.id("academyTechnologies") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const courses = await ctx.db
      .query("academyCourses")
      .withIndex("by_technology", (q) => q.eq("technologyId", args.id))
      .collect();
    for (const course of courses) {
      await deleteCourseCascade(ctx, course._id);
    }
    await ctx.db.delete(args.id);
    return null;
  },
});

/* ================================================================
   COURSES
   ================================================================ */

/**
 * Admin-gated upload URL for course cover photos. Mirrors the avatar flow in
 * convex/users.ts but requires ADMIN/SUPER_ADMIN so learners can never obtain
 * upload credentials. The returned URL is a one-time Convex storage upload URL.
 */
export const generateCourseCoverUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Resolve a freshly-uploaded cover storage id to its public URL, or undefined. */
async function resolveCoverUrl(
  ctx: MutationCtx,
  storageId: Id<"_storage"> | null | undefined
): Promise<string | undefined> {
  if (!storageId) return undefined;
  const url = await ctx.storage.getUrl(storageId);
  if (!url) throw new Error("Cover photo upload failed. Please try again.");
  return url;
}

export const upsertCourse = mutation({
  args: {
    id: v.optional(v.id("academyCourses")),
    technologyId: v.id("academyTechnologies"),
    title: v.string(),
    slug: v.string(),
    description: v.string(),
    difficulty: difficultyValidator,
    durationMinutes: v.optional(v.number()),
    xpReward: v.optional(v.number()),
    thumbnailUrl: v.optional(v.string()),
    /** New cover photo storage id, or `null` to remove the current cover. */
    coverImageStorageId: v.optional(v.union(v.null(), v.id("_storage"))),
    sortOrder: v.optional(v.number()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = slugify(args.slug || args.title);
    if (!slug) throw new Error("Slug is required");

    const clash = await ctx.db
      .query("academyCourses")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (clash && clash._id !== args.id) {
      throw new Error("A course with this slug already exists");
    }

    const t = Date.now();
    if (args.id) {
      const current = await ctx.db.get(args.id);
      if (!current) throw new Error("Course not found");

      // Resolve the cover change BEFORE patching so we never remove the old
      // image until the new upload has resolved and the patch succeeds.
      let coverPatch: {
        coverImageStorageId?: Id<"_storage">;
        coverImageUrl?: string;
      } | null = null;
      let orphanStorageId: Id<"_storage"> | undefined;
      if (args.coverImageStorageId !== undefined) {
        if (args.coverImageStorageId === null) {
          // Admin removed the cover photo — clear both fields (patching a
          // field to undefined deletes it) and free the stored file.
          if (current.coverImageStorageId) {
            orphanStorageId = current.coverImageStorageId;
          }
          coverPatch = { coverImageStorageId: undefined, coverImageUrl: undefined };
        } else {
          const url = await resolveCoverUrl(ctx, args.coverImageStorageId);
          if (
            current.coverImageStorageId &&
            String(current.coverImageStorageId) !== String(args.coverImageStorageId)
          ) {
            orphanStorageId = current.coverImageStorageId;
          }
          coverPatch = {
            coverImageStorageId: args.coverImageStorageId,
            coverImageUrl: url,
          };
        }
      }

      await ctx.db.patch(args.id, {
        technologyId: args.technologyId,
        title: args.title,
        slug,
        description: args.description,
        difficulty: args.difficulty,
        ...(args.durationMinutes !== undefined ? { durationMinutes: args.durationMinutes } : {}),
        ...(args.xpReward !== undefined ? { xpReward: args.xpReward } : {}),
        ...(args.thumbnailUrl !== undefined ? { thumbnailUrl: args.thumbnailUrl } : {}),
        ...(args.sortOrder !== undefined ? { sortOrder: args.sortOrder } : {}),
        ...(args.published !== undefined ? { published: args.published } : {}),
        ...(coverPatch ?? {}),
        updatedAt: t,
      });

      // Old stored file is freed only after the course update succeeded. This
      // is best-effort: a deletion failure must not roll back the course save.
      if (orphanStorageId) {
        try {
          await ctx.storage.delete(orphanStorageId);
        } catch {
          // Orphaned file cleanup is best-effort per the storage architecture.
        }
      }
      return args.id;
    }
    const siblings = await ctx.db
      .query("academyCourses")
      .withIndex("by_technology", (q) => q.eq("technologyId", args.technologyId))
      .collect();
    const coverUrl = await resolveCoverUrl(ctx, args.coverImageStorageId);
    return await ctx.db.insert("academyCourses", {
      technologyId: args.technologyId,
      title: args.title,
      slug,
      description: args.description,
      difficulty: args.difficulty,
      durationMinutes: args.durationMinutes,
      xpReward: args.xpReward ?? 100,
      thumbnailUrl: args.thumbnailUrl,
      coverImageStorageId:
        args.coverImageStorageId && typeof args.coverImageStorageId !== "undefined"
          ? args.coverImageStorageId
          : undefined,
      coverImageUrl: coverUrl,
      published: args.published ?? false,
      sortOrder: args.sortOrder ?? siblings.length,
      createdAt: t,
      updatedAt: t,
    });
  },
});

/** Delete a course and everything below it. */
export async function deleteCourseCascade(
  ctx: MutationCtx,
  courseId: Id<"academyCourses">
): Promise<void> {
  const course = await ctx.db.get(courseId);
  const modules = await ctx.db
    .query("academyModules")
    .withIndex("by_course", (q) => q.eq("courseId", courseId))
    .collect();
  for (const module of modules) {
    await deleteModuleCascade(ctx, module._id);
  }
  const progressRows = await ctx.db
    .query("academyProgress")
    .withIndex("by_course", (q) => q.eq("courseId", courseId))
    .collect();
  for (const row of progressRows) {
    await ctx.db.delete(row._id);
  }
  await ctx.db.delete(courseId);
  // Free the uploaded cover photo file (best-effort).
  if (course?.coverImageStorageId) {
    try {
      await ctx.storage.delete(course.coverImageStorageId);
    } catch {
      // Storage cleanup is best-effort — never block the course deletion.
    }
  }
}

export const deleteCourse = mutation({
  args: { id: v.id("academyCourses") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await deleteCourseCascade(ctx, args.id);
    return null;
  },
});

/* ================================================================
   MODULES
   ================================================================ */

export const upsertModule = mutation({
  args: {
    id: v.optional(v.id("academyModules")),
    courseId: v.id("academyCourses"),
    title: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const t = Date.now();
    if (args.id) {
      await ctx.db.patch(args.id, {
        courseId: args.courseId,
        title: args.title,
        ...(args.description !== undefined ? { description: args.description } : {}),
        ...(args.sortOrder !== undefined ? { sortOrder: args.sortOrder } : {}),
        updatedAt: t,
      });
      return args.id;
    }
    const siblings = await ctx.db
      .query("academyModules")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
    return await ctx.db.insert("academyModules", {
      courseId: args.courseId,
      title: args.title,
      description: args.description,
      sortOrder: args.sortOrder ?? siblings.length,
      createdAt: t,
      updatedAt: t,
    });
  },
});
/** Delete a module and everything below it. */
export async function deleteModuleCascade(
  ctx: MutationCtx,
  moduleId: Id<"academyModules">
): Promise<void> {
  const lessons = await ctx.db
    .query("academyLessons")
    .withIndex("by_module", (q) => q.eq("moduleId", moduleId))
    .collect();
  for (const lesson of lessons) {
    await deleteLessonCascade(ctx, lesson._id);
  }
  await ctx.db.delete(moduleId);
}

export const deleteModule = mutation({
  args: { id: v.id("academyModules") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await deleteModuleCascade(ctx, args.id);
    return null;
  },
});

/** Delete a lesson plus its exercise, quiz and quiz questions. */
export async function deleteLessonCascade(
  ctx: MutationCtx,
  lessonId: Id<"academyLessons">
): Promise<void> {
  const exercises = await ctx.db
    .query("academyExercises")
    .withIndex("by_lesson", (q) => q.eq("lessonId", lessonId))
    .collect();
  for (const exercise of exercises) {
    await ctx.db.delete(exercise._id);
  }
  const quizzes = await ctx.db
    .query("academyQuizzes")
    .withIndex("by_lesson", (q) => q.eq("lessonId", lessonId))
    .collect();
  for (const quiz of quizzes) {
    const questions = await ctx.db
      .query("academyQuizQuestions")
      .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
      .collect();
    for (const question of questions) {
      await ctx.db.delete(question._id);
    }
    await ctx.db.delete(quiz._id);
  }
  await ctx.db.delete(lessonId);
}

export const deleteLesson = mutation({
  args: { id: v.id("academyLessons") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await deleteLessonCascade(ctx, args.id);
    return null;
  },
});

/* ================================================================
   LESSONS - the full admin lesson editor save
   ================================================================ */

const contentBlockValidator = v.union(
  v.object({
    type: v.literal("heading"),
    level: v.union(v.literal(1), v.literal(2), v.literal(3)),
    text: v.string(),
  }),
  v.object({ type: v.literal("paragraph"), text: v.string() }),
  v.object({
    type: v.literal("list"),
    ordered: v.boolean(),
    items: v.array(v.string()),
  }),
  v.object({
    type: v.literal("code"),
    language: v.string(),
    code: v.string(),
    caption: v.optional(v.string()),
  }),
  v.object({
    type: v.literal("image"),
    url: v.string(),
    alt: v.optional(v.string()),
    caption: v.optional(v.string()),
  }),
  v.object({ type: v.literal("link"), text: v.string(), url: v.string() }),
  v.object({ type: v.literal("note"), text: v.string() }),
  v.object({ type: v.literal("warning"), text: v.string() }),
  v.object({ type: v.literal("tip"), text: v.string() })
);

const codeExampleValidator = v.object({
  title: v.optional(v.string()),
  language: v.string(),
  code: v.string(),
  expectedOutput: v.optional(v.string()),
  explanation: v.optional(v.string()),
});

/**
 * Create or update a lesson with its rich content, code examples, practice
 * exercise and quiz (questions included). One round trip for the whole editor.
 */
export const upsertLesson = mutation({
  args: {
    id: v.optional(v.id("academyLessons")),
    technologyIds: v.array(v.id("academyTechnologies")),
    courseId: v.id("academyCourses"),
    moduleId: v.id("academyModules"),
    title: v.string(),
    slug: v.string(),
    shortDescription: v.string(),
    difficulty: difficultyValidator,
    estimatedMinutes: v.optional(v.number()),
    content: v.array(contentBlockValidator),
    codeExamples: v.array(codeExampleValidator),
    sortOrder: v.optional(v.number()),
    published: v.optional(v.boolean()),
    exercise: v.optional(
      v.union(
        v.null(),
        v.object({
          id: v.optional(v.id("academyExercises")),
          title: v.string(),
          difficulty: difficultyValidator,
          question: v.string(),
          instructions: v.array(v.string()),
          starterCode: v.string(),
          language: v.string(),
          expectedOutput: v.optional(v.string()),
          solution: v.optional(v.string()),
          hints: v.optional(v.array(v.string())),
        })
      )
    ),
    quiz: v.optional(
      v.union(
        v.null(),
        v.object({
          id: v.optional(v.id("academyQuizzes")),
          title: v.string(),
          passingPercentage: v.number(),
          allowRetake: v.boolean(),
          questions: v.array(
            v.object({
              id: v.optional(v.id("academyQuizQuestions")),
              question: v.string(),
              options: v.array(v.object({ id: v.string(), text: v.string() })),
              correctAnswerId: v.string(),
              explanation: v.optional(v.string()),
            })
          ),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.technologyIds.length === 0) {
      throw new Error("At least one technology is required");
    }
    if (args.technologyIds.length > 4) {
      throw new Error("A lesson can have at most 4 technology types");
    }
    const slug = slugify(args.slug || args.title);
    if (!slug) throw new Error("Slug is required");

    const clash = await ctx.db
      .query("academyLessons")
      .withIndex("by_course_slug", (q) =>
        q.eq("courseId", args.courseId).eq("slug", slug)
      )
      .unique();
    if (clash && clash._id !== args.id) {
      throw new Error("A lesson with this slug already exists in the course");
    }

    const t = Date.now();
    let lessonId: Id<"academyLessons">;
    if (args.id) {
      await ctx.db.patch(args.id, {
        technologyIds: args.technologyIds,
        courseId: args.courseId,
        moduleId: args.moduleId,
        slug,
        title: args.title,
        shortDescription: args.shortDescription,
        difficulty: args.difficulty,
        estimatedMinutes: args.estimatedMinutes,
        content: args.content,
        codeExamples: args.codeExamples,
        ...(args.sortOrder !== undefined ? { sortOrder: args.sortOrder } : {}),
        ...(args.published !== undefined ? { published: args.published } : {}),
        updatedAt: t,
      });
      lessonId = args.id;
    } else {
      const siblings = await ctx.db
        .query("academyLessons")
        .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
        .collect();
      lessonId = await ctx.db.insert("academyLessons", {
        technologyIds: args.technologyIds,
        courseId: args.courseId,
        moduleId: args.moduleId,
        slug,
        title: args.title,
        shortDescription: args.shortDescription,
        difficulty: args.difficulty,
        estimatedMinutes: args.estimatedMinutes,
        content: args.content,
        codeExamples: args.codeExamples,
        sortOrder: args.sortOrder ?? siblings.length,
        published: args.published ?? false,
        createdAt: t,
        updatedAt: t,
      });
    }

    // ---- Practice exercise: create / update / delete -------------------
    const existingExercises = await ctx.db
      .query("academyExercises")
      .withIndex("by_lesson", (q) => q.eq("lessonId", lessonId))
      .collect();
    if (args.exercise) {
      const ex = args.exercise;
      if (ex.id) {
        await ctx.db.patch(ex.id, {
          lessonId,
          title: ex.title,
          difficulty: ex.difficulty,
          question: ex.question,
          instructions: ex.instructions,
          starterCode: ex.starterCode,
          language: ex.language,
          expectedOutput: ex.expectedOutput,
          solution: ex.solution,
          hints: ex.hints,
          updatedAt: t,
        });
        for (const stale of existingExercises) {
          if (stale._id !== ex.id) await ctx.db.delete(stale._id);
        }
      } else {
        for (const stale of existingExercises) {
          await ctx.db.delete(stale._id);
        }
        await ctx.db.insert("academyExercises", {
          lessonId,
          title: ex.title,
          difficulty: ex.difficulty,
          question: ex.question,
          instructions: ex.instructions,
          starterCode: ex.starterCode,
          language: ex.language,
          expectedOutput: ex.expectedOutput,
          solution: ex.solution,
          hints: ex.hints,
          createdAt: t,
          updatedAt: t,
        });
      }
    } else if (args.exercise === null) {
      for (const stale of existingExercises) {
        await ctx.db.delete(stale._id);
      }
    }

    // ---- Quiz: create / update / delete (questions synced) -------------
    const existingQuizzes = await ctx.db
      .query("academyQuizzes")
      .withIndex("by_lesson", (q) => q.eq("lessonId", lessonId))
      .collect();
    if (args.quiz) {
      const quiz = args.quiz;
      let quizId: Id<"academyQuizzes">;
      if (quiz.id) {
        await ctx.db.patch(quiz.id, {
          lessonId,
          title: quiz.title,
          passingPercentage: quiz.passingPercentage,
          allowRetake: quiz.allowRetake,
          updatedAt: t,
        });
        quizId = quiz.id;
        for (const stale of existingQuizzes) {
          if (stale._id !== quiz.id) await deleteQuizCascade(ctx, stale._id);
        }
      } else {
        for (const stale of existingQuizzes) {
          await deleteQuizCascade(ctx, stale._id);
        }
        quizId = await ctx.db.insert("academyQuizzes", {
          lessonId,
          title: quiz.title,
          passingPercentage: quiz.passingPercentage,
          allowRetake: quiz.allowRetake,
          createdAt: t,
          updatedAt: t,
        });
      }

      const existingQuestions = await ctx.db
        .query("academyQuizQuestions")
        .withIndex("by_quiz", (q) => q.eq("quizId", quizId))
        .collect();
      const keptIds = new Set<string>();
      for (let i = 0; i < quiz.questions.length; i++) {
        const q = quiz.questions[i];
        if (q.id) {
          await ctx.db.patch(q.id, {
            quizId,
            question: q.question,
            options: q.options,
            correctAnswerId: q.correctAnswerId,
            explanation: q.explanation,
            orderIndex: i,
          });
          keptIds.add(String(q.id));
        } else {
          const newId = await ctx.db.insert("academyQuizQuestions", {
            quizId,
            question: q.question,
            options: q.options,
            correctAnswerId: q.correctAnswerId,
            explanation: q.explanation,
            orderIndex: i,
          });
          keptIds.add(String(newId));
        }
      }
      for (const existing of existingQuestions) {
        if (!keptIds.has(String(existing._id))) {
          await ctx.db.delete(existing._id);
        }
      }
    } else if (args.quiz === null) {
      for (const stale of existingQuizzes) {
        await deleteQuizCascade(ctx, stale._id);
      }
    }

    return lessonId;
  },
});

async function deleteQuizCascade(
  ctx: MutationCtx,
  quizId: Id<"academyQuizzes">
): Promise<void> {
  const questions = await ctx.db
    .query("academyQuizQuestions")
    .withIndex("by_quiz", (q) => q.eq("quizId", quizId))
    .collect();
  for (const question of questions) {
    await ctx.db.delete(question._id);
  }
  await ctx.db.delete(quizId);
}

/* ================================================================
   PUBLISH / REORDER
   ================================================================ */

export const setCoursePublished = mutation({
  args: { id: v.id("academyCourses"), published: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { published: args.published, updatedAt: Date.now() });
    return null;
  },
});

export const setLessonPublished = mutation({
  args: { id: v.id("academyLessons"), published: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { published: args.published, updatedAt: Date.now() });
    return null;
  },
});

/** Reorder modules within a course. `moduleIds` = new order. */
export const reorderModules = mutation({
  args: {
    courseId: v.id("academyCourses"),
    moduleIds: v.array(v.id("academyModules")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (let i = 0; i < args.moduleIds.length; i++) {
      await ctx.db.patch(args.moduleIds[i], { sortOrder: i, updatedAt: Date.now() });
    }
    return null;
  },
});

/** Reorder lessons within a course. `lessonIds` = new order. */
export const reorderLessons = mutation({
  args: {
    courseId: v.id("academyCourses"),
    lessonIds: v.array(v.id("academyLessons")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (let i = 0; i < args.lessonIds.length; i++) {
      await ctx.db.patch(args.lessonIds[i], { sortOrder: i, updatedAt: Date.now() });
    }
    return null;
  },
});

/* ================================================================
   ADMIN QUERIES
   ================================================================ */

/** All technologies (including inactive) with course counts. */
export const listTechnologiesAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("academyTechnologies").collect();
    rows.sort((a, b) => a.sortOrder - b.sortOrder);
    const result = [];
    for (const tech of rows) {
      const courses = await ctx.db
        .query("academyCourses")
        .withIndex("by_technology", (q) => q.eq("technologyId", tech._id))
        .collect();
      result.push({ ...tech, courseCount: courses.length });
    }
    return result;
  },
});

/** Courses of one technology (including drafts) with lesson counts. */
export const listCoursesAdmin = query({
  args: { technologyId: v.id("academyTechnologies") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const courses = await ctx.db
      .query("academyCourses")
      .withIndex("by_technology", (q) => q.eq("technologyId", args.technologyId))
      .collect();
    courses.sort((a, b) => a.sortOrder - b.sortOrder);
    const result = [];
    for (const course of courses) {
      const lessons = await ctx.db
        .query("academyLessons")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();
      result.push({
        _id: course._id,
        technologyId: course.technologyId,
        title: course.title,
        slug: course.slug,
        description: course.description,
        difficulty: course.difficulty,
        published: course.published,
        xpReward: course.xpReward,
        /** Canonical cover photo (uploaded cover, falling back to legacy URL). */
        coverImage: course.coverImageUrl ?? course.thumbnailUrl ?? null,
        lessonCount: lessons.length,
      });
    }
    return result;
  },
});

/** Course admin tree: modules with lesson metas (including drafts). */
export const getCourseAdmin = query({
  args: { courseId: v.id("academyCourses") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const course = await ctx.db.get(args.courseId);
    if (!course) return null;
    const modules = await ctx.db
      .query("academyModules")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
    modules.sort((a, b) => a.sortOrder - b.sortOrder);
    const tree = [];
    for (const module of modules) {
      const lessons = await ctx.db
        .query("academyLessons")
        .withIndex("by_module", (q) => q.eq("moduleId", module._id))
        .collect();
      lessons.sort((a, b) => a.sortOrder - b.sortOrder);
      tree.push({
        _id: module._id,
        title: module.title,
        description: module.description ?? null,
        lessons: lessons.map((l) => ({
          _id: l._id,
          title: l.title,
          slug: l.slug,
          difficulty: l.difficulty,
          published: l.published,
        })),
      });
    }
    return {
      course,
      modules: tree,
    };
  },
});

/** Full lesson document for the admin editor (includes answers). */
export const getLessonAdmin = query({
  args: { lessonId: v.id("academyLessons") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) return null;
    const exercise = await ctx.db
      .query("academyExercises")
      .withIndex("by_lesson", (q) => q.eq("lessonId", lesson._id))
      .first();
    const quiz = await ctx.db
      .query("academyQuizzes")
      .withIndex("by_lesson", (q) => q.eq("lessonId", lesson._id))
      .first();
    let quizFull: {
      _id: string;
      title: string;
      passingPercentage: number;
      allowRetake: boolean;
      questions: Array<{
        _id: string;
        question: string;
        options: Array<{ id: string; text: string }>;
        correctAnswerId: string;
        explanation: string | null;
      }>;
    } | null = null;
    if (quiz) {
      const questions = await ctx.db
        .query("academyQuizQuestions")
        .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
        .collect();
      questions.sort((a, b) => a.orderIndex - b.orderIndex);
      quizFull = {
        _id: quiz._id,
        title: quiz.title,
        passingPercentage: quiz.passingPercentage,
        allowRetake: quiz.allowRetake,
        questions: questions.map((q) => ({
          _id: q._id,
          question: q.question,
          options: q.options,
          correctAnswerId: q.correctAnswerId,
          explanation: q.explanation ?? null,
        })),
      };
    }
    return {
      lesson,
      exercise: exercise ?? null,
      quiz: quizFull,
    };
  },
});

/* ================================================================
   SEED - initial C++ / HTML / CSS / JavaScript curriculum
   ================================================================ */

/**
 * Seed the starter curriculum from `academySeedData`. Idempotent: skips any
 * technology slug that already exists, so it can be re-run safely.
 */
export const seedAcademyContent = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const curriculum = buildSeedCurriculum();
    let created = { technologies: 0, courses: 0, modules: 0, lessons: 0, quizzes: 0, exercises: 0 };

    for (const techSeed of curriculum) {
      const existingTech = await ctx.db
        .query("academyTechnologies")
        .withIndex("by_slug", (q) => q.eq("slug", techSeed.technology.slug))
        .unique();
      if (existingTech) continue;

      const t = Date.now();
      const techId = await ctx.db.insert("academyTechnologies", {
        ...techSeed.technology,
        isActive: true,
        createdAt: t,
        updatedAt: t,
      });
      created.technologies += 1;

      for (let ci = 0; ci < techSeed.courses.length; ci++) {
        const courseSeed = techSeed.courses[ci];
        const courseId = await ctx.db.insert("academyCourses", {
          technologyId: techId,
          ...courseSeed.course,
          sortOrder: ci,
          published: true,
          createdAt: t,
          updatedAt: t,
        });
        for (let mi = 0; mi < courseSeed.modules.length; mi++) {
          const moduleSeed = courseSeed.modules[mi];
          const moduleId = await ctx.db.insert("academyModules", {
            courseId,
            title: moduleSeed.title,
            description: moduleSeed.description,
            sortOrder: mi,
            createdAt: t,
            updatedAt: t,
          });
          created.modules += 1;

          for (let li = 0; li < moduleSeed.lessons.length; li++) {
            const lessonSeed = moduleSeed.lessons[li];
            const lessonId = await ctx.db.insert("academyLessons", {
              technologyIds: [techId],
              courseId,
              moduleId,
              ...lessonSeed.lesson,
              published: true,
              sortOrder: li,
              createdAt: t,
              updatedAt: t,
            });
            created.lessons += 1;

            if (lessonSeed.exercise) {
              await ctx.db.insert("academyExercises", {
                lessonId,
                ...lessonSeed.exercise,
                createdAt: t,
                updatedAt: t,
              });
              created.exercises += 1;
            }
            if (lessonSeed.quiz) {
              const quizId = await ctx.db.insert("academyQuizzes", {
                lessonId,
                title: lessonSeed.quiz.title,
                passingPercentage: lessonSeed.quiz.passingPercentage,
                allowRetake: lessonSeed.quiz.allowRetake,
                createdAt: t,
                updatedAt: t,
              });
              for (let qi = 0; qi < lessonSeed.quiz.questions.length; qi++) {
                await ctx.db.insert("academyQuizQuestions", {
                  quizId,
                  ...lessonSeed.quiz.questions[qi],
                  orderIndex: qi,
                });
              }
              created.quizzes += 1;
            }
          }
        }
      }
    }
    return created;
  },
});
