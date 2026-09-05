"use client";

import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import CourseCoverImage from "@/components/academy/CourseCoverImage";
import { BookOpen, ChevronRight, Layers, Plus, School, Sprout } from "lucide-react";

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="flex items-center justify-between rounded-lg border border-white/[0.08] px-3 py-2.5 text-sm text-neutral-300 transition-colors hover:border-white/[0.16] hover:bg-white/[0.04] hover:text-white">
      {label}
      <ChevronRight size={15} className="text-neutral-500" />
    </a>
  );
}

export default function AdminCodeAcademy() {
  const technologies = useQuery(api.academyAdmin.listTechnologiesAdmin) ?? [];
  const seed = useMutation(api.academyAdmin.seedAcademyContent);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [activeTech, setActiveTech] = useState<string | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await seed();
      setSeedResult(`Created: ${res.technologies} technologies, ${res.courses} courses, ${res.modules} modules, ${res.lessons} lessons, ${res.quizzes} quizzes, ${res.exercises} exercises.`);
    } catch (e: any) {
      setSeedResult(`Error: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const courses = useQuery(api.academyAdmin.listCoursesAdmin, activeTech ? { technologyId: activeTech as any } : "skip");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Code Academy</h1>
          <p className="mt-1 text-sm text-neutral-400">Manage learning technologies, courses, modules and lessons.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/admin/code-academy/lessons/new" className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">
            <Plus size={15} /> New lesson
          </a>
          <button type="button" onClick={handleSeed} disabled={seeding} className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-neutral-300 hover:bg-white/[0.05]">
            <Sprout size={15} />
            {seeding ? "Seeding…" : "Seed starter curriculum"}
          </button>
        </div>
      </div>

      {seedResult && (
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-300">{seedResult}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <School size={16} className="text-indigo-400" />
            Technologies ({technologies.length})
          </div>
          <div className="mt-3 space-y-1.5">
            {technologies.length === 0 && <p className="text-sm text-neutral-500">No technologies yet.</p>}
            {technologies.map((tech: any) => (
              <button key={tech._id} type="button" onClick={() => setActiveTech(activeTech === tech._id ? null : tech._id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${activeTech === tech._id ? "bg-indigo-500/10 text-white" : "text-neutral-300 hover:bg-white/[0.04]"}`}>
                <span className="truncate">{tech.name}</span>
                <span className="text-xs text-neutral-500">{tech.courseCount} courses</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <BookOpen size={16} className="text-indigo-400" />
            Courses ({activeTech && courses ? courses.length : 0})
          </div>
          <div className="mt-3 space-y-1.5">
            {!activeTech && <p className="text-sm text-neutral-500">Select a technology to view its courses.</p>}
            {activeTech && courses && courses.map((course: any) => (
              <div key={course._id} className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.04]">
                <a href={`/admin/code-academy/${course._id}`} className="flex min-w-0 flex-1 items-center gap-2">
                  {course.coverImage && (
                    <CourseCoverImage src={course.coverImage} alt="" className="h-9 w-14 shrink-0" />
                  )}
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate text-neutral-300 transition-colors hover:text-white">{course.title}</span>
                    <span className="shrink-0 text-xs text-neutral-500">{course.lessonCount} lessons</span>
                  </span>
                </a>
                <a href={`/admin/code-academy/${course._id}/edit`} className="shrink-0 rounded-md border border-white/[0.08] px-2 py-1 text-xs text-neutral-400 transition-colors hover:border-indigo-400/40 hover:text-indigo-300">
                  Edit
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Layers size={16} className="text-indigo-400" />
            Quick actions
          </div>
          <div className="mt-3 space-y-2">
            <QuickLink href="/admin/code-academy/lessons/new" label="Create a new lesson" />
            <QuickLink href="/code-academy" label="View Code Academy (as learner)" />
          </div>
        </div>
      </div>
    </div>
  );
}
