"use client";

/**
 * Course cover photo display component.
 *
 * Renders the canonical course cover photo (uploaded Convex storage URL, or the
 * legacy thumbnail URL fallback) with a graceful placeholder whenever the image
 * is missing, is not a usable http(s) URL, or fails to load. Never shows a
 * broken-image icon and never crashes on bad data — arbitrary external hosts
 * are supported via a plain `<img>` element (no Next.js image config needed).
 */

import { useState } from "react";
import { ImageOff } from "lucide-react";

/** Accept `https:` / `http:` URLs only; everything else is unusable for `<img>`. */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export default function CourseCoverImage({
  src,
  alt,
  className = "",
}: {
  src?: string | null;
  alt: string;
  /** Sizing classes for the outer wrapper, e.g. "h-40 w-full". */
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const usable = src && isValidHttpUrl(src) && !failed;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] ${className}`}
    >
      {usable ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageOff size={22} className="text-neutral-600" />
        </div>
      )}
    </div>
  );
}