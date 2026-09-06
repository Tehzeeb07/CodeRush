"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion } from "framer-motion";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  Target,
  Building2,
  CalendarDays,
  Gauge,
  GraduationCap,
  Users,
  BadgeDollarSign,
  CheckCircle2,
  Tag,
  FileText,
} from "lucide-react";
import {
  categoryLabel,
  categoryEmoji,
  CATEGORY_BADGE_COLORS,
  DIFFICULTY_BADGE_COLORS,
  difficultyLabel,
  experienceLabel,
  formatDate,
} from "../../../components/talent-connect/constants";

export default function TalentConnectDetailsPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id as Id<"talentConnectPosts">;

  const post = useQuery(api.talentConnectPosts.getPublished, { id: postId });
  const mySubmission = useQuery(api.talentConnectSubmissions.getMine, {
    postId,
  });

  // Captured once so the expired check is stable across re-renders.
  const [now] = useState(() => Date.now());

  if (post === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090d] text-sm text-slate-600">
        Loading Talent Connect…
      </div>
    );
  }

  if (post === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#07090d] text-slate-400">
        <Target size={36} className="text-slate-700" />
        <p>Talent Connect post not found.</p>
        <Link
          href="/talent-connect"
          className="text-sm text-amber-400 hover:underline"
        >
          ← Back to Talent Connect
        </Link>
      </div>
    );
  }

  const categoryColor =
    CATEGORY_BADGE_COLORS[post.category] ??
    "text-white/60 bg-white/10 border-white/20";
  const difficultyColor =
    DIFFICULTY_BADGE_COLORS[post.difficultyLevel] ??
    "text-white/60 bg-white/10 border-white/20";

  const isExpired = post.deadline !== undefined && post.deadline < now;
  const alreadySubmitted = mySubmission !== undefined && mySubmission !== null;

  return (
    <div className="min-h-screen overflow-hidden bg-[#07090d] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-500/[0.05] blur-[120px]" />
        <div className="absolute bottom-[-200px] right-[-100px] h-[400px] w-[400px] rounded-full bg-violet-600/[0.05] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top navigation */}
        <div className="mb-8">
          <Link
            href="/talent-connect"
            className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-sm text-slate-400 backdrop-blur-xl transition-all hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-1"
            />
            Back to Talent Connect
          </Link>
        </div>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <header className="mb-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${categoryColor}`}
              >
                {categoryEmoji(post.category)} {categoryLabel(post.category)}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${difficultyColor}`}
              >
                <Gauge size={11} /> {difficultyLabel(post.difficultyLevel)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                <GraduationCap size={11} /> {experienceLabel(post.experienceLevel)}
              </span>
            </div>

            <h1 className="text-3xl font-black leading-tight tracking-[-0.03em] text-white sm:text-4xl">
              {post.title}
            </h1>

            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Building2 size={15} className="text-amber-400" />
              {post.companyName}
            </p>
          </header>

          {/* Meta grid */}
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0d1118] p-4">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
                <CalendarDays size={12} /> Deadline
              </p>
              <p className="mt-2 text-sm font-bold text-white">
                {post.deadline
                  ? isExpired
                    ? "Closed"
                    : formatDate(post.deadline)
                  : "No deadline"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#0d1118] p-4">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
                <Users size={12} /> Proposals
              </p>
              <p className="mt-2 text-sm font-bold text-white">
                {post.submissionCount ?? 0} submitted
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#0d1118] p-4">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
                <BadgeDollarSign size={12} /> Compensation
              </p>
              <p className="mt-2 text-sm font-bold text-white">
                {post.compensationInfo || "Not specified"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#0d1118] p-4">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
                <Tag size={12} /> Tags
              </p>
              <p className="mt-2 truncate text-sm font-bold text-white">
                {post.tags.length > 0 ? post.tags.join(", ") : "—"}
              </p>
            </div>
          </div>

          {/* Description */}
          <section className="mb-8 rounded-3xl border border-white/[0.06] bg-[#0d1118] p-6 sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-amber-400">
              <FileText size={15} /> Project Description
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {post.fullDescription}
            </p>
          </section>

          {/* Requirements */}
          {post.requirements.length > 0 && (
            <section className="mb-8 rounded-3xl border border-white/[0.06] bg-[#0d1118] p-6 sm:p-8">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-amber-400">
                <CheckCircle2 size={15} /> Requirements
              </h2>
              <ul className="space-y-3">
                {post.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {req}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Required skills */}
          {post.requiredSkills.length > 0 && (
            <section className="mb-8 rounded-3xl border border-white/[0.06] bg-[#0d1118] p-6 sm:p-8">
              <h2 className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-amber-400">
                Required Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {post.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="sticky bottom-4 rounded-3xl border border-amber-400/15 bg-[#0d1118]/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div>
                <h3 className="text-base font-bold text-white">
                  {alreadySubmitted
                    ? "Your proposal has been submitted"
                    : isExpired
                      ? "This post is closed"
                      : "Ready to showcase your talent?"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {alreadySubmitted
                    ? "Track its status from My Talent Connect."
                    : isExpired
                      ? "The deadline for this Talent Connect post has passed."
                      : "Submit your professional proposal with your solution, approach, and experience."}
                </p>
              </div>

              {alreadySubmitted ? (
                <Link
                  href="/dashboard/talent-connect"
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-6 py-3 text-sm font-bold text-amber-300 transition hover:bg-amber-400/20"
                >
                  View My Proposal
                </Link>
              ) : isExpired ? (
                <span className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-6 py-3 text-sm font-bold text-slate-600">
                  Submissions Closed
                </span>
              ) : (
                <Link
                  href={`/talent-connect/${post._id}/submit`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-bold text-black shadow-[0_10px_40px_rgba(245,158,11,0.25)] transition hover:shadow-[0_15px_50px_rgba(245,158,11,0.35)]"
                >
                  <Target size={16} />
                  Submit Your Proposal
                </Link>
              )}
            </div>
          </section>
        </motion.article>
      </div>
    </div>
  );
}
