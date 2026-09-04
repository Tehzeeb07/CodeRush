"use client";

/**
 * WebEditor — the dedicated workspace for Web Development challenges
 * (category `web` / hackathon category `web`).
 *
 * Flow:
 *   Open editor → load saved draft (Convex) or starter code
 *   Edit index.html / style.css / script.js (reuses the shared Monaco editor)
 *   Run → sandboxed iframe preview (no Piston — pure browser rendering)
 *   Save → persist draft to Convex (webProjectDrafts)
 *   Submit → stores a `pending` web submission for admin review
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";

import { useToasts, ToastStack } from "@/components/ui/Toast";
import CodeEditor from "@/components/code-editor/CodeEditor";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

import WebToolbar, { type SaveState } from "./WebToolbar";
import WebFileTabs, { type WebFileId } from "./WebFileTabs";
import WebPreview, { type PreviewStatus } from "./WebPreview";

import {
  DEFAULT_STARTER_CSS,
  DEFAULT_STARTER_HTML,
  DEFAULT_STARTER_JAVASCRIPT,
  hasSubmittableCode,
  type WebProjectCode,
} from "@/lib/web-editor/buildPreview";

export interface WebEditorProps {
  challenge: Doc<"challenges">;
}

const EMPTY_CODE: WebProjectCode = { html: "", css: "", javascript: "" };

export default function WebEditor({ challenge }: WebEditorProps) {
  const router = useRouter();
  const { toasts, push } = useToasts();

  const draft = useQuery(api.webSubmissions.getMyDraft, {
    challengeId: challenge._id,
  });
  const saveDraft = useMutation(api.webSubmissions.saveDraft);
  const submitWeb = useMutation(api.webSubmissions.submitWebChallenge);

  const [activeFile, setActiveFile] = useState<WebFileId>("html");
  const [codes, setCodes] = useState<WebProjectCode | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const [runId, setRunId] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Initialize editor content exactly once: saved draft → challenge starter
  // template → default starter. `draft === undefined` means still loading.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    if (draft === undefined) return;
    initialized.current = true;

    if (draft) {
      setCodes({
        html: draft.htmlCode,
        css: draft.cssCode,
        javascript: draft.javascriptCode,
      });
      push("Restored your saved draft", "info");
    } else {
      setCodes({
        html: challenge.starterHtml ?? DEFAULT_STARTER_HTML,
        css: challenge.starterCss ?? DEFAULT_STARTER_CSS,
        javascript: challenge.starterJavascript ?? DEFAULT_STARTER_JAVASCRIPT,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge, draft]);
// ------------------------------------------------------------------
  // Run → browser preview (never Piston for web challenges).
  // ------------------------------------------------------------------
  const handleRun = useCallback(() => {
    setRunId((v) => v + 1);
    push("Launching browser preview…", "info");
  }, [push]);

  // ------------------------------------------------------------------
  // Save → Convex draft (webProjectDrafts).
  // ------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    if (!codes) return;
    setSaveState("saving");
    try {
      await saveDraft({
        challengeId: challenge._id,
        htmlCode: codes.html,
        cssCode: codes.css,
        javascriptCode: codes.javascript,
      });
      setSaveState("saved");
      push("Draft saved", "success");
      window.setTimeout(() => setSaveState("idle"), 2500);
    } catch (e) {
      setSaveState("error");
      push(e instanceof Error ? e.message : "Could not save draft", "error");
      window.setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [codes, challenge._id, saveDraft, push]);

  // Ctrl/Cmd+S anywhere in the workspace saves the draft.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  // ------------------------------------------------------------------
  // Submit → pending web submission (confirmation + guards).
  // ------------------------------------------------------------------
  const beginSubmit = useCallback(() => {
    if (!codes) return;
    if (!hasSubmittableCode(codes)) {
      setSubmitMessage({
        type: "error",
        text: "Write some HTML, CSS or JavaScript before submitting — you can't submit an empty solution.",
      });
      return;
    }
    setSubmitMessage(null);
    setConfirmOpen(true);
  }, [codes]);

  const confirmSubmit = useCallback(async () => {
    if (!codes) return;
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      await submitWeb({
        challengeId: challenge._id,
        htmlCode: codes.html,
        cssCode: codes.css,
        javascriptCode: codes.javascript,
      });
      setConfirmOpen(false);
      setSubmitMessage({
        type: "success",
        text: "Solution submitted! It is now pending admin review.",
      });
      push("Submitted for review", "success");
    } catch (e) {
      setSubmitMessage({
        type: "error",
        text:
          e instanceof Error ? e.message : "Submission failed — please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }, [codes, challenge._id, submitWeb, push]);

  const handleCodeChange = useCallback(
    (value: string) => {
      setCodes((prev) => {
        if (!prev) return prev;
        return { ...prev, [activeFile]: value };
      });
    },
    [activeFile],
  );

  const activeValue = codes
    ? activeFile === "html"
      ? codes.html
      : activeFile === "css"
        ? codes.css
        : codes.javascript
    : "";
  const activeLanguage =
    activeFile === "html" ? "html" : activeFile === "css" ? "css" : "javascript";

  if (!codes) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-700 border-t-emerald-400" />
          Loading editor…
        </div>
      </div>
    );
  }
return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <WebToolbar
        challengeName={challenge.title}
        onBack={() => router.push(`/challenges/${challenge._id}`)}
        running={previewStatus === "running"}
        onRun={handleRun}
        saveState={saveState}
        onSave={() => void handleSave()}
      />

      {/* Editor + Preview */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Code side */}
        <div className="flex min-h-[50vh] min-w-0 flex-1 flex-col border-b border-neutral-800 lg:min-h-0 lg:border-b-0 lg:border-r">
          <WebFileTabs active={activeFile} onChange={setActiveFile} />
          <div className="min-h-0 flex-1">
            <CodeEditor
              language={activeLanguage}
              value={activeValue}
              onChange={handleCodeChange}
              onRun={handleRun}
            />
          </div>
        </div>

        {/* Preview side */}
        <div className="flex h-[45vh] w-full shrink-0 lg:h-auto lg:w-1/2 lg:max-w-[50%]">
          <WebPreview
            code={codes ?? EMPTY_CODE}
            runId={runId}
            onStatusChange={setPreviewStatus}
            className="w-full"
          />
        </div>
      </div>

      {/* Bottom submit bar */}
      <div className="border-t border-neutral-800 bg-[#0d0f12] px-3 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {submitMessage ? (
              <p
                className={`text-sm ${
                  submitMessage.type === "success"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
                role="status"
              >
                {submitMessage.text}
              </p>
            ) : (
              <p className="text-xs text-neutral-500">
                Save stores your progress. Submit sends your solution for admin
                review.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={beginSubmit}
            className="rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Submit Challenge
          </button>
        </div>
      </div>

      {/* Submit confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Submit this challenge?"
        description="Are you sure you want to submit this solution for review? You can keep editing after submitting, but your submission will be locked for admin review."
        confirmLabel="Submit"
        cancelLabel="Cancel"
        variant="default"
        isLoading={submitting}
        onClose={() => {
          if (!submitting) setConfirmOpen(false);
        }}
        onConfirm={() => void confirmSubmit()}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}