"use client";

/**
 * Course Cover Photo uploader (admin).
 *
 * A self-contained upload control for the Course Edit form. The admin picks an
 * image from their device; this component validates type/size client-side and
 * hands the file to the parent, which uploads it to Convex storage. The parent
 * owns the upload + preview state, so this component stays presentational and
 * re-usable.
 *
 * States handled: no cover, existing cover, pending new cover, uploading,
 * removed (pending save), validation errors, upload errors.
 */

import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import CourseCoverImage from "./CourseCoverImage";

export const COVER_MAX_MB = 5;
const COVER_MAX_BYTES = COVER_MAX_MB * 1024 * 1024;
const COVER_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const COVER_ACCEPT_ATTR = "image/jpeg,image/png,image/webp,image/gif";

/** Pending (unsaved) cover upload state owned by the parent form. */
export interface CoverUploadState {
  /** Convex storage id returned by the upload (persisted on save). */
  storageId: string;
  /** Browser object URL used for the live preview (never stored). */
  previewUrl: string;
  /** Original file name (shown under the preview). */
  fileName: string;
}

export default function CourseCoverUploader({
  existingUrl,
  pending,
  uploading,
  disabled = false,
  error = null,
  onFileSelected,
  onRemove,
}: {
  existingUrl: string | null;
  pending: CoverUploadState | null;
  uploading: boolean;
  disabled?: boolean;
  error?: string | null;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const shownError = localError ?? error;
  const shownPreview = pending ? pending.previewUrl : existingUrl;

  const openPicker = () => {
    if (disabled || uploading) return;
    setLocalError(null);
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file after a cancelled/removed pick.
    e.target.value = "";
    if (!file) return;

    const looksLikeImage =
      COVER_ACCEPTED_TYPES.includes(file.type) ||
      (file.type === "" && /\.(jpe?g|png|webp|gif)$/i.test(file.name));
    if (!looksLikeImage) {
      setLocalError("Please choose a JPG, PNG, WEBP or GIF image.");
      return;
    }
    if (file.size > COVER_MAX_BYTES) {
      setLocalError(`Image must be smaller than ${COVER_MAX_MB} MB.`);
      return;
    }
    setLocalError(null);
    onFileSelected(file);
  };

  const handleRemove = () => {
    if (disabled || uploading) return;
    setLocalError(null);
    onRemove();
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={COVER_ACCEPT_ATTR}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="relative">
        <CourseCoverImage
          src={shownPreview}
          alt="Course cover photo"
          className="h-48 w-full"
        />

        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/70">
            <Loader2 size={22} className="animate-spin text-indigo-300" />
            <p className="text-sm font-medium text-white">Uploading cover photo…</p>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="truncate text-xs text-neutral-500">
          {pending
            ? pending.fileName
            : existingUrl
              ? "Current cover photo"
              : "No cover photo selected"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || uploading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : pending || existingUrl ? (
            <RefreshCw size={15} />
          ) : (
            <ImagePlus size={15} />
          )}
          {pending || existingUrl ? "Change Photo" : "Upload Cover Photo"}
        </button>

        {(pending || existingUrl) && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3.5 py-2 text-sm text-rose-300 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={15} />
            Remove
          </button>
        )}

        {uploading && (
          <span className="text-xs text-indigo-300">Saving new cover on save…</span>
        )}
      </div>

      {!uploading && shownError && (
        <p className="mt-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-300">
          {shownError}
        </p>
      )}
    </div>
  );
}