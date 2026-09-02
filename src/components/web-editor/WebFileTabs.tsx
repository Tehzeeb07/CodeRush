"use client";

/**
 * File tabs for the Web Development workspace (index.html / style.css /
 * script.js). Simple, accessible, and styled to match the CodeRush dark
 * developer UI.
 */

export type WebFileId = "html" | "css" | "javascript";

export const WEB_FILES: {
  id: WebFileId;
  label: string;
  language: string;
}[] = [
  { id: "html", label: "index.html", language: "html" },
  { id: "css", label: "style.css", language: "css" },
  { id: "javascript", label: "script.js", language: "javascript" },
];

interface WebFileTabsProps {
  active: WebFileId;
  onChange: (file: WebFileId) => void;
}

export default function WebFileTabs({ active, onChange }: WebFileTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Editor files"
      className="flex items-center gap-1 border-b border-neutral-800 bg-[#0d0f12] px-2 pt-2"
    >
      {WEB_FILES.map((file) => {
        const isActive = file.id === active;
        return (
          <button
            key={file.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(file.id)}
            className={`rounded-t-md border border-b-0 px-3 py-1.5 font-mono text-xs transition-colors ${
              isActive
                ? "border-neutral-700 bg-neutral-900 text-white"
                : "border-transparent text-neutral-500 hover:bg-neutral-900/50 hover:text-neutral-300"
            }`}
          >
            {file.label}
          </button>
        );
      })}
    </div>
  );
}