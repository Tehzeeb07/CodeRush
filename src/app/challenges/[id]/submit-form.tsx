"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export default function SubmitForm({ challengeId }: { challengeId: Id<"challenges"> }) {
  const myExisting = useQuery(api.submissions.myForChallenge, { challengeId });
    const myTeams = useQuery(api.teams.myTeams);
  const createSubmission = useMutation(api.submissions.create);
  const updateSubmission = useMutation(api.submissions.update);

  const existing = myExisting?.[0]; // most recent submission, if any

  const [editing, setEditing] = useState(false);
    const [teamId, setTeamId] = useState<string>("");
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  // Prefill the form when edit mode opens with an existing submission
  // loaded. This uses the "adjust state during render" pattern (React
  // docs) so the form stays a controlled component without an effect.
  const [prefilledId, setPrefilledId] = useState<string | null>(null);
  if (existing && editing && prefilledId !== existing._id) {
    setPrefilledId(existing._id);
    setRepoUrl(existing.repoUrl);
    setDemoUrl(existing.demoUrl ?? "");
    setDescription(existing.description);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (existing) {
        await updateSubmission({
          submissionId: existing._id,
          teamId: teamId ? (teamId as any) : undefined,
          repoUrl,
          demoUrl: demoUrl || undefined,
          description,
        });
      } else {
        await createSubmission({
          challengeId,
          teamId: teamId ? (teamId as any) : undefined,
          repoUrl,
          demoUrl: demoUrl || undefined,
          description,
        });
      }
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (myExisting === undefined) return null;

  // Already submitted, not currently editing — show summary + edit button
  if (existing && !editing) {
    return (
      <div className="border border-neutral-800 rounded-lg p-5 bg-neutral-900">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">Your submission</h3>
          <span className="text-xs text-emerald-400">✓ Submitted</span>
        </div>
        <p className="text-neutral-400 text-sm mb-3">{existing.description}</p>
        <div className="flex gap-3 text-xs mb-4">
          <a href={existing.repoUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
            Repo →
          </a>
          {existing.demoUrl && (
            <a href={existing.demoUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
              Live demo →
            </a>
          )}
        </div>
        {saved && <p className="text-sm text-emerald-400 mb-3">Updated! 🎉</p>}
        <button
          onClick={() => setEditing(true)}
          className="w-full rounded-md border border-neutral-700 hover:bg-neutral-800 text-white text-sm py-2 transition-colors"
        >
          Edit & resubmit
        </button>
      </div>
    );
  }

  // No submission yet, or currently editing — show the form
  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-neutral-800 rounded-lg p-5 bg-neutral-900">
      <h3 className="font-semibold text-lg">
        {existing ? "Edit your submission" : "Submit your project"}
      </h3>

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

      {myTeams && myTeams.length > 0 && (
        <div>
          <label className="block text-sm text-neutral-300 mb-1">
            Submit as team (optional)
          </label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full rounded-md bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-sm outline-none focus:border-neutral-500"
          >
            <option value="">Just me (solo submission)</option>
            {myTeams.map((team) =>
              team ? (
                <option key={team._id} value={team._id}>
                  {team.name}
                </option>
              ) : null
            )}
          </select>
        </div>
      )}
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

      <div className="flex gap-2">
        {existing && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex-1 rounded-md border border-neutral-700 hover:bg-neutral-800 text-white text-sm py-2 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold py-2 transition-colors"
        >
          {submitting ? "Saving…" : existing ? "Save changes" : "Submit Project"}
        </button>
      </div>
    </form>
  );
}