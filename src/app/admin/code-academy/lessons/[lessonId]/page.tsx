"use client";

/**
 * Admin lesson editor (create). Builds the full lesson payload — content
 * blocks, code examples, practice exercise and quiz — and saves it via the
 * single `upsertLesson` mutation. The edit variant loads existing data first.
 */

import { useQuery, useMutation } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../../convex/_generated/dataModel";
import {
  Plus,
  Save,
  Trash2,
} from "lucide-react";

interface OptionDraft {
  id: string;
  text: string;
}

interface QuestionDraft {
  id?: string;
  question: string;
  options: OptionDraft[];
  correctAnswerId: string;
  explanation: string;
}

type LessonDifficulty = "beginner" | "intermediate" | "advanced";
type LessonContentBlock = Doc<"academyLessons">["content"][number];
type LessonCodeExample = Doc<"academyLessons">["codeExamples"][number];
type TechnologyAdmin = Doc<"academyTechnologies"> & { courseCount: number };
type LessonAdminData = NonNullable<
  FunctionReturnType<typeof api.academyAdmin.getLessonAdmin>
>;

interface LessonFormState {
  title: string;
  slug: string;
  shortDescription: string;
  difficulty: LessonDifficulty;
  estimatedMinutes: number;
  content: LessonContentBlock[];
  codeExamples: LessonCodeExample[];
  technologyIds: string[];
  technologyId: string;
  courseId: string;
  moduleId: string;
  published: boolean;
}

interface ExerciseFormState {
  title: string;
  difficulty: LessonDifficulty;
  question: string;
  instructions: string[];
  starterCode: string;
  language: string;
  expectedOutput: string;
  hints: string[];
}

interface QuizFormState {
  title: string;
  passingPercentage: number;
  allowRetake: boolean;
  questions: QuestionDraft[];
}

const EMPTY_FORM: LessonFormState = {
  title: "",
  slug: "",
  shortDescription: "",
  difficulty: "beginner",
  estimatedMinutes: 10,
  content: [],
  codeExamples: [],
  technologyIds: [],
  technologyId: "",
  courseId: "",
  moduleId: "",
  published: false,
};

const EMPTY_EXERCISE: ExerciseFormState = {
  title: "",
  difficulty: "beginner",
  question: "",
  instructions: [""],
  starterCode: "",
  language: "cpp",
  expectedOutput: "",
  hints: [""],
};

const EMPTY_QUIZ: QuizFormState = {
  title: "",
  passingPercentage: 70,
  allowRetake: true,
  questions: [],
};

function lessonFormFromData(data: LessonAdminData): LessonFormState {
  const lesson = data.lesson;
  return {
    title: lesson.title,
    slug: lesson.slug,
    shortDescription: lesson.shortDescription,
    difficulty: lesson.difficulty,
    estimatedMinutes: lesson.estimatedMinutes ?? 10,
    content: lesson.content ?? [],
    codeExamples: lesson.codeExamples ?? [],
    technologyIds: (lesson.technologyIds ?? []).map((tid) => String(tid)),
    technologyId: "",
    courseId: String(lesson.courseId),
    moduleId: String(lesson.moduleId),
    published: lesson.published ?? false,
  };
}

function exerciseFormFromData(
  exercise: NonNullable<LessonAdminData["exercise"]>
): ExerciseFormState {
  return {
    title: exercise.title,
    difficulty: exercise.difficulty,
    question: exercise.question,
    instructions:
      exercise.instructions.length > 0 ? exercise.instructions : [""],
    starterCode: exercise.starterCode,
    language: exercise.language,
    expectedOutput: exercise.expectedOutput ?? "",
    hints: exercise.hints && exercise.hints.length > 0 ? exercise.hints : [""],
  };
}

function quizFormFromData(
  quiz: NonNullable<LessonAdminData["quiz"]>
): QuizFormState {
  return {
    title: quiz.title,
    passingPercentage: quiz.passingPercentage,
    allowRetake: quiz.allowRetake,
    questions: quiz.questions.map((q) => ({
      id: String(q._id),
      question: q.question,
      options: q.options,
      correctAnswerId: q.correctAnswerId,
      explanation: q.explanation ?? "",
    })),
  };
}

export default function AdminLessonEditor() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.lessonId as string) || null;
  const isEdit = id !== null && id !== "new";

  const existing = useQuery(
    api.academyAdmin.getLessonAdmin,
    isEdit && id ? { lessonId: id as Id<"academyLessons"> } : "skip"
  );
  const technologies = useQuery(api.academyAdmin.listTechnologiesAdmin) ?? [];

  // Existing lesson data (when editing) seeds the editor's *initial* state.
  // The `key` below remounts the editor once the data arrives, replacing the
  // previous "copy data into state from an effect" approach — same result,
  // without cascading renders.
  return (
    <LessonEditorBody
      key={existing?.lesson._id ?? "empty"}
      existing={existing ?? null}
      technologies={technologies}
      isEdit={isEdit}
      lessonId={id}
      router={router}
    />
  );
}

function LessonEditorBody({
  existing,
  technologies,
  isEdit,
  lessonId,
  router,
}: {
  existing: LessonAdminData | null;
  technologies: TechnologyAdmin[];
  isEdit: boolean;
  lessonId: string | null;
  router: ReturnType<typeof useRouter>;
}) {
  const upsertLesson = useMutation(api.academyAdmin.upsertLesson);

  const [form, setForm] = useState<LessonFormState>(
    existing ? lessonFormFromData(existing) : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exercise draft
  const [exEnabled, setExEnabled] = useState(existing?.exercise != null);
  const [exForm, setExForm] = useState<ExerciseFormState>(
    existing?.exercise ? exerciseFormFromData(existing.exercise) : EMPTY_EXERCISE
  );

  // Quiz draft
  const [quizEnabled, setQuizEnabled] = useState(existing?.quiz != null);
  const [quizForm, setQuizForm] = useState<QuizFormState>(
    existing?.quiz ? quizFormFromData(existing.quiz) : EMPTY_QUIZ
  );

  const addQuestion = () => {
    setQuizForm((f) => ({
      ...f,
      questions: [
        ...f.questions,
        {
          question: "",
          options: [
            { id: "a", text: "" },
            { id: "b", text: "" },
            { id: "c", text: "" },
            { id: "d", text: "" },
          ],
          correctAnswerId: "a",
          explanation: "",
        },
      ],
    }));
  };

    const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (form.technologyIds.length === 0) {
        setError("Please select at least one technology.");
        setSaving(false);
        return;
      }
      if (!form.courseId) {
        setError("Please select a course.");
        setSaving(false);
        return;
      }
      if (!form.moduleId) {
        setError("Please select a module.");
        setSaving(false);
        return;
      }
      if (!form.title.trim()) {
        setError("Title is required.");
        setSaving(false);
        return;
      }
      if (!form.slug.trim()) {
        setError("Slug is required.");
        setSaving(false);
        return;
      }
      if (form.technologyIds.length > 5) {
        setError("A lesson can have at most 5 technology types.");
        setSaving(false);
        return;
      }
      const lessonPayload = {
        technologyIds: form.technologyIds as Id<"academyTechnologies">[],
        courseId: form.courseId as Id<"academyCourses">,
        moduleId: form.moduleId as Id<"academyModules">,
        title: form.title,
        slug: form.slug,
        shortDescription: form.shortDescription,
        difficulty: form.difficulty,
        estimatedMinutes: form.estimatedMinutes,
        content: form.content,
        codeExamples: form.codeExamples,
        published: form.published,
        exercise: exEnabled
          ? {
              title: exForm.title,
              difficulty: exForm.difficulty,
              question: exForm.question,
              instructions: exForm.instructions.filter(Boolean),
              starterCode: exForm.starterCode,
              language: exForm.language,
              expectedOutput: exForm.expectedOutput || undefined,
              hints: exForm.hints.filter(Boolean),
            }
          : null,
        quiz: quizEnabled
          ? {
              title: quizForm.title,
              passingPercentage: quizForm.passingPercentage,
              allowRetake: quizForm.allowRetake,
              questions: quizForm.questions.map((q) => ({
                question: q.question,
                options: q.options,
                correctAnswerId: q.correctAnswerId,
                explanation: q.explanation || undefined,
              })),
            }
          : null,
      };
      const savedLessonId = await upsertLesson(
        isEdit && lessonId
          ? { ...lessonPayload, id: lessonId as Id<"academyLessons"> }
          : lessonPayload
      );
      router.push(`/admin/code-academy/lessons/${savedLessonId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? "Edit lesson" : "New lesson"}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Define content, code examples, a practice exercise and a quiz.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? "Saving…" : "Save lesson"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <BasicInfo
            form={form}
            setForm={setForm}
            technologies={technologies}
          />
          <ContentEditor form={form} setForm={setForm} />
        </div>
        <div className="space-y-6">
          <ExercisePanel
            enabled={exEnabled}
            setEnabled={setExEnabled}
            form={exForm}
            setForm={setExForm}
          />
          <QuizPanel
            enabled={quizEnabled}
            setEnabled={setQuizEnabled}
            form={quizForm}
            setForm={setQuizForm}
            addQuestion={addQuestion}
          />
        </div>
      </div>
    </div>
  );
}

function BasicInfo({ form, setForm, technologies }: { form: LessonFormState; setForm: Dispatch<SetStateAction<LessonFormState>>; technologies: TechnologyAdmin[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5">
      <h2 className="mb-4 text-sm font-semibold text-white">Basic information</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="academy-input" placeholder="e.g. Variables" />
        </Field>
        <Field label="Slug">
          <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} className="academy-input" placeholder="variables" />
        </Field>
        <Field label="Short description" className="sm:col-span-2">
          <input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className="academy-input" />
        </Field>
        <Field label="Difficulty">
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as LessonDifficulty })} className="academy-input">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </Field>
        <Field label="Estimated minutes">
          <input type="number" value={form.estimatedMinutes} onChange={(e) => setForm({ ...form, estimatedMinutes: Number(e.target.value) })} className="academy-input" />
        </Field>
        <Field label="Technology">
          <select value={form.technologyId} onChange={(e) => setForm({ ...form, technologyId: e.target.value })} className="academy-input">
            <option value="">Select…</option>
            {technologies.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Course ID">
          <input value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className="academy-input" placeholder="Course Convex ID" />
        </Field>
        <Field label="Module ID">
          <input value={form.moduleId} onChange={(e) => setForm({ ...form, moduleId: e.target.value })} className="academy-input" placeholder="Module Convex ID" />
        </Field>
        <div className="flex items-center gap-2 pt-6">
          <input id="pub" type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="h-4 w-4 rounded" />
          <label htmlFor="pub" className="text-sm text-neutral-300">Published</label>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-neutral-400">{label}</label>
      {children}
    </div>
  );
}

function ContentEditor({ form, setForm }: { form: LessonFormState; setForm: Dispatch<SetStateAction<LessonFormState>> }) {
  const addBlock = (type: string) => {
    let b: LessonContentBlock;
    if (type === "heading") { b = { type: "heading", level: 2, text: "" }; }
    else if (type === "paragraph") { b = { type: "paragraph", text: "" }; }
    else if (type === "list") { b = { type: "list", ordered: false, items: [""] }; }
    else if (type === "code") { b = { type: "code", language: "cpp", code: "", caption: "" }; }
    else if (type === "note" || type === "warning" || type === "tip") { b = { type, text: "" }; }
    else { b = { type: "paragraph", text: "" }; }
    setForm({ ...form, content: [...form.content, b] });
  };
  const removeBlock = (idx: number) => setForm({ ...form, content: form.content.filter((_, i) => i !== idx) });
  const updateBlock = (idx: number, patch: Partial<LessonContentBlock>) => {
    const next = form.content.map((b, i) => (i === idx ? ({ ...b, ...patch } as LessonContentBlock) : b));
    setForm({ ...form, content: next });
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Content blocks</h2>
        <div className="flex flex-wrap gap-1.5">
          {["heading", "paragraph", "list", "code", "note", "tip", "warning"].map((t) => (
            <button key={t} type="button" onClick={() => addBlock(t)} className="rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-neutral-400 hover:bg-white/[0.05]">+ {t}</button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {form.content.length === 0 && <p className="text-sm text-neutral-500">No content blocks yet.</p>}
        {form.content.map((block, idx) => (
          <div key={idx} className="rounded-xl border border-white/[0.06] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-indigo-300">{block.type}</span>
              <button type="button" onClick={() => removeBlock(idx)} className="text-neutral-500 hover:text-rose-400"><Trash2 size={14} /></button>
            </div>
            {block.type === "heading" && <div className="flex gap-2"><select value={block.level} onChange={(e) => updateBlock(idx, { level: Number(e.target.value) as 1 | 2 | 3 })} className="academy-input w-20"><option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option></select><input value={block.text} onChange={(e) => updateBlock(idx, { text: e.target.value })} className="academy-input flex-1" /></div>}
            {(block.type === "paragraph" || block.type === "note" || block.type === "warning" || block.type === "tip") && <textarea value={block.text} onChange={(e) => updateBlock(idx, { text: e.target.value })} className="academy-input min-h-[60px]" />}
            {block.type === "list" && <div className="space-y-1.5"><label className="flex items-center gap-2 text-xs text-neutral-400"><input type="checkbox" checked={block.ordered} onChange={(e) => updateBlock(idx, { ordered: e.target.checked })} className="h-3.5 w-3.5 rounded" /> Ordered</label>{block.items.map((item, i: number) => (<input key={i} value={item} onChange={(e) => { const items = [...block.items]; items[i] = e.target.value; updateBlock(idx, { items }); }} className="academy-input" />))}<button type="button" onClick={() => updateBlock(idx, { items: [...block.items, ""] })} className="text-xs text-indigo-300">+ Add item</button></div>}
            {block.type === "code" && <div className="space-y-2"><input value={block.language} onChange={(e) => updateBlock(idx, { language: e.target.value })} className="academy-input w-40" placeholder="language" /><textarea value={block.code} onChange={(e) => updateBlock(idx, { code: e.target.value })} className="academy-input min-h-[80px] font-mono text-[13px]" /><input value={block.caption ?? ""} onChange={(e) => updateBlock(idx, { caption: e.target.value })} className="academy-input" placeholder="Caption" /></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ExercisePanel({ enabled, setEnabled, form, setForm }: { enabled: boolean; setEnabled: (v: boolean) => void; form: ExerciseFormState; setForm: Dispatch<SetStateAction<ExerciseFormState>> }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5">
      <label className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Practice exercise</span>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 rounded" />
      </label>
      {enabled && (
        <div className="mt-4 space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="academy-input" placeholder="Exercise title" />
          <textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="academy-input min-h-[60px]" placeholder="Question" />
          <textarea value={form.starterCode} onChange={(e) => setForm({ ...form, starterCode: e.target.value })} className="academy-input min-h-[80px] font-mono text-[13px]" placeholder="Starter code" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="academy-input">
              <option value="cpp">C++</option><option value="python">Python</option><option value="javascript">JavaScript</option><option value="java">Java</option>
            </select>
            <input value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as ExerciseFormState["difficulty"] })} className="academy-input" placeholder="difficulty" />
          </div>
          <input value={form.expectedOutput} onChange={(e) => setForm({ ...form, expectedOutput: e.target.value })} className="academy-input" placeholder="Expected output (optional)" />
        </div>
      )}
    </div>
  );
}

function QuizPanel({ enabled, setEnabled, form, setForm, addQuestion }: { enabled: boolean; setEnabled: (v: boolean) => void; form: QuizFormState; setForm: Dispatch<SetStateAction<QuizFormState>>; addQuestion: () => void }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e14] p-5">
      <label className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Quiz</span>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 rounded" />
      </label>
      {enabled && (
        <div className="mt-4 space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="academy-input" placeholder="Quiz title" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={form.passingPercentage} onChange={(e) => setForm({ ...form, passingPercentage: Number(e.target.value) })} className="academy-input" placeholder="Pass %" />
            <label className="flex items-center gap-2 text-xs text-neutral-300 pt-2">
              <input type="checkbox" checked={form.allowRetake} onChange={(e) => setForm({ ...form, allowRetake: e.target.checked })} className="h-3.5 w-3.5 rounded" /> Allow retake
            </label>
          </div>
          <div className="space-y-3">
            {form.questions.map((q, qi) => (
              <div key={qi} className="rounded-xl border border-white/[0.06] p-3 space-y-2">
                <input value={q.question} onChange={(e) => { const qs = [...form.questions]; qs[qi] = { ...qs[qi], question: e.target.value }; setForm({ ...form, questions: qs }); }} className="academy-input" placeholder={`Question ${qi + 1}`} />
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${qi}`} checked={q.correctAnswerId === opt.id} onChange={() => { const qs = [...form.questions]; qs[qi] = { ...qs[qi], correctAnswerId: opt.id }; setForm({ ...form, questions: qs }); }} className="h-3.5 w-3.5" />
                    <input value={opt.text} onChange={(e) => { const qs = [...form.questions]; qs[qi] = { ...qs[qi], options: qs[qi].options.map((o, i) => (i === oi ? { ...o, text: e.target.value } : o)) }; setForm({ ...form, questions: qs }); }} className="academy-input flex-1" placeholder={`Option ${opt.id}`} />
                  </div>
                ))}
                <input value={q.explanation} onChange={(e) => { const qs = [...form.questions]; qs[qi] = { ...qs[qi], explanation: e.target.value }; setForm({ ...form, questions: qs }); }} className="academy-input" placeholder="Explanation (optional)" />
              </div>
            ))}
          </div>
          <button type="button" onClick={addQuestion} className="flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"><Plus size={13} /> Add question</button>
        </div>
      )}
    </div>
  );
}
