"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Paperclip,
} from "lucide-react";
import { TALENT_CONNECT_TECH_OPTIONS } from "./constants";

interface PreviousProject {
  title: string;
  url: string;
  description: string;
  technologies: string;
}

const EMPTY_PROJECT: PreviousProject = {
  title: "",
  url: "",
  description: "",
  technologies: "",
};

/**
 * Professional proposal form for a Talent Connect post.
 * Resume/CV upload: architecture-ready via `resumeFileId` on the backend,
 * but file upload is intentionally not required in this version.
 */
export default function ProposalForm({ postId }: { postId: string }) {
  const router = useRouter();
  const submitProposal = useMutation(api.talentConnectSubmissions.submit);

  const [proposedSolution, setProposedSolution] = useState("");
  const [technicalApproach, setTechnicalApproach] = useState("");
  const [technologyStack, setTechnologyStack] = useState<string[]>([]);
  const [customTech, setCustomTech] = useState("");
  const [relevantExperience, setRelevantExperience] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [previousProjects, setPreviousProjects] = useState<PreviousProject[]>([
    { ...EMPTY_PROJECT },
  ]);
  const [additionalMessage, setAdditionalMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const toggleTech = (tech: string) => {
    setTechnologyStack((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const addCustomTech = () => {
    const value = customTech.trim();
    if (!value) return;
    setTechnologyStack((prev) =>
      prev.includes(value) ? prev : [...prev, value]
    );
    setCustomTech("");
  };

  const updateProject = (index: number, patch: Partial<PreviousProject>) => {
    setPreviousProjects((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await submitProposal({
        postId: postId as Id<"talentConnectPosts">,
        proposedSolution,
        technicalApproach,
        technologyStack,
        relevantExperience,
        portfolioUrl: portfolioUrl || undefined,
        githubUrl: githubUrl || undefined,
        linkedinUrl: linkedinUrl || undefined,
        previousProjects: previousProjects
          .filter((p) => p.title.trim())
          .map((p) => ({
            title: p.title,
            url: p.url || undefined,
            description: p.description || undefined,
            technologies: p.technologies
              ? p.technologies.split(",").map((t) => t.trim()).filter(Boolean)
              : undefined,
          })),
        additionalMessage: additionalMessage || undefined,
      });

      setMessage({
        type: "success",
        text: "Your Talent Connect proposal has been submitted! Track its status in My Talent Connect.",
      });
      setTimeout(() => router.push("/dashboard/talent-connect"), 1500);
    } catch (error) {
      console.error("Submit proposal error:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to submit your proposal.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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

      {/* PROPOSED SOLUTION */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-300">
          Proposed Solution <span className="text-red-400">*</span>
        </label>
        <p className="mb-3 text-xs text-slate-500">
          Explain how you would solve the problem or approach the project.
        </p>
        <textarea
          required
          rows={7}
          value={proposedSolution}
          onChange={(e) => setProposedSolution(e.target.value)}
          placeholder="Describe your solution at a high level: what you would build, key features, and how it meets the requirements…"
          className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
        />
      </div>

      {/* TECHNICAL APPROACH */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-300">
          Technical Approach <span className="text-red-400">*</span>
        </label>
        <p className="mb-3 text-xs text-slate-500">
          Cover your system architecture, technologies, development approach,
          scalability, security considerations, and implementation strategy.
        </p>
        <textarea
          required
          rows={9}
          value={technicalApproach}
          onChange={(e) => setTechnicalApproach(e.target.value)}
          placeholder={"• Architecture: …\n• Scalability: …\n• Security: …\n• Implementation strategy: …"}
          className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
        />
      </div>

      {/* TECHNOLOGY STACK */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-300">
          Technology Stack
        </label>
        <div className="mb-3 flex flex-wrap gap-2">
          {TALENT_CONNECT_TECH_OPTIONS.map((tech) => (
            <button
              key={tech}
              type="button"
              onClick={() => toggleTech(tech)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                technologyStack.includes(tech)
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                  : "border-slate-800 bg-[#151922] text-slate-400 hover:border-slate-700 hover:text-slate-300"
              }`}
            >
              {tech}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customTech}
            onChange={(e) => setCustomTech(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTech();
              }
            }}
            placeholder="Add a custom technology…"
            className="flex-1 rounded-xl border border-slate-800 bg-[#151922] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustomTech}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#151922] px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-400"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        {technologyStack.filter(
          (t) => !TALENT_CONNECT_TECH_OPTIONS.includes(t as never)
        ).length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Custom:{" "}
            {technologyStack
              .filter((t) => !TALENT_CONNECT_TECH_OPTIONS.includes(t as never))
              .join(", ")}
          </p>
        )}
      </div>

      {/* RELEVANT EXPERIENCE */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-300">
          Relevant Experience <span className="text-red-400">*</span>
        </label>
        <p className="mb-3 text-xs text-slate-500">
          Describe your previous experience related to this project or
          requirement.
        </p>
        <textarea
          required
          rows={5}
          value={relevantExperience}
          onChange={(e) => setRelevantExperience(e.target.value)}
          placeholder="Share the work, roles, and achievements that make you a strong fit…"
          className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
        />
      </div>

      {/* LINKS */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Portfolio URL
          </label>
          <input
            type="url"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            placeholder="https://yourportfolio.com"
            className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            GitHub URL
          </label>
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/username"
            className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            LinkedIn URL
          </label>
          <input
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/username"
            className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* PREVIOUS PROJECTS */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <label className="block text-sm font-semibold text-slate-300">
              Previous Projects
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Showcase your strongest previous work relevant to this Talent
              Connect post.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPreviousProjects((prev) => [...prev, { ...EMPTY_PROJECT }])
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#151922] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-amber-500/50 hover:text-amber-400"
          >
            <Plus size={14} /> Add Project
          </button>
        </div>

        <div className="space-y-4">
          {previousProjects.map((project, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-800 bg-[#151922]/60 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Project {index + 1}
                </span>
                {previousProjects.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviousProjects((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs text-red-400 transition hover:text-red-300"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={project.title}
                  onChange={(e) =>
                    updateProject(index, { title: e.target.value })
                  }
                  placeholder="Project title"
                  className="rounded-xl border border-slate-800 bg-[#151922] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                />
                <input
                  type="url"
                  value={project.url}
                  onChange={(e) => updateProject(index, { url: e.target.value })}
                  placeholder="https://project-url.com"
                  className="rounded-xl border border-slate-800 bg-[#151922] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                />
                <input
                  type="text"
                  value={project.description}
                  onChange={(e) =>
                    updateProject(index, { description: e.target.value })
                  }
                  placeholder="Short description"
                  className="rounded-xl border border-slate-800 bg-[#151922] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                />
                <input
                  type="text"
                  value={project.technologies}
                  onChange={(e) =>
                    updateProject(index, { technologies: e.target.value })
                  }
                  placeholder="Technologies used (comma separated)"
                  className="rounded-xl border border-slate-800 bg-[#151922] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADDITIONAL MESSAGE */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-300">
          Additional Message
        </label>
        <textarea
          rows={4}
          value={additionalMessage}
          onChange={(e) => setAdditionalMessage(e.target.value)}
          placeholder="Anything else you would like the reviewer to know…"
          className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none"
        />
      </div>

      {/* RESUME / CV — architecture ready for future upload */}
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-slate-800 bg-[#151922]/40 px-4 py-4 text-xs text-slate-500">
        <Paperclip size={15} className="mt-0.5 shrink-0 text-slate-600" />
        <p>
          <span className="font-semibold text-slate-400">Resume / CV:</span>{" "}
          Resume upload will be available soon. In the meantime, include a
          link to your resume in the additional message or your portfolio
          URL.
        </p>
      </div>

      {/* SUBMIT */}
      <div className="flex items-center justify-end gap-3 border-t border-white/[0.05] pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-slate-800 px-5 py-3 text-sm font-semibold text-slate-400 transition hover:border-slate-700 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-bold text-black shadow-[0_10px_40px_rgba(245,158,11,0.25)] transition hover:shadow-[0_15px_50px_rgba(245,158,11,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Submit Your Proposal
        </button>
      </div>
    </form>
  );
}
