"use client";

/**
 * Admin Course Edit page (/admin/code-academy/[courseId]/edit).
 *
 * Fully functional editor wired to the existing Convex backend:
 *  - Loads the real course from the database via the admin-gated
 *    `getCourseAdmin` query.
 *  - Pre-fills every editable field with the current DB values.
 *  - Validates required fields client-side.
 *  - Persists changes through the existing admin-gated `upsertCourse`
 *    mutation (passing the course `_id`, so it updates in place).
 *  - Shows a success message and redirects back to the course view page.
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import CourseCoverUploader from "@/components/academy/CourseCoverUploader";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";

type Difficulty = "beginner" | "intermediate" | "advanced";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-neutral-400">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function AdminCourseEditPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = (params?.courseId as string) || "";
  const courseIdTyped = courseId as Id<"academyCourses">;

  const data = useQuery(
    api.academyAdmin.getCourseAdmin,
    courseId ? { courseId: courseIdTyped } : "skip"
  );
  const technologies = useQuery(api.academyAdmin.listTechnologiesAdmin) ?? [];

  const upsertCourse = useMutation(api.academyAdmin.upsertCourse);
  const generateCoverUploadUrl = useMutation(
    api.academyAdmin.generateCourseCoverUploadUrl
  );

  const [form, setForm] = useState({
    technologyId: "",
    title: "",
    slug: "",
    description: "",
    difficulty: "beginner" as Difficulty,
    durationMinutes: "",
    xpReward: "",
    published: false,
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Course cover photo upload state. The file is uploaded to Convex storage
  // immediately on selection; the storage id is only persisted when the form
  // is saved, so an abandoned edit never changes the course cover.
  const [coverPending, setCoverPending] = useState<{
    storageId: string;
    previewUrl: string;
    fileName: string;
  } | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  // Tracks the browser object URL used for the live preview so it can be
  // revoked on replace/remove/unmount (never persisted — see CoverUploader).
  const coverPreviewRef = useRef<string | null>(null);
  const revokeCoverPreview = () => {
    if (coverPreviewRef.current) {
      URL.revokeObjectURL(coverPreviewRef.current);
      coverPreviewRef.current = null;
    }
  };

  // Pre-populate the form from the existing course document (once).
  useEffect(() => {
    if (!courseId || !data || loaded) return;
    const course = data.course;
    setForm({
      technologyId: String(course.technologyId),
      title: course.title,
      slug: course.slug,
      description: course.description,
      difficulty: course.difficulty,
      durationMinutes:
        course.durationMinutes != null ? String(course.durationMinutes) : "",
      xpReward: course.xpReward != null ? String(course.xpReward) : "",
      published: course.published,
    });
    setLoaded(true);
  }, [courseId, data, loaded]);

  // Free the preview object URL when the form unmounts.
  useEffect(() => {
    return () => revokeCoverPreview();
  }, []);

  const handleCoverFileSelected = async (file: File) => {
    if (coverUploading) return;
    setCoverUploading(true);
    setCoverError(null);
    try {
      const uploadUrl = await generateCoverUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Unable to upload cover photo. Please try again.");
      const { storageId } = await res.json();
      if (!storageId) throw new Error("Unable to upload cover photo. Please try again.");

      revokeCoverPreview();
      const previewUrl = URL.createObjectURL(file);
      coverPreviewRef.current = previewUrl;
      setCoverPending({ storageId, previewUrl, fileName: file.name });
      setCoverRemoved(false);
    } catch (err) {
      setCoverError(
        err instanceof Error
          ? err.message
          : "Unable to upload cover photo. Please try again."
      );
    } finally {
      setCoverUploading(false);
    }
  };

  const handleCoverRemove = () => {
    revokeCoverPreview();
    setCoverPending(null);
    setCoverRemoved(true);
    setCoverError(null);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (!form.title.trim()) throw new Error("Course title is required.");
      if (!form.slug.trim()) throw new Error("Course slug is required.");
      if (!form.technologyId) throw new Error("Please select a technology.");

      const duration =
        form.durationMinutes.trim() !== ""
          ? Number(form.durationMinutes)
          : undefined;
      const xp =
        form.xpReward.trim() !== "" ? Number(form.xpReward) : undefined;
      if (duration != null && (!Number.isFinite(duration) || duration < 0)) {
        throw new Error("Duration must be a non-negative number.");
      }
      if (xp != null && (!Number.isFinite(xp) || xp < 0)) {
        throw new Error("XP reward must be a non-negative number.");
      }

      await upsertCourse({
        id: courseIdTyped,
        technologyId: form.technologyId as Id<"academyTechnologies">,
        title: form.title.trim(),
        slug: form.slug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        description: form.description,
        difficulty: form.difficulty,
        durationMinutes: duration,
        xpReward: xp ?? 100,
        coverImageStorageId: coverPending
          ? (coverPending.storageId as Id<"_storage">)
          : coverRemoved
            ? null
            : undefined,
        published: form.published,
      });

      setSuccess("Course updated successfully. Redirecting…");
      setTimeout(() => {
        router.push(`/admin/code-academy/${courseId}`);
      }, 900);
    } catch (e: any) {
      setError(e && e.message ? e.message : "Failed to save the course.");
    } finally {
      setSaving(false);
    }
  };

  const backTo = courseId
    ? `/admin/code-academy/${courseId}`
    : "/admin/code-academy";

  if (!courseId || data === null) {
    return (
      <div>
        <button
          type="button"
          onClick={() => router.push("/admin/code-academy")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={17} />
          Back to Code Academy
        </button>
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-10 text-center">
          <BookOpen size={36} className="mx-auto text-neutral-600" />
          <h1 className="mt-4 text-xl font-bold text-white">Course not found</h1>
          <p className="mt-2 text-sm text-neutral-400">
            The course you are looking for does not exist or may have been
            deleted.
          </p>
        </div>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400">
          <Loader2 size={22} className="animate-spin" />
          Loading course…
        </div>
      </div>
    );
  }

  // Canonical cover photo for the uploader: the uploaded cover, with the
  // legacy thumbnail URL as a fallback for pre-upload courses.
  const existingCoverUrl = data.course.coverImageUrl ?? data.course.thumbnailUrl ?? null;

  return (
    <div>
      {/* HEADER */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.push(backTo)}
            className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to course
          </button>
          <h1 className="text-2xl font-bold text-white">Edit course</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Update course information, technology, difficulty and publish
            status.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || coverUploading}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? "Saving…" : coverUploading ? "Uploading cover photo…" : "Save changes"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      {/* FORM */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">
              Basic information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title">
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="academy-input"
                  placeholder="e.g. C++ Fundamentals"
                />
              </Field>
              <Field label="Slug">
                <input
                  value={form.slug}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, ""),
                    })
                  }
                  className="academy-input"
                  placeholder="cpp-fundamentals"
                />
              </Field>
              <Field label="Difficulty" className="sm:col-span-2">
                <select
                  value={form.difficulty}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      difficulty: e.target.value as Difficulty,
                    })
                  }
                  className="academy-input"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </Field>
              <Field label="Technology" className="sm:col-span-2">
                <select
                  value={form.technologyId}
                  onChange={(e) =>
                    setForm({ ...form, technologyId: e.target.value })
                  }
                  className="academy-input"
                >
                  <option value="">Select…</option>
                  {technologies.map((t) => (
                    <option key={t._id} value={String(t._id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={5}
                  className="academy-input"
                  placeholder="What learners will master in this course."
                />
              </Field>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">
              Appearance
            </h2>
            <div className="grid gap-4">
              <Field label="Course Cover Photo">
                <CourseCoverUploader
                  existingUrl={coverRemoved ? null : existingCoverUrl}
                  pending={coverPending}
                  uploading={coverUploading}
                  disabled={saving}
                  error={coverError}
                  onFileSelected={handleCoverFileSelected}
                  onRemove={handleCoverRemove}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">
              Publishing
            </h2>
            <div className="grid gap-4">
              <Field label="Duration (minutes)">
                <input
                  type="number"
                  min={0}
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({ ...form, durationMinutes: e.target.value })
                  }
                  className="academy-input"
                  placeholder="e.g. 300"
                />
              </Field>
              <Field label="XP reward">
                <input
                  type="number"
                  min={0}
                  value={form.xpReward}
                  onChange={(e) =>
                    setForm({ ...form, xpReward: e.target.value })
                  }
                  className="academy-input"
                  placeholder="e.g. 100"
                />
              </Field>
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="course-published"
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) =>
                    setForm({ ...form, published: e.target.checked })
                  }
                  className="h-4 w-4 rounded"
                />
                <label
                  htmlFor="course-published"
                  className="text-sm text-neutral-300"
                >
                  Published
                </label>
              </div>
              <p className="text-xs leading-relaxed text-neutral-500">
                Draft courses are only visible to admins. Published courses
                appear in the learner-facing Code Academy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}