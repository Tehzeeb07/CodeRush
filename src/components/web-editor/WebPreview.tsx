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
  const [srcDoc, setSrcDoc] = useState<string>("");
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const transitionTo = (next: PreviewStatus) => {
    setStatus(next);
    onStatusChange?.(next);
  };

  useEffect(() => {
    if (runId <= 0) return; // nothing to preview until first Run
    transitionTo("running");
    setError(null);
    try {
      const doc = buildPreviewDocument(code);
      setSrcDoc(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the preview.");
      transitionTo("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

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
        {srcDoc && (
          <iframe
            key={runId}
            title="Web Development Preview"
            sandbox="allow-scripts"
            srcDoc={srcDoc}
            onLoad={() => transitionTo("ready")}
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