/**
 * CodeRush — Code Academy learning backend (public browsing, progress tracking,
 * practice+quiz submissions,and idempotent XP rewards).
 *
 * Everything a learner can touch lives here. Admin authoring lives in
 * `convex/academyAdmin.ts`. XP is granted exclusively through the shared
 * `awardAcademyXp` helper below, which syncs `profiles.xp` and `userStats`
 * (points/xp) so Code Academy rewards feed the existing leaderboard system.

 * Every reward is keyed by an idempotent `uniqueKey`, so re-opening or
 * re-completing content can never farm XP.

 */
import { v } from "convex/values";
import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";

/** XP amounts for every Code Academy reward type (spec §9). */
export const ACADEMY_XP = {
  lesson: 10,
  practice: 30,
  quiz: 20,
  module: 50,
  course: 100,
} as const;

export type AcademyRewardType =
  | "lesson_completed"
  | "practice_completed"
  | "quiz_completed"
  | "module_completed"
  | "course_completed";

export type AcademyDifficulty = "beginner" | "intermediate" | "advanced";

/* ================================================================
   REWARDS — the only place academy XP is created
   ================================================================ */

/**
 * Grant one academy reward exactly once, idempotently. Keeps `profiles.xp`
 * (displayed XP) and `userStats` (leaderboard points/XP) strictly in sync,
 * mirroring how submission XP works elsewhere in CodeRush.
 */
async function awardAcademyXp(
  ctx: MutationCtx,
  params: {
    userId: Id<"users">;
    type: AcademyRewardType;
    amount: number;
    courseId?: Id<"academyCourses">;
    lessonId?: Id<"academyLessons">;
    moduleId?: Id<"academyModules">;
    /** Scope id that identifies this reward (e.g. the lesson id). */
    uniqueKeyScope: string;
  }
): Promise<boolean> {
  const uniqueKey = `academy:${params.type}:${params.userId}:${params.uniqueKeyScope}`;
  const existing = await ctx.db
    .query("academyRewards")
    .withIndex("by_unique_key", (q) => q.eq("uniqueKey", uniqueKey))
    .unique();
  if (existing) return false;

  const createdAt = Date.now();
  await ctx.db.insert("academyRewards", {
    userId: params.userId,
    type: params.type,
    amount: params.amount,
    ...(params.courseId ? { courseId: params.courseId } : {}),
    ...(params.lessonId ? { lessonId: params.lessonId } : {}),
    ...(params.moduleId ? { moduleId: params.moduleId } : {}),
    uniqueKey,
    createdAt,
  });
  await ctx.db.insert("xpLedger", {
    userId: params.userId,
    amount: params.amount,
    reason: params.type,
    uniqueKey,
    createdAt,
  });

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", params.userId))
    .unique();
  if (profile) {
    await ctx.db.patch(profile._id, { xp: (profile.xp ?? 0) + params.amount });
  }

  let stats = await ctx.db
    .query("userStats")
    .withIndex("by_user", (q) => q.eq("userId", params.userId))
    .unique();
  if (!stats) {
    await ctx.db.insert("userStats", {
      userId: params.userId,
      points: params.amount,
      xp: params.amount,
      totalSubmissions: 0,
      successfulSubmissions: 0,
      failedSubmissions: 0,
      problemsSolved: 0,
      updatedAt: createdAt,
    });
  } else {
    await ctx.db.patch(stats._id, {
      points: stats.points + params.amount,
      xp: (stats.xp ?? stats.points ?? 0) + params.amount,
      updatedAt: createdAt,
    });
  }
  return true;
}
/* ================================================================
   COURSE STRUCTURE HELPERS
   ================================================================ */

/** Modules (sorted) with their lessons (sorted) for one course. */
interface CourseStructure {
  modules: Array<{
    module: Doc<"academyModules">;
    lessons: Doc<"academyLessons">[];
  }>;
  /** All lessons of the course in canonical (module, sortOrder) order. */
  sortedLessons: Doc<"academyLessons">[];
  totalLessons: number;
}

async function loadCourseStructure(
  ctx: QueryCtx,
  courseId: Id<"academyCourses">
): Promise<CourseStructure> {
  const modules = await ctx.db
    .query("academyModules")
    .withIndex("by_course", (q) => q.eq("courseId", courseId))
    .collect();
  modules.sort((a, b) => a.sortOrder - b.sortOrder);

  const lessons = await ctx.db
    .query("academyLessons")
    .withIndex("by_course", (q) => q.eq("courseId", courseId))
    .collect();
  lessons.sort((a, b) => a.sortOrder - b.sortOrder);

  const byModule = new Map<string, Doc<"academyLessons">[]>();
  for (const lesson of lessons) {
    const key = String(lesson.moduleId);
    const bucket = byModule.get(key);
    if (bucket) bucket.push(lesson);
    else byModule.set(key, [lesson]);
  }

  return {
    modules: modules.map((m) => ({
      module: m,
      lessons: byModule.get(String(m._id)) ?? [],
    })),
    sortedLessons: lessons,
    totalLessons: lessons.length,
  };
}

/**
 * Sequential unlock: a lesson is unlocked when it is published and every
 * previous lesson in the course is completed. The first lesson is always
 * unlocked, so new learners can start immediately.
 */
function computeUnlockFlags(
  sortedLessons: Doc<"academyLessons">[],
  progress: Doc<"academyProgress"> | null
): boolean[] {
  const completed = new Set(
    (progress ? progress.completedLessonIds : []).map(String)
  );
  const flags: boolean[] = [];
  let previousCompleted = true;
  for (const lesson of sortedLessons) {
    flags.push(lesson.published && previousCompleted);
    previousCompleted = completed.has(String(lesson._id));
  }
  return flags;
}

/** Fetch-or-create the per-user progress row for a course. */
async function getOrCreateProgress(
  ctx: MutationCtx,
  userId: Id<"users">,
  courseId: Id<"academyCourses">
): Promise<Doc<"academyProgress">> {
  const existing = await ctx.db
    .query("academyProgress")
    .withIndex("by_user_course", (q) =>
      q.eq("userId", userId).eq("courseId", courseId)
    )
    .unique();
  if (existing) return existing;

  const course = await ctx.db.get(courseId);
  if (!course) throw new Error("Course not found");
  const now = Date.now();
  const id = await ctx.db.insert("academyProgress", {
    userId,
    courseId,
    technologyId: course.technologyId,
    lastAccessedAt: now,
    completedLessonIds: [],
    completedModuleIds: [],
    completedExerciseIds: [],
    completedQuizIds: [],
    quizScores: [],
    completed: false,
    xpEarned: 0,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create progress row");
  return created;
}

/** Resolve technology + course (+ optional lesson) by slugs, for public reads. */
async function resolveLessonContext(
  ctx: QueryCtx,
  args: {
    technologySlug: string;
    courseSlug: string;
    lessonSlug?: string;
  }
): Promise<{
  tech: Doc<"academyTechnologies">;
  course: Doc<"academyCourses">;
  lesson: Doc<"academyLessons"> | null;
} | null> {
  const tech = await ctx.db
    .query("academyTechnologies")
    .withIndex("by_slug", (q) => q.eq("slug", args.technologySlug))
    .unique();
  if (!tech || !tech.isActive) return null;

  const course = await ctx.db
    .query("academyCourses")
    .withIndex("by_slug", (q) => q.eq("slug", args.courseSlug))
    .unique();
  if (!course || course.technologyId !== tech._id || !course.published) {
    return null;
  }

  const lessonSlug = args.lessonSlug;
  if (!lessonSlug) {
    return { tech, course, lesson: null };
  }

  const lesson = await ctx.db
    .query("academyLessons")
    .withIndex("by_course_slug", (q) =>
      q.eq("courseId", course._id).eq("slug", lessonSlug)
    )
    .unique();
  if (!lesson || !lesson.published) return null;

  return { tech, course, lesson };
}
/* ================================================================
   PUBLIC BROWSING QUERIES
   ================================================================ */

/**
 * Active technologies for the Code Academy landing page. Nothing about the
 * supported languages is hardcoded in the UI — whatever the admin creates
 * here appears across Code Academy.
 */
export const listTechnologies = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("academyTechnologies")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    rows.sort((a, b) => a.sortOrder - b.sortOrder);

    const result = [];
    for (const tech of rows) {
      const courses = await ctx.db
        .query("academyCourses")
        .withIndex("by_technology", (q) => q.eq("technologyId", tech._id))
        .collect();
      const published = courses.filter((c) => c.published);
      let lessonCount = 0;
      for (const course of published) {
        const lessons = await ctx.db
          .query("academyLessons")
          .withIndex("by_course", (q) => q.eq("courseId", course._id))
          .collect();
        lessonCount += lessons.length;
      }
      result.push({
        _id: tech._id,
        name: tech.name,
        slug: tech.slug,
        description: tech.description,
        icon: tech.icon ?? null,
        color: tech.color ?? null,
        courseCount: published.length,
        lessonCount,
      });
    }
    return result;
  },
});

/** One technology with its published courses and the viewer's progress. */
export const getTechnologyPage = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const tech = await ctx.db
      .query("academyTechnologies")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!tech || !tech.isActive) return null;

    const userId = await getAuthUserId(ctx);
    const courses = await ctx.db
      .query("academyCourses")
      .withIndex("by_technology", (q) => q.eq("technologyId", tech._id))
      .collect();
    courses.sort((a, b) => a.sortOrder - b.sortOrder);
    const result = [];
    for (const course of courses) {
      if (!course.published) continue;
      const lessons = await ctx.db
        .query("academyLessons")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();
      let progress: {
        percent: number;
        completed: boolean;
        lastAccessedAt: number;
      } | null = null;
      if (userId) {
        const prog = await ctx.db
          .query("academyProgress")
          .withIndex("by_user_course", (q) => q.eq("userId", userId).eq("courseId", course._id))
          .unique();
        if (prog) {
          progress = {
            percent: lessons.length > 0 ? Math.round((prog.completedLessonIds.length / lessons.length) * 100) : 0,
            completed: prog.completed,
            lastAccessedAt: prog.lastAccessedAt,
          };
        }
      }
      result.push({
        _id: course._id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        difficulty: course.difficulty,
        durationMinutes: course.durationMinutes ?? null,
        xpReward: course.xpReward,
        /** Canonical cover photo (uploaded cover, falling back to legacy URL). */
        coverImage: course.coverImageUrl ?? course.thumbnailUrl ?? null,
        lessonCount: lessons.length,
        progress,
      });
    }

    return {
      _id: tech._id,
      name: tech.name,
      slug: tech.slug,
      description: tech.description,
      icon: tech.icon ?? null,
      color: tech.color ?? null,
      courses: result,
    };
  },
});

/** Published courses for landing cards, with optional filters. */
export const listCourses = query({
  args: {
    technologySlug: v.optional(v.string()),
    difficulty: v.optional(v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    )),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    let courses = await ctx.db
      .query("academyCourses")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();

    if (args.technologySlug) {
      const techSlug = args.technologySlug;
      const tech = await ctx.db
        .query("academyTechnologies")
        .withIndex("by_slug", (q) => q.eq("slug", techSlug))
        .unique();
      courses = tech ? courses.filter((c) => c.technologyId === tech._id) : [];
    }
    if (args.difficulty) {
      courses = courses.filter((c) => c.difficulty === args.difficulty);
    }
    if (args.search && args.search.trim()) {
      const q = args.search.trim().toLowerCase();
      courses = courses.filter(
        (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      );
    }
    courses.sort((a, b) => a.sortOrder - b.sortOrder);
    courses = courses.slice(0, Math.min(args.limit ?? 100, 100));

    const result = [];
    for (const course of courses) {
      const tech = await ctx.db.get(course.technologyId);
      const lessons = await ctx.db
        .query("academyLessons")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();
      let progress: { percent: number; completed: boolean } | null = null;
      if (userId) {
        const prog = await ctx.db
          .query("academyProgress")
          .withIndex("by_user_course", (q) => q.eq("userId", userId).eq("courseId", course._id))
          .unique();
        if (prog) {
          progress = {
            percent: lessons.length > 0 ? Math.round((prog.completedLessonIds.length / lessons.length) * 100) : 0,
            completed: prog.completed,
          };
        }
      }
      result.push({
        _id: course._id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        difficulty: course.difficulty,
        durationMinutes: course.durationMinutes ?? null,
        xpReward: course.xpReward,
        /** Canonical cover photo (uploaded cover, falling back to legacy URL). */
        coverImage: course.coverImageUrl ?? course.thumbnailUrl ?? null,
        lessonCount: lessons.length,
        technology: tech
          ? { name: tech.name, slug: tech.slug, icon: tech.icon ?? null, color: tech.color ?? null }
          : null,
        progress,
      });
    }
    return result;
  },
});

/**
 * Course page: course + full metadata tree (modules and lesson metas, NO
 * lesson content), the viewer's progress, unlock flags and continue target.
 */
export const getCoursePage = query({
  args: { technologySlug: v.string(), courseSlug: v.string() },
  handler: async (ctx, args) => {
    const tech = await ctx.db
      .query("academyTechnologies")
      .withIndex("by_slug", (q) => q.eq("slug", args.technologySlug))
      .unique();
    if (!tech || !tech.isActive) return null;

    const course = await ctx.db
      .query("academyCourses")
      .withIndex("by_slug", (q) => q.eq("slug", args.courseSlug))
      .unique();
    if (!course || course.technologyId !== tech._id || !course.published) return null;

    const userId = await getAuthUserId(ctx);
    const progress = userId
      ? await ctx.db
          .query("academyProgress")
          .withIndex("by_user_course", (q) => q.eq("userId", userId).eq("courseId", course._id))
          .unique()
      : null;

    const structure = await loadCourseStructure(ctx, course._id);
    const unlockFlags = computeUnlockFlags(structure.sortedLessons, progress);
    const completedLessonIds = progress ? progress.completedLessonIds : [];

    const modules = structure.modules.map((m) => ({
      _id: m.module._id,
      title: m.module.title,
      description: m.module.description ?? null,
      lessons: m.lessons.map((l) => ({
        _id: l._id,
        slug: l.slug,
        title: l.title,
        shortDescription: l.shortDescription,
        difficulty: l.difficulty,
        estimatedMinutes: l.estimatedMinutes ?? null,
        published: l.published,
      })),
    }));

    // Continue target: last-accessed lesson, else first uncompleted lesson.
    let continueLessonSlug: string | null = null;
    const byId = new Map(structure.sortedLessons.map((l) => [String(l._id), l]));
    const resolvedContinue =
      progress?.lastAccessedLessonId
        ? byId.get(String(progress.lastAccessedLessonId))
        : undefined;
    if (resolvedContinue && resolvedContinue.published) {
      continueLessonSlug = resolvedContinue.slug;
    } else {
      const completedSet = new Set(completedLessonIds.map(String));
      const nextUncompleted = structure.sortedLessons.find(
        (l) => l.published &&
          !completedSet.has(String(l._id))
      );
      continueLessonSlug = nextUncompleted ? nextUncompleted.slug : null;
    }

    const totalLessons = structure.totalLessons;
    return {
      course: {
        _id: course._id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        difficulty: course.difficulty,
        durationMinutes: course.durationMinutes ?? null,
        xpReward: course.xpReward,
        /** Canonical cover photo (uploaded cover, falling back to legacy URL). */
        coverImage: course.coverImageUrl ?? course.thumbnailUrl ?? null,
        moduleCount: structure.modules.length,
      },
      technology: { name: tech.name, slug: tech.slug, icon: tech.icon ?? null, color: tech.color ?? null },
      modules,
      totalLessons,
      progress: progress
        ? {
            percent: totalLessons > 0 ? Math.round((progress.completedLessonIds.length / totalLessons) * 100) : 0,
            completedLessonCount: progress.completedLessonIds.length,
            completed: progress.completed,
            completedAt: progress.completedAt ?? null,
            xpEarned: progress.xpEarned,
          }
        : null,
      continueLessonSlug,
      completedLessonIds,
      unlockFlags,
    };
  },
});

/**
 * Lesson page data: the single lesson (with content), its exercise, its quiz
 * (sanitized - no answers), the sidebar tree, unlock flags and prev/next.
 * Loads lesson content ONLY for the current lesson (performance rule).
 */
export const getLessonPage = query({
  args: {
    technologySlug: v.string(),
    courseSlug: v.string(),
    lessonSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveLessonContext(ctx, args);
    if (!resolved || !resolved.lesson) return null;
    const { tech, course, lesson } = resolved;

    const userId = await getAuthUserId(ctx);
    const progress = userId
      ? await ctx.db
          .query("academyProgress")
          .withIndex("by_user_course", (q) => q.eq("userId", userId).eq("courseId", course._id))
          .unique()
      : null;

    const structure = await loadCourseStructure(ctx, course._id);
    const unlockFlags = computeUnlockFlags(structure.sortedLessons, progress);
    const flatIndex = structure.sortedLessons.findIndex((l) => l._id === lesson._id);
    if (flatIndex === -1) return null;
    const unlocked = unlockFlags[flatIndex] ?? false;

    const prevLesson = flatIndex > 0 ? structure.sortedLessons[flatIndex - 1] : null;
    const nextLesson =
      flatIndex < structure.sortedLessons.length - 1
        ? structure.sortedLessons[flatIndex + 1]
        : null;

    const completedSet = new Set((progress ? progress.completedLessonIds : []).map(String));
    const exerciseCompleted = progress
      ? progress.completedExerciseIds.some((id) => String(id) === String(lesson._id))
      : false;
    const quizPassed = progress
      ? progress.completedQuizIds.some((id) => String(id) === String(lesson._id))
      : false;

    // Sidebar tree with per-lesson state.
    const modules = structure.modules.map((m) => ({
      _id: m.module._id,
      title: m.module.title,
      lessons: m.lessons.map((l) => ({
        _id: l._id,
        slug: l.slug,
        title: l.title,
        state: completedSet.has(String(l._id))
          ? ("completed" as const)
          : l._id === lesson._id
            ? ("current" as const)
            : ("locked" as const),
      })),
    }));

    // Exercise (full) when present.
    const exerciseDoc = await ctx.db
      .query("academyExercises")
      .withIndex("by_lesson", (q) => q.eq("lessonId", lesson._id))
      .first();

    // Quiz (sanitized) when present.
    const quizDoc = await ctx.db
      .query("academyQuizzes")
      .withIndex("by_lesson", (q) => q.eq("lessonId", lesson._id))
      .first();
    let quiz: {
      _id: string;
      title: string;
      passingPercentage: number;
      allowRetake: boolean;
      questions: Array<{ _id: string; question: string; options: Array<{ id: string; text: string }> }>;
    } | null = null;
    if (quizDoc) {
      const questions = await ctx.db
        .query("academyQuizQuestions")
        .withIndex("by_quiz", (q) => q.eq("quizId", quizDoc._id))
        .collect();
      questions.sort((a, b) => a.orderIndex - b.orderIndex);
      quiz = {
        _id: quizDoc._id,
        title: quizDoc.title,
        passingPercentage: quizDoc.passingPercentage,
        allowRetake: quizDoc.allowRetake,
        questions: questions.map((q) => ({
          _id: q._id,
          question: q.question,
          options: q.options,
        })),
      };
    }

    const totalLessons = structure.totalLessons;
    return {
      lesson: {
        _id: lesson._id,
        slug: lesson.slug,
        title: lesson.title,
        shortDescription: lesson.shortDescription,
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes ?? null,
        content: lesson.content,
        codeExamples: lesson.codeExamples,
      },
      course: {
        _id: course._id,
        title: course.title,
        slug: course.slug,
        difficulty: course.difficulty,
      },
      technology: { name: tech.name, slug: tech.slug, icon: tech.icon ?? null, color: tech.color ?? null },
      modules,
      totalLessons,
      completedLessonCount: progress ? progress.completedLessonIds.length : 0,
      percent: totalLessons > 0 && progress ? Math.round((progress.completedLessonIds.length / totalLessons) * 100) : 0,
      unlocked,
      lessonCompleted: completedSet.has(String(lesson._id)),
      exercise: exerciseDoc
        ? {
            _id: exerciseDoc._id,
            title: exerciseDoc.title,
            question: exerciseDoc.question,
            instructions: exerciseDoc.instructions,
            starterCode: exerciseDoc.starterCode,
            language: exerciseDoc.language,
            expectedOutput: exerciseDoc.expectedOutput ?? null,
            hints: exerciseDoc.hints ?? null,
            difficulty: exerciseDoc.difficulty,
          }
        : null,
      exerciseCompleted,
      quiz,
      quizPassed,
      prev: prevLesson ? { slug: prevLesson.slug, title: prevLesson.title } : null,
      next: nextLesson ? { slug: nextLesson.slug, title: nextLesson.title } : null,
    };
  },
});

/* ================================================================
   USER DASHBOARD QUERIES
   ================================================================ */

/**
 * Everything the Code Academy dashboard/landing needs about the signed-in
 * learner: per-course progress, continue-learning target, overall stats and
 * per-technology progress percentages.
 */
export const getMyAcademyOverview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const progressRows = await ctx.db
      .query("academyProgress")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    let lessonsCompleted = 0;
    let practicesCompleted = 0;
    let quizzesPassed = 0;
    let coursesCompleted = 0;
    let xpEarned = 0;
    const courses = [];
    const techAgg = new Map<
      string,
      { name: string; slug: string; icon: string | null; color: string | null; done: number; total: number; completedCourses: number; totalCourses: number }
    >();

    for (const progress of progressRows) {
      const course = await ctx.db.get(progress.courseId);
      if (!course || !course.published) continue;
      const tech = await ctx.db.get(progress.technologyId);
      const structure = await loadCourseStructure(ctx, course._id);
      const totalLessons = structure.totalLessons;
      const completedCount = progress.completedLessonIds.length;
      const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      lessonsCompleted += completedCount;
      practicesCompleted += progress.completedExerciseIds.length;
      quizzesPassed += progress.completedQuizIds.length;
      if (progress.completed) coursesCompleted += 1;
      xpEarned += progress.xpEarned;

      // Continue target = last-accessed, else first uncompleted.
      const byId = new Map(structure.sortedLessons.map((l) => [String(l._id), l]));
      const lastAccessed = progress.lastAccessedLessonId
        ? byId.get(String(progress.lastAccessedLessonId))
        : undefined;
      const completedSet = new Set(progress.completedLessonIds.map(String));
      const nextLesson = structure.sortedLessons.find(
        (l) => l.published && !completedSet.has(String(l._id))
      );
      const target = lastAccessed && lastAccessed.published ? lastAccessed : nextLesson ?? null;

      const techMeta = tech
        ? { name: tech.name, slug: tech.slug, icon: tech.icon ?? null, color: tech.color ?? null }
        : { name: "Unknown", slug: "", icon: null, color: null };

      courses.push({
        course: {
          _id: course._id,
          title: course.title,
          slug: course.slug,
          difficulty: course.difficulty,
          description: course.description,
          /** Canonical cover photo (uploaded cover, falling back to legacy URL). */
          coverImage: course.coverImageUrl ?? course.thumbnailUrl ?? null,
        },
        technology: techMeta,
        percent,
        completed: progress.completed,
        completedAt: progress.completedAt ?? null,
        lastAccessedAt: progress.lastAccessedAt,
        completedLessonCount: completedCount,
        totalLessons,
        xpEarned: progress.xpEarned,
        continueLesson: target
          ? { slug: target.slug, title: target.title }
          : null,
      });

      const key = String(progress.technologyId);
      const agg = techAgg.get(key) ?? {
        name: techMeta.name,
        slug: techMeta.slug,
        icon: techMeta.icon,
        color: techMeta.color,
        done: 0,
        total: 0,
        completedCourses: 0,
        totalCourses: 0,
      };
      agg.done += completedCount;
      agg.total += totalLessons;
      agg.totalCourses += 1;
      if (progress.completed) agg.completedCourses += 1;
      techAgg.set(key, agg);
    }

    const perTechnology = Array.from(techAgg.values()).map((t) => ({
      name: t.name,
      slug: t.slug,
      icon: t.icon,
      color: t.color,
      percent: t.total > 0 ? Math.round((t.done / t.total) * 100) : 0,
      completedCourses: t.completedCourses,
      totalCourses: t.totalCourses,
    }));

    return {
      stats: {
        lessonsCompleted,
        practicesCompleted,
        quizzesPassed,
        coursesCompleted,
        xpEarned,
      },
      courses,
      perTechnology,
    };
  },
});

/** The learner's most recently viewed lessons (Recently viewed section). */
export const getRecentlyViewedLessons = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const limit = Math.min(args.limit ?? 6, 12);
    const progressRows = await ctx.db
      .query("academyProgress")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    const result = [];
    for (const progress of progressRows) {
      if (!progress.lastAccessedLessonId) continue;
      const lesson = await ctx.db.get(progress.lastAccessedLessonId);
      if (!lesson) continue;
      const course = await ctx.db.get(progress.courseId);
      const tech = await ctx.db.get(progress.technologyId);
      result.push({
        lessonId: lesson._id,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        courseId: course ? course._id : null,
        courseTitle: course ? course.title : "",
        courseSlug: course ? course.slug : "",
        technologySlug: tech ? tech.slug : "",
        technologyName: tech ? tech.name : "",
        lastAccessedAt: progress.lastAccessedAt,
        completed: progress.completedLessonIds.some((id) => String(id) === String(lesson._id)),
      });
    }
    return result;
  },
});

/** Learning badges: one per completed course (course_completed rewards). */
export const getMyAcademyBadges = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rewards = await ctx.db
      .query("academyRewards")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("type", "course_completed"))
      .collect();
    rewards.sort((a, b) => b.createdAt - a.createdAt);
    const result = [];
    for (const reward of rewards) {
      if (!reward.courseId) continue;
      const course = await ctx.db.get(reward.courseId);
      if (!course) continue;
      const tech = await ctx.db.get(course.technologyId);
      result.push({
        courseId: course._id,
        courseTitle: course.title,
        courseSlug: course.slug,
        technologyName: tech ? tech.name : "",
        technologySlug: tech ? tech.slug : "",
        earnedAt: reward.createdAt,
        xp: reward.amount,
      });
    }
    return result;
  },
});

/* ================================================================
   USER MUTATIONS
   ================================================================ */

/**
 * Record that the signed-in user opened a lesson. Drives "Continue
 * Learning", "Recently viewed" and the current-position markers. Safe to
 * call on every lesson view — it never awards XP.
 */
export const trackLessonAccess = mutation({
  args: {
    technologySlug: v.string(),
    courseSlug: v.string(),
    lessonSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const resolved = await resolveLessonContext(ctx, args);
    if (!resolved || !resolved.lesson) return null;
    const { course, lesson } = resolved;

    const progress = await getOrCreateProgress(ctx, userId, course._id);
    const t = Date.now();
    await ctx.db.patch(progress._id, {
      currentModuleId: lesson.moduleId,
      currentLessonId: lesson._id,
      lastAccessedLessonId: lesson._id,
      lastAccessedAt: t,
      updatedAt: t,
    });
    return null;
  },
});

/**
 * Mark a lesson as completed. Awards +10 lesson XP once, +50 module bonus
 * when the whole module finishes, and +100 course bonus (plus a badge
 * notification) when the whole course finishes — all idempotently.
 */
export const completeLesson = mutation({
  args: {
    technologySlug: v.string(),
    courseSlug: v.string(),
    lessonSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const resolved = await resolveLessonContext(ctx, args);
    if (!resolved || !resolved.lesson) throw new Error("Lesson not found");
    const { course, lesson } = resolved;

    const progress = await getOrCreateProgress(ctx, userId, lesson.courseId);
    const alreadyCompleted = progress.completedLessonIds.some(
      (id) => String(id) === String(lesson._id)
    );

    if (alreadyCompleted) {
      const totalLessons = (
        await ctx.db
          .query("academyLessons")
          .withIndex("by_course", (q) => q.eq("courseId", course._id))
          .collect()
      ).length;
      return {
        alreadyCompleted,
        xpAwarded: 0,
        moduleCompleted: false,
        courseCompleted: false,
        completed: progress.completed,
        percent:
          totalLessons > 0
            ? Math.round((progress.completedLessonIds.length / totalLessons) * 100)
            : 0,
      };
    }

    let xpAwarded = 0;
    let moduleCompleted = false;
    let courseCompleted = false;
    const t = Date.now();

    const completedLessonIds = [...progress.completedLessonIds, lesson._id];

    // Lesson XP (+10) - granted once per user per lesson.
    const lessonGranted = await awardAcademyXp(ctx, {
      userId,
      type: "lesson_completed",
      amount: ACADEMY_XP.lesson,
      courseId: course._id,
      lessonId: lesson._id,
      uniqueKeyScope: String(lesson._id),
    });
    if (lessonGranted) xpAwarded += ACADEMY_XP.lesson;

    // Module bonus (+50) when every lesson of this module is complete.
    const moduleLessons = await ctx.db
      .query("academyLessons")
      .withIndex("by_module", (q) => q.eq("moduleId", lesson.moduleId))
      .collect();
    const moduleDone = moduleLessons.every((l) =>
      completedLessonIds.some((id) => String(id) === String(l._id))
    );
    const completedModuleIds = [...progress.completedModuleIds];
    if (
      moduleDone &&
      !completedModuleIds.some((id) => String(id) === String(lesson.moduleId))
    ) {
      const moduleGranted = await awardAcademyXp(ctx, {
        userId,
        type: "module_completed",
        amount: ACADEMY_XP.module,
        courseId: course._id,
        moduleId: lesson.moduleId,
        uniqueKeyScope: String(lesson.moduleId),
      });
      if (moduleGranted) {
        xpAwarded += ACADEMY_XP.module;
        moduleCompleted = true;
        completedModuleIds.push(lesson.moduleId);
      }
    }

    // Course bonus (+100) when every lesson of the course is complete.
    const courseLessons = await ctx.db
      .query("academyLessons")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .collect();
    const courseDone = courseLessons.every((l) =>
      completedLessonIds.some((id) => String(id) === String(l._id))
    );
    let completed = progress.completed;
    let completedAt = progress.completedAt;
    if (courseDone && !progress.completed) {
      const courseGranted = await awardAcademyXp(ctx, {
        userId,
        type: "course_completed",
        amount: ACADEMY_XP.course,
        courseId: course._id,
        uniqueKeyScope: String(course._id),
      });
      if (courseGranted) {
        xpAwarded += ACADEMY_XP.course;
        courseCompleted = true;
        completed = true;
        completedAt = t;
      }
    }

    await ctx.db.patch(progress._id, {
      completedLessonIds,
      completedModuleIds,
      completed,
      ...(completed && !progress.completed ? { completedAt } : {}),
      xpEarned: progress.xpEarned + xpAwarded,
      updatedAt: t,
    });

    if (courseCompleted) {
      const tech = await ctx.db.get(course.technologyId);
      await ctx.db.insert("notifications", {
        userId,
        type: "achievement",
        title: "Course completed!",
        message: `Congratulations! You completed ${course.title} and earned a new badge. View it in your Code Academy dashboard.`,
        read: false,
        link: `/code-academy/${tech ? tech.slug : ""}/${course.slug}`,
        createdAt: t,
      });
    }

    const totalLessons = courseLessons.length;
    const doneCount = completedLessonIds.length;

    return {
      alreadyCompleted,
      xpAwarded,
      moduleCompleted,
      courseCompleted,
      completed: alreadyCompleted ? progress.completed : true,
      percent: totalLessons > 0 ? Math.round((doneCount / totalLessons) * 100) : 0,
    };
  },
});

/**
 * Submit a practice exercise. Records the attempt (append-only), auto-grades
 * against the expected output when one is configured, and awards practice XP
 * (+30) exactly once when the exercise is completed.
 */
export const submitExercise = mutation({
  args: {
    exerciseId: v.id("academyExercises"),
    code: v.string(),
    output: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) throw new Error("Exercise not found");
    const lesson = await ctx.db.get(exercise.lessonId);
    if (!lesson) throw new Error("Lesson not found");
    const course = await ctx.db.get(lesson.courseId);
    if (!course || !course.published) throw new Error("Course is not published");

    // Auto-grade when an expected output exists; self-paced otherwise.
    const passed: boolean | null =
      exercise.expectedOutput !== undefined
        ? exercise.expectedOutput.trim() === (args.output ?? "").trim()
        : null;

    const t = Date.now();
    const attemptDoc: {
      userId: Id<"users">;
      exerciseId: Id<"academyExercises">;
      lessonId: Id<"academyLessons">;
      code: string;
      output?: string;
      passed?: boolean;
      createdAt: number;
    } = {
      userId,
      exerciseId: exercise._id,
      lessonId: lesson._id,
      code: args.code,
      createdAt: t,
    };
    if (args.output !== undefined) attemptDoc.output = args.output;
    if (passed !== null) attemptDoc.passed = passed;
    await ctx.db.insert("academyExerciseAttempts", attemptDoc);

    const progress = await getOrCreateProgress(ctx, userId, lesson.courseId);
    const alreadyCompleted = progress.completedExerciseIds.some(
      (id) => String(id) === String(lesson._id)
    );

    const isDone = passed === null ? true : passed;
    let xpAwarded = 0;
    let newlyCompleted = false;

    if (isDone && !alreadyCompleted) {
      const granted = await awardAcademyXp(ctx, {
        userId,
        type: "practice_completed",
        amount: ACADEMY_XP.practice,
        courseId: course._id,
        lessonId: lesson._id,
        uniqueKeyScope: String(lesson._id),
      });
      if (granted) {
        xpAwarded += ACADEMY_XP.practice;
        newlyCompleted = true;
        await ctx.db.patch(progress._id, {
          completedExerciseIds: [...progress.completedExerciseIds, lesson._id],
          xpEarned: progress.xpEarned + xpAwarded,
          updatedAt: t,
        });
      }
    }

    return {
      passed,
      xpAwarded,
      newlyCompleted,
      alreadyCompleted,
    };
  },
});

/**
 * Submit a quiz. Answers are scored on the server against the stored correct
 * options; the response reveals per-question correctness, the correct answer
 * and the explanation AFTER submission. Passing the quiz awards +20 XP once.
 */
export const submitQuiz = mutation({
  args: {
    quizId: v.id("academyQuizzes"),
    answers: v.array(
      v.object({
        questionId: v.string(),
        selectedAnswerId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) throw new Error("Quiz not found");
    const lesson = await ctx.db.get(quiz.lessonId);
    if (!lesson) throw new Error("Lesson not found");
    const course = await ctx.db.get(lesson.courseId);
    if (!course || !course.published) throw new Error("Course is not published");

    const questions = await ctx.db
      .query("academyQuizQuestions")
      .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
      .collect();
    questions.sort((a, b) => a.orderIndex - b.orderIndex);

    let score = 0;
    const results = questions.map((question) => {
      const answer = args.answers.find((a) => a.questionId === String(question._id));
      const selected = answer?.selectedAnswerId ?? null;
      const correct = selected !== null && selected === question.correctAnswerId;
      if (correct) score += 1;
      return {
        questionId: String(question._id),
        selectedAnswerId: selected,
        correct,
        correctAnswerId: question.correctAnswerId,
        explanation: question.explanation ?? null,
      };
    });

    const total = questions.length;
    const percentage =
      total > 0 ? Math.round((score / total) * 10000) / 100 : 0;
    const passed = percentage >= quiz.passingPercentage;

    const t = Date.now();
    await ctx.db.insert("academyQuizAttempts", {
      userId,
      quizId: quiz._id,
      lessonId: lesson._id,
      score,
      total,
      percentage,
      passed,
      answers: args.answers.map((a) => ({
        questionId: a.questionId,
        selectedAnswerId: a.selectedAnswerId,
      })),
      createdAt: t,
    });

    const progress = await getOrCreateProgress(ctx, userId, lesson.courseId);
    const alreadyPassed = progress.completedQuizIds.some(
      (id) => String(id) === String(lesson._id)
    );

    let xpAwarded = 0;
    if (passed && !alreadyPassed) {
      const granted = await awardAcademyXp(ctx, {
        userId,
        type: "quiz_completed",
        amount: ACADEMY_XP.quiz,
        courseId: course._id,
        lessonId: lesson._id,
        uniqueKeyScope: String(lesson._id),
      });
      if (granted) {
        xpAwarded += ACADEMY_XP.quiz;
        await ctx.db.patch(progress._id, {
          completedQuizIds: [...progress.completedQuizIds, lesson._id],
          quizScores: [
            ...progress.quizScores.filter(
              (s) => String(s.lessonId) !== String(lesson._id)
            ),
            { lessonId: lesson._id, score, total, passedAt: t },
          ],
          xpEarned: progress.xpEarned + xpAwarded,
          updatedAt: t,
        });
      }
    }

    return {
      score,
      total,
      percentage,
      passed,
      xpAwarded,
      alreadyPassed,
      results,
    };
  },
});

/* ================================================================
   SEARCH
   ================================================================ */

/**
 * Search across technologies, courses and lessons with optional
 * technology/difficulty filters. Powers the Code Academy search bar.
 */
export const searchAcademy = query({
  args: {
    query: v.string(),
    technologySlug: v.optional(v.string()),
    difficulty: v.optional(v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const q = args.query.trim().toLowerCase();
    if (!q) {
      return { technologies: [], courses: [], lessons: [] };
    }

    // Technologies: match name, slug or description.
    const allTechs = await ctx.db
      .query("academyTechnologies")
      .withIndex("by_isActive", (t) => t.eq("isActive", true))
      .collect();
    const technologies = allTechs
      .filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.slug.includes(q) ||
          t.description.toLowerCase().includes(q)
      )
      .slice(0, 8)
      .map((t) => ({
        _id: t._id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        icon: t.icon ?? null,
        color: t.color ?? null,
      }));

    // Courses: published only, optional filters.
    const allCourses = await ctx.db
      .query("academyCourses")
      .withIndex("by_published", (c) => c.eq("published", true))
      .collect();

    const matchingCourses = allCourses.filter((c) => {
      if (args.difficulty && c.difficulty !== args.difficulty) return false;
      return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    });

    const courses = [];
    for (const course of matchingCourses.slice(0, 10)) {
      const tech = await ctx.db.get(course.technologyId);
      if (args.technologySlug && (!tech || tech.slug !== args.technologySlug)) continue;
      const lessons = await ctx.db
        .query("academyLessons")
        .withIndex("by_course", (l) => l.eq("courseId", course._id))
        .collect();
      let percent: number | null = null;
      if (userId) {
        const prog = await ctx.db
          .query("academyProgress")
          .withIndex("by_user_course", (p) => p.eq("userId", userId).eq("courseId", course._id))
          .unique();
        if (prog) {
          percent = lessons.length > 0 ? Math.round((prog.completedLessonIds.length / lessons.length) * 100) : 0;
        }
      }
      courses.push({
        _id: course._id,
        title: course.title,
        slug: course.slug,
        difficulty: course.difficulty,
        /** Canonical cover photo (uploaded cover, falling back to legacy URL). */
        coverImage: course.coverImageUrl ?? course.thumbnailUrl ?? null,
        technology: tech ? { name: tech.name, slug: tech.slug } : null,
        lessonCount: lessons.length,
        percent,
      });
    }

    // Lessons: search published lessons by title/description.
    const lessonMatches = [];
    const courseById = new Map(allCourses.map((c) => [String(c._id), c]));
    for (const course of allCourses) {
      if (args.difficulty && course.difficulty !== args.difficulty) continue;
      if (args.technologySlug) {
        const tech = await ctx.db.get(course.technologyId);
        if (!tech || tech.slug !== args.technologySlug) continue;
      }
      const lessons = await ctx.db
        .query("academyLessons")
        .withIndex("by_course", (l) => l.eq("courseId", course._id))
        .collect();
      for (const lesson of lessons) {
        if (!lesson.published) continue;
        if (
          lesson.title.toLowerCase().includes(q) ||
          lesson.shortDescription.toLowerCase().includes(q)
        ) {
          lessonMatches.push({ lesson, course });
        }
      }
    }

    const lessons = [];
    for (const match of lessonMatches.slice(0, 15)) {
      const course = courseById.get(String(match.course._id));
      const tech = course ? await ctx.db.get(course.technologyId) : null;
      const moduleDoc = await ctx.db.get(match.lesson.moduleId);
      let completed = false;
      if (userId) {
        const prog = await ctx.db
          .query("academyProgress")
          .withIndex("by_user_course", (p) => p.eq("userId", userId).eq("courseId", match.course._id))
          .unique();
        completed = prog
          ? prog.completedLessonIds.some((id) => String(id) === String(match.lesson._id))
          : false;
      }
      lessons.push({
        _id: match.lesson._id,
        title: match.lesson.title,
        slug: match.lesson.slug,
        difficulty: match.lesson.difficulty,
        courseSlug: match.course.slug,
        courseTitle: match.course.title,
        technologySlug: tech ? tech.slug : "",
        technologyName: tech ? tech.name : "",
        moduleTitle: moduleDoc ? moduleDoc.title : "",
        completed,
      });
    }

    return { technologies, courses, lessons };
  },
});