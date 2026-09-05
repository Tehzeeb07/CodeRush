"use client";

/**
 * Code Academy — shared UI primitives (icon resolution, difficulty badges,
 * progress bars, stat cards). Kept dependency-light and reused across the
 * landing, course, lesson and dashboard views.
 */

import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  Lock,
  Star,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Map an admin-chosen icon key to a Lucide icon. Falls back to BookOpen. */
const ICON_MAP: Record<string, LucideIcon> = {
  book: BookOpen,
  code: Code2,
  zap: Zap,
  star: Star,
  trophy: Trophy,
};

export function TechnologyIcon({
  icon,
  color,
  size = 22,
}: {
  icon?: string | null;
  color?: string | null;
  size?: number;
}) {
  const Key = icon && ICON_MAP[icon] ? ICON_MAP[icon] : BookOpen;
  return <Key size={size} style={color ? { color } : undefined} />;
}

const DIFFICULTY_STYLES: Record<
  string,
  { label: string; className: string }
> = {
  beginner: {
    label: "Beginner",
    className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  },
  intermediate: {
    label: "Intermediate",
    className: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  },
  advanced: {
    label: "Advanced",
    className: "bg-rose-500/15 text-rose-300 border-rose-500/20",
  },
};

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const cfg = DIFFICULTY_STYLES[difficulty] ?? DIFFICULTY_STYLES.beginner;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

export function ProgressBar({
  percent,
  className = "",
}: {
  percent: number;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-white/[0.06] ${className}`}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

export function LessonStateIcon({ state }: { state: string }) {
  if (state === "completed")
    return <CheckCircle2 size={16} className="text-emerald-400" />;
  if (state === "current")
    return <div className="h-2.5 w-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.7)]" />;
  return <Lock size={14} className="text-neutral-600" />;
}

export function DurationStamp({ minutes }: { minutes?: number | null }) {
  if (!minutes) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
      <Clock size={12} />
      {minutes} min
    </span>
  );
}

export function AcademyLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] transition-all duration-300 hover:border-white/[0.16] hover:bg-white/[0.05] ${className}`}
    >
      {children}
    </Link>
  );
}
