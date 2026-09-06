"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Target, BriefcaseBusiness, Handshake } from "lucide-react";
import PostCard from "../../components/talent-connect/PostCard";
import {
  TALENT_CONNECT_CATEGORIES,
  TALENT_CONNECT_EXPERIENCE_LEVELS,
} from "../../components/talent-connect/constants";

export default function TalentConnectPage() {
  const posts = useQuery(api.talentConnectPosts.listPublished, {});

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [experienceLevel, setExperienceLevel] = useState<string | undefined>(undefined);
  const [skill, setSkill] = useState("");

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    for (const post of posts ?? []) {
      for (const s of post.requiredSkills) set.add(s);
    }
    return Array.from(set).sort();
  }, [posts]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const skillQuery = skill.trim().toLowerCase();

    return (posts ?? []).filter((post) => {
      if (
        query &&
        !post.title.toLowerCase().includes(query) &&
        !post.shortDescription.toLowerCase().includes(query) &&
        !post.companyName.toLowerCase().includes(query) &&
        !post.tags.some((t) => t.toLowerCase().includes(query))
      ) {
        return false;
      }
      if (category && post.category !== category) return false;
      if (experienceLevel && post.experienceLevel !== experienceLevel) {
        return false;
      }
      if (
        skillQuery &&
        !post.requiredSkills.some((s) => s.toLowerCase().includes(skillQuery))
      ) {
        return false;
      }
      return true;
    });
  }, [posts, search, category, experienceLevel, skill]);

  const hasActiveFilters =
    search.trim() !== "" ||
    category !== undefined ||
    experienceLevel !== undefined ||
    skill.trim() !== "";

  return (
    <div className="min-h-screen overflow-hidden bg-[#07090d] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-500/[0.05] blur-[120px]" />
        <div className="absolute bottom-[-200px] left-[-100px] h-[400px] w-[400px] rounded-full bg-blue-600/[0.06] blur-[120px]" />
        <div className="absolute right-[-150px] top-[30%] h-[400px] w-[400px] rounded-full bg-violet-600/[0.05] blur-[120px]" />

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

          <Link
            href="/dashboard/talent-connect"
            className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-sm text-slate-400 backdrop-blur-xl transition-all hover:border-amber-400/25 hover:bg-white/[0.05] hover:text-amber-300"
          >
            <BriefcaseBusiness size={15} />
            My Talent Connect
          </Link>
        </motion.div>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/10 bg-amber-400/[0.05] px-3 py-1.5">
            <Target size={13} className="text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400">
              🎯 Talent Connect
            </span>
          </div>

          <h1 className="max-w-4xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
            Connect your talent with{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
              real-world projects
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Showcase your skills, experience, and projects. Submit
            professional proposals to real-world technical requirements,
            companies, and career opportunities.
          </p>
        </motion.section>

        {/* Filters */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10 space-y-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Talent Connect posts, companies, tags…"
                className="w-full rounded-xl border border-white/[0.07] bg-white/[0.025] py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 backdrop-blur-xl focus:border-amber-400/30 focus:outline-none"
              />
            </div>

            {/* Skills filter */}
            <select
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-sm text-slate-300 backdrop-blur-xl focus:border-amber-400/30 focus:outline-none"
            >
              <option value="">All Skills</option>
              {allSkills.map((s) => (
                <option key={s} value={s} className="bg-[#0d1118]">
                  {s}
                </option>
              ))}
            </select>

            {/* Experience level filter */}
            <select
              value={experienceLevel ?? ""}
              onChange={(e) => setExperienceLevel(e.target.value || undefined)}
              className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-sm text-slate-300 backdrop-blur-xl focus:border-amber-400/30 focus:outline-none"
            >
              <option value="">Any Experience Level</option>
              {TALENT_CONNECT_EXPERIENCE_LEVELS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#0d1118]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCategory(undefined)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition ${
                category === undefined
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                  : "border-white/[0.07] bg-white/[0.025] text-slate-400 hover:border-white/[0.14] hover:text-white"
              }`}
            >
              <Handshake size={12} /> All Categories
            </button>
            {TALENT_CONNECT_CATEGORIES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(category === opt.value ? undefined : opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition ${
                  category === opt.value
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    : "border-white/[0.07] bg-white/[0.025] text-slate-400 hover:border-white/[0.14] hover:text-white"
                }`}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </motion.section>

        {/* Posts grid */}
        <section>
          {posts === undefined ? (
            <div className="flex items-center justify-center py-32 text-sm text-slate-600">
              Loading Talent Connect…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-white/[0.06] bg-[#0d1118] px-8 py-20 text-center">
              <Target size={40} className="mx-auto text-slate-700" />
              <h3 className="mt-5 text-lg font-bold text-white">
                {hasActiveFilters
                  ? "No Talent Connect posts match your filters"
                  : "No Talent Connect posts yet"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                {hasActiveFilters
                  ? "Try adjusting your search, category, skills, or experience level filters."
                  : "Real-world projects and technical requirements will appear here once companies publish them."}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                  {filtered.length} {filtered.length === 1 ? "post" : "posts"} available
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setCategory(undefined);
                      setExperienceLevel(undefined);
                      setSkill("");
                    }}
                    className="text-[11px] font-bold text-amber-400 transition hover:text-amber-300"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((post, index) => (
                  <PostCard key={post._id} post={post} index={index} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
