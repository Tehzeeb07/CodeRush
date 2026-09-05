"use client";

/**
 * Collapsible lesson sidebar: course title, modules and lessons with
 * completion/current/locked state. On mobile it becomes a slide-over drawer
 * toggled by a button in the lesson page.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import { LessonStateIcon } from "./academy-ui";

interface SidebarLesson {
  _id: string;
  slug: string;
  title: string;
  state: "completed" | "current" | "locked";
}

interface SidebarModule {
  _id: string;
  title: string;
  lessons: SidebarLesson[];
}

export default function LessonSidebar({
  courseTitle,
  technologySlug,
  courseSlug,
  modules,
  mobileOpen,
  onMobileClose,
}: {
  courseTitle: string;
  technologySlug: string;
  courseSlug: string;
  modules: SidebarModule[];
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.08] p-4">
        <a
          href={`/code-academy/${technologySlug}/${courseSlug}`}
          className="text-xs font-semibold uppercase tracking-wider text-indigo-300 hover:text-indigo-200"
        >
          ← Back to course
        </a>
        <h2 className="mt-1 text-sm font-bold leading-snug text-white">
          {courseTitle}
        </h2>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {modules.map((mod) => {
          const isCollapsed = collapsed[mod._id];
          return (
            <div key={mod._id} className="mb-1">
              <button
                type="button"
                onClick={() => toggle(mod._id)}
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-neutral-300 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                {isCollapsed ? (
                  <ChevronRight size={13} className="text-neutral-500" />
                ) : (
                  <ChevronDown size={13} className="text-neutral-500" />
                )}
                <span className="truncate">{mod.title}</span>
              </button>
              {!isCollapsed && (
                <div className="ml-2 mt-0.5 space-y-0.5 border-l border-white/[0.06] pl-3">
                  {mod.lessons.map((l) => (
                    <a
                      key={l._id}
                      href={
                        l.state === "locked"
                          ? undefined
                          : `/code-academy/${technologySlug}/${courseSlug}/${l.slug}`
                      }
                      onClick={l.state === "locked" ? undefined : onMobileClose}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
                        l.state === "current"
                          ? "bg-indigo-500/10 font-medium text-white"
                          : l.state === "locked"
                            ? "cursor-not-allowed text-neutral-600"
                            : "text-neutral-400 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <LessonStateIcon state={l.state} />
                      <span className="truncate">{l.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-white/[0.08] bg-[#0b0d12] lg:block">
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Escape" && onMobileClose()}
          />
          <div className="absolute left-0 top-0 h-full w-72 border-r border-white/[0.08] bg-[#0b0d12]">
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close menu"
              className="absolute right-3 top-3 text-neutral-400 hover:text-white"
            >
              <X size={18} />
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
}

export function MobileSidebarToggle({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open course navigation"
      className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs text-neutral-300 lg:hidden"
    >
      <Menu size={14} /> Contents
    </button>
  );
}
