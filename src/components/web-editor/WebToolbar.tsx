"use client";

/**
 * Top toolbar for the Web Development workspace.
 *
 *   [← Back]  Challenge Name .................  [▶ Run] [💾 Save]
 *
 * Matches the CodeRush dark developer UI (neutral-950 surfaces, emerald
 * accents). Save/run state labels mirror the statuses used elsewhere
 * (Saving… / Saved / Running…).
 */

import { Play, Save, ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface WebToolbarProps {
  challengeName: string;
  onBack: () => void;
  running: boolean;
  onRun: () => void;
  saveState: SaveState;
  onSave: () => void;
}

export default function WebToolbar({
  challengeName,
  onBack,
  running,
  onRun,
  saveState,
  onSave,
}: WebToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 bg-[#0d0f12] px-3 py-2">
      <button
        type="button"
        onClick={onBack}
        title="Back to challenge details"
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
      >
        <ArrowLeft size={14} />
        <span className="hidden sm:inline">Back</span>
      </button>

      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
        {challengeName}
      </h1>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          title="Run in browser preview (Ctrl+Enter)"
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} />
          )}
          {running ? "Running…" : "Run"}
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={saveState === "saving"}
          title="Save draft (Ctrl+S)"
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition-colors hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveState === "saving" && <Loader2 size={14} className="animate-spin" />}
          {saveState === "saved" && <CheckCircle2 size={14} className="text-emerald-400" />}
          {saveState === "error" && <XCircle size={14} className="text-red-400" />}
          {saveState !== "saving" && <Save size={14} />}
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved"
              : "Save"}
        </button>
      </div>
    </div>
  );
}