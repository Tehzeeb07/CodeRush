"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import Link from "next/link";
import {
  DifficultyBadge,
  DurationStamp,
  ProgressBar,
  TechnologyIcon,
} from "@/components/academy/academy-ui";
import CourseCoverImage from "@/components/academy/CourseCoverImage";
import { ArrowLeft, BookOpen, CheckCircle2, Lock, Play } from "lucide-react";

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Loading() {
  return (
    <div className="cr-shell">
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-10">
        <div className="h-6 w-32 rounded bg-neutral-800" />
        <div className="mt-6 h-10 w-2/3 rounded bg-neutral-800" />
        <div className="mt-3 h-4 w-full rounded bg-neutral-800" />
      </div>
    </div>
  );
}

function NotFound({ technologySlug }: { technologySlug: string }) {
  return (
    <div className="cr-shell">
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <BookOpen size={40} className="mx-auto text-neutral-600" />
        <h1 className="mt-4 text-xl font-bold text-white">Course not found</h1>
        <Link
          href={`/code-academy/${technologySlug}`}
          className="mt-4 inline-block text-sm text-indigo-300 hover:text-indigo-200"
        >
          ← Back to path
        </Link>
      </div>
    </div>
  );
}

export default function CoursePage() {
  const params = useParams();
  const technologySlug = params.technology as string;
  const courseSlug = params.course as string;
  const data = useQuery(api.academy.getCoursePage, {
    technologySlug,
    courseSlug,
  });

  if (data === undefined) return <Loading />;
  if (!data) return <NotFound technologySlug={technologySlug} />;

  const progress = data.progress;

  return (
    <div className="cr-shell">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href={`/code-academy/${technologySlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={15} /> {data.technology.name}
        </Link>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <Header data={data} />
            {progress && <ProgressPanel progress={progress} total={data.totalLessons} />}
            <Modules data={data} technologySlug={technologySlug} courseSlug={courseSlug} />
          </div>
          <Sidebar data={data} progress={progress} technologySlug={technologySlug} courseSlug={courseSlug} />
        </div>
      </div>
    </div>
  );
}

function Header({ data }: { data: any }) {
  return (
    <div>
      {data.course.coverImage && (
        <div className="mb-5">
          <CourseCoverImage
            src={data.course.coverImage}
            alt={`${data.course.title} cover photo`}
            className="h-64 w-full"
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <DifficultyBadge difficulty={data.course.difficulty} />
        <DurationStamp minutes={data.course.durationMinutes} />
        <span className="text-xs text-neutral-500">
          {data.totalLessons} lessons · {data.course.moduleCount} modules
        </span>
      </div>
      <h1 className="mt-3 text-3xl font-bold text-white">{data.course.title}</h1>
      <p className="mt-2 text-neutral-400">{data.course.description}</p>
    </div>
  );
}

function ProgressPanel({ progress, total }: { progress: any; total: number }) {
  return (
    <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">Your progress</span>
        <span className="text-sm font-bold text-indigo-300">{progress.percent}%</span>
      </div>
      <ProgressBar percent={progress.percent} className="mt-3" />
      <p className="mt-2 text-xs text-neutral-500">
        {progress.completedLessonCount}/{total} lessons completed · {progress.xpEarned} XP earned
      </p>
      {progress.completed && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
          <CheckCircle2 size={16} /> Course completed!
        </p>
      )}
    </div>
  );
}

function Modules({ data, technologySlug, courseSlug }: { data: any; technologySlug: string; courseSlug: string }) {
  return (
    <div className="mt-8 space-y-6">
      {data.modules.map((mod: any, mi: number) => (
        <div key={mod._id}>
          <h2 className="text-lg font-semibold text-white">
            <span className="mr-2 text-neutral-500">Module {mi + 1}:</span>
            {mod.title}
          </h2>
          {mod.description && <p className="mt-0.5 text-sm text-neutral-500">{mod.description}</p>}
          <div className="mt-3 space-y-1.5">
            {mod.lessons.map((lesson: any, li: number) => {
              const completed = data.completedLessonIds.some((id: any) => id === lesson._id);
              const flatIndex = data.modules.flatMap((m: any) => m.lessons).findIndex((l: any) => l._id === lesson._id);
              const locked = !data.unlockFlags[flatIndex];
              const href = locked ? "#" : `/code-academy/${technologySlug}/${courseSlug}/${lesson.slug}`;
              return (
                <Link key={lesson._id} href={href} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${locked ? "cursor-not-allowed border-white/[0.05] opacity-50" : "border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.03]"}`}>
                  {completed ? <CheckCircle2 size={18} className="shrink-0 text-emerald-400" /> : locked ? <Lock size={16} className="shrink-0 text-neutral-600" /> : <Play size={16} className="shrink-0 text-indigo-400" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{li + 1}. {lesson.title}</p>
                    <p className="truncate text-xs text-neutral-500">{lesson.shortDescription}</p>
                  </div>
                  <DifficultyBadge difficulty={lesson.difficulty} />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Sidebar({ data, progress, technologySlug, courseSlug }: { data: any; progress: any; technologySlug: string; courseSlug: string }) {
  return (
    <aside className="w-full shrink-0 lg:w-72">
      <div className="sticky top-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: data.technology.color ? `${data.technology.color}22` : "rgba(99,102,241,0.12)" }}>
            <TechnologyIcon icon={data.technology.icon} color={data.technology.color} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{data.course.title}</p>
            <p className="text-xs text-neutral-500">{data.technology.name}</p>
          </div>
        </div>
        {data.continueLessonSlug && (
          <Link href={`/code-academy/${technologySlug}/${courseSlug}/${data.continueLessonSlug}`} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400">
            <Play size={15} />
            {progress && progress.percent > 0 ? "Continue learning" : "Start course"}
          </Link>
        )}
        <div className="mt-4 space-y-2 text-sm">
          <Row label="Lessons" value={data.totalLessons} />
          <Row label="Modules" value={data.course.moduleCount} />
          <Row label="Difficulty" value={capitalize(data.course.difficulty)} />
          <Row label="XP reward" value={`+${data.course.xpReward}`} />
        </div>
      </div>
    </aside>
  );
}
