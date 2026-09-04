"use client";

/**
 * Admin review page for a single Web Development submission.
 * Shows user / challenge / date / status, a sandboxed live preview, the
 * HTML / CSS / JavaScript source, and Approve / Reject actions.
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import WebPreview from "@/components/web-editor/WebPreview";
import { useToasts, ToastStack } from "@/components/ui/Toast";

type CodeFile = "html" | "css" | "javascript";

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/20 text-amber-400" },
  approved: {
    label: "Approved",
    className: "bg-emerald-500/20 text-emerald-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/20 text-red-400",
  },
};

const CODE_TABS: { id: CodeFile; label: string }[] = [
  { id: "html", label: "index.html" },
  { id: "css", label: "style.css" },
  { id: "javascript", label: "script.js" },
];

export default function AdminWebSubmissionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { toasts, push } = useToasts();

  const submission = useQuery(api.webSubmissions.getWebSubmissionAdmin, {
    submissionId: params.id as Id<"submissions">,
  });
  const reviewWebSubmission = useMutation(api.webSubmissions.reviewWebSubmission);

  const [activeCode, setActiveCode] = useState<CodeFile>("html");
  const [note, setNote] = useState("");
  const [runId, setRunId] = useState(1);
  const [actionLoading, setActionLoading] = useState<
    "approved" | "rejected" | null
  >(null);

  const meta =
    STATUS_META[submission?.status ?? "pending"] ?? STATUS_META.pending;

  const runReview = async (verdict: "approved" | "rejected") => {
    if (!submission) return;
    setActionLoading(verdict);
    try {
      await reviewWebSubmission({
        submissionId: submission._id,
        verdict,
        note: note || undefined,
      });
      setNote("");
      push(
        verdict === "approved"
          ? "Submission approved — XP granted."
          : "Submission rejected.",
        verdict === "approved" ? "success" : "info",
      );
    } catch (e) {
      push(e instanceof Error ? e.message : "Could not update submission", "error");
    } finally {
      setActionLoading(null);
    }
  };

  if (submission === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        Loading submission…
      </div>
    );
  }

  if (submission === null) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-slate-300">Submission not found.</p>
        <button
          type="button"
          onClick={() => router.push("/admin/challenges/submissions")}
          className="text-sm text-blue-400 hover:underline"
        >
          ← Back to Web Submissions
        </button>
      </div>
    );
  }

  const code =
    activeCode === "html"
      ? submission.htmlCode
      : activeCode === "css"
        ? submission.cssCode
        : submission.javascriptCode;
return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => router.push("/admin/challenges/submissions")}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={15} />
            Back to Web Submissions
          </button>
          <h1 className="text-2xl font-bold text-white">
            {submission.challengeTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {submission.username}
            {submission.userEmail ? ` · ${submission.userEmail}` : ""} ·{" "}
            {new Date(submission.submittedAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}
        >
          {meta.label}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Live preview */}
          <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-[#1E293B]">
            <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
              <span className="text-sm font-semibold text-white">
                Live Preview
              </span>
              <div className="flex items-center gap-2">
                {submission.xpAwarded !== null && (
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                    ✦ +{submission.xpAwarded} XP granted
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setRunId((v) => v + 1)}
                  title="Refresh preview"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:text-white"
                >
                  <RotateCcw size={12} />
                  Refresh
                </button>
              </div>
            </div>
            <div className="relative h-[480px]">
              <WebPreview
                code={{
                  html: submission.htmlCode,
                  css: submission.cssCode,
                  javascript: submission.javascriptCode,
                }}
                runId={runId}
              />
            </div>
          </div>

          {/* Code panes */}
          <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-[#1E293B]">
            <div className="flex items-center gap-1 border-b border-slate-700/50 px-2 pt-2">
              {CODE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCode(tab.id)}
                  className={`rounded-t-md border border-b-0 px-3 py-1.5 font-mono text-xs transition-colors ${
                    activeCode === tab.id
                      ? "border-slate-600 bg-slate-800 text-white"
                      : "border-transparent text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <pre className="max-h-[420px] overflow-auto bg-[#0B1120] p-4 font-mono text-xs leading-relaxed text-slate-200">
              {code || "// empty"}
            </pre>
          </div>
        </div>
{/* Review actions */}
        <div className="h-fit space-y-4 rounded-xl border border-slate-700/50 bg-[#1E293B] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Review
          </h2>
          <div>
            <label
              htmlFor="review-note"
              className="mb-1 block text-xs text-slate-400"
            >
              Note (optional)
            </label>
            <textarea
              id="review-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Feedback for the user (stored with the verdict)."
              className="w-full rounded-lg border border-slate-700/50 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={() => void runReview("approved")}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading === "approved" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              Approve
            </button>
            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={() => void runReview("rejected")}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading === "rejected" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <XCircle size={15} />
              )}
              Reject
            </button>
          </div>

          {submission.reviewedBy && (
            <div className="rounded-lg bg-slate-800/50 p-3 text-xs text-slate-400">
              Reviewed by{" "}
              <span className="text-slate-200">{submission.reviewedBy}</span>
              {submission.reviewedAt
                ? ` on ${new Date(submission.reviewedAt).toLocaleString()}`
                : ""}
              {submission.reviewNote && (
                <>
                  <br />
                  <span className="text-slate-300">
                    Note: {submission.reviewNote}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}