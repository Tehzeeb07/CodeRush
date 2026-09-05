"use client";

import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import CourseCoverImage from "@/components/academy/CourseCoverImage";
import Link from "next/link";
import {
  Search,
  ArrowRight,
  BookOpen,
  Code2,
  GraduationCap,
  Sparkles,
  X,
  ChevronRight,
} from "lucide-react";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const results = useQuery(api.academy.searchAcademy, {
    query: q,
  });

  const hasResults =
    results &&
    ((results.technologies?.length ?? 0) > 0 ||
      (results.courses?.length ?? 0) > 0 ||
      (results.lessons?.length ?? 0) > 0);

  return (<div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
    {/* Ambient Background */} <div className="pointer-events-none absolute inset-0 overflow-hidden"> <div className="absolute left-1/2 top-[-180px] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-violet-600/[0.08] blur-[120px]" /> <div className="absolute left-[-180px] top-[35%] h-[320px] w-[320px] rounded-full bg-blue-600/[0.05] blur-[110px]" /> <div className="absolute right-[-180px] top-[55%] h-[320px] w-[320px] rounded-full bg-purple-600/[0.05] blur-[110px]" /> </div>


    {/* Subtle Grid */}
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />

    <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-5 sm:px-6 lg:px-8">
      {/* =========================================================
        PREMIUM SEARCH BAR — TOP OF PAGE
    ========================================================== */}
      <section className="sticky top-4 z-30 mb-12">
        <div className="rounded-[24px] border border-white/[0.10] bg-[#0b0b0c]/90 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <div className="relative flex min-h-[64px] items-center rounded-[18px] border border-white/[0.07] bg-white/[0.035]">
            {/* Search Icon */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/[0.10] shadow-lg shadow-violet-950/20">
                <Search className="h-5 w-5 text-violet-300" />
              </div>
            </div>

            {/* Search Input */}
            <form
              action="/code-academy/search"
              method="GET"
              className="flex min-w-0 flex-1"
            >
              <input
                type="search"
                name="q"
                defaultValue={q}
                autoComplete="off"
                placeholder="Search courses, lessons, technologies..."
                className="h-14 w-full min-w-0 bg-transparent pr-4 text-base font-medium text-white outline-none placeholder:text-neutral-600 sm:text-[17px]"
              />

              <button
                type="submit"
                className="mr-2 hidden h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-black transition-all duration-200 hover:bg-neutral-200 hover:shadow-lg hover:shadow-white/10 sm:flex"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </form>

            {/* Clear Button */}
            {q && (
              <Link
                href="/code-academy/search"
                aria-label="Clear search"
                className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
        HEADER
    ========================================================== */}
      <header className="mb-10">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-400">
          <Sparkles className="h-3.5 w-3.5" />
          CodeRush Academy
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          {q ? (
            <>
              Search results for{" "}
              <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-blue-300 bg-clip-text text-transparent">
                "{q}"
              </span>
            </>
          ) : (
            <>
              Explore the{" "}
              <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-blue-300 bg-clip-text text-transparent">
                Academy
              </span>
            </>
          )}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500 sm:text-base">
          Discover learning paths, courses, and lessons designed to help you
          build real programming skills.
        </p>
      </header>

      {/* =========================================================
        LOADING STATE
    ========================================================== */}
      {!results ? (
        <div className="space-y-10">
          {[1, 2, 3].map((section) => (
            <div key={section}>
              <div className="mb-4 h-4 w-28 animate-pulse rounded bg-white/[0.06]" />

              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-[82px] animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.025]"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : hasResults ? (
        <div className="space-y-12">
          {/* =====================================================
            TECHNOLOGIES
        ====================================================== */}
          {results.technologies?.length > 0 && (
            <Section
              title="Learning Paths"
              icon={<GraduationCap className="h-4 w-4" />}
              count={results.technologies.length}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {results.technologies.map((t: any) => (
                  <Link
                    key={t._id}
                    href={`/code-academy/${t.slug}`}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-400/25 hover:bg-white/[0.045] hover:shadow-2xl hover:shadow-violet-950/10"
                  >
                    <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/3 -translate-y-1/3 rounded-full bg-violet-500/[0.07] blur-2xl transition group-hover:bg-violet-500/[0.12]" />

                    <div className="relative flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.045]">
                        <Code2 className="h-5 w-5 text-violet-300" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-bold text-white transition-colors group-hover:text-violet-200">
                            {t.name}
                          </h3>

                          <ArrowRight className="h-4 w-4 shrink-0 text-neutral-700 transition-all group-hover:translate-x-1 group-hover:text-violet-300" />
                        </div>

                        {t.description && (
                          <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-neutral-500">
                            {t.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* =====================================================
            COURSES
        ====================================================== */}
          {results.courses?.length > 0 && (
            <Section
              title="Courses"
              icon={<BookOpen className="h-4 w-4" />}
              count={results.courses.length}
            >
              <div className="grid gap-3">
                {results.courses.map((c: any) => (
                  <Link
                    key={c._id}
                    href={`/code-academy/${c.technology?.slug}/${c.slug}`}
                    className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 transition-all duration-300 hover:border-blue-400/20 hover:bg-white/[0.045] hover:shadow-xl hover:shadow-blue-950/10 sm:p-4"
                  >
                    {/* Accent */}
                    <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-blue-400/0 via-blue-400/60 to-violet-400/0 opacity-0 transition-opacity group-hover:opacity-100" />

                    {c.coverImage ? (
                      <CourseCoverImage
                        src={c.coverImage}
                        alt={c.title}
                        className="h-16 w-24 shrink-0 rounded-xl object-cover ring-1 ring-white/[0.08] sm:h-[72px] sm:w-28"
                      />
                    ) : (
                      <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] sm:h-[72px] sm:w-28">
                        <BookOpen className="h-5 w-5 text-neutral-600" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-white transition-colors group-hover:text-blue-200">
                            {c.title}
                          </h3>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                            {c.technology?.name && (
                              <span className="rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1">
                                {c.technology.name}
                              </span>
                            )}

                            <span>•</span>

                            <span>
                              {c.lessonCount ?? 0} lessons
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-neutral-700 transition-all group-hover:translate-x-1 group-hover:text-blue-300" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* =====================================================
            LESSONS
        ====================================================== */}
          {results.lessons?.length > 0 && (
            <Section
              title="Lessons"
              icon={<BookOpen className="h-4 w-4" />}
              count={results.lessons.length}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {results.lessons.map((l: any) => (
                  <Link
                    key={l._id}
                    href={`/code-academy/${l.technologySlug}/${l.courseSlug}/${l.slug}`}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/20 hover:bg-white/[0.045]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/10 bg-emerald-400/[0.06]">
                        <BookOpen className="h-4 w-4 text-emerald-300" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="line-clamp-2 font-bold leading-5 text-white transition-colors group-hover:text-emerald-200">
                            {l.title}
                          </h3>

                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-700 transition-all group-hover:translate-x-1 group-hover:text-emerald-300" />
                        </div>

                        <p className="mt-2 truncate text-xs text-neutral-500">
                          {l.technologyName}{" "}
                          <span className="px-1 text-neutral-700">•</span>{" "}
                          {l.courseTitle}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>
      ) : (
        /* =======================================================
           EMPTY STATE
        ======================================================== */
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] px-6 py-20 text-center">
          <div className="absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-violet-500/[0.08] blur-[80px]" />

          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] shadow-xl">
            <Search className="h-7 w-7 text-neutral-500" />
          </div>

          <h2 className="relative mt-6 text-xl font-bold text-white">
            No results found
          </h2>

          <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
            We couldn't find anything matching{" "}
            <span className="font-semibold text-neutral-300">
              "{q}"
            </span>
            . Try searching for a different course, technology, or lesson.
          </p>

          <Link
            href="/code-academy/search"
            className="relative mt-7 inline-flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition-all hover:border-white/[0.18] hover:bg-white/[0.10]"
          >
            <Search className="h-4 w-4" />
            Start a new search
          </Link>
        </div>
      )}
    </main>
  </div>


  );
}

/* ===============================================================
SECTION COMPONENT
================================================================ */

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (<section> <div className="mb-4 flex items-center justify-between"> <div className="flex items-center gap-2.5"> <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035] text-neutral-400">
    {icon} </div>


    <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-neutral-300">
      {title}
    </h2>

    <span className="rounded-full border border-white/[0.07] bg-white/[0.035] px-2 py-0.5 text-[11px] font-bold text-neutral-500">
      {count}
    </span>
  </div>
  </div>

    {children}
  </section>


  );
}
