
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import LikeButton from "./like-button";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  Sparkles,
  Code2,
  Layers3,
} from "lucide-react";

/**
 * lucide-react 1.x removed brand icons (Github), so the GitHub mark is
 * inlined here to keep the showcase "Repo" button rendering.
 */
function GithubIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18a11 11 0 0 1 5.76 0c2.19-1.49 3.15-1.18 3.15-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export default function ShowcasePage() {
  const submissions = useQuery(api.submissions.listAll);

  return (
    <div className="min-h-screen overflow-hidden bg-[#07090d] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-blue-600/[0.08] blur-[120px]" />
        <div className="absolute bottom-[-200px] left-[-100px] h-[400px] w-[400px] rounded-full bg-violet-600/[0.06] blur-[120px]" />
        <div className="absolute right-[-150px] top-[30%] h-[400px] w-[400px] rounded-full bg-cyan-500/[0.04] blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top navigation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex items-center justify-between"
        >
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

          <div className="hidden items-center gap-2 rounded-full border border-blue-400/10 bg-blue-400/[0.04] px-3 py-1.5 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-400">
              Community
            </span>
          </div>
        </motion.div>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/10 bg-violet-400/[0.05] px-3 py-1.5"
          >
            <Sparkles size={13} className="text-violet-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400">
              Developer Showcase
            </span>
          </div>

          <h1 className="max-w-4xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            Built by developers.
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Shared with the community.
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Explore projects created by the CodeRush community, discover new
            ideas, and get inspired by what other developers are building.
          </p>

          {/* Stats strip */}
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Layers3 size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">
                  {submissions?.length ?? 0}
                </p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                  Projects
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <Code2 size={16} className="text-violet-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">∞</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                  Ideas
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Loading */}
        {submissions === undefined && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-[270px] animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.025]"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {submissions?.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-white/[0.06] bg-white/[0.02] px-6 py-20 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.04]">
              <Code2 size={26} className="text-slate-500" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-white">
              No projects yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              The showcase is waiting for its first project. Complete a
              challenge and share what you build with the community.
            </p>
          </motion.div>
        )}

        {/* Projects */}
        {submissions && submissions.length > 0 && (
          <section>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">
                  Community projects
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                  Latest builds
                </h2>
              </div>

              <span className="hidden text-xs text-slate-600 sm:block">
                {submissions.length}{" "}
                {submissions.length === 1 ? "project" : "projects"}
              </span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {submissions.map((s, index) => (
                <motion.article
                  key={s._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.05,
                  }}
                  whileHover={{ y: -5 }}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d1118] transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
                >
                  {/* Card glow */}
                  <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-500/[0.06] blur-3xl transition-all duration-500 group-hover:bg-blue-500/[0.12]" />

                  {/* Top accent */}
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-50 transition-opacity group-hover:opacity-100" />

                  <div className="relative p-5">
                    {/* Header */}
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-sm font-bold text-blue-300 ring-1 ring-white/[0.06]">
                          {s.username?.[0]?.toUpperCase() ?? "?"}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">
                            {s.username}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-slate-600">
                            {s.challengeTitle}
                          </p>
                        </div>
                      </div>

                      <LikeButton submissionId={s._id} />
                    </div>

                    {/* Project title */}
                    <div className="mb-3">
                      <h3 className="line-clamp-1 text-lg font-bold tracking-tight text-white transition-colors group-hover:text-blue-300">
                        {s.challengeTitle}
                      </h3>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                          Completed project
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mb-6 line-clamp-3 min-h-[60px] text-sm leading-5 text-slate-500">
                      {s.description || "No description provided."}
                    </p>

                    {/* Divider */}
                    <div className="mb-4 h-px bg-white/[0.05]" />

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {s.repoUrl && (
                          <a
                            href={s.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/link inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-2 text-[10px] font-semibold text-slate-400 transition-all hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
                          >
                            <GithubIcon size={13} />
                            Repo
                            <ArrowUpRight
                              size={11}
                              className="opacity-50 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                            />
                          </a>
                        )}

                        {s.demoUrl && (
                          <a
                            href={s.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/link inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-2 text-[10px] font-semibold text-blue-400 transition-all hover:bg-blue-500/15 hover:text-blue-300"
                          >
                            <ExternalLink size={12} />
                            Live
                            <ArrowUpRight
                              size={11}
                              className="opacity-50 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                            />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                        <span className="h-1 w-1 rounded-full bg-slate-700" />
                        Community
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        )}

        {/* Bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 border-t border-white/[0.05] pt-6 text-center"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-700">
            CodeRush · Build · Learn · Share
          </p>
        </motion.div>
      </div>
    </div>
  );
}
