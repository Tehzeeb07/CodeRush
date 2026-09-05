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
  Search,
  Loader2,
  UploadCloud,
  DownloadCloud,
  Target,
  Users,
} from "lucide-react";
import { ConfirmDialog } from "../../../components/admin/ConfirmDialog";
import StatusBadge from "../../../components/talent-connect/StatusBadge";
import {
  TALENT_CONNECT_POST_STATUSES,
  categoryLabel,
  categoryEmoji,
  postStatusLabel,
  formatDate,
} from "../../../components/talent-connect/constants";

type PostStatus = "draft" | "published" | "unpublished" | "archived";

export default function AdminTalentConnectPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PostStatus | undefined>(undefined);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const posts = useQuery(api.talentConnectPosts.listAdmin, {
    search: search || undefined,
    status,
  });

  const setPostStatus = useMutation(api.talentConnectPosts.setPostStatus);
  const deletePost = useMutation(api.talentConnectPosts.deletePost);

  const showSuccess = (text: string) => {
    setMessage({ type: "success", text });
    setTimeout(() => setMessage(null), 3000);
  };

  const showError = (text: string) => {
    setMessage({ type: "error", text });
    setTimeout(() => setMessage(null), 4000);
  };

  const list = posts ?? [];

  const performStatusChange = async (id: string, next: PostStatus) => {
    try {
      setActionLoading(`status-${id}`);
      await setPostStatus({
        postId: id as Id<"talentConnectPosts">,
        status: next,
      });
      showSuccess(
        next === "published"
          ? "Talent Connect post published."
          : `Talent Connect post ${postStatusLabel(next).toLowerCase()}.`
      );
    } catch (error) {
      console.error("Update Talent Connect status error:", error);
      showError(
        error instanceof Error ? error.message : "Failed to update status."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const performDelete = async (id: string) => {
    try {
      setActionLoading(`delete-${id}`);
      await deletePost({ postId: id as Id<"talentConnectPosts"> });
      showSuccess("Talent Connect post deleted permanently.");
    } catch (error) {
      console.error("Delete Talent Connect post error:", error);
      showError(
        error instanceof Error ? error.message : "Failed to delete post."
      );
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1117] p-6 text-white md:p-8">
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
              <Target size={18} />
            </span>
            Talent Connect
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Create and manage Talent Connect posts. Publish real-world
            projects and technical requirements, then review proposals from
            talented developers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/admin/talent-connect/new")}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-black shadow-[0_10px_40px_rgba(245,158,11,0.2)] transition hover:shadow-[0_15px_50px_rgba(245,158,11,0.3)]"
        >
          <Plus size={16} />
          New Talent Connect Post
        </button>
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
          {message.text}
        </div>
      )}

      {/* FILTERS */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description or company…"
            className="w-full rounded-xl border border-slate-800 bg-[#151922] py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/40 focus:outline-none"
          />
        </div>
        <select
          value={status ?? ""}
          onChange={(e) =>
            setStatus((e.target.value || undefined) as PostStatus | undefined)
          }
          className="rounded-xl border border-slate-800 bg-[#151922] px-4 py-3 text-sm text-slate-300 focus:border-amber-500/40 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {TALENT_CONNECT_POST_STATUSES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* POSTS */}
      {posts === undefined ? (
        <div className="flex items-center justify-center py-32 text-sm text-slate-600">
          <Loader2 size={20} className="mr-3 animate-spin" />
          Loading Talent Connect posts…
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-[#151922] px-8 py-20 text-center">
          <Target size={40} className="mx-auto text-slate-700" />
          <h3 className="mt-5 text-lg font-bold text-white">
            No Talent Connect posts yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Create your first post to start discovering talented developers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((post) => {
            const isStatusLoading = actionLoading === `status-${post._id}`;
            const isDeleteLoading = actionLoading === `delete-${post._id}`;

            return (
              <div
                key={post._id}
                className="rounded-2xl border border-slate-800 bg-[#151922] p-5 transition hover:border-slate-700"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={post.status} kind="post" />
                      <span className="rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-300">
                        {categoryEmoji(post.category)}{" "}
                        {categoryLabel(post.category)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-[10px] font-bold text-slate-300">
                        <Users size={11} /> {post.submissionCount ?? 0}{" "}
                        {(post.submissionCount ?? 0) === 1
                          ? "proposal"
                          : "proposals"}
                      </span>
                    </div>

                    <h3 className="truncate text-base font-bold text-white">
                      {post.title}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                      {post.shortDescription}
                    </p>
                    <p className="mt-1.5 text-[11px] text-slate-600">
                      {post.companyName}
                      {post.deadline
                        ? ` · Due ${formatDate(post.deadline)}`
                        : ""}
                      {` · Created ${formatDate(post.createdAt)}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/talent-connect/${post._id}`)
                      }
                      title="View post and proposals"
                      className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 transition hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/talent-connect/${post._id}/edit`)
                      }
                      title="Edit post"
                      className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 transition hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-400"
                    >
                      <Pencil size={16} />
                    </button>

                    {post.status === "published" ? (
                      <button
                        type="button"
                        disabled={isStatusLoading}
                        onClick={() =>
                          performStatusChange(post._id, "unpublished")
                        }
                        title="Unpublish post"
                        className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 transition hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isStatusLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <DownloadCloud size={16} />
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isStatusLoading || post.status === "archived"}
                        onClick={() => performStatusChange(post._id, "published")}
                        title={
                          post.status === "archived"
                            ? "Archived posts cannot be published"
                            : "Publish post"
                        }
                        className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isStatusLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <UploadCloud size={16} />
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isDeleteLoading}
                      onClick={() =>
                        setConfirmDelete({ id: post._id, title: post.title })
                      }
                      title="Delete post"
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
      )}

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete Talent Connect post?"
        description={`You are about to permanently delete "${confirmDelete?.title}". This action cannot be undone. All submitted proposals will also be removed.`}
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
