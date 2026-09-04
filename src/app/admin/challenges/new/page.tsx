"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";

type HackathonCategory = "ai" | "coding" | "web";

type Difficulty = "beginner" | "intermediate" | "advanced";

const CATEGORY_OPTIONS = [
  { value: "ai", label: "🤖 AI", desc: "Machine learning, NLP, computer vision, generative AI" },
  { value: "coding", label: "🧩 Coding", desc: "Algorithms, data structures, competitive programming" },
  { value: "web", label: "🌐 Web Development", desc: "Full-stack apps, APIs, frontend, backend" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export default function NewChallengePage() {
  const router = useRouter();
  const createChallenge = useMutation(api.challenges.createChallenge);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hackathonCategory, setHackathonCategory] = useState<HackathonCategory>("ai");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rules, setRules] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [xpReward, setXpReward] = useState(100);
  // Web Development starter templates (used when hackathonCategory = "web").
  const [starterHtml, setStarterHtml] = useState("");
  const [starterCss, setStarterCss] = useState("");
  const [starterJavascript, setStarterJavascript] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showSuccess = (text: string) => {
    setMessage({ type: "success", text });
    setTimeout(() => setMessage(null), 3000);
  };

  const showError = (text: string) => {
    setMessage({ type: "error", text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const startDateMs = startDate ? new Date(startDate).getTime() : undefined;
      const endDateMs = endDate ? new Date(endDate).getTime() : undefined;

      await createChallenge({
        title,
        description,
        hackathonCategory,
        difficulty,
        startDate: startDateMs,
        endDate: endDateMs,
        rules: rules || undefined,
        bannerUrl: bannerUrl || undefined,
        xpReward,
        starterHtml: starterHtml || undefined,
        starterCss: starterCss || undefined,
        starterJavascript: starterJavascript || undefined,
      });

      showSuccess("Challenge created successfully!");
      setTimeout(() => router.push("/admin/challenges"), 1000);
    } catch (error) {
      console.error("Create challenge error:", error);
      showError(error instanceof Error ? error.message : "Failed to create challenge.");
    } finally {
      setSubmitting(false);
    }
  };
return (
    <div className="min-h-screen bg-[#0F1117] p-6 text-white md:p-8">
      {/* HEADER */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push("/admin/challenges")}
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Challenges
        </button>
        <h1 className="text-3xl font-bold tracking-tight">New Challenge</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create a new hackathon challenge. It will instantly appear on the public Challenges page.
        </p>
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
          {message.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
        {/* CATEGORY SELECTOR */}
        <div>
          <label className="mb-3 block text-sm font-semibold text-slate-300">
            Hackathon Category <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setHackathonCategory(opt.value)}
                className={`rounded-xl border p-4 text-left transition ${
                  hackathonCategory === opt.value
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-800 bg-[#151922] hover:border-slate-700"
                }`}
              >
                <span className="text-lg font-semibold">{opt.label}</span>
                <p className="mt-1 text-xs text-slate-500">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* TITLE */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. AI-Powered Healthcare Innovation Challenge"
            className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="Describe the challenge, goals, and what participants will build..."
            className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>

        {/* DIFFICULTY & XP */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as Difficulty)
              }
              className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-slate-300 outline-none focus:border-blue-500"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              XP Reward
            </label>
            <input
              type="number"
              min={0}
              value={xpReward}
              onChange={(e) => setXpReward(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
            />
          </div>
        </div>

        {/* DATES */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
            />
          </div>
        </div>

        {/* BANNER URL */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Banner Image URL
          </label>
          <input
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="https://example.com/banner.jpg"
            className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>

        {/* RULES */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Rules & Guidelines
          </label>
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={5}
            placeholder="List the rules, judging criteria, submission requirements..."
            className="w-full rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>

        {/* WEB STARTER CODE — only relevant for Web Development challenges */}
        {hackathonCategory === "web" && (
          <div className="rounded-xl border border-cyan-800/40 bg-cyan-950/20 p-4">
            <h3 className="mb-1 text-sm font-semibold text-cyan-300">
              🌐 Web Starter Code (optional)
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              Pre-fill the editor with starter templates. Leave blank to use
              the default CodeRush placeholders.
            </p>
            {[
              { label: "index.html", value: starterHtml, set: setStarterHtml, lang: "HTML" },
              { label: "style.css", value: starterCss, set: setStarterCss, lang: "CSS" },
              { label: "script.js", value: starterJavascript, set: setStarterJavascript, lang: "JavaScript" },
            ].map((f) => (
              <div key={f.label} className="mb-3 last:mb-0">
                <label className="mb-1 block font-mono text-xs text-cyan-200">
                  {f.label}
                </label>
                <textarea
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  rows={4}
                  placeholder={`/* ${f.lang} starter template */`}
                  className="w-full rounded-xl border border-slate-800 bg-[#0d1220] px-4 py-3 font-mono text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
                />
              </div>
            ))}
          </div>
        )}

        {/* SUBMIT */}
        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all duration-200 hover:scale-[1.02] hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            {submitting ? "Creating..." : "Create Challenge"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/challenges")}
            className="rounded-xl border border-slate-700 bg-[#151922] px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}