"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Plus,
  Eye,
  Pencil,
  Copy,
  Archive,
  Trash2,
  RefreshCw,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ConfirmDialog } from "../../../components/admin/ConfirmDialog";

export default function AdminProblemsPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<
    "easy" | "medium" | "hard" | undefined
  >(undefined);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "archive" | "delete";
    id: string;
    title: string;
    currentlyArchived: boolean;
  } | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const problemsData = useQuery(api.problems.listProblemsAdmin, {
    search: search || undefined,
    difficulty,
    page: 0,
    pageSize: 100,
  });

  const duplicateProblem = useMutation(api.problems.duplicateProblem);
  const archiveProblem = useMutation(api.problems.archiveProblem);
  const deleteProblem = useMutation(api.problems.deleteProblem);

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

  const handleView = (slug: string) => {
    router.push(`/admin/problems/${encodeURIComponent(slug)}`);
  };

  const handleEdit = (slug: string) => {
    router.push(`/admin/problems/${encodeURIComponent(slug)}/edit`);
  };

  const handleDuplicate = async (id: string) => {
    try {
      setActionLoading(`duplicate-${id}`);

      // Backend generates a unique "-copy" slug (with numeric suffixes if
      // needed) and sets the duplicated problem to Draft status.
      await duplicateProblem({
        id: id as any,
      });

      showSuccess(
        "Problem duplicated successfully. It was added to the list as a draft."
      );
    } catch (error) {
      console.error("Duplicate problem error:", error);

      showError(
        error instanceof Error
          ? error.message
          : "Failed to duplicate problem."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Open the confirmation dialog for archiving / restoring.
  const requestArchive = (
    id: string,
    currentlyArchived: boolean
  ) => {
    setConfirmDialog({
      type: "archive",
      id,
      title:
        problems.find((p) => p._id === id)?.title ??
        "this problem",
      currentlyArchived,
    });
  };

  const performArchive = async (
    id: string,
    currentlyArchived: boolean
  ) => {
    try {
      setActionLoading(`archive-${id}`);

      await archiveProblem({
        id: id as any,
        archived: !currentlyArchived,
      });

      showSuccess(
        currentlyArchived
          ? "Problem restored and re-published to its previous status."
          : "Problem archived. It is no longer visible to regular users."
      );
    } catch (error) {
      console.error("Archive problem error:", error);

      showError(
        error instanceof Error
          ? error.message
          : "Failed to update archive status."
      );
    } finally {
      setActionLoading(null);
      setConfirmDialog(null);
    }
  };

  // Open the confirmation dialog for deletion.
  const requestDelete = (id: string) => {
    setConfirmDialog({
      type: "delete",
      id,
      title:
        problems.find((p) => p._id === id)?.title ??
        "this problem",
      currentlyArchived: false,
    });
  };

  const performDelete = async (id: string) => {
    try {
      setActionLoading(`delete-${id}`);

      await deleteProblem({
        id: id as any,
      });

      showSuccess("Problem deleted permanently.");
    } catch (error) {
      console.error("Delete problem error:", error);

      showError(
        error instanceof Error
          ? error.message
          : "Failed to delete problem."
      );
    } finally {
      setActionLoading(null);
      setConfirmDialog(null);
    }
  };

  // Dispatch the confirmed destructive action.
  const performConfirmAction = () => {
    if (!confirmDialog) return;

    if (confirmDialog.type === "archive") {
      void performArchive(
        confirmDialog.id,
        confirmDialog.currentlyArchived
      );
    } else {
      void performDelete(confirmDialog.id);
    }
  };

  const problems = problemsData?.problems ?? [];

  const totalProblems = problemsData?.total ?? 0;

  const publishedCount = problems.filter(
    (problem) =>
      problem.published === true && problem.archived !== true
  ).length;

  const draftCount = problems.filter(
    (problem) =>
      problem.published !== true && problem.archived !== true
  ).length;

  const archivedCount = problems.filter(
    (problem) => problem.archived === true
  ).length;

  const totalTestCases = problems.reduce(
    (total, problem) => total + problem.testCases.length,
    0
  );

  return (
    <div className="min-h-screen bg-[#0F1117] p-6 text-white md:p-8">
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Problems
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Manage coding problems, test cases, publishing, and
            moderation.
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
            onClick={() => router.push("/admin/problems/new")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all duration-200 hover:scale-[1.02] hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98]"
          >
            <Plus size={18} />
            New Problem
          </button>
        </div>
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

          {message.text}
        </div>
      )}

      {/* STATS */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-800 bg-[#151922] p-5">
          <p className="text-sm text-slate-400">
            Total Problems
          </p>

          <p className="mt-2 text-2xl font-bold">
            {totalProblems}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#151922] p-5">
          <p className="text-sm text-slate-400">
            Published
          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {publishedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#151922] p-5">
          <p className="text-sm text-slate-400">
            Drafts
          </p>

          <p className="mt-2 text-2xl font-bold text-yellow-400">
            {draftCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#151922] p-5">
          <p className="text-sm text-slate-400">
            Archived
          </p>

          <p className="mt-2 text-2xl font-bold text-orange-400">
            {archivedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#151922] p-5">
          <p className="text-sm text-slate-400">
            Test Cases
          </p>

          <p className="mt-2 text-2xl font-bold">
            {totalTestCases}
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems by title or slug..."
            className="w-full rounded-xl border border-slate-800 bg-[#151922] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>

        <select
          value={difficulty ?? ""}
          onChange={(e) => {
            const value = e.target.value;

            setDifficulty(
              value === ""
                ? undefined
                : (value as "easy" | "medium" | "hard")
            );
          }}
          className="rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-slate-300 outline-none focus:border-blue-500"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* LOADING */}
      {problemsData === undefined && (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-800 bg-[#151922]">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2
              size={22}
              className="animate-spin"
            />
            Loading problems...
          </div>
        </div>
      )}

      {/* EMPTY */}
      {problemsData !== undefined && problems.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-[#151922] p-12 text-center">
          <h2 className="text-lg font-semibold">
            No problems found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Create a new problem or change your search filters.
          </p>

          <button
            type="button"
            onClick={() => router.push("/admin/problems/new")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
          >
            <Plus size={17} />
            Create Problem
          </button>
        </div>
      )}

      {/* PROBLEMS */}
      {problems.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#151922]">
          {/* TABLE HEADER */}
          <div className="hidden border-b border-slate-800 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 lg:grid lg:grid-cols-[2fr_0.8fr_0.9fr_1fr_1.7fr] lg:gap-4">
            <div>Problem</div>
            <div>Difficulty</div>
            <div>Status</div>
            <div>Tests</div>
            <div className="text-right">
              Actions
            </div>
          </div>

          <div className="divide-y divide-slate-800">
            {problems.map((problem) => {
              const isArchived = problem.archived === true;
              const isPublished =
                problem.published === true && !isArchived;

              const isDuplicateLoading =
                actionLoading === `duplicate-${problem._id}`;

              const isArchiveLoading =
                actionLoading === `archive-${problem._id}`;

              const isDeleteLoading =
                actionLoading === `delete-${problem._id}`;

              return (
                <div
                  key={problem._id}
                  className={`px-6 py-5 transition-colors hover:bg-slate-900/40 ${isArchived ? "opacity-70" : ""
                    }`}
                >
                  <div className="grid gap-5 lg:grid-cols-[2fr_0.8fr_0.9fr_1fr_1.7fr] lg:items-center lg:gap-4">
                    {/* PROBLEM */}
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleView(problem.slug)
                        }
                        className="truncate text-left font-semibold text-white transition hover:text-blue-400"
                      >
                        {problem.title}
                      </button>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        /{problem.slug}
                      </p>

                      {problem.category && (
                        <span className="mt-2 inline-flex rounded-full bg-slate-800 px-2.5 py-1 text-[11px] text-slate-400">
                          {problem.category}
                        </span>
                      )}
                    </div>

                    {/* DIFFICULTY */}
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${problem.difficulty === "easy"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : problem.difficulty === "medium"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-red-500/10 text-red-400"
                          }`}
                      >
                        {problem.difficulty
                          .charAt(0)
                          .toUpperCase() +
                          problem.difficulty.slice(1)}
                      </span>
                    </div>

                    {/* STATUS */}
                    <div>
                      {isArchived ? (
                        <span className="inline-flex rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
                          Archived
                        </span>
                      ) : isPublished ? (
                        <span className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-400">
                          Draft
                        </span>
                      )}
                    </div>

                    {/* TESTS */}
                    <div className="text-xs text-slate-400">
                      <div>
                        {problem.testCases.length} total
                      </div>

                      <div>
                        {
                          problem.testCases.filter(
                            (test) => test.isSample
                          ).length
                        }{" "}
                        samples
                      </div>

                      <div className="mt-1">
                        {problem.timeLimitMs}ms ·{" "}
                        {problem.memoryLimitMb}MB
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                      {/* VIEW */}
                      <button
                        type="button"
                        onClick={() =>
                          handleView(problem.slug)
                        }
                        title="View Problem"
                        className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 transition hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400"
                      >
                        <Eye size={16} />
                      </button>

                      {/* EDIT */}
                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(problem.slug)
                        }
                        title="Edit Problem"
                        className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 transition hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-400"
                      >
                        <Pencil size={16} />
                      </button>

                      {/* DUPLICATE */}
                      <button
                        type="button"
                        disabled={isDuplicateLoading}
                        onClick={() =>
                          handleDuplicate(
                            problem._id
                          )
                        }
                        title="Duplicate Problem"
                        className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 transition hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDuplicateLoading ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>

                      {/* ARCHIVE */}
                      <button
                        type="button"
                        disabled={isArchiveLoading}
                        onClick={() =>
                          requestArchive(
                            problem._id,
                            isArchived
                          )
                        }
                        title={
                          isArchived
                            ? "Restore Problem"
                            : "Archive Problem"
                        }
                        className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 transition hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isArchiveLoading ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Archive size={16} />
                        )}
                      </button>

                      {/* DELETE */}
                      <button
                        type="button"
                        disabled={isDeleteLoading}
                        onClick={() =>
                          requestDelete(
                            problem._id
                          )
                        }
                        title="Delete Problem"
                        className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleteLoading ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
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

      {/* CONFIRM DIALOG (archive / restore / delete) */}
      <ConfirmDialog
        open={confirmDialog !== null}
        title={
          confirmDialog?.type === "delete"
            ? "Delete Problem?"
            : confirmDialog?.currentlyArchived
              ? "Restore Problem?"
              : "Archive Problem?"
        }
        description={
          confirmDialog?.type === "delete"
            ? `You are about to permanently delete "${confirmDialog?.title}". This action cannot be undone. Related submissions will be removed and bookmarks/execution history will be detached.`
            : confirmDialog?.currentlyArchived
              ? `"${confirmDialog?.title}" will become visible to regular users again based on its publish status.`
              : `"${confirmDialog?.title}" will be hidden from the public problem list. It will remain available here in Admin Problem Management and can be restored at any time.`
        }
        confirmLabel={
          confirmDialog?.type === "delete"
            ? "Delete"
            : confirmDialog?.currentlyArchived
              ? "Restore"
              : "Archive"
        }
        cancelLabel="Cancel"
        variant={
          confirmDialog?.type === "delete"
            ? "destructive"
            : "warning"
        }
        isLoading={actionLoading !== null}
        onClose={() => setConfirmDialog(null)}
        onConfirm={performConfirmAction}
      />
    </div>
  );
}