"use client";

/**
 * Runnable code example. For compiled/interpreted languages (cpp, python,
 * javascript, java) it calls the existing /api/code/execute endpoint — no
 * separate execution backend. For web lessons (html/css) it renders a live
 * browser preview.
 */

import { useState } from "react";
import { Check, Copy, Play, RotateCw, Terminal } from "lucide-react";

type RunResult = {
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  status?: string;
  message?: string;
  error?: string;
} | null;

const EXECUTABLE_LANGS = new Set(["cpp", "python", "javascript", "java", "c++"]);

function normalizeLanguage(lang: string): string {
  const l = lang.toLowerCase();
  if (l === "c++") return "cpp";
  if (l === "js") return "javascript";
  if (l === "py") return "python";
  return l;
}
export default function CodePlayground({
  title,
  language,
  code,
  expectedOutput,
  explanation,
}: {
  title?: string;
  language: string;
  code: string;
  expectedOutput?: string;
  explanation?: string;
}) {
  const [value, setValue] = useState(code);
  const [output, setOutput] = useState<RunResult>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const lang = normalizeLanguage(language);
  const isWeb = lang === "html" || lang === "css";
  const executable = EXECUTABLE_LANGS.has(lang);

  const run = async () => {
    if (isWeb) return;
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang, code: value }),
      });
      const data = await res.json();
      setOutput(data);
    } catch (e) {
      setOutput({ error: "Could not reach the execution service." });
    } finally {
      setRunning(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
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

  const passed =
    expectedOutput && output && output.stdout !== undefined
      ? output.stdout.trim() === expectedOutput.trim()
      : null;

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-white/[0.03] px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-neutral-500" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            {title ?? language}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] text-neutral-400 transition-colors hover:border-white/[0.16] hover:text-white"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          {executable && (
            <button
              type="button"
              onClick={run}
              disabled={running}
              className="flex items-center gap-1 rounded-lg bg-indigo-500/90 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {running ? <RotateCw size={12} className="animate-spin" /> : <Play size={12} />}
              {running ? "Running…" : "Run Code"}
            </button>
          )}
        </div>
      </div>

      <pre className="max-h-80 overflow-auto bg-[#0a0a0a] p-4 text-[13px] leading-relaxed text-neutral-200">
        <code>{value}</code>
      </pre>

      {isWeb && <WebPreview lang={lang} code={value} />}
      {output && executable && <OutputPanel outText={outText} passed={passed} />}

      {expectedOutput && !output && (
        <div className="border-t border-white/[0.08] bg-white/[0.02] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Expected output
          </p>
          <pre className="mt-1 text-[13px] text-neutral-400">{expectedOutput}</pre>
        </div>
      )}

      {explanation && (
        <div className="border-t border-white/[0.08] px-4 py-3 text-sm text-neutral-400">
          {explanation}
        </div>
      )}
    </div>
  );
}

function OutputPanel({
  outText,
  passed,
}: {
  outText: string;
  passed: boolean | null;
}) {
  return (
    <div className="border-t border-white/[0.08] bg-[#080808] p-4">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        <Terminal size={12} />
        Output
        {passed !== null && (
          <span
            className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              passed
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-rose-500/15 text-rose-300"
            }`}
          >
            {passed ? "✓ Matches expected" : "✗ Differs from expected"}
          </span>
        )}
      </div>
      <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-300">
        {outText || <span className="text-neutral-600">(no output)</span>}
      </pre>
    </div>
  );
}

function WebPreview({ lang, code }: { lang: string; code: string }) {
  const srcDoc =
    lang === "html"
      ? code
      : `<!DOCTYPE html><html><head><style>body{font-family:system-ui;padding:16px;background:#fff;color:#111}</style></head><body><style>${code}</style><div class="preview">Preview</div></body></html>`;
  return (
    <div className="border-t border-white/[0.08]">
      <div className="border-b border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        Live preview
      </div>
      <iframe
        title="preview"
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        className="h-64 w-full bg-white"
      />
    </div>
  );
}
