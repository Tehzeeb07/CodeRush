"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Target,
  Building2,
  CalendarDays,
  Clock3,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import StatusBadge from "../../../components/talent-connect/StatusBadge";
import { formatDate } from "../../../components/talent-connect/constants";

export default function MyTalentConnectPage() {
  const submissions = useQuery(api.talentConnectSubmissions.listMine, {});
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="min-h-screen overflow-hidden bg-[#07090d] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-500/[0.05] blur-[120px]" />
        <div className="absolute bottom-[-200px] left-[-100px] h-[400px] w-[400px] rounded-full bg-blue-600/[0.06] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top navigation */}
        <div className="mb-10 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-sm text-slate-400 backdrop-blur-xl transition-all hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-1"
            />
            Back to dashboard
          </Link>

          <Link
            href="/talent-connect"
            className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-sm text-slate-400 backdrop-blur-xl transition-all hover:border-amber-400/25 hover:bg-white/[0.05] hover:text-amber-300"
          >
            <Target size={15} />
            Explore Talent Connect
          </Link>
        </div>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/10 bg-amber-400/[0.05] px-3 py-1.5">
            <Target size={13} className="text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400">
              My Talent Connect
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
            Your Talent Connect proposals
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-500">
            Track every proposal you have submitted, review feedback from
            admins and companies, and follow your submission status.
          </p>
        </motion.header>

        {/* Submissions */}
        <section className="space-y-4">
          {submissions === undefined ? (
            <div className="flex items-center justify-center py-32 text-sm text-slate-600">
              Loading your proposals…
            </div>
          ) : submissions.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.06] bg-[#0d1118] px-8 py-20 text-center">
              <Target size={40} className="mx-auto text-slate-700" />
              <h3 className="mt-5 text-lg font-bold text-white">
                No proposals yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Browse Talent Connect posts and submit your first professional
                proposal to connect with real-world projects and companies.
              </p>
              <Link
                href="/talent-connect"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-bold text-black shadow-[0_10px_40px_rgba(245,158,11,0.25)] transition hover:shadow-[0_15px_50px_rgba(245,158,11,0.35)]"
              >
                Explore Talent Connect
              </Link>
            </div>
          ) : (
            submissions.map((submission, index) => (
              <motion.article
                key={submission._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
                className="overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0d1118] transition-colors hover:border-white/[0.1]"
              >
                {/* Card head */}
                <div className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={submission.submissionStatus} />
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {submission.postTitle}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Building2 size={12} />
                        {submission.companyName}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-3 text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={12} />
                        Submitted {formatDate(submission.submittedAt)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={12} />
                        Updated {formatDate(submission.updatedAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(
                            expanded === submission._id ? null : submission._id
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-amber-400/25 hover:text-amber-300"
                      >
                        {expanded === submission._id ? (
                          <>
                            <ChevronUp size={13} /> Hide proposal
                          </>
                        ) : (
                          <>
                            <ChevronDown size={13} /> View proposal
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Feedback */}
                  {submission.adminFeedback && (
                    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-400/15 bg-blue-500/[0.06] p-4">
                      <MessageSquare size={15} className="mt-0.5 shrink-0 text-blue-400" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-400">
                          Feedback
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-slate-300">
                          {submission.adminFeedback}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded proposal */}
                {expanded === submission._id && (
                  <div className="border-t border-white/[0.05] bg-white/[0.015] p-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div>
                        <h4 className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-400">
                          Proposed Solution
                        </h4>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-300">
                          {submission.proposedSolution}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-400">
                          Technical Approach
                        </h4>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-300">
                          {submission.technicalApproach}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-400">
                          Relevant Experience
                        </h4>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-300">
                          {submission.relevantExperience}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-400">
                          Technology Stack
                        </h4>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {submission.technologyStack.length > 0 ? (
                            submission.technologyStack.map((tech) => (
                              <span
                                key={tech}
                                className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-slate-400"
                              >
                                {tech}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-600">—</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Links */}
                    {(submission.portfolioUrl ||
                      submission.githubUrl ||
                      submission.linkedinUrl) && (
                      <div className="mt-6 flex flex-wrap gap-2 border-t border-white/[0.05] pt-5">
                        {submission.portfolioUrl && (
                          <a
                            href={submission.portfolioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-amber-400/25 hover:text-amber-300"
                          >
                            Portfolio ↗
                          </a>
                        )}
                        {submission.githubUrl && (
                          <a
                            href={submission.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-amber-400/25 hover:text-amber-300"
                          >
                            GitHub ↗
                          </a>
                        )}
                        {submission.linkedinUrl && (
                          <a
                            href={submission.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-amber-400/25 hover:text-amber-300"
                          >
                            LinkedIn ↗
                          </a>
                        )}
                      </div>
                    )}

                    {/* Previous projects */}
                    {submission.previousProjects.length > 0 && (
                      <div className="mt-6 border-t border-white/[0.05] pt-5">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-400">
                          Previous Projects
                        </h4>
                        <div className="mt-3 space-y-3">
                          {submission.previousProjects.map((project, i) => (
                            <div
                              key={i}
                              className="rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-bold text-white">
                                  {project.title}
                                </p>
                                {project.url && (
                                  <a
                                    href={project.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300"
                                  >
                                    Open ↗
                                  </a>
                                )}
                              </div>
                              {project.description && (
                                <p className="mt-1 text-xs leading-6 text-slate-500">
                                  {project.description}
                                </p>
                              )}
                              {project.technologies &&
                                project.technologies.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {project.technologies.map((tech) => (
                                      <span
                                        key={tech}
                                        className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-500"
                                      >
                                        {tech}
                                      </span>
                                    ))}
                                  </div>
                                )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional message */}
                    {submission.additionalMessage && (
                      <div className="mt-6 border-t border-white/[0.05] pt-5">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-400">
                          Additional Message
                        </h4>
                        <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-400">
                          {submission.additionalMessage}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </motion.article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
