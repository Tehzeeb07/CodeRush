"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Target,
  Building2,
  CalendarDays,
  Users,
  Gauge,
  GraduationCap,
  ArrowUpRight,
} from "lucide-react";
import {
  categoryLabel,
  categoryEmoji,
  CATEGORY_BADGE_COLORS,
  DIFFICULTY_BADGE_COLORS,
  difficultyLabel,
  experienceLabel,
  formatDate,
} from "./constants";

export interface TalentConnectPostCardData {
  _id: string;
  title: string;
  shortDescription: string;
  requiredSkills: string[];
  category: string;
  difficultyLevel: string;
  experienceLevel: string;
  companyName: string;
  deadline?: number;
  createdAt: number;
  submissionCount?: number;
}

/**
 * Premium card for a Talent Connect post on the public browse page.
 */
export default function PostCard({
  post,
  index = 0,
}: {
  post: TalentConnectPostCardData;
  index?: number;
}) {
  const categoryColor =
    CATEGORY_BADGE_COLORS[post.category] ??
    "text-white/60 bg-white/10 border-white/20";
  const difficultyColor =
    DIFFICULTY_BADGE_COLORS[post.difficultyLevel] ??
    "text-white/60 bg-white/10 border-white/20";

  const [now] = useState(() => Date.now());

  const isExpired =
    post.deadline !== undefined && post.deadline < now;

  return (
    <Link href={`/talent-connect/${post._id}`} className="block">
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
        whileHover={{ y: -6 }}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0d1118] p-6 transition-all duration-300 hover:border-amber-400/25 hover:shadow-[0_25px_70px_rgba(0,0,0,0.4)]"
      >
        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Ambient glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-500/[0.07] blur-3xl transition-transform duration-500 group-hover:scale-125" />

        {/* Header row */}
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-amber-500/[0.08] text-amber-400 transition-transform duration-300 group-hover:scale-110">
              <Target size={18} />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-400">
                <Building2 size={12} className="shrink-0 text-slate-600" />
                {post.companyName}
              </p>
            </div>
          </div>

          <ArrowUpRight
            size={16}
            className="shrink-0 text-slate-700 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-amber-400"
          />
        </div>

        {/* Title + description */}
        <h3 className="relative mt-4 text-lg font-bold leading-snug tracking-tight text-white transition-colors group-hover:text-amber-50">
          {post.title}
        </h3>
        <p className="relative mt-2 line-clamp-3 text-xs leading-6 text-slate-500">
          {post.shortDescription}
        </p>

        {/* Skills */}
        {post.requiredSkills.length > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {post.requiredSkills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-slate-400"
              >
                {skill}
              </span>
            ))}
            {post.requiredSkills.length > 5 && (
              <span className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-slate-500">
                +{post.requiredSkills.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${categoryColor}`}
          >
            {categoryEmoji(post.category)} {categoryLabel(post.category)}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${difficultyColor}`}
          >
            <Gauge size={11} /> {difficultyLabel(post.difficultyLevel)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
            <GraduationCap size={11} /> {experienceLabel(post.experienceLevel)}
          </span>
        </div>

        {/* Footer */}
        <div className="relative mt-auto pt-5">
          <div className="flex items-center justify-between border-t border-white/[0.05] pt-4 text-[10px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={12} />
              {post.deadline
                ? isExpired
                  ? "Closed"
                  : `Due ${formatDate(post.deadline)}`
                : "No deadline"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={12} />
              {post.submissionCount ?? 0}{" "}
              {(post.submissionCount ?? 0) === 1 ? "proposal" : "proposals"}
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
