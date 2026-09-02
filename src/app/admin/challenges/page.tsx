"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ConfirmDialog } from "../../../components/admin/ConfirmDialog";

const CATEGORY_OPTIONS = [
  { value: "ai", label: "🤖 AI", color: "text-violet-400 bg-violet-500/10" },
  { value: "coding", label: "🧩 Coding", color: "text-emerald-400 bg-emerald-500/10" },
  { value: "web", label: "🌐 Web Development", color: "text-cyan-400 bg-cyan-500/10" },
] as const;

type HackathonCategory = "ai" | "coding" | "web";

export default function AdminChallengesPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<HackathonCategory | undefined>(undefined);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const challenges = useQuery(api.challenges.listChallengesAdmin, {
    search: search || undefined,
    hackathonCategory: category,
  });

  const deleteChallenge = useMutation(api.challenges.deleteChallenge);

  const showSuccess = (text: string) => {
    setMessage({ type: "success", text });
    setTimeout(() => setMessage(null), 3000);
  };

  const showError = (text: string) => {
    setMessage({ type: "error", text });
    setTimeout(() => setMessage(null), 4000);
  };

  const list = challenges ?? [];

  const countByCategory = (cat: HackathonCategory) =>
    list.filter((c) => c.hackathonCategory === cat).length;

  const formatDate = (ts?: number) =>
    ts ? new Date(ts).toLocaleDateString() : "—";

  const performDelete = async (id: string) => {
    try {
      setActionLoading(`delete-${id}`);
      await deleteChallenge({ challengeId: id as Id<"challenges"> });
      showSuccess("Challenge deleted permanently.");
    } catch (error) {
      console.error("Delete challenge error:", error);
      showError(error instanceof Error ? error.message : "Failed to delete challenge.");
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  const categoryMeta = (cat?: string) =>
    CATEGORY_OPTIONS.find((c) => c.value === cat) ?? {
      value: cat ?? "—",
      label: cat ? `🏆 ${cat}` : "🏆 Uncategorized",
      color: "text-white/60 bg-white/10",
    };
return (
    <div className="min-h-screen bg-[#0F1117] p-6 text-white md:p-8">
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Challenges</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage hackathons and challenges. Create new challenges and they
            will instantly appear in the public Challenges section.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#151922] px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/challenges/new")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all duration-200 hover:scale-[1.02] hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98]"
          >
            <Plus size={18} />
            New Challenge
          </button>
        </div>
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

      {/* STATS */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-[#151922] p-5">
          <p className="text-sm text-slate-400">Total Challenges</p>
          <p className="mt-2 text-2xl font-bold">{list.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#151922] p-5">
          <p className="text-sm text-slate-400">🤖 AI Hackathons</p>
          <p className="mt-2 text-2xl font-bold text-violet-400">{countByCategory("ai")}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#151922] p-5">
          <p className="text-sm text-slate-400">🧩 Coding Hackathons</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{countByCategory("coding")}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#151922] p-5">
          <p className="text-sm text-slate-400">🌐 Web Development Hackathons</p>
          <p className="mt-2 text-2xl font-bold text-cyan-400">{countByCategory("web")}</p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search challenges by title or description..."
            className="w-full rounded-xl border border-slate-800 bg-[#151922] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>

        <select
          value={category ?? ""}
          onChange={(e) =>
            setCategory(e.target.value === "" ? undefined : (e.target.value as HackathonCategory))
          }
          className="rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-slate-300 outline-none focus:border-blue-500"
        >
          <option value="">All Categories</option>
          <option value="ai">🤖 AI</option>
          <option value="coding">🧩 Coding</option>
          <option value="web">🌐 Web Development</option>
        </select>
      </div>

      {/* LOADING */}
      {challenges === undefined && (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-800 bg-[#151922]">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 size={22} className="animate-spin" />
            Loading challenges...
          </div>
        </div>
      )}

      {/* EMPTY */}
      {challenges !== undefined && list.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-[#151922] p-12 text-center">
          <h2 className="text-lg font-semibold">No challenges found</h2>
          <p className="mt-2 text-sm text-slate-500">
            Create a new hackathon challenge or change your search filters.
          </p>
          <button
            type="button"
            onClick={() => router.push("/admin/challenges/new")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
          >
            <Plus size={17} />
            Create Challenge
          </button>
        </div>
      )}

      {/* TABLE */}
      {list.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#151922]">
          <div className="hidden border-b border-slate-800 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 lg:grid lg:grid-cols-[2fr_1fr_0.9fr_1.2fr_1.2fr_1.5fr] lg:gap-4">
            <div>Challenge</div>
            <div>Category</div>
            <div>Difficulty</div>
            <div>Start Date</div>
            <div>End Date</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-800">
            {list.map((challenge) => {
              const meta = categoryMeta(challenge.hackathonCategory);
              const isDeleteLoading = actionLoading === `delete-${challenge._id}`;

              return (
                <div
                  key={challenge._id}
                  className="px-6 py-5 transition-colors hover:bg-slate-900/40"
                >
                  <div className="grid gap-5 lg:grid-cols-[2fr_1fr_0.9fr_1.2fr_1.2fr_1.5fr] lg:items-center lg:gap-4">
                    {/* CHALLENGE */}
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/challenges/${challenge._id}`)}
                        className="truncate text-left font-semibold text-white transition hover:text-blue-400"
                      >
                        {challenge.title}
                      </button>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {challenge.description}
                      </p>
                    </div>

                    {/* CATEGORY */}
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                    </div>

                    {/* DIFFICULTY */}
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          challenge.difficulty === "beginner"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : challenge.difficulty === "intermediate"
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
                      </span>
                    </div>

                    {/* START */}
                    <div className="text-sm text-slate-300">{formatDate(challenge.startDate)}</div>

                    {/* END */}
                    <div className="text-sm text-slate-300">{formatDate(challenge.endDate)}</div>

                    {/* ACTIONS */}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/challenges/${challenge._id}`)}
                        title="View Challenge"
                        className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 transition hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/admin/challenges/${challenge._id}/edit`)
                        }
                        title="Edit Challenge"
                        className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 transition hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-400"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        disabled={isDeleteLoading}
                        onClick={() =>
                          setConfirmDelete({ id: challenge._id, title: challenge.title })
                        }
                        title="Delete Challenge"
                        className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleteLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete Challenge?"
        description={`You are about to permanently delete "${confirmDelete?.title}". This action cannot be undone. Related submissions will also be removed.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={actionLoading !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && void performDelete(confirmDelete.id)}
      />
    </div>
  );
}