"use client";

/**
 * CodeRush - Admin Announcements Page
 *
 * Fully functional announcement management for ADMIN / SUPER_ADMIN:
 * create, publish (auto-notifies every user server-side), drafts, edit,
 * delete, search, type/status filters and pagination.
 *
 * Authorization note: all permission checks happen inside the Convex
 * mutations/queries (see convex/announcements.ts). This UI only hides
 * actions - it never decides who is allowed to do what.
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useToasts, ToastStack } from "@/components/ui/Toast";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Megaphone,
  AlertCircle,
  Info,
  Wrench,
  Trophy,
  Send,
  Save,
  Rocket,
  X,
} from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warning: "bg-amber-500/20 text-amber-400",
  maintenance: "bg-orange-500/20 text-orange-400",
  update: "bg-emerald-500/20 text-emerald-400",
  contest: "bg-purple-500/20 text-purple-400",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  info: Info,
  warning: AlertCircle,
  maintenance: Wrench,
  update: Megaphone,
  contest: Trophy,
};

type AnnouncementType = "info" | "warning" | "maintenance" | "update" | "contest";
type StatusFilter = "all" | "published" | "draft";

export default function AdminAnnouncementsPage() {
  const { toasts, push } = useToasts();

  // ---- List state -----------------------------------------------------
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<"" | AnnouncementType>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // ---- Form state -----------------------------------------------------
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<AnnouncementType>("info");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); // publishing / saving / deleting

  // ---- Server data ----------------------------------------------------
  const data = useQuery(api.announcements.adminListAnnouncements, {
    search: search || undefined,
    page,
    pageSize: 10,
    type: (typeFilter || undefined) as AnnouncementType | undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const createAnnouncement = useMutation(api.announcements.createAnnouncement);
  const publishAnnouncement = useMutation(api.announcements.publishAnnouncement);
  const updateAnnouncement = useMutation(api.announcements.updateAnnouncement);
  const deleteAnnouncement = useMutation(api.announcements.deleteAnnouncement);

  const announcements = data?.announcements ?? [];
  const totalPages = data?.totalPages ?? 0;
  const total = data?.total ?? 0;
  const isLoading = data === undefined;

  function openCreateForm() {
    setEditingId(null);
    setTitle("");
    setMessage("");
    setType("info");
    setValidationError(null);
    setShowForm(true);
  }

  function openEditForm(
    ann: { _id: string; title: string; message: string; type: string }
  ) {
    setEditingId(ann._id);
    setTitle(ann.title);
    setMessage(ann.message);
    setType((ann.type as AnnouncementType) ?? "info");
    setValidationError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setValidationError(null);
  }

  /** Client-side validation mirroring the server rules. */
  function validate(): string | null {
    if (title.trim().length < 3) return "Title must be at least 3 characters.";
    if (title.trim().length > 120) return "Title must be at most 120 characters.";
    if (message.trim().length < 3) return "Message must be at least 3 characters.";
    return null;
  }

  /** Publish button: create + publish (new) or publish (existing). */
  async function handlePublish() {
    const error = validate();
    if (error) {
      setValidationError(error);
      push(error, "error");
      return;
    }

    setBusy(true);
    setValidationError(null);

    try {
      if (editingId) {
        await updateAnnouncement({
          id: editingId as never,
          title: title.trim(),
          message: message.trim(),
          type,
        });
        const result = await publishAnnouncement({ id: editingId as never });
        push(
          result.alreadyPublished
            ? "Already published - no duplicate notifications sent."
            : "Announcement published successfully. Notifications sent to all users.",
          "success"
        );
      } else {
        await createAnnouncement({
          title: title.trim(),
          message: message.trim(),
          type,
          priority: "medium",
          publish: true,
        });
        push(
          "Announcement published successfully. Notifications sent to all users.",
          "success"
        );
      }
      closeForm();
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to publish announcement", "error");
    } finally {
      setBusy(false);
    }
  }

  /** Save as draft (create unpublished) or save edits without publishing. */
  async function handleSaveDraft() {
    const error = validate();
    if (error) {
      setValidationError(error);
      push(error, "error");
      return;
    }

    setBusy(true);
    setValidationError(null);

    try {
      if (editingId) {
        await updateAnnouncement({
          id: editingId as never,
          title: title.trim(),
          message: message.trim(),
          type,
          published: false,
        });
        push("Draft saved.", "success");
      } else {
        await createAnnouncement({
          title: title.trim(),
          message: message.trim(),
          type,
          priority: "medium",
          publish: false,
        });
        push("Draft created. Publish it when you're ready.", "success");
      }
      closeForm();
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to save draft", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishDraft(id: string) {
    setBusy(true);
    try {
      const result = await publishAnnouncement({ id: id as never });
      push(
        result.alreadyPublished
          ? "Already published - no duplicate notifications sent."
          : "Announcement published successfully. Notifications sent to all users.",
        "success"
      );
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to publish announcement", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, announcementTitle: string) {
    if (!window.confirm(`Delete "${announcementTitle}"? This cannot be undone.`)) {
      return;
    }

    setBusy(true);
    try {
      await deleteAnnouncement({ id: id as never });
      push("Announcement deleted.", "success");
    } catch (err) {
      push(err instanceof Error ? err.message : "Failed to delete announcement", "error");
    } finally {
      setBusy(false);
    }
  }

  function isPublished(ann: { published?: boolean; isActive: boolean }): boolean {
    return (ann.published ?? ann.isActive) === true;
  }

  return (
    <div className="space-y-6">
      <ToastStack toasts={toasts} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="mt-1 text-sm text-slate-400">Create and manage platform announcements</p>
        </div>
        <button
          onClick={openCreateForm}
          disabled={showForm}
          className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {editingId ? "Edit Announcement" : "Create Announcement"}
            </h3>
            <button
              onClick={closeForm}
              aria-label="Close form"
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-700/50 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>

          {validationError && (
            <div
              role="alert"
              className="mt-3 flex items-center gap-2 rounded-lg border border-red-800/60 bg-red-950/50 px-3 py-2 text-sm text-red-300"
            >
              <AlertCircle size={15} />
              {validationError}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="ann-title" className="mb-1.5 block text-xs font-medium text-slate-400">
                Title
              </label>
              <input
                id="ann-title"
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                className="w-full rounded-lg border border-slate-700/50 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ann-type" className="mb-1.5 block text-xs font-medium text-slate-400">
                Type
              </label>
              <select
                id="ann-type"
                value={type}
                onChange={(e) => setType(e.target.value as AnnouncementType)}
                className="w-full rounded-lg border border-slate-700/50 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="maintenance">Maintenance</option>
                <option value="update">Update</option>
                <option value="contest">Contest</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="ann-message" className="mb-1.5 block text-xs font-medium text-slate-400">
              Message / Description
            </label>
            <textarea
              id="ann-message"
              placeholder="Message..."
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-slate-700/50 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button
              onClick={closeForm}
              disabled={busy}
              className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg border border-slate-600/60 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={14} />
              {editingId ? "Save Draft" : "Save as Draft"}
            </button>
            <button
              onClick={handlePublish}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Publishing…
                </>
              ) : (
                <>
                  <Send size={14} />
                  Publish
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[250px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full rounded-lg border border-slate-700/50 bg-[#1E293B] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-[#3B82F6] focus:outline-none"
          />
        </div>

        <select
          aria-label="Filter by type"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as "" | AnnouncementType); setPage(0); }}
          className="rounded-lg border border-slate-700/50 bg-[#1E293B] px-3 py-2.5 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
        >
          <option value="">All types</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="maintenance">Maintenance</option>
          <option value="update">Update</option>
          <option value="contest">Contest</option>
        </select>

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(0); }}
          className="rounded-lg border border-slate-700/50 bg-[#1E293B] px-3 py-2.5 text-sm text-white focus:border-[#3B82F6] focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5">
              <div className="flex items-start gap-4">
                <div className="skeleton h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-2/3" />
                  <div className="skeleton h-2.5 w-1/4" />
                </div>
              </div>
            </div>
          ))
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-700/50 bg-[#1E293B] px-6 py-14 text-center">
            <Megaphone size={30} className="text-slate-600" />
            <p className="text-sm font-medium text-slate-400">No announcements found</p>
            <p className="text-xs text-slate-500">
              Try adjusting the search or filters, or create a new announcement.
            </p>
          </div>
        ) : (
          announcements.map((ann) => {
            const Icon = TYPE_ICONS[ann.type] ?? Info;
            const published = isPublished(ann);
            return (
              <div key={ann._id} className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${TYPE_COLORS[ann.type] ?? "bg-slate-500/20"}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{ann.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">{ann.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className={`rounded-full px-2 py-0.5 ${TYPE_COLORS[ann.type]}`}>{ann.type}</span>
                        <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                        {published ? (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400">Published</span>
                        ) : (
                          <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-slate-400">Draft</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!published && (
                      <button
                        onClick={() => handlePublishDraft(ann._id)}
                        disabled={busy}
                        title="Publish announcement"
                        aria-label="Publish announcement"
                        className="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                      >
                        <Rocket size={13} /> Publish
                      </button>
                    )}
                    <button
                      onClick={() => openEditForm(ann)}
                      disabled={busy}
                      aria-label="Edit announcement"
                      className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-700/50 hover:text-white disabled:opacity-50"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(ann._id, ann.title)}
                      disabled={busy}
                      aria-label="Delete announcement"
                      className="flex h-8 w-8 items-center justify-center rounded text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {page * 10 + 1} to {Math.min((page + 1) * 10, total)} of {total} announcements
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 hover:bg-slate-700/50 disabled:opacity-50">
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-sm text-slate-400">Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 hover:bg-slate-700/50 disabled:opacity-50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

