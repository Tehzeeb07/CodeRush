"use client";

/**
 * Sandboxed live preview for Web Development challenges.
 *
 * Untrusted user HTML/CSS/JS is combined into one self-contained document
 * and rendered inside a locked-down iframe:
 *
 *   - `srcDoc` — no server, no app origin involved
 *   - `sandbox="allow-scripts"` — executes user JS but keeps the frame at an
 *     opaque origin: user code cannot read the parent window, cookies,
 *     localStorage, Convex credentials, or the CodeRush DOM.
 *   - No allow-same-origin / allow-forms / allow-modals / allow-popups /
 *     allow-top-navigation — the frame is deliberately isolated.
 *
 * A new `runId` remounts the iframe (state refresh) and re-builds the
 * document. Loading / error states are surfaced in the panel.
 */

import { useEffect, useState } from "react";
import {
  buildPreviewDocument,
  type WebProjectCode,
} from "@/lib/web-editor/buildPreview";

export type PreviewStatus = "idle" | "running" | "ready" | "error";

interface WebPreviewProps {
  code: WebProjectCode;
  /** Increment to refresh the preview (Run button). */
  runId: number;
  /** Called whenever the preview status changes (lets parents drive UI). */
  onStatusChange?: (status: PreviewStatus) => void;
  className?: string;
}

export default function WebPreview({
  code,
  runId,
  onStatusChange,
  className = "",
}: WebPreviewProps) {
  if (runId <= 0) {
    // Nothing to preview until the first Run.
    return (
      <PreviewView
        status="idle"
        error={null}
        doc=""
        runId={0}
        className={className}
      />
    );
  }

  // Keying by `runId` remounts the frame for every Run, so the document is
  // built once at mount from the current code — no effect-based state sync
  // and no cascading renders.
  return (
    <PreviewFrame
      key={runId}
      code={code}
      runId={runId}
      onStatusChange={onStatusChange}
      className={className}
    />
  );
}

function PreviewFrame({
  code,
  runId,
  onStatusChange,
  className,
}: {
  code: WebProjectCode;
  runId: number;
  onStatusChange?: (status: PreviewStatus) => void;
  className: string;
}) {
  // Build the preview document once at mount (this component remounts for
  // every run). Pure computation, so it is safe to derive during render.
  const [built] = useState(() => {
    try {
      return { doc: buildPreviewDocument(code), error: null as string | null };
    } catch (e) {
      return {
        doc: "",
        error:
          e instanceof Error ? e.message : "Could not build the preview.",
      };
    }
  });
  // Tracks whether the iframe has finished loading for this run.
  const [loaded, setLoaded] = useState(false);

  const status: PreviewStatus = built.error
    ? "error"
    : loaded
      ? "ready"
      : "running";

  // Let the parent mirror the preview status (e.g. to drive the toolbar).
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  return (
    <PreviewView
      status={status}
      error={built.error}
      doc={built.doc}
      runId={runId}
      onLoaded={() => setLoaded(true)}
      className={className}
    />
  );
}

function PreviewView({
  status,
  error,
  doc,
  runId,
  onLoaded,
  className,
}: {
  status: PreviewStatus;
  error: string | null;
  doc: string;
  runId: number;
  onLoaded?: () => void;
  className: string;
}) {
  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-[#0d0f12] px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Preview
        </span>
        <span role="status" aria-live="polite">
          {status === "running" && (
            <span className="text-xs text-amber-300">Running…</span>
          )}
          {status === "ready" && (
            <span className="text-xs text-emerald-400">✓ Preview Ready</span>
          )}
          {status === "idle" && (
            <span className="text-xs text-neutral-600">
              Hit Run to render your page
            </span>
          )}
          {status === "error" && (
            <span className="text-xs text-red-400">Preview failed</span>
          )}
        </span>
      </div>

      {/* Preview body */}
      <div className="relative min-h-0 flex-1 bg-white">
        {doc && (
          <iframe
            key={runId}
            title="Web Development Preview"
            sandbox="allow-scripts"
            srcDoc={doc}
            onLoad={onLoaded}
            className="h-full w-full border-0 bg-white"
          />
        )}

        {status === "running" && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-600 border-t-emerald-400" />
              Loading preview…
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/80 p-6">
            <div className="max-w-sm rounded-lg border border-red-800 bg-red-950/60 p-4 text-sm text-red-200">
              <p className="mb-1 font-semibold">Preview could not be rendered</p>
              <p className="text-red-300/80">{error}</p>
            </div>
          </div>
        )}

        {status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
            <p className="text-sm text-neutral-500">
              Press <span className="font-mono text-neutral-400">Run</span> to
              see your website here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}