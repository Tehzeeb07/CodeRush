"use client";

import {
  SUBMISSION_BADGE_COLORS,
  POST_STATUS_BADGE_COLORS,
  submissionStatusLabel,
  postStatusLabel,
} from "./constants";

/**
 * Visually attractive pill badge for Talent Connect statuses
 * (proposal review status or Talent Connect post lifecycle status).
 */
export default function StatusBadge({
  status,
  kind = "submission",
  className = "",
}: {
  status: string;
  kind?: "submission" | "post";
  className?: string;
}) {
  const colors =
    kind === "submission"
      ? (SUBMISSION_BADGE_COLORS[status] ?? SUBMISSION_BADGE_COLORS.pending)
      : (POST_STATUS_BADGE_COLORS[status] ?? POST_STATUS_BADGE_COLORS.draft);

  const label =
    kind === "submission"
      ? submissionStatusLabel(status)
      : postStatusLabel(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${colors} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
