/**
 * Talent Connect — shared constants, labels and badge colors.
 */

export const TALENT_CONNECT_CATEGORIES = [
  {
    value: "technical_solution",
    label: "Technical Solution",
    emoji: "🛠️",
    desc: "Solve a concrete technical problem with your proposed approach",
  },
  {
    value: "project_collaboration",
    label: "Project Collaboration",
    emoji: "🤝",
    desc: "Collaborate with a company or team on a real project",
  },
  {
    value: "startup_idea",
    label: "Startup Idea",
    emoji: "🚀",
    desc: "Pitch your take on an early-stage product idea",
  },
  {
    value: "freelance_project",
    label: "Freelance Project",
    emoji: "💼",
    desc: "Deliver a scoped, paid freelance engagement",
  },
  {
    value: "job_opportunity",
    label: "Job Opportunity",
    emoji: "🎯",
    desc: "Direct hiring pipelines from real companies",
  },
  {
    value: "innovation_challenge",
    label: "Innovation Challenge",
    emoji: "💡",
    desc: "Push the boundaries with an open innovation brief",
  },
  {
    value: "open_technical_problem",
    label: "Open Technical Problem",
    emoji: "🧪",
    desc: "Open-ended problems with no single correct answer",
  },
  {
    value: "developer_recruitment",
    label: "Developer Recruitment",
    emoji: "👥",
    desc: "Companies scouting for exceptional developer talent",
  },
] as const;

export type TalentConnectCategoryValue =
  (typeof TALENT_CONNECT_CATEGORIES)[number]["value"];

export const TALENT_CONNECT_DIFFICULTIES = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
] as const;

export type TalentConnectDifficultyValue =
  (typeof TALENT_CONNECT_DIFFICULTIES)[number]["value"];

export const TALENT_CONNECT_EXPERIENCE_LEVELS = [
  { value: "any_level", label: "Any Level" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "experienced", label: "Experienced" },
  { value: "senior", label: "Senior" },
] as const;

export type TalentConnectExperienceValue =
  (typeof TALENT_CONNECT_EXPERIENCE_LEVELS)[number]["value"];

export const TALENT_CONNECT_POST_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "unpublished", label: "Unpublished" },
  { value: "archived", label: "Archived" },
] as const;

export const TALENT_CONNECT_SUBMISSION_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

export type TalentConnectSubmissionStatusValue =
  (typeof TALENT_CONNECT_SUBMISSION_STATUSES)[number]["value"];

/** Quick-pick technologies offered in the proposal form (custom ones allowed). */
export const TALENT_CONNECT_TECH_OPTIONS = [
  "React",
  "Next.js",
  "Node.js",
  "TypeScript",
  "Python",
  "Java",
  "PostgreSQL",
  "MongoDB",
  "Docker",
  "AWS",
  "Convex",
] as const;

/* ================================================================
   LABEL HELPERS
   ================================================================ */

export function categoryLabel(value?: string | null): string {
  if (!value) return "—";
  return (
    TALENT_CONNECT_CATEGORIES.find((c) => c.value === value)?.label ?? value
  );
}

export function categoryEmoji(value?: string | null): string {
  if (!value) return "•";
  return TALENT_CONNECT_CATEGORIES.find((c) => c.value === value)?.emoji ?? "•";
}

export function difficultyLabel(value?: string | null): string {
  if (!value) return "—";
  return (
    TALENT_CONNECT_DIFFICULTIES.find((d) => d.value === value)?.label ?? value
  );
}

export function experienceLabel(value?: string | null): string {
  if (!value) return "—";
  return (
    TALENT_CONNECT_EXPERIENCE_LEVELS.find((e) => e.value === value)?.label ??
    value
  );
}

export function submissionStatusLabel(value?: string | null): string {
  if (!value) return "—";
  return (
    TALENT_CONNECT_SUBMISSION_STATUSES.find((s) => s.value === value)?.label ??
    value
  );
}

export function postStatusLabel(value?: string | null): string {
  if (!value) return "—";
  return (
    TALENT_CONNECT_POST_STATUSES.find((s) => s.value === value)?.label ?? value
  );
}

export function formatDate(ts?: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ================================================================
   BADGE COLORS
   ================================================================ */

export const CATEGORY_BADGE_COLORS: Record<string, string> = {
  technical_solution: "text-blue-400 bg-blue-500/10 border-blue-400/20",
  project_collaboration: "text-cyan-400 bg-cyan-500/10 border-cyan-400/20",
  startup_idea: "text-violet-400 bg-violet-500/10 border-violet-400/20",
  freelance_project: "text-emerald-400 bg-emerald-500/10 border-emerald-400/20",
  job_opportunity: "text-amber-400 bg-amber-500/10 border-amber-400/20",
  innovation_challenge:
    "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-400/20",
  open_technical_problem:
    "text-orange-400 bg-orange-500/10 border-orange-400/20",
  developer_recruitment: "text-sky-400 bg-sky-500/10 border-sky-400/20",
};

export const DIFFICULTY_BADGE_COLORS: Record<string, string> = {
  beginner: "text-emerald-400 bg-emerald-500/10 border-emerald-400/20",
  intermediate: "text-yellow-400 bg-yellow-500/10 border-yellow-400/20",
  advanced: "text-orange-400 bg-orange-500/10 border-orange-400/20",
  expert: "text-red-400 bg-red-500/10 border-red-400/20",
};

export const SUBMISSION_BADGE_COLORS: Record<string, string> = {
  pending: "text-slate-300 bg-slate-500/10 border-slate-400/20",
  under_review: "text-blue-400 bg-blue-500/10 border-blue-400/20",
  shortlisted: "text-violet-400 bg-violet-500/10 border-violet-400/20",
  approved: "text-emerald-400 bg-emerald-500/10 border-emerald-400/20",
  rejected: "text-red-400 bg-red-500/10 border-red-400/20",
};

export const POST_STATUS_BADGE_COLORS: Record<string, string> = {
  draft: "text-slate-300 bg-slate-500/10 border-slate-400/20",
  published: "text-emerald-400 bg-emerald-500/10 border-emerald-400/20",
  unpublished: "text-yellow-400 bg-yellow-500/10 border-yellow-400/20",
  archived: "text-red-400 bg-red-500/10 border-red-400/20",
};

