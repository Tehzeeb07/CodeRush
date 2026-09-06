"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../../../convex/_generated/api";
import Link from "next/link";
import LessonContentRenderer from "@/components/academy/LessonContentRenderer";
import PracticeExercise from "@/components/academy/PracticeExercise";
import LessonQuiz from "@/components/academy/LessonQuiz";
import LessonSidebar, {
  MobileSidebarToggle,
} from "@/components/academy/LessonSidebar";
import {
  DifficultyBadge,
  DurationStamp,
  ProgressBar,
} from "@/components/academy/academy-ui";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Lock,
  Trophy,
} from "lucide-react";

export default function LessonPage() {
  const params = useParams();
  const technologySlug = params.technology as string;
  const courseSlug = params.course as string;
  const lessonSlug = params.lesson as string;
  const [mobileOpen, setMobileOpen] = useState(false);

  const data = useQuery(api.academy.getLessonPage, {
    technologySlug,
    courseSlug,
    lessonSlug,
  });
  const trackAccess = useMutation(api.academy.trackLessonAccess);
  const completeLesson = useMutation(api.academy.completeLesson);

  useEffect(() => {
    if (data?.lesson) {
      trackAccess({ technologySlug, courseSlug, lessonSlug });
    }
  }, [data?.lesson, trackAccess, technologySlug, courseSlug, lessonSlug]);

  if (data === undefined) return <Loading />;
  if (!data) return <NotFound technologySlug={technologySlug} />;

  const {
    lesson,
    course,
    technology,
    modules,
    totalLessons,
    completedLessonCount,
    percent,
    unlocked,
    lessonCompleted,
    exercise,
    exerciseCompleted,
    quiz,
    quizPassed,
    prev,
    next,
  } = data;

  const onComplete = async () => {
    if (!lessonCompleted) {
      await completeLesson({ technologySlug, courseSlug, lessonSlug });
    }
  };

  return (
    <div className="cr-shell">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/code-academy/${technologySlug}/${courseSlug}`}
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} /> {course.title}
          </Link>
          <MobileSidebarToggle onClick={() => setMobileOpen(true)} />
        </div>

        <div className="flex gap-6">
          <LessonSidebar
            courseTitle={course.title}
            technologySlug={technologySlug}
            courseSlug={courseSlug}
            modules={modules}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />

          <main className="min-w-0 flex-1">
            {!unlocked ? (
              <Locked />
            ) : (
              <>
                <LessonHeader
                  lesson={lesson}
                  technology={technology}
                  completed={lessonCompleted}
                  percent={percent}
                  completedLessonCount={completedLessonCount}
                  totalLessons={totalLessons}
                />

                <div className="mt-6">
                  <LessonContentRenderer
                    content={lesson.content as any}
                    codeExamples={lesson.codeExamples}
                  />
                </div>

                {exercise && (
                  <PracticeExercise
                    exercise={{
                      _id: exercise._id,
                      title: exercise.title,
                      question: exercise.question,
                      instructions: exercise.instructions,
                      starterCode: exercise.starterCode,
                      language: exercise.language,
                      expectedOutput: exercise.expectedOutput,
                      hints: exercise.hints,
                      difficulty: exercise.difficulty,
                    }}
                    completed={exerciseCompleted}
                  />
                )}

                {quiz && (
                  <LessonQuiz
                    quiz={{
                      _id: quiz._id,
                      title: quiz.title,
                      passingPercentage: quiz.passingPercentage,
                      allowRetake: quiz.allowRetake,
                      questions: quiz.questions,
                    }}
                    passed={quizPassed}
                  />
                )}

                <CompletionBar
                  lessonCompleted={lessonCompleted}
                  onComplete={onComplete}
                />

                <PrevNext
                  prev={prev}
                  next={next}
                  technologySlug={technologySlug}
                  courseSlug={courseSlug}
                />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
function LessonHeader({ lesson, technology, completed, percent, completedLessonCount, totalLessons }: { lesson: any; technology: any; completed: boolean; percent: number; completedLessonCount: number; totalLessons: number }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-indigo-300">{technology.name}</span>
        <span className="text-neutral-600">·</span>
        <DifficultyBadge difficulty={lesson.difficulty} />
        <DurationStamp minutes={lesson.estimatedMinutes} />
        {completed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            <Trophy size={10} /> Completed
          </span>
        )}
      </div>
      <h1 className="mt-2 text-3xl font-bold text-white">{lesson.title}</h1>
      <p className="mt-2 text-neutral-400">{lesson.shortDescription}</p>
      <div className="mt-4">
        <ProgressBar percent={percent} />
        <p className="mt-1.5 text-xs text-neutral-500">
          {completedLessonCount}/{totalLessons} lessons completed ({percent}%)
        </p>
      </div>
    </div>
  );
}

function CompletionBar({ lessonCompleted, onComplete }: { lessonCompleted: boolean; onComplete: () => void }) {
  const [done, setDone] = useState(lessonCompleted);
  if (done) {
    return (
      <div className="mt-8 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-5 py-3 text-sm font-semibold text-emerald-300">
        <Trophy size={16} /> Lesson completed! +10 XP earned.
      </div>
    );
  }
  return (
    <div className="mt-8 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3">
      <p className="text-sm text-neutral-400">
        Finished reading? Mark this lesson as complete to earn +10 XP.
      </p>
      <button
        type="button"
        onClick={async () => { await onComplete(); setDone(true); }}
        className="shrink-0 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
      >
        Mark complete
      </button>
    </div>
  );
}

function PrevNext({ prev, next, technologySlug, courseSlug }: { prev: { slug: string; title: string } | null; next: { slug: string; title: string } | null; technologySlug: string; courseSlug: string }) {
  return (
    <div className="mt-8 flex items-center justify-between gap-4">
      {prev ? (
        <Link href={`/code-academy/${technologySlug}/${courseSlug}/${prev.slug}`} className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-3 text-sm text-neutral-300 transition-colors hover:border-white/[0.16] hover:text-white">
          <ChevronLeft size={16} />
          <span className="truncate">{prev.title}</span>
        </Link>
      ) : <span />}
      {next ? (
        <Link href={`/code-academy/${technologySlug}/${courseSlug}/${next.slug}`} className="ml-auto flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-400">
          <span className="truncate">{next.title}</span>
          <ChevronRight size={16} />
        </Link>
      ) : (
        <Link href={`/code-academy/${technologySlug}/${courseSlug}`} className="ml-auto flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400">
          Back to course <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}

function Locked() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] py-20">
      <Lock size={40} className="text-neutral-600" />
      <h2 className="mt-4 text-xl font-bold text-white">Lesson locked</h2>
      <p className="mt-2 max-w-sm text-center text-sm text-neutral-400">
        Complete the previous lesson to unlock this one.
      </p>
    </div>
  );
}

function Loading() {
  return (
    <div className="cr-shell">
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-10">
        <div className="h-8 w-64 rounded bg-neutral-800" />
        <div className="mt-4 h-10 w-2/3 rounded bg-neutral-800" />
      </div>
    </div>
  );
}

function NotFound({ technologySlug }: { technologySlug: string }) {
  return (
    <div className="cr-shell">
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <BookOpen size={40} className="mx-auto text-neutral-600" />
        <h1 className="mt-4 text-xl font-bold text-white">Lesson not found</h1>
        <Link href={`/code-academy/${technologySlug}`} className="mt-4 inline-block text-sm text-indigo-300 hover:text-indigo-200">
          ← Back to path
        </Link>
      </div>
    </div>
  );
}

