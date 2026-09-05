"use client";

/**
 * Lesson quiz: renders multiple-choice questions, submits answers to the
 * backend for server-side scoring, then reveals correctness, the correct
 * answer and explanations. Passing awards +20 XP once.
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Check, RotateCw, Send, Trophy } from "lucide-react";

interface QuizQuestion {
  _id: string;
  question: string;
  options: Array<{ id: string; text: string }>;
}

export default function LessonQuiz({
  quiz,
  passed,
}: {
  quiz: {
    _id: string;
    title: string;
    passingPercentage: number;
    allowRetake: boolean;
    questions: QuizQuestion[];
  };
  passed: boolean;
}) {
  const submitQuiz = useMutation(api.academy.submitQuiz);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    percentage: number;
    passed: boolean;
    xpAwarded: number;
    alreadyPassed: boolean;
    results: Array<{
      questionId: string;
      selectedAnswerId: string | null;
      correct: boolean;
      correctAnswerId: string;
      explanation: string | null;
    }>;
  } | null>(null);

  const allAnswered = quiz.questions.every((q) => selected[q._id]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await submitQuiz({
        quizId: quiz._id as any,
        answers: quiz.questions.map((q) => ({
          questionId: q._id,
          selectedAnswerId: selected[q._id] ?? undefined,
        })),
      });
      setResult(res);
    } catch (e) {
      setResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  const retake = () => {
    setSelected({});
    setResult(null);
  };

  const scorePct = result ? Math.round((result.score / result.total) * 100) : 0;

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08]">
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-5 py-4">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-400" />
          <h3 className="text-lg font-semibold text-white">{quiz.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {passed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              <Check size={10} /> Passed
            </span>
          )}
          <span className="text-xs text-neutral-500">
            Pass: {quiz.passingPercentage}%
          </span>
        </div>
      </div>

      {!result ? (
        <div className="divide-y divide-white/[0.06]">
          {quiz.questions.map((q, idx) => (
            <div key={q._id} className="px-5 py-4">
              <p className="text-sm font-medium text-white">
                <span className="mr-2 text-neutral-500">{idx + 1}.</span>
                {q.question}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt) => {
                  const active = selected[q._id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelected((s) => ({ ...s, [q._id]: opt.id }))}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                        active
                          ? "border-indigo-500/40 bg-indigo-500/10 text-white"
                          : "border-white/[0.08] text-neutral-300 hover:border-white/[0.16] hover:bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                          active
                            ? "border-indigo-400 bg-indigo-500 text-white"
                            : "border-white/[0.15] text-neutral-500"
                        }`}
                      >
                        {opt.id.toUpperCase()}
                      </span>
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-xs text-neutral-500">
              {Object.keys(selected).length}/{quiz.questions.length} answered
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={!allAnswered || submitting}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500/90 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
            >
              {submitting ? <RotateCw size={14} className="animate-spin" /> : <Send size={14} />}
              Submit answers
            </button>
          </div>
        </div>
      ) : (
        <ResultView
          result={result}
          quiz={quiz}
          scorePct={scorePct}
          allowRetake={quiz.allowRetake}
          onRetake={retake}
        />
      )}
    </div>
  );
}

function ResultView({
  result,
  quiz,
  scorePct,
  allowRetake,
  onRetake,
}: {
  result: NonNullable<ReturnType<typeof LessonQuiz> extends never ? never : any>;
  quiz: { title: string; questions: QuizQuestion[]; passingPercentage: number };
  scorePct: number;
  allowRetake: boolean;
  onRetake: () => void;
}) {
  return (
    <div className="px-5 py-5">
      <div
        className={`mb-5 flex items-center gap-3 rounded-xl border p-4 ${
          result.passed
            ? "border-emerald-500/20 bg-emerald-500/[0.06]"
            : "border-amber-500/20 bg-amber-500/[0.06]"
        }`}
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
            result.passed ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
          }`}
        >
          {scorePct}%
        </div>
        <div>
          <p className="font-semibold text-white">
            {result.passed
              ? result.alreadyPassed
                ? "You passed this quiz!"
                : `You passed! +${result.xpAwarded} XP earned.`
              : "Not quite — try again!"}
          </p>
          <p className="text-sm text-neutral-400">
            {result.score}/{result.total} correct
            {result.alreadyPassed && " (XP already awarded earlier)"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {quiz.questions.map((q, idx) => {
          const r = result.results.find(
            (x: any) => x.questionId === q._id
          );
          if (!r) return null;
          const correctOpt = q.options.find((o) => o.id === r.correctAnswerId);
          return (
            <div
              key={q._id}
              className={`rounded-xl border p-4 ${
                r.correct ? "border-emerald-500/15" : "border-rose-500/15"
              }`}
            >
              <p className="text-sm font-medium text-white">
                <span className="mr-2 text-neutral-500">{idx + 1}.</span>
                {q.question}
              </p>
              <p className="mt-2 text-sm">
                <span className="text-neutral-500">Your answer: </span>
                <span className={r.correct ? "text-emerald-300" : "text-rose-300"}>
                  {q.options.find((o) => o.id === r.selectedAnswerId)?.text ?? "—"}
                </span>
              </p>
              {!r.correct && correctOpt && (
                <p className="text-sm">
                  <span className="text-neutral-500">Correct answer: </span>
                  <span className="text-emerald-300">{correctOpt.text}</span>
                </p>
              )}
              {r.explanation && (
                <p className="mt-2 text-sm text-neutral-400">{r.explanation}</p>
              )}
            </div>
          );
        })}
      </div>

      {allowRetake && !result.passed && (
        <button
          type="button"
          onClick={onRetake}
          className="mt-5 flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-neutral-300 transition-colors hover:border-white/[0.2] hover:text-white"
        >
          <RotateCw size={14} /> Retake quiz
        </button>
      )}
    </div>
  );
}
