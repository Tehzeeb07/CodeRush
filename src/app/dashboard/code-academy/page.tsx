"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import CourseCoverImage from "@/components/academy/CourseCoverImage";
import { ProgressBar, TechnologyIcon } from "@/components/academy/academy-ui";
import { BookOpen, CheckCircle2, Trophy, Zap } from "lucide-react";

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <Icon size={20} className="text-indigo-400" />
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

export default function CodeAcademyDashboard() {
  const overview = useQuery(api.academy.getMyAcademyOverview);
  const badges = useQuery(api.academy.getMyAcademyBadges) ?? [];

  if (!overview) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-10">
        <div className="h-8 w-64 rounded bg-neutral-800" />
      </div>
    );
  }

  const inProgress = overview.courses.filter((c) => !c.completed);
  const completed = overview.courses.filter((c) => c.completed);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-white">Code Academy</h1>
      <p className="mt-1 text-sm text-neutral-400">Track your learning progress across all paths.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={BookOpen} label="Lessons completed" value={overview.stats.lessonsCompleted} />
        <Stat icon={CheckCircle2} label="Courses completed" value={overview.stats.coursesCompleted} />
        <Stat icon={Zap} label="Practice done" value={overview.stats.practicesCompleted} />
        <Stat icon={Trophy} label="XP earned" value={overview.stats.xpEarned} />
      </div>

      {overview.perTechnology?.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Progress by path</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {overview.perTechnology.map((t: any) => (
              <div key={t.slug} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="flex items-center gap-2">
                  <TechnologyIcon icon={t.icon} color={t.color} />
                  <span className="font-medium text-white">{t.name}</span>
                </div>
                <ProgressBar percent={t.percent} className="mt-3" />
                <p className="mt-1.5 text-xs text-neutral-500">
                  {t.percent}% · {t.completedCourses}/{t.totalCourses} courses
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {inProgress.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Continue learning</h2>
          <div className="mt-4 space-y-3">
            {inProgress.map((c: any) => (
              <div key={c.course._id} className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                {c.course.coverImage && (
                  <CourseCoverImage src={c.course.coverImage} alt={c.course.title} className="h-14 w-20 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{c.course.title}</p>
                  <p className="text-xs text-neutral-500">
                    {c.technology.name} · {c.completedLessonCount}/{c.totalLessons} lessons
                  </p>
                  <ProgressBar percent={c.percent} className="mt-2" />
                </div>
                {c.continueLesson && (
                  <Link href={`/code-academy/${c.technology.slug}/${c.course.slug}/${c.continueLesson.slug}`} className="shrink-0 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">
                    Continue
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Completed courses</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((c: any) => (
              <div key={c.course._id} className="flex items-center gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                {c.course.coverImage && (
                  <CourseCoverImage src={c.course.coverImage} alt={c.course.title} className="h-12 w-16 shrink-0" />
                )}
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <p className="font-medium text-white">{c.course.title}</p>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {c.technology.name} · {c.xpEarned} XP
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {badges.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Achievements</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {badges.map((b: any) => (
              <div key={b.courseId} className="flex items-center gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] p-4">
                <Trophy size={22} className="text-amber-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{b.courseTitle}</p>
                  <p className="text-xs text-neutral-500">{b.technologyName}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {overview.courses.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-white/[0.1] p-10 text-center">
          <BookOpen size={36} className="mx-auto text-neutral-600" />
          <p className="mt-3 font-medium text-white">You haven&apos;t started any course yet.</p>
          <Link href="/code-academy" className="mt-3 inline-block text-sm font-semibold text-indigo-300 hover:text-indigo-200">
            Explore learning paths →
          </Link>
        </div>
      )}
    </div>
  );
}
