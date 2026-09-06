"use client";

/**
 * Code Academy Landing Page
 *
 * Premium learning platform landing experience featuring:
 * - Premium search bar at the top
 * - Modern hero section
 * - Learning paths
 * - User learning progress
 * - Popular courses
 * - Recently viewed lessons
 * - Achievement CTA
 * - Premium glassmorphism UI
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

import {
  AcademyLink,
  DifficultyBadge,
  ProgressBar,
  TechnologyIcon,
} from "@/components/academy/academy-ui";

import CourseCoverImage from "@/components/academy/CourseCoverImage";

import {
  ArrowRight,
  BookOpen,
  Compass,
  Rocket,
  Search,
  Sparkles,
  Trophy,
  Zap,
  GraduationCap,
  Layers3,
  Clock3,
  ChevronRight,
  Flame,
} from "lucide-react";

import Link from "next/link";

/* -------------------------------------------------------------------------- */
/*                                   HERO                                     */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0b0b16] px-6 py-16 shadow-2xl shadow-black/30 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[-30%] h-[420px] w-[420px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-35%] right-[5%] h-[420px] w-[420px] rounded-full bg-violet-500/20 blur-[120px]" />
        <div className="absolute right-[35%] top-[15%] h-[220px] w-[220px] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-[0.025]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
      </div>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/[0.08] px-4 py-2 text-xs font-semibold tracking-wide text-indigo-300 shadow-lg shadow-indigo-500/5 backdrop-blur-xl">
          <Sparkles size={14} className="text-indigo-400" />
          <span>LEARN · PRACTICE · BUILD · GROW</span>
        </div>

        <h1 className="mt-7 max-w-4xl text-balance text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Master the skills that
          <span className="mt-2 block bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
            shape the future.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-neutral-400 sm:text-lg">
          Learn programming and web development with structured learning paths,
          interactive lessons, hands-on practice, quizzes and real-world
          challenges.
        </p>

        <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="#paths"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-indigo-500/40"
          >
            Start Learning
            <ArrowRight
              size={17}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>

          <Link
            href="/code-academy/search"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.035] px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-xl transition-all duration-300 hover:border-white/[0.18] hover:bg-white/[0.07]"
          >
            Explore Courses
            <ChevronRight size={16} />
          </Link>
        </div>

        <div className="mt-12 grid w-full max-w-2xl grid-cols-3 divide-x divide-white/[0.08] rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3 py-5 backdrop-blur-xl">
          <div className="px-3">
            <p className="text-lg font-bold text-white sm:text-xl">
              Structured
            </p>
            <p className="mt-1 text-xs text-neutral-500">Learning paths</p>
          </div>

          <div className="px-3">
            <p className="text-lg font-bold text-white sm:text-xl">
              Interactive
            </p>
            <p className="mt-1 text-xs text-neutral-500">Hands-on lessons</p>
          </div>

          <div className="px-3">
            <p className="text-lg font-bold text-white sm:text-xl">
              Real Skills
            </p>
            <p className="mt-1 text-xs text-neutral-500">Build & practice</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                              SECTION HEADER                                */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/15 bg-indigo-500/[0.08]">
            <Icon size={19} className="text-indigo-400" />
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              SEARCH BAR                                    */
/* -------------------------------------------------------------------------- */

function SearchBar({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (value: string) => void;
}) {
  const handleSearch = () => {
    const value = search.trim();

    if (!value) return;

    window.location.href = `/code-academy/search?q=${encodeURIComponent(
      value
    )}`;
  };

  return (
    <div className="relative z-20 mx-auto mb-9 w-full max-w-4xl">
      <div className="rounded-[1.5rem] border border-white/[0.10] bg-[#0d0d18]/90 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <div className="relative flex min-h-[68px] items-center overflow-hidden rounded-[1.15rem] border border-white/[0.06] bg-white/[0.035] transition-all duration-300 focus-within:border-indigo-500/30 focus-within:bg-white/[0.05] focus-within:shadow-lg focus-within:shadow-indigo-500/[0.08]">
          <div className="pointer-events-none absolute left-4 flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/10 bg-indigo-500/[0.07] sm:left-5">
            <Search size={19} className="text-indigo-300" />
          </div>

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search courses, lessons, technologies..."
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            className="h-[68px] w-full bg-transparent py-3 pl-[68px] pr-[125px] text-sm font-medium text-white outline-none placeholder:text-neutral-600 sm:pl-[76px] sm:pr-[145px] sm:text-[15px]"
          />

          <button
            type="button"
            onClick={handleSearch}
            disabled={!search.trim()}
            className="group absolute right-2.5 inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:from-indigo-400 hover:to-violet-400 hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:px-5"
          >
            <span className="hidden sm:inline">Search</span>

            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-neutral-600">
        <Search size={12} />
        <span>Search across courses, lessons and learning paths</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              COURSE CARD                                   */
/* -------------------------------------------------------------------------- */

function CourseCard({
  course,
}: {
  course: {
    _id: string;
    title: string;
    slug: string;
    description: string;
    coverImage: string | null;
    difficulty: string;
    durationMinutes: number | null;
    xpReward: number;
    lessonCount: number;

    technology: {
      name: string;
      slug: string;
      color: string | null;
    } | null;

    progress: {
      percent: number;
      completed: boolean;
    } | null;
  };
}) {
  const href = `/code-academy/${course.technology?.slug ?? ""}/${course.slug}`;

  return (
    <AcademyLink
      href={href}
      className="group relative flex min-h-[100%] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/25 hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-indigo-500/[0.06]"
    >
      {course.coverImage && (
        <div className="relative overflow-hidden">
          <CourseCoverImage
            src={course.coverImage}
            alt={course.title}
            className="h-44 w-full transition-transform duration-500 group-hover:scale-[1.04]"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c0c15]/70 via-transparent to-transparent" />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <span
            className="inline-flex max-w-[65%] items-center truncate rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: course.technology?.color
                ? `${course.technology.color}18`
                : "rgba(99,102,241,0.12)",
              color: course.technology?.color ?? "#818cf8",
            }}
          >
            {course.technology?.name ?? "Technology"}
          </span>

          <DifficultyBadge difficulty={course.difficulty} />
        </div>

        <div className="mt-5">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-white transition-colors group-hover:text-indigo-300">
            {course.title}
          </h3>

          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-500">
            {course.description}
          </p>
        </div>

        {course.progress && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-neutral-500">Progress</span>

              <span className="font-semibold text-indigo-300">
                {course.progress.percent}%
              </span>
            </div>

            <ProgressBar percent={course.progress.percent} />
          </div>
        )}

        <div className="mt-auto pt-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-4 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen size={13} />
              {course.lessonCount} lessons
            </span>

            {course.durationMinutes && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={13} />
                {course.durationMinutes} min
              </span>
            )}

            <span className="ml-auto inline-flex items-center gap-1 text-indigo-300">
              <Zap size={13} />
              +{course.xpReward} XP
            </span>
          </div>
        </div>
      </div>
    </AcademyLink>
  );
}

/* -------------------------------------------------------------------------- */
/*                           CONTINUE LEARNING                                */
/* -------------------------------------------------------------------------- */

function ContinueLearning({
  overview,
}: {
  overview: NonNullable<
    ReturnType<typeof useQuery<typeof api.academy.getMyAcademyOverview>>
  >;
}) {
  const inProgress = overview.courses.filter((course) => !course.completed);

  return (
    <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 shadow-xl shadow-black/10 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">
              Continue where you left off
            </h3>

            <p className="mt-1 text-sm text-neutral-500">
              Keep your learning momentum going.
            </p>
          </div>

          <Flame size={20} className="text-orange-400" />
        </div>

        <div className="space-y-3">
          {inProgress.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] py-12 text-center">
              <GraduationCap size={30} className="text-neutral-600" />

              <p className="mt-3 text-sm text-neutral-500">
                You haven&apos;t started a course yet.
              </p>

              <Link
                href="#paths"
                className="mt-4 text-sm font-medium text-indigo-400 hover:text-indigo-300"
              >
                Explore learning paths →
              </Link>
            </div>
          )}

          {inProgress.slice(0, 3).map((course) => (
            <div
              key={course.course._id}
              className="group flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-white/[0.018] p-4 transition-all duration-300 hover:border-indigo-500/20 hover:bg-white/[0.035] sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">
                    {course.course.title}
                  </p>

                  <span className="rounded-full bg-indigo-500/[0.08] px-2 py-0.5 text-[10px] text-indigo-300">
                    {course.percent}%
                  </span>
                </div>

                <p className="mt-1 text-xs text-neutral-500">
                  {course.technology.name} · {course.completedLessonCount}/
                  {course.totalLessons} lessons completed
                </p>

                <ProgressBar percent={course.percent} className="mt-3" />
              </div>

              {course.continueLesson && (
                <Link
                  href={`/code-academy/${course.technology.slug}/${course.course.slug}/${course.continueLesson.slug}`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-500/90 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-indigo-400"
                >
                  Continue
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        <MiniStat
          icon={BookOpen}
          label="Lessons completed"
          value={overview.stats.lessonsCompleted}
        />

        <MiniStat
          icon={Trophy}
          label="Courses completed"
          value={overview.stats.coursesCompleted}
        />

        <MiniStat
          icon={Zap}
          label="Total XP earned"
          value={overview.stats.xpEarned}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                MINI STAT                                   */
/* -------------------------------------------------------------------------- */

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-500/20 hover:bg-white/[0.04]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-500/10 bg-indigo-500/[0.08]">
        <Icon size={19} className="text-indigo-400" />
      </div>

      <div>
        <p className="text-xs text-neutral-500">{label}</p>

        <p className="mt-1 text-2xl font-bold tracking-tight text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              EMPTY STATES                                  */
/* -------------------------------------------------------------------------- */

function EmptyPaths() {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.015] px-6 py-14 text-center">
      <Layers3 size={30} className="mx-auto text-neutral-600" />

      <p className="mt-3 text-sm text-neutral-500">
        No learning paths available yet.
      </p>

      <p className="mt-1 text-xs text-neutral-600">
        Administrators can create technologies and courses from the admin
        panel.
      </p>
    </div>
  );
}

function EmptyCourses() {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.015] px-6 py-14 text-center">
      <BookOpen size={30} className="mx-auto text-neutral-600" />

      <p className="mt-3 text-sm text-neutral-500">
        No published courses yet.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               MAIN PAGE                                    */
/* -------------------------------------------------------------------------- */

export default function CodeAcademyLanding() {
  const technologies = useQuery(api.academy.listTechnologies) ?? [];

  const courses =
    useQuery(api.academy.listCourses, {
      limit: 9,
    }) ?? [];

  const overview = useQuery(api.academy.getMyAcademyOverview);

  const recentlyViewed =
    useQuery(api.academy.getRecentlyViewedLessons, {}) ?? [];

  const [search, setSearch] = useState("");

  return (
    <div className="cr-shell relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[10%] top-[15%] h-[500px] w-[500px] rounded-full bg-indigo-500/[0.025] blur-[140px]" />

        <div className="absolute right-[5%] top-[45%] h-[450px] w-[450px] rounded-full bg-violet-500/[0.025] blur-[140px]" />
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        {/* Search — TOP */}

        <SearchBar search={search} setSearch={setSearch} />

        {/* Hero */}

        <Hero />

        {/* Learning Paths */}

        <section id="paths" className="mt-20 scroll-mt-24 sm:mt-24">
          <SectionHeader
            icon={Compass}
            title="Learning paths"
            subtitle="Choose a technology and follow a carefully structured curriculum."
          />

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {technologies.length === 0 && <EmptyPaths />}

            {technologies.map((tech) => (
              <AcademyLink
                key={tech._id}
                href={`/code-academy/${tech.slug}`}
                className="group relative flex min-h-[230px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/25 hover:bg-white/[0.045] hover:shadow-xl hover:shadow-indigo-500/[0.05]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] via-transparent to-violet-500/[0.03] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.04]"
                    style={{
                      background: tech.color
                        ? `${tech.color}18`
                        : "rgba(99,102,241,0.12)",
                    }}
                  >
                    <TechnologyIcon
                      icon={tech.icon}
                      color={tech.color}
                      size={27}
                    />
                  </div>

                  <div className="mt-5">
                    <h3 className="text-base font-bold text-white transition-colors group-hover:text-indigo-300">
                      {tech.name}
                    </h3>

                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-500">
                      {tech.description}
                    </p>
                  </div>
                </div>

                <div className="relative mt-auto flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-neutral-500">
                  <div className="flex items-center gap-3">
                    <span>{tech.courseCount} courses</span>

                    <span className="h-1 w-1 rounded-full bg-neutral-600" />

                    <span>{tech.lessonCount} lessons</span>
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-indigo-400 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100"
                  />
                </div>
              </AcademyLink>
            ))}
          </div>
        </section>

        {/* Learning Journey */}

        {overview && (
          <section className="mt-20 sm:mt-24">
            <SectionHeader
              icon={Rocket}
              title="Your learning journey"
              subtitle="Track your progress and continue building your skills."
            />

            <ContinueLearning overview={overview} />
          </section>
        )}

        {/* Popular Courses */}

        <section className="mt-20 sm:mt-24">
          <SectionHeader
            icon={Sparkles}
            title="Popular courses"
            subtitle="Discover courses designed to help you build practical development skills."
            action={
              <Link
                href="/code-academy/search"
                className="hidden items-center gap-2 text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300 sm:inline-flex"
              >
                View all courses
                <ArrowRight size={15} />
              </Link>
            }
          />

          <div className="mt-8 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}

            {courses.length === 0 && <EmptyCourses />}
          </div>
        </section>

        {/* Recently Viewed */}

        {recentlyViewed.length > 0 && (
          <section className="mt-20 sm:mt-24">
            <SectionHeader
              icon={Zap}
              title="Recently viewed"
              subtitle="Quickly jump back into lessons you recently explored."
            />

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recentlyViewed.map((lesson) => (
                <AcademyLink
                  key={lesson.lessonId}
                  href={`/code-academy/${lesson.technologySlug}/${lesson.courseSlug}/${lesson.lessonSlug}`}
                  className="group flex min-h-[170px] flex-col rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/25 hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-semibold text-indigo-300">
                      {lesson.technologyName}
                    </span>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium ${lesson.completed
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                        }`}
                    >
                      {lesson.completed ? "Completed" : "In progress"}
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs text-neutral-500">
                      {lesson.courseTitle}
                    </p>

                    <h4 className="mt-1.5 line-clamp-2 text-base font-semibold leading-snug text-white transition-colors group-hover:text-indigo-300">
                      {lesson.lessonTitle}
                    </h4>
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-5 text-xs font-medium text-indigo-400">
                    Continue lesson

                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </AcademyLink>
              ))}
            </div>
          </section>
        )}

        {/* Achievement CTA */}

        {overview && overview.stats.coursesCompleted > 0 && (
          <section className="mt-20 sm:mt-24">
            <div className="relative isolate overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0d0d18] px-6 py-12 text-center shadow-2xl shadow-black/20 sm:px-10 sm:py-16">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[100px]" />
              </div>

              <div className="relative mx-auto max-w-xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/15 bg-amber-400/[0.08]">
                  <Trophy size={30} className="text-amber-400" />
                </div>

                <h3 className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {overview.stats.coursesCompleted} course
                  {overview.stats.coursesCompleted > 1 ? "s" : ""} completed!
                </h3>

                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-400">
                  You&apos;ve built valuable knowledge. Take the next step and
                  put your programming skills to the test.
                </p>

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href="/challenges"
                    className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 hover:shadow-indigo-500/30"
                  >
                    Try a Challenge

                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>

                  <Link
                    href="/talent-connect"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white transition-all hover:border-white/[0.18] hover:bg-white/[0.06]"
                  >
                    Talent Connect
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}