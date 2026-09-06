"use client";

/**
 * Practice exercise: a Monaco editor, a Run button (reusing /api/code/execute)
 * and a Submit button that calls the academy backend to auto-grade and award
 * XP. Simpler than Coding Problems — its purpose is learning.
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import CodeEditor from "@/components/code-editor/CodeEditor";
import { Check, RotateCw, Send, Terminal } from "lucide-react";

type RunResult = {
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  error?: string;
  message?: string;
} | null;

export default function PracticeExercise({
  exercise,
  completed,
}: {
  exercise: {
    _id: string;
    title: string;
    question: string;
    instructions: string[];
    starterCode: string;
    language: string;
    expectedOutput?: string | null;
    hints?: string[] | null;
    difficulty: string;
  };
  completed: boolean;
}) {
  const submitExercise = useMutation(api.academy.submitExercise);
  const [code, setCode] = useState(exercise.starterCode);
  const [output, setOutput] = useState<RunResult>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    passed: boolean | null;
    xpAwarded: number;
    newlyCompleted: boolean;
  } | null>(null);
  const [showHints, setShowHints] = useState(false);

  const lang = normalizeForEditor(exercise.language);

  const run = async () => {
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: mapToRuntime(exercise.language), code }),
      });
      setOutput(await res.json());
    } catch (e) {
      setOutput({ error: "Could not reach the execution service." });
    } finally {
      setRunning(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setResult(null);
    const outText = output?.stdout ?? "";
    try {
      const res = await submitExercise({
        exerciseId: exercise._id as any,
        code,
        output: outText,
      });
      setResult(res);
    } catch (e) {
      setResult({ passed: null, xpAwarded: 0, newlyCompleted: false });
    } finally {
      setSubmitting(false);
    }
  };

  const outText = output
    ? output.stdout?.trim()
      ? output.stdout
      : output.stderr?.trim()
        ? output.stderr
        : output.compile_output?.trim()
          ? output.compile_output
          : output.error ?? output.message ?? ""
    : "";

  const autoPassed =
    exercise.expectedOutput && output && output.stdout !== undefined
      ? output.stdout.trim() === exercise.expectedOutput.trim()
      : null;

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08]">
      <div className="border-b border-white/[0.08] bg-white/[0.03] px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            Practice
          </span>
          {completed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              <Check size={10} /> Completed
            </span>
          )}
        </div>
        <h3 className="mt-1 text-lg font-semibold text-white">
          {exercise.title}
        </h3>
        <p className="mt-1 text-sm text-neutral-400">{exercise.question}</p>
      </div>

      {exercise.instructions?.length > 0 && (
        <div className="border-b border-white/[0.08] px-5 py-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
            Instructions
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-300">
            {exercise.instructions.map((inst, i) => (
              <li key={i}>{inst}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-white/[0.08] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Editor
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={run}
                disabled={running}
                className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] text-neutral-300 transition-colors hover:border-white/[0.16] hover:text-white disabled:opacity-50"
              >
                {running ? <RotateCw size={12} className="animate-spin" /> : <Terminal size={12} />}
                {running ? "Running" : "Run"}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="flex items-center gap-1 rounded-lg bg-indigo-500/90 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                {submitting ? <RotateCw size={12} className="animate-spin" /> : <Send size={12} />}
                Submit
              </button>
            </div>
          </div>
          <div className="h-72">
            <CodeEditor
              language={lang}
              value={code}
              onChange={setCode}
              onRun={run}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="border-b border-white/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Output
          </div>
          <pre className="flex-1 overflow-auto bg-[#080808] p-4 text-[13px] leading-relaxed text-neutral-300">
            {output
              ? outText || <span className="text-neutral-600">(no output)</span>
              : <span className="text-neutral-600">Run your code to see output here.</span>}
          </pre>
          {exercise.expectedOutput && (
            <div className="border-t border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Expected output
              </p>
              <pre className="mt-1 text-[13px] text-neutral-400">
                {exercise.expectedOutput}
              </pre>
              {autoPassed !== null && (
                <span
                  className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    autoPassed
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-rose-500/15 text-rose-300"
                  }`}
                >
                  {autoPassed ? "✓ Matches" : "✗ Differs"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {result && (
        <div
          className={`border-t px-5 py-4 ${
            result.newlyCompleted
              ? "border-emerald-500/20 bg-emerald-500/[0.06]"
              : "border-white/[0.08] bg-white/[0.02]"
          }`}
        >
          {result.newlyCompleted ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <Check size={16} /> Exercise completed! +{result.xpAwarded} XP earned.
            </p>
          ) : result.passed === false ? (
            <p className="text-sm text-rose-300">
              Not quite — your output doesn&apos;t match the expected output yet. Try again!
            </p>
          ) : (
            <p className="text-sm text-neutral-400">
              Submission recorded. Keep practicing!
            </p>
          )}
        </div>
      )}

      {exercise.hints && exercise.hints.length > 0 && (
        <div className="border-t border-white/[0.08] px-5 py-3">
          <button
            type="button"
            onClick={() => setShowHints((s) => !s)}
            className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
          >
            {showHints ? "Hide hints" : `Show hints (${exercise.hints.length})`}
          </button>
          {showHints && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-400">
              {exercise.hints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function normalizeForEditor(lang: string): string {
  const l = lang.toLowerCase();
  if (l === "c++") return "cpp";
  if (l === "js") return "javascript";
  if (l === "py") return "python";
  return l;
}

function mapToRuntime(lang: string): string {
  const l = lang.toLowerCase();
  if (l === "c++") return "cpp";
  if (l === "js") return "javascript";
  if (l === "py") return "python";
  return l;
}
