"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import {
  TALENT_CONNECT_CATEGORIES,
  TALENT_CONNECT_DIFFICULTIES,
  TALENT_CONNECT_EXPERIENCE_LEVELS,
} from "./constants";

export interface TalentConnectPostFormValues {
  title: string;
  shortDescription: string;
  fullDescription: string;
  requirements: string[];
  requiredSkills: string[];
  category: string;
  difficultyLevel: string;
  experienceLevel: string;
  companyName: string;
  compensationInfo?: string;
  deadline?: number;
  tags: string[];
}

const EMPTY: TalentConnectPostFormValues = {
  title: "",
  shortDescription: "",
  fullDescription: "",
  requirements: [],
  requiredSkills: [],
  category: "technical_solution",
  difficultyLevel: "intermediate",
  experienceLevel: "any_level",
  companyName: "",
  compensationInfo: "",
  tags: [],
};

/**
 * Shared create/edit form for Talent Connect posts (admin side).
 */
export default function PostForm({
  mode,
  postId,
  initial,
}: {
  mode: "create" | "edit";
  postId?: string;
  initial?: TalentConnectPostFormValues;
}) {
  const router = useRouter();
  const createPost = useMutation(api.talentConnectPosts.createPost);
  const updatePost = useMutation(api.talentConnectPosts.updatePost);

  const [values, setValues] = useState<TalentConnectPostFormValues>(
    initial ?? EMPTY
  );
  const [requirementsText, setRequirementsText] = useState(
    (initial?.requirements ?? []).join("\n")
  );
  const [skillsText, setSkillsText] = useState(
    (initial?.requiredSkills ?? []).join(", ")
  );
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [deadlineDate, setDeadlineDate] = useState(
    initial?.deadline
      ? new Date(initial.deadline).toISOString().slice(0, 10)
      : ""
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const set = (patch: Partial<TalentConnectPostFormValues>) =>
    setValues((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const requirements = requirementsText
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);
    const requiredSkills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    const deadline = deadlineDate
      ? new Date(`${deadlineDate}T23:59:59`).getTime()
      : undefined;

    const payload = {
      title: values.title,
      shortDescription: values.shortDescription,
      fullDescription: values.fullDescription,
      requirements,
      requiredSkills,
      tags,
      category: values.category as never,
      difficultyLevel: values.difficultyLevel as never,
      experienceLevel: values.experienceLevel as never,
      companyName: values.companyName,
      compensationInfo: values.compensationInfo || undefined,
      deadline,
    };

    try {
      if (mode === "create") {
        await createPost(payload);
        setMessage({
          type: "success",
          text: "Talent Connect post created as a draft. Publish it when you are ready!",
        });
        setTimeout(() => router.push("/admin/talent-connect"), 1200);
      } else {
        await updatePost({ postId: postId as Id<"talentConnectPosts">, ...payload });
        setMessage({ type: "success", text: "Talent Connect post updated." });
        setTimeout(() => router.push("/admin/talent-connect"), 1200);
      }
    } catch (error) {
      console.error("Save Talent Connect post error:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save the Talent Connect post.",
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      {/* MESSAGE */}
      {message && (
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/20 bg-red-500/10 text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <XCircle size={18} />
          )}
          {message.text}
        </div>
      )}

      {/* TITLE */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-300">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          value={values.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="e.g. Build a Scalable Online Learning Platform"
          className={inputClass}
        />
      </div>

      {/* COMPANY */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-300">
          Company or Organization Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          required
          value={values.companyName}
          onChange={(e) => set({ companyName: e.target.value })}
          placeholder="e.g. Acme Labs"
          className={inputClass}
        />
      </div>

      {/* SHORT DESCRIPTION */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-300">
          Short Description <span className="text-red-400">*</span>
        </label>
        <p className="mb-3 text-xs text-slate-500">
          Shown on the Talent Connect cards. Keep it punchy — 1-2 sentences.
        </p>
        <textarea
          required
          rows={3}
          value={values.shortDescription}
          onChange={(e) => set({ shortDescription: e.target.value })}
          placeholder="We are looking for talented developers with ideas and experience in building scalable online learning platforms."
          className={inputClass}
        />
      </div>

      {/* FULL DESCRIPTION */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-300">
          Full Project or Problem Description{" "}
          <span className="text-red-400">*</span>
        </label>
        <p className="mb-3 text-xs text-slate-500">
          Explain what you want to build and what kind of talent or technical
          solution you are looking for.
        </p>
        <textarea
          required
          rows={9}
          value={values.fullDescription}
          onChange={(e) => set({ fullDescription: e.target.value })}
          placeholder="Describe the project, the problem, context, goals, and what a great proposal looks like…"
          className={inputClass}
        />
      </div>

      {/* REQUIREMENTS */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-300">
          Requirements
        </label>
        <p className="mb-3 text-xs text-slate-500">
          One requirement per line (e.g. “Support thousands of students.”).
        </p>
        <textarea
          rows={6}
          value={requirementsText}
          onChange={(e) => setRequirementsText(e.target.value)}
          placeholder={"Support thousands of students.\nVideo streaming functionality.\nStudent authentication."}
          className={inputClass}
        />
      </div>

      {/* SKILLS + TAGS */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Required Skills
          </label>
          <input
            type="text"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder="React, Node.js, PostgreSQL"
            className={inputClass}
          />
          <p className="mt-2 text-xs text-slate-500">Comma separated.</p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Tags
          </label>
          <input
            type="text"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="edtech, streaming, saas"
            className={inputClass}
          />
          <p className="mt-2 text-xs text-slate-500">Comma separated.</p>
        </div>
      </div>

      {/* CATEGORY */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-slate-300">
          Talent Connect Category <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TALENT_CONNECT_CATEGORIES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set({ category: opt.value })}
              className={`rounded-xl border p-4 text-left transition ${
                values.category === opt.value
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-slate-800 bg-[#151922] hover:border-slate-700"
              }`}
            >
              <span className="text-sm font-semibold">
                {opt.emoji} {opt.label}
              </span>
              <p className="mt-1 text-xs text-slate-500">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* DIFFICULTY + EXPERIENCE */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Difficulty / Complexity Level
          </label>
          <div className="flex flex-wrap gap-2">
            {TALENT_CONNECT_DIFFICULTIES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set({ difficultyLevel: opt.value })}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  values.difficultyLevel === opt.value
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-slate-800 bg-[#151922] text-slate-400 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Expected Experience Level
          </label>
          <div className="flex flex-wrap gap-2">
            {TALENT_CONNECT_EXPERIENCE_LEVELS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set({ experienceLevel: opt.value })}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  values.experienceLevel === opt.value
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-slate-800 bg-[#151922] text-slate-400 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DEADLINE + COMPENSATION */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Deadline
          </label>
          <input
            type="date"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
            className={inputClass}
          />
          <p className="mt-2 text-xs text-slate-500">
            Optional — leave empty for an open-ended post.
          </p>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Budget / Compensation Info
          </label>
          <input
            type="text"
            value={values.compensationInfo ?? ""}
            onChange={(e) => set({ compensationInfo: e.target.value })}
            placeholder="e.g. $5,000 – $8,000 or Equity partnership"
            className={inputClass}
          />
          <p className="mt-2 text-xs text-slate-500">Optional.</p>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex items-center justify-end gap-3 border-t border-white/[0.05] pt-6">
        <button
          type="button"
          onClick={() => router.push("/admin/talent-connect")}
          className="rounded-xl border border-slate-800 px-5 py-3 text-sm font-semibold text-slate-400 transition hover:border-slate-700 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_40px_rgba(37,99,235,0.25)] transition hover:shadow-[0_15px_50px_rgba(139,92,246,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {mode === "create"
            ? "Create Talent Connect Post"
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
