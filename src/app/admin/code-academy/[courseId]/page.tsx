"use client";

/**
 * Admin Course Details / View page (/admin/code-academy/[courseId]).
 *
 * Read-only inspection of a real course loaded from Convex via the
 * admin-gated `getCourseAdmin` query (no mock data). Displays the full
 * course metadata plus its module/lesson tree. The Edit button navigates
 * to /admin/code-academy/[courseId]/edit.
 */

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import CourseCoverImage from "@/components/academy/CourseCoverImage";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Layers,
  Loader2,
  Pencil,
} from "lucide-react";

const difficultyStyles: Record<string, string> = {
  beginner: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  intermediate: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  advanced: "border-rose-500/40 bg-rose-500/10 text-rose-400",
};

export default function AdminCourseViewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = (params?.courseId as string) || "";
  const courseIdTyped = courseId as Id<"academyCourses">;

  const data = useQuery(
    api.academyAdmin.getCourseAdmin,
    courseId ? { courseId: courseIdTyped } : "skip"
  );
  const technologies = useQuery(api.academyAdmin.listTechnologiesAdmin) ?? [];

  if (!courseId || data === null) {
    return (
      <div>
        <button
          type="button"
          onClick={() => router.push("/admin/code-academy")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={17} />
          Back to Code Academy
        </button>
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-10 text-center">
          <BookOpen size={36} className="mx-auto text-neutral-600" />
          <h1 className="mt-4 text-xl font-bold text-white">Course not found</h1>
          <p className="mt-2 text-sm text-neutral-400">
            The course you are looking for does not exist or may have been
            deleted.
          </p>
        </div>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400">
          <Loader2 size={22} className="animate-spin" />
          Loading course…
        </div>
      </div>
    );
  }

  const course = data.course;
  const modules = data.modules;
  const technology = technologies.find(
    (t) => t._id === course.technologyId
  );
  const formatDate = (value?: number) =>
    value ? new Date(value).toLocaleString() : "—";

  return (
    <div>
      {/* HEADER */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.push("/admin/code-academy")}
            className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Code Academy
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{course.title}</h1>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                course.published
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-neutral-500/40 bg-neutral-500/10 text-neutral-400"
              }`}
            >
              {course.published ? "Published" : "Draft"}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                difficultyStyles[course.difficulty] ??
                difficultyStyles.beginner
              }`}
            >
              {course.difficulty}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            /admin/code-academy/{courseId}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/admin/code-academy/${courseId}/edit`)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
        >
          <Pencil size={15} />
          Edit course
        </button>
      </div>

      {/* MAIN GRID */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <BookOpen size={16} className="text-indigo-400" />
            About this course
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
            {course.description || "No description provided."}
          </p>
          <div className="mt-4">
            <CourseCoverImage
              src={course.coverImageUrl ?? course.thumbnailUrl ?? null}
              alt={`${course.title} cover photo`}
              className="h-64 w-full"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <Layers size={16} className="text-indigo-400" />
            Details
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">
                Technology
              </dt>
              <dd className="mt-0.5 text-neutral-200">
                {technology?.name ?? String(course.technologyId)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">
                Slug
              </dt>
              <dd className="mt-0.5 text-neutral-200">{course.slug}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">
                Difficulty
              </dt>
              <dd className="mt-0.5 capitalize text-neutral-200">
                {course.difficulty}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">
                Duration
              </dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-neutral-200">
                <Clock size={14} className="text-neutral-500" />
                {course.durationMinutes
                  ? `${course.durationMinutes} min`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">
                XP reward
              </dt>
              <dd className="mt-0.5 text-neutral-200">
                {course.xpReward ?? 0} XP
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">
                Sort order
              </dt>
              <dd className="mt-0.5 text-neutral-200">
                {course.sortOrder ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">
                Created
              </dt>
              <dd className="mt-0.5 text-neutral-200">
                {formatDate(course.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">
                Last updated
              </dt>
              <dd className="mt-0.5 text-neutral-200">
                {formatDate(course.updatedAt)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* MODULES & LESSONS */}
      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <Layers size={16} className="text-indigo-400" />
          Modules ({modules.length})
        </h2>
        {modules.length === 0 && (
          <p className="text-sm text-neutral-500">No modules yet.</p>
        )}
        <div className="space-y-4">
          {modules.map((module) => (
            <div
              key={module._id}
              className="rounded-xl border border-white/[0.06] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">
                  {module.title}
                </h3>
                <span className="text-xs text-neutral-500">
                  {module.lessons.length} lessons
                </span>
              </div>
              {module.description && (
                <p className="mt-1 text-xs text-neutral-500">
                  {module.description}
                </p>
              )}
              {module.lessons.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {module.lessons.map((lesson) => (
                    <li
                      key={lesson._id}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="min-w-0 truncate">{lesson.title}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {!lesson.published && (
                          <span className="rounded-full border border-neutral-500/40 bg-neutral-500/10 px-2 py-0.5 text-[10px] text-neutral-400">
                            Draft
                          </span>
                        )}
                        <a
                          href={`/admin/code-academy/lessons/${lesson._id}`}
                          className="rounded-md border border-white/[0.08] px-2 py-1 text-xs text-neutral-400 transition-colors hover:border-indigo-400/40 hover:text-indigo-300"
                        >
                          Edit
                        </a>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}