"use client";

/**
 * Test Cases Management — admin-only editor for problem test cases.
 *
 * SECURITY: every query/mutation used here (listProblemsAdmin,
 * getProblemFull, updateProblem) verifies the caller is ADMIN or
 * SUPER_ADMIN server-side. Hidden test cases are only ever exposed
 * through these gated functions and are never rendered on user-facing
 * problem pages (public queries project them out entirely).
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Upload,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  FileCode2,
  Clock,
  MemoryStick,
} from "lucide-react";
import { useToasts, ToastStack } from "../ui/Toast";

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
}

type Tab = "all" | "sample" | "hidden";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-amber-500/20 text-amber-400",
  hard: "bg-red-500/20 text-red-400",
};

export function TestCasesManager() {
  const [search, setSearch] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  // Forms
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [caseInput, setCaseInput] = useState("");
  const [caseOutput, setCaseOutput] = useState("");
  const [caseIsSample, setCaseIsSample] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [saving, setSaving] = useState(false);

  const { toasts, push } = useToasts();

  const problemsData = useQuery(api.problems.listProblemsAdmin, {
    search: search.trim() || undefined,
    pageSize: 50,
  });
  const problem = useQuery(
    api.problems.getProblemFull,
    selectedSlug ? { slug: selectedSlug } : "skip"
  );
  const updateProblem = useMutation(api.problems.updateProblem);

  const problems = problemsData?.problems ?? [];
  const cases: TestCase[] = useMemo(
    () => (problem?.testCases ?? []) as TestCase[],
    [problem]
  );
  const visibleCases = cases.filter((c) =>
    tab === "all" ? true : tab === "sample" ? c.isSample : !c.isSample
  );

  const resetForms = () => {
    setShowAdd(false);
    setShowBulk(false);
    setEditingId(null);
    setCaseInput("");
    setCaseOutput("");
    setCaseIsSample(false);
    setBulkJson("");
  };

  /** Persist a new full testCases array through the gated updateProblem mutation. */
  const persist = async (next: TestCase[], okMsg: string) => {
    if (!problem) return;
    setSaving(true);
    try {
      await updateProblem({
        id: problem._id,
        testCases: next.map((c) => ({
          id: c.id,
          input: c.input,
          expectedOutput: c.expectedOutput,
          isSample: c.isSample,
        })),
      });
      push(okMsg, "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed to save test cases", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!problem) return;
    if (!caseInput.trim() || !caseOutput.trim()) {
      push("Input and expected output are both required.", "error");
      return;
    }
    const next: TestCase[] = [
      ...cases,
      {
        id: crypto.randomUUID(),
        input: caseInput,
        expectedOutput: caseOutput,
        isSample: caseIsSample,
      },
    ];
    await persist(next, caseIsSample ? "Public test case added." : "Hidden test case added.");
    resetForms();
  };

  const handleEditSave = async () => {
    if (!problem || editingId === null) return;
    if (!caseInput.trim() || !caseOutput.trim()) {
      push("Input and expected output are both required.", "error");
      return;
    }
    const next = cases.map((c) =>
      c.id === editingId
        ? { ...c, input: caseInput, expectedOutput: caseOutput, isSample: caseIsSample }
        : c
    );
    await persist(next, "Test case updated.");
    resetForms();
  };

  const handleDelete = async (tc: TestCase) => {
    if (!problem) return;
    if (!window.confirm(`Delete this ${tc.isSample ? "public" : "hidden"} test case?`)) return;
    await persist(
      cases.filter((c) => c.id !== tc.id),
      "Test case deleted."
    );
  };

  const handleBulk = async () => {
    if (!problem) return;
    try {
      const parsed: unknown = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error("Expected a JSON array of test cases.");
      const next = [...cases];
      for (const raw of parsed) {
        const item = raw as Record<string, unknown>;
        const input = typeof item.input === "string" ? item.input : "";
        const output =
          typeof item.expectedOutput === "string"
            ? item.expectedOutput
            : typeof item.output === "string"
              ? item.output
              : "";
        if (!input || !output) {
          throw new Error(
            'Each test case needs string "input" and "expectedOutput" fields.'
          );
        }
        next.push({
          id: crypto.randomUUID(),
          input,
          expectedOutput: output,
          isSample: item.isSample === true,
        });
      }
      await persist(next, `${parsed.length} test case(s) uploaded.`);
      resetForms();
    } catch (e) {
      push(e instanceof Error ? e.message : "Invalid JSON.", "error");
    }
  };

  const startEdit = (tc: TestCase) => {
    setShowAdd(false);
    setShowBulk(false);
    setEditingId(tc.id);
    setCaseInput(tc.input);
    setCaseOutput(tc.expectedOutput);
    setCaseIsSample(tc.isSample);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Test Cases</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage public and hidden test cases per problem
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
        <p className="text-sm text-amber-200">
          <span className="font-semibold">Security:</span> hidden test cases are visible
          only to admins and the judge service. They are never exposed to users through
          public queries.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Problem selector */}
        <div className="flex max-h-[70vh] flex-col overflow-hidden rounded-xl border border-slate-700/50 bg-[#1E293B]">
          <div className="border-b border-slate-700/50 p-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search problems..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:border-[#3B82F6] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {problemsData === undefined && (
              <p className="p-3 text-sm text-slate-400">Loading problems...</p>
            )}
            {problemsData !== undefined && problems.length === 0 && (
              <p className="p-3 text-sm text-slate-400">No problems found.</p>
            )}
            {problems.map((p) => (
              <button
                key={p._id}
                onClick={() => {
                  setSelectedSlug(p.slug);
                  resetForms();
                  setTab("all");
                }}
                className={`mb-1 w-full rounded-lg p-3 text-left transition-colors ${
                  selectedSlug === p.slug
                    ? "bg-[#3B82F6]/10 ring-1 ring-[#3B82F6]/40"
                    : "hover:bg-slate-700/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-white">{p.title}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${DIFFICULTY_COLORS[p.difficulty]}`}>
                    {p.difficulty}
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-slate-400">{p.slug}</div>
                <div className="mt-1.5 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Eye size={11} /> {p.testCases?.filter((t: TestCase) => t.isSample).length ?? 0} public
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <EyeOff size={11} /> {p.testCases?.filter((t: TestCase) => !t.isSample).length ?? 0} hidden
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor panel */}
        <div className="overflow-hidden rounded-xl border border-slate-700/50 bg-[#1E293B]">
          {!selectedSlug && (
            <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-400">
              <FileCode2 size={36} />
              <p className="text-sm">Select a problem to manage its test cases.</p>
            </div>
          )}
          {selectedSlug && problem === undefined && (
            <div className="flex h-96 items-center justify-center text-sm text-slate-400">
              Loading test cases...
            </div>
          )}
          {selectedSlug && problem === null && (
            <div className="flex h-96 items-center justify-center text-sm text-red-400">
              Problem not found.
            </div>
          )}

          {problem && (
            <>
              {/* Problem header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/50 p-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">{problem.title}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="rounded bg-slate-700/50 px-2 py-0.5">{problem.slug}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {problem.timeLimitMs}ms</span>
                    <span className="flex items-center gap-1"><MemoryStick size={12} /> {problem.memoryLimitMb}MB</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Eye size={12} /> {cases.filter((c) => c.isSample).length} public
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <EyeOff size={12} /> {cases.filter((c) => !c.isSample).length} hidden
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingId(null); setShowBulk(false); setShowAdd(true); setCaseInput(""); setCaseOutput(""); setCaseIsSample(false); }}
                    className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]"
                  >
                    <Plus size={15} /> Add Test Case
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setShowAdd(false); setShowBulk(true); setBulkJson(""); }}
                    className="flex items-center gap-2 rounded-lg border border-slate-700/50 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700/50"
                  >
                    <Upload size={15} /> Bulk Upload
                  </button>
                </div>
              </div>

              {/* Add form */}
              {showAdd && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="border-b border-slate-700/50 bg-slate-800/30 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">New Test Case</h3>
                    <button onClick={resetForms} className="text-slate-400 hover:text-white"><X size={16} /></button>
                  </div>
                  <TestCaseForm
                    input={caseInput} output={caseOutput} isSample={caseIsSample}
                    onInput={setCaseInput} onOutput={setCaseOutput} onIsSample={setCaseIsSample}
                    onSubmit={handleAdd} onCancel={resetForms} submitLabel="Add Test Case" saving={saving}
                  />
                </motion.div>
              )}

              {/* Edit form */}
              {editingId !== null && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="border-b border-slate-700/50 bg-slate-800/30 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Edit Test Case</h3>
                    <button onClick={resetForms} className="text-slate-400 hover:text-white"><X size={16} /></button>
                  </div>
                  <TestCaseForm
                    input={caseInput} output={caseOutput} isSample={caseIsSample}
                    onInput={setCaseInput} onOutput={setCaseOutput} onIsSample={setCaseIsSample}
                    onSubmit={handleEditSave} onCancel={resetForms} submitLabel="Save Changes" saving={saving}
                  />
                </motion.div>
              )}

              {/* Bulk upload form */}
              {showBulk && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="border-b border-slate-700/50 bg-slate-800/30 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Bulk Upload Test Cases</h3>
                    <button onClick={resetForms} className="text-slate-400 hover:text-white"><X size={16} /></button>
                  </div>
                  <p className="mb-2 text-xs text-slate-400">
                    Paste a JSON array of test cases with optional{" "}
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[#3B82F6]">isSample</code>{" "}
                    flags. Each item needs string <code className="text-[#3B82F6]">input</code> and{" "}
                    <code className="text-[#3B82F6]">expectedOutput</code> fields.
                  </p>
                  <textarea
                    value={bulkJson}
                    onChange={(e) => setBulkJson(e.target.value)}
                    rows={8}
                    placeholder='[{"input": "2 3", "expectedOutput": "5", "isSample": false}]'
                    className="w-full rounded-lg border border-slate-700/50 bg-slate-900/70 p-3 font-mono text-xs text-slate-200 placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleBulk}
                      disabled={saving || !bulkJson.trim()}
                      className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50"
                    >
                      <Upload size={15} /> {saving ? "Uploading..." : "Upload"}
                    </button>
                    <button onClick={resetForms} className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50">
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-700/50 px-5 pt-4">
                {([
                  { key: "all" as Tab, label: `All (${cases.length})` },
                  { key: "sample" as Tab, label: `Public (${cases.filter((c) => c.isSample).length})` },
                  { key: "hidden" as Tab, label: `Hidden (${cases.filter((c) => !c.isSample).length})` },
                ]).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                      tab === t.key
                        ? "border-b-2 border-[#3B82F6] text-[#3B82F6]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Test case list */}
              <div className="space-y-4 p-5">
                {visibleCases.length === 0 && (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
                    <CheckCircle size={28} />
                    <p className="text-sm">No {tab === "all" ? "" : `${tab} `}test cases yet.</p>
                  </div>
                )}
                {visibleCases.map((tc, index) => (
                  <motion.div
                    key={tc.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-300">#{index + 1}</span>
                        {tc.isSample ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                            <Eye size={10} /> Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                            <EyeOff size={10} /> Hidden
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(tc)}
                          className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-700/50 hover:text-white"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(tc)}
                          className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-500/10"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Input</p>
                        <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-200">{tc.input}</pre>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Expected Output</p>
                        <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-200">{tc.expectedOutput}</pre>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}

/** Shared form for creating / editing a single test case. */
function TestCaseForm({
  input,
  output,
  isSample,
  onInput,
  onOutput,
  onIsSample,
  onSubmit,
  onCancel,
  submitLabel,
  saving,
}: {
  input: string;
  output: string;
  isSample: boolean;
  onInput: (v: string) => void;
  onOutput: (v: string) => void;
  onIsSample: (v: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  saving: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Input</label>
        <textarea
          value={input}
          onChange={(e) => onInput(e.target.value)}
          rows={4}
          placeholder="stdin for this test case"
          className="w-full rounded-lg border border-slate-700/50 bg-slate-900/70 p-3 font-mono text-xs text-slate-200 placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Expected Output</label>
        <textarea
          value={output}
          onChange={(e) => onOutput(e.target.value)}
          rows={4}
          placeholder="expected stdout"
          className="w-full rounded-lg border border-slate-700/50 bg-slate-900/70 p-3 font-mono text-xs text-slate-200 placeholder-slate-500 focus:border-[#3B82F6] focus:outline-none"
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={isSample}
          onChange={(e) => onIsSample(e.target.checked)}
          className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-[#3B82F6]"
        />
        Public (sample) test case — visible to users
      </label>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSubmit}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
