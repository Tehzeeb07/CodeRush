"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  Eye,
  Pencil,
  Loader2,
  Users,
  Building2,
  CalendarDays,
  MessageSquare,
  ExternalLink,
  GraduationCap,
  Gauge,
} from "lucide-react";
import {
  TALENT_CONNECT_SUBMISSION_STATUSES as STATUS_OPTIONS,
  categoryLabel,
  categoryEmoji,
  difficultyLabel,
  experienceLabel,
  formatDate,
  SUBMISSION_BADGE_COLORS,
} from "../../../../components/talent-connect/constants";

type SubmissionStatus = (typeof STATUS_OPTIONS)[number]["value"];

export default function AdminTalentConnectDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = params.id as Id<"talentConnectPosts">;

  const post = useQuery(api.talentConnectPosts.adminGet, { id: postId });
  const submissions = useQuery(api.talentConnectSubmissions.listForPostAdmin, {
    postId,
  });

  const updateStatus = useMutation(api.talentConnectSubmissions.updateStatus);
  const provideFeedback = useMutation(
    api.talentConnectSubmissions.provideFeedback
  );

  const [statusFilter, setStatusFilter] = useState<
    SubmissionStatus | undefined
  >(undefined);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showSuccess = (text: string) => {
    setMessage({ type: "success", text });
    setTimeout(() => setMessage(null), 3000);
  };

  const showError = (text: string) => {
    setMessage({ type: "error", text });
    setTimeout(() => setMessage(null), 4000);
  };

  const performStatusChange = async (
    submissionId: string,
    next: SubmissionStatus
  ) => {
    try {
      setActionLoading(`status-${submissionId}`);
      await updateStatus({
        submissionId: submissionId as Id<"talentConnectSubmissions">,
        submissionStatus: next,
      });
      showSuccess(`Proposal marked as ${next.replace("_", " ")}.`);
    } catch (error) {
      console.error("Update proposal status error:", error);
      showError(
        error instanceof Error ? error.message : "Failed to update status."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const performFeedback = async (submissionId: string) => {
    const feedback = feedbackDrafts[submissionId]?.trim();
    if (!feedback) {
      showError("Write feedback before sending it.");
      return;
    }
    try {
      setActionLoading(`feedback-${submissionId}`);
      await provideFeedback({
        submissionId: submissionId as Id<"talentConnectSubmissions">,
        feedback,
      });
      showSuccess("Feedback sent.");
      setFeedbackDrafts((prev) => ({ ...prev, [submissionId]: "" }));
    } catch (error) {
      console.error("Send feedback error:", error);
      showError(
        error instanceof Error ? error.message : "Failed to send feedback."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const list = (submissions ?? []).filter(
    (s) => !statusFilter || s.submissionStatus === statusFilter
  );

  const statusCount = (status: SubmissionStatus) =>
    (submissions ?? []).filter((s) => s.submissionStatus === status).length;

  if (post === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F1117] text-sm text-slate-500">
        <Loader2 size={20} className="mr-3 animate-spin" />
        Loading…
      </div>
    );
  }

  if (post === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0F1117] text-slate-400">
        <p>Talent Connect post not found.</p>
        <button
          type="button"
          onClick={() => router.push("/admin/talent-connect")}
          className="text-sm text-amber-400 hover:underline"
        >
          ← Back to Talent Connect
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1117] p-6 text-white md:p-8">
      {/* HEADER */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push("/admin/talent-connect")}
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Talent Connect
        </button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-300">
                {categoryEmoji(post.category)} {categoryLabel(post.category)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-[10px] font-bold text-slate-300">
                <Gauge size={11} /> {difficultyLabel(post.difficultyLevel)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-[10px] font-bold text-slate-300">
                <GraduationCap size={11} />{" "}
                {experienceLabel(post.experienceLevel)}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Building2 size={13} /> {post.companyName}
              </span>
              {post.deadline && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} /> Due {formatDate(post.deadline)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Users size={13} /> {post.submissionCount ?? 0} total proposals
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/talent-connect/${post._id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-400"
            >
              <Eye size={14} /> View Public Page
            </Link>
            <Link
              href={`/admin/talent-connect/${post._id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-xs font-semibold text-yellow-400 transition hover:bg-yellow-500/20"
            >
              <Pencil size={14} /> Edit Post
            </Link>
          </div>
        </div>
      </div>

      {/* POST DETAILS */}
      <div className="mb-10 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-[#151922] p-5 lg:col-span-2">
          <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">
            Full Description
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
            {post.fullDescription}
          </p>

          {post.requirements.length > 0 && (
            <>
              <h2 className="mb-3 mt-6 text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">
                Requirements
              </h2>
              <ul className="space-y-2">
                {post.requirements.map((req, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-slate-300"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {req}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-[#151922] p-5">
            <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">
              Required Skills
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {post.requiredSkills.length > 0 ? (
                post.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-[11px] font-medium text-slate-300"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-600">—</span>
              )}
            </div>

            {post.tags.length > 0 && (
              <>
                <h2 className="mb-3 mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-slate-800/70 px-2 py-0.5 text-[10px] font-medium text-slate-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </>
            )}

            {post.compensationInfo && (
              <>
                <h2 className="mb-2 mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">
                  Compensation
                </h2>
                <p className="text-xs text-slate-300">{post.compensationInfo}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* PROPOSALS */}
      <section>
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-bold tracking-tight">
            Proposals{" "}
            <span className="text-sm font-medium text-slate-500">
              ({submissions?.length ?? 0})
            </span>
          </h2>

          {/* Status filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter(undefined)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                statusFilter === undefined
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                  : "border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white"
              }`}
            >
              All ({submissions?.length ?? 0})
            </button>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setStatusFilter(
                    statusFilter === opt.value ? undefined : opt.value
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                  statusFilter === opt.value
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white"
                }`}
              >
                {opt.label} ({statusCount(opt.value)})
              </button>
            ))}
          </div>
        </div>

        {/* MESSAGE */}
        {message && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {submissions === undefined ? (
          <div className="flex items-center justify-center py-24 text-sm text-slate-600">
            <Loader2 size={20} className="mr-3 animate-spin" />
            Loading proposals…
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-[#151922] px-8 py-16 text-center">
            <Users size={36} className="mx-auto text-slate-700" />
            <h3 className="mt-4 text-base font-bold text-white">
              No proposals
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {statusFilter
                ? "No proposals with this status yet."
                : "Proposals submitted by developers will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {list.map((submission) => {
              const isStatusLoading =
                actionLoading === `status-${submission._id}`;
              const isFeedbackLoading =
                actionLoading === `feedback-${submission._id}`;
              const badgeColor =
                SUBMISSION_BADGE_COLORS[submission.submissionStatus] ??
                SUBMISSION_BADGE_COLORS.pending;

              return (
                <article
                  key={submission._id}
                  className="rounded-2xl border border-slate-800 bg-[#151922] p-5"
                >
                  {/* Applicant header */}
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${badgeColor}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {submission.submissionStatus.replace("_", " ")}
                        </span>
                        <span className="text-[11px] text-slate-600">
                          Submitted {formatDate(submission.submittedAt)}
                        </span>
                      </div>

                      <p className="flex items-center gap-2 text-sm font-bold text-white">
                        {submission.username}
                        {submission.username !== "unknown" && (
                          <Link
                            href={`/u/${submission.username}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-[10px] font-semibold text-slate-400 transition hover:border-amber-500/50 hover:text-amber-400"
                          >
                            Profile <ExternalLink size={10} />
                          </Link>
                        )}
                      </p>
                      {submission.userBio && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {submission.userBio}
                        </p>
                      )}
                    </div>

                    {/* Status actions */}
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {(
                        [
                          { value: "under_review", label: "Under Review" },
                          { value: "shortlisted", label: "Shortlist" },
                          { value: "approved", label: "Approve" },
                          { value: "rejected", label: "Reject" },
                        ] as const
                      ).map((action) => (
                        <button
                          key={action.value}
                          type="button"
                          disabled={
                            isStatusLoading ||
                            submission.submissionStatus === action.value
                          }
                          onClick={() =>
                            performStatusChange(submission._id, action.value)
                          }
                          className={`rounded-lg border px-3 py-2 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            action.value === "approved"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              : action.value === "rejected"
                                ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                : action.value === "shortlisted"
                                  ? "border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                                  : "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                          }`}
                        >
                          {isStatusLoading ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            action.label
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Proposal content */}
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-400">
                        Proposed Solution
                      </h4>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-300">
                        {submission.proposedSolution}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-400">
                        Technical Approach
                      </h4>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-300">
                        {submission.technicalApproach}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-400">
                        Relevant Experience
                      </h4>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-300">
                        {submission.relevantExperience}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-400">
                        Technology Stack
                      </h4>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {submission.technologyStack.length > 0 ? (
                          submission.technologyStack.map((tech) => (
                            <span
                              key={tech}
                              className="rounded-lg border border-slate-700 bg-slate-800/50 px-2 py-1 text-[10px] font-medium text-slate-300"
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
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                      {submission.portfolioUrl && (
                        <a
                          href={submission.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-400"
                        >
                          Portfolio ↗
                        </a>
                      )}
                      {submission.githubUrl && (
                        <a
                          href={submission.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-400"
                        >
                          GitHub ↗
                        </a>
                      )}
                      {submission.linkedinUrl && (
                        <a
                          href={submission.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-400"
                        >
                          LinkedIn ↗
                        </a>
                      )}
                    </div>
                  )}

                  {/* Previous projects */}
                  {submission.previousProjects.length > 0 && (
                    <div className="mt-5 border-t border-slate-800 pt-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-400">
                        Previous Projects
                      </h4>
                      <div className="mt-3 space-y-3">
                        {submission.previousProjects.map((project, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-slate-800 bg-[#1a1f2b] p-4"
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
                                  Open <ExternalLink size={10} />
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
                                      className="rounded-md bg-slate-800/70 px-2 py-0.5 text-[10px] font-medium text-slate-500"
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
                    <div className="mt-5 border-t border-slate-800 pt-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-400">
                        Additional Message
                      </h4>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-400">
                        {submission.additionalMessage}
                      </p>
                    </div>
                  )}

                  {/* Feedback */}
                  <div className="mt-5 border-t border-slate-800 pt-4">
                    <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-400">
                      <MessageSquare size={12} /> Feedback
                    </h4>

                    {submission.adminFeedback && (
                      <div className="mt-3 rounded-xl border border-blue-400/15 bg-blue-500/[0.06] p-3">
                        <p className="whitespace-pre-wrap text-xs leading-6 text-slate-300">
                          {submission.adminFeedback}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <textarea
                        rows={2}
                        value={feedbackDrafts[submission._id] ?? ""}
                        onChange={(e) =>
                          setFeedbackDrafts((prev) => ({
                            ...prev,
                            [submission._id]: e.target.value,
                          }))
                        }
                        placeholder="Write feedback for this developer…"
                        className="flex-1 rounded-xl border border-slate-800 bg-[#1a1f2b] px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={isFeedbackLoading}
                        onClick={() => void performFeedback(submission._id)}
                        className="inline-flex h-fit items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isFeedbackLoading ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <MessageSquare size={13} />
                        )}
                        Send Feedback
                      </button>
                    </div>

                    <p className="mt-2 text-[10px] text-slate-600">
                      Last updated {formatDate(submission.updatedAt)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

