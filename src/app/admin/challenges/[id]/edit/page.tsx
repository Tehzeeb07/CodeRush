"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type HackathonCategory = "ai" | "coding" | "web";

type Difficulty = "beginner" | "intermediate" | "advanced";

const CATEGORY_OPTIONS = [
  {
    value: "ai",
    label: "🤖 AI",
    desc: "Machine learning, NLP, computer vision, generative AI",
  },
  {
    value: "coding",
    label: "🧩 Coding",
    desc: "Algorithms, data structures, competitive programming",
  },
  {
    value: "web",
    label: "🌐 Web Development",
    desc: "Full-stack apps, APIs, frontend, backend",
  },
] as const;

const DIFFICULTY_OPTIONS = [
  {
    value: "beginner",
    label: "Beginner",
  },
  {
    value: "intermediate",
    label: "Intermediate",
  },
  {
    value: "advanced",
    label: "Advanced",
  },
] as const;

export default function EditChallengePage() {
  const params = useParams();
  const router = useRouter();

  const challengeId = decodeURIComponent(
    String(params.id ?? "")
  );

  const challenge = useQuery(api.challenges.get, {
    id: challengeId as Id<"challenges">,
  });

  const updateChallenge = useMutation(
    api.challenges.updateChallenge
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [hackathonCategory, setHackathonCategory] =
    useState<HackathonCategory>("ai");

  const [difficulty, setDifficulty] =
    useState<Difficulty>("beginner");

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

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showSuccess = (text: string) => {
    setMessage({
      type: "success",
      text,
    });


    setTimeout(() => {
      setMessage(null);
    }, 3000);

  };

  const showError = (text: string) => {
    setMessage({
      type: "error",
      text,
    });

    setTimeout(() => {
      setMessage(null);
    }, 4000);

  };

  // Prefill form when challenge loads
  useEffect(() => {
    if (!challenge) return;

    // Defer state updates to a microtask (react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      setTitle(challenge.title ?? "");
      setDescription(challenge.description ?? "");
      setHackathonCategory(
        (challenge.hackathonCategory as HackathonCategory) ?? "ai"
      );
      setDifficulty(
        (challenge.difficulty as Difficulty) ?? "beginner"
      );
      setStartDate(
        challenge.startDate
          ? new Date(challenge.startDate)
            .toISOString()
            .split("T")[0]
          : ""
      );
      setEndDate(
        challenge.endDate
          ? new Date(challenge.endDate)
            .toISOString()
            .split("T")[0]
          : ""
      );
      setRules(challenge.rules ?? "");
      setBannerUrl(challenge.bannerUrl ?? "");
      setXpReward(challenge.xpReward ?? 100);
      setStarterHtml(challenge.starterHtml ?? "");
      setStarterCss(challenge.starterCss ?? "");
      setStarterJavascript(challenge.starterJavascript ?? "");
    });
  }, [challenge]);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();


    if (!title.trim()) {
      showError("Challenge title is required.");
      return;
    }

    if (!description.trim()) {
      showError("Challenge description is required.");
      return;
    }

    if (
      startDate &&
      endDate &&
      new Date(endDate).getTime() <
      new Date(startDate).getTime()
    ) {
      showError(
        "End date cannot be earlier than start date."
      );
      return;
    }

    if (xpReward < 0) {
      showError("XP reward cannot be negative.");
      return;
    }

    setSubmitting(true);

    try {
      const startDateMs = startDate
        ? new Date(startDate).getTime()
        : undefined;

      const endDateMs = endDate
        ? new Date(endDate).getTime()
        : undefined;

      await updateChallenge({
        challengeId: challengeId as Id<"challenges">,
        title: title.trim(),
        description: description.trim(),
        hackathonCategory,
        difficulty,
        startDate: startDateMs,
        endDate: endDateMs,
        rules: rules.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        xpReward,
        starterHtml: starterHtml.trim() || undefined,
        starterCss: starterCss.trim() || undefined,
        starterJavascript: starterJavascript.trim() || undefined,
      });

      showSuccess("Challenge updated successfully!");

      setTimeout(() => {
        router.push("/admin/challenges");
      }, 1000);
    } catch (error) {
      console.error(
        "Update challenge error:",
        error
      );

      showError(
        error instanceof Error
          ? error.message
          : "Failed to update challenge."
      );
    } finally {
      setSubmitting(false);
    }

  };

  // Loading state
  if (challenge === undefined) {
    return (<div className="flex min-h-screen items-center justify-center bg-[#0F1117] text-white"> <div className="flex items-center gap-3 text-slate-400"> <Loader2
      size={22}
      className="animate-spin"
    />

      <span>Loading challenge...</span>
    </div>
    </div>
    );

  }

  // Challenge not found
  if (challenge === null) {
    return (<div className="flex min-h-screen items-center justify-center bg-[#0F1117] text-white"> <div className="text-center"> <h1 className="text-2xl font-bold">
      Challenge Not Found </h1>

      <p className="mt-2 text-sm text-slate-400">
        This challenge does not exist.
      </p>

      <button
        type="button"
        onClick={() =>
          router.push("/admin/challenges")
        }
        className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
      >
        Back to Challenges
      </button>
    </div>
    </div>
    );

  }

  return (<div className="min-h-screen bg-[#0F1117] p-6 text-white md:p-8">


    {/* HEADER */}
    <div className="mb-8">
      <button
        type="button"
        onClick={() =>
          router.push("/admin/challenges")
        }
        className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft size={16} />

        Back to Challenges
      </button>

      <h1 className="text-3xl font-bold tracking-tight">
        Edit Challenge
      </h1>

      <p className="mt-1 text-sm text-slate-400">
        Editing:{" "}
        <span className="text-white/80">
          {challenge.title}
        </span>
      </p>
    </div>

    {/* MESSAGE */}
    {message && (
      <div
        className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${message.type === "success"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/20 bg-red-500/10 text-red-400"
          }`}
      >
        {message.type === "success" ? (
          <CheckCircle2 size={18} />
        ) : (
          <XCircle size={18} />
        )}

        <span>{message.text}</span>
      </div>
    )}

    {/* FORM */}
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-5xl space-y-6"
    >

      <div className="rounded-2xl border border-white/10 bg-[#171A21] p-6 md:p-8">

        {/* FORM HEADER */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white">
            Challenge Information
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Update the details and configuration
            of this challenge.
          </p>
        </div>

        <div className="space-y-7">

          {/* TITLE */}
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Challenge Title
            </label>

            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="Enter challenge title"
              required
              className="w-full rounded-xl border border-white/10 bg-[#0F1117] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Description
            </label>

            <textarea
              id="description"
              rows={6}
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Describe the challenge..."
              required
              className="w-full resize-none rounded-xl border border-white/10 bg-[#0F1117] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>

          {/* CATEGORY */}
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-300">
              Challenge Category
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              {CATEGORY_OPTIONS.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() =>
                    setHackathonCategory(
                      category.value as HackathonCategory
                    )
                  }
                  className={`rounded-xl border p-4 text-left transition ${hackathonCategory ===
                    category.value
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/10 bg-[#0F1117] hover:border-white/20"
                    }`}
                >
                  <div className="text-sm font-semibold text-white">
                    {category.label}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {category.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* DIFFICULTY */}
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-300">
              Difficulty
            </label>

            <div className="flex flex-wrap gap-3">
              {DIFFICULTY_OPTIONS.map(
                (option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setDifficulty(
                        option.value as Difficulty
                      )
                    }
                    className={`rounded-xl border px-5 py-2.5 text-sm font-medium transition ${difficulty === option.value
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-white/10 bg-[#0F1117] text-slate-400 hover:border-white/20 hover:text-white"
                      }`}
                  >
                    {option.label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* DATES */}
          <div className="grid gap-6 md:grid-cols-2">

            <div>
              <label
                htmlFor="startDate"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Start Date
              </label>

              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) =>
                  setStartDate(e.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-[#0F1117] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="endDate"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                End Date
              </label>

              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) =>
                  setEndDate(e.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-[#0F1117] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
              />
            </div>

          </div>

          {/* XP REWARD */}
          <div>
            <label
              htmlFor="xpReward"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              XP Reward
            </label>

            <input
              id="xpReward"
              type="number"
              min="0"
              value={xpReward}
              onChange={(e) =>
                setXpReward(
                  Number(e.target.value) || 0
                )
              }
              className="w-full rounded-xl border border-white/10 bg-[#0F1117] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              XP awarded to users after successfully
              completing this challenge.
            </p>
          </div>

          {/* BANNER URL */}
          <div>
            <label
              htmlFor="bannerUrl"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Banner Image URL
            </label>

            <input
              id="bannerUrl"
              type="url"
              value={bannerUrl}
              onChange={(e) =>
                setBannerUrl(e.target.value)
              }
              placeholder="https://example.com/banner.jpg"
              className="w-full rounded-xl border border-white/10 bg-[#0F1117] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>

          {/* RULES */}
          <div>
            <label
              htmlFor="rules"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Challenge Rules
            </label>

            <textarea
              id="rules"
              rows={6}
              value={rules}
              onChange={(e) =>
                setRules(e.target.value)
              }
              placeholder="Enter challenge rules and requirements..."
              className="w-full resize-none rounded-xl border border-white/10 bg-[#0F1117] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>

        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col-reverse gap-3 pb-8 sm:flex-row sm:justify-end">

        <button
          type="button"
          disabled={submitting}
          onClick={() =>
            router.push("/admin/challenges")
          }
          className="rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />

              Updating...
            </>
          ) : (
            <>
              <Save size={18} />

              Save Changes
            </>
          )}
        </button>

      </div>
    </form>
  </div>

  );
}
