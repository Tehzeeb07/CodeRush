"use client";

import { useQuery, useMutation } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";

export default function TeamDetailPage() {
  const params = useParams<{ id: string }>();
  const teamId = params.id as Id<"teams">;

  const team = useQuery(api.teams.get, { teamId });
  const requestToJoin = useMutation(api.teams.requestToJoin);
  const respondToRequest = useMutation(api.teams.respondToRequest);

  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  async function handleJoinRequest() {
    setError(null);
    setRequesting(true);
    try {
      await requestToJoin({ teamId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRequesting(false);
    }
  }

  if (team === undefined) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">
        Loading…
      </div>
    );
  }

  if (team === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 gap-4">
        <p>Team not found.</p>
        <Link href="/teams" className="text-emerald-400 hover:underline text-sm">
          ← Back to teams
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/teams" className="text-sm text-neutral-400 hover:underline">
          ← Back to teams
        </Link>

        <h1 className="text-2xl font-bold mt-4 mb-1">{team.name}</h1>
        {team.description && (
          <p className="text-neutral-400 text-sm mb-6">{team.description}</p>
        )}

        {/* Join button — only shown if not already a member/pending, and not the owner */}
        {!team.isOwner && team.myStatus === null && (
          <div className="mb-6">
            <button
              onClick={handleJoinRequest}
              disabled={requesting}
              className="rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-semibold px-4 py-2 text-sm transition-colors"
            >
              {requesting ? "Requesting…" : "Request to join"}
            </button>
            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
          </div>
        )}

        {!team.isOwner && team.myStatus === "pending" && (
          <p className="text-sm text-yellow-400 mb-6">
            ⏳ Your request to join is pending approval.
          </p>
        )}

        {!team.isOwner && team.myStatus === "accepted" && (
          <p className="text-sm text-emerald-400 mb-6">✓ You're a member of this team.</p>
        )}

        {/* Pending requests — owner only */}
        {team.isOwner && team.pending.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold text-sm mb-2 text-neutral-300">
              Join requests ({team.pending.length})
            </h2>
            <div className="space-y-2">
              {team.pending.map((req) => (
                <div
                  key={req._id}
                  className="flex items-center justify-between border border-neutral-800 rounded-md p-3 bg-neutral-900"
                >
                  <span className="text-sm">{req.username}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        respondToRequest({
                          teamId,
                          applicantUserId: req.userId,
                          accept: true,
                        })
                      }
                      className="text-xs rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-3 py-1"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() =>
                        respondToRequest({
                          teamId,
                          applicantUserId: req.userId,
                          accept: false,
                        })
                      }
                      className="text-xs rounded-md border border-neutral-700 hover:bg-neutral-800 text-white px-3 py-1"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members list */}
        <div>
          <h2 className="font-semibold text-sm mb-2 text-neutral-300">
            Members ({team.accepted.length})
          </h2>
          <div className="space-y-2">
            {team.accepted.map((m) => (
              <div
                key={m._id}
                className="border border-neutral-800 rounded-md p-3 bg-neutral-900 text-sm flex items-center justify-between"
              >
                <span>{m.username}</span>
                {m.userId === team.ownerId && (
                  <span className="text-xs text-neutral-500">Owner</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}