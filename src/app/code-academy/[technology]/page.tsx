"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import {
  AcademyLink,
  DifficultyBadge,
  DurationStamp,
  ProgressBar,
  TechnologyIcon,
} from "@/components/academy/academy-ui";
import CourseCoverImage from "@/components/academy/CourseCoverImage";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function TechnologyPage() {
  const params = useParams();
  const slug = params.technology as string;
  const data = useQuery(api.academy.getTechnologyPage, { slug });

  if (data === undefined) {
    return <Loading />;
  }
  if (!data) {
    return <NotFound />;
  }

  return (
    <div className="cr-shell">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/code-academy"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={15} /> All paths
        </Link>

        <div className="mt-6 flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: data.color ? `${data.color}22` : "rgba(99,102,241,0.12)",
            }}
          >
            <TechnologyIcon icon={data.icon} color={data.color} size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{data.name}</h1>
            <p className="mt-1 text-neutral-400">{data.description}</p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.courses.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/[0.1] p-8 text-center text-sm text-neutral-500">
              No published courses for this path yet.
            </div>
          )}
          {data.courses.map((course) => (
            <AcademyLink
              key={course._id}
              href={`/code-academy/${slug}/${course.slug}`}
              className="flex flex-col gap-3 p-5"
            >
              {course.coverImage && (
                <CourseCoverImage
                  src={course.coverImage}
                  alt={course.title}
                  className="-mx-5 -mt-5 mb-1 h-36 w-full"
                />
              )}
              <div className="flex items-center justify-between">
                <DifficultyBadge difficulty={course.difficulty} />
                <DurationStamp minutes={course.durationMinutes} />
              </div>
              <div>
                <h3 className="font-semibold leading-snug text-white">
                  {course.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-400">
                  {course.description}
                </p>
              </div>
              {course.progress && (
                <div>
                  <ProgressBar percent={course.progress.percent} />
                  <p className="mt-1 text-xs text-neutral-500">
                    {course.progress.percent}% complete
                  </p>
                </div>
              )}
              <div className="mt-auto flex items-center gap-3 text-xs text-neutral-500">
                <span>{course.lessonCount} lessons</span>
                <span className="ml-auto text-indigo-300">+{course.xpReward} XP</span>
              </div>
            </AcademyLink>
          ))}
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="cr-shell">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-neutral-800" />
          <div className="h-4 w-96 rounded bg-neutral-800" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-neutral-800" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="cr-shell">
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <BookOpen size={40} className="mx-auto text-neutral-600" />
        <h1 className="mt-4 text-xl font-bold text-white">Path not found</h1>
        <Link
          href="/code-academy"
          className="mt-4 inline-block text-sm text-indigo-300 hover:text-indigo-200"
        >
          ← Back to Code Academy
        </Link>
      </div>
    </div>
  );
}
