"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";

export default function TeamsPage() {
  const teams = useQuery(api.teams.list);
  const createTeam = useMutation(api.teams.create);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await createTeam({ name, description: description || undefined });
      setName("");
      setDescription("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-sm text-neutral-400 hover:underline">
          ← Back to dashboard
        </Link>

        <div className="flex items-center justify-between mt-4 mb-6">
          <h1 className="text-2xl font-bold">👥 Teams</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 transition-colors"
          >
            {showForm ? "Cancel" : "Create team"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="space-y-3 border border-neutral-800 rounded-lg p-4 bg-neutral-900 mb-6"
          >
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team name"
              className="w-full rounded-md bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-sm outline-none focus:border-neutral-500"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this team about? (optional)"
              rows={2}
              className="w-full rounded-md bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-sm outline-none focus:border-neutral-500 resize-none"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold py-2 text-sm transition-colors"
            >
              {creating ? "Creating…" : "Create team"}
            </button>
          </form>
        )}

        {teams === undefined && <p className="text-neutral-500">Loading teams…</p>}
        {teams?.length === 0 && (
          <p className="text-neutral-500">No teams yet — create the first one!</p>
        )}

        <div className="space-y-3">
          {teams?.map((team) => (
            <Link
              key={team._id}
              href={`/teams/${team._id}`}
              className="block border border-neutral-800 rounded-lg p-4 bg-neutral-900 hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{team.name}</h2>
                <span className="text-xs text-neutral-500">
                  {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                </span>
              </div>
              {team.description && (
                <p className="text-neutral-400 text-sm mt-1">{team.description}</p>
              )}
              <p className="text-neutral-500 text-xs mt-2">by {team.ownerUsername}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}