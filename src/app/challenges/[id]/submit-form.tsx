"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export default function SubmitForm({ challengeId }: { challengeId: Id<"challenges"> }) {
  const createSubmission = useMutation(api.submissions.create);

  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createSubmission({
        challengeId,
        repoUrl,
        demoUrl: demoUrl || undefined,
        description,
      });
      setRepoUrl("");
      setDemoUrl("");
      setDescription("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-neutral-800 rounded-lg p-5 bg-neutral-900">
      <h3 className="font-semibold text-lg">Submit your project</h3>

      <div>
        <label className="block text-sm text-neutral-300 mb-1">GitHub repo URL</label>
        <input
          type="url"
          required
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/you/project"
          className="w-full rounded-md bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-300 mb-1">Live demo URL (optional)</label>
        <input
          type="url"
          value={demoUrl}
          onChange={(e) => setDemoUrl(e.target.value)}
          placeholder="https://your-demo.vercel.app"
          className="w-full rounded-md bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-300 mb-1">Description</label>
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="What did you build? Anything judges should know?"
          className="w-full rounded-md bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-sm outline-none focus:border-neutral-500 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {submitted && <p className="text-sm text-emerald-400">Submitted! 🎉</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold py-2 transition-colors"
      >
        {submitting ? "Submitting…" : "Submit Project"}
      </button>
    </form>
  );
}