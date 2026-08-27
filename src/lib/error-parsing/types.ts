/**
 * Normalized error model shared by every language error parser.
 *
 * Raw compiler/interpreter output is parsed into this shape BEFORE it
 * reaches the UI. The renderer (see ResultPanel/ErrorDetailsCard) turns
 * these fields into the structured explanation blocks:
 *
 *   Type / What happened / Where / Why / How to fix / Relevant code
 */

export type ParsedErrorType =
    | "compilation_error"
    | "runtime_error"
    | "wrong_answer"
    | "time_limit"
    | "memory_limit"
    | "input_error"
    | "internal_error";

/** How sure the parser is about the diagnosis. Never blur these lines. */
export type ErrorConfidence =
    /** Derived deterministically from compiler/runtime output. */
    | "certain"
    /** Recognized pattern, but the underlying cause may vary. */
    | "probable"
    /** Heuristic guess — the UI must present it as a possible cause. */
    | "speculative";

export interface ParsedError {
    type: ParsedErrorType;
    /** Parser id that produced this result (e.g. "cpp/gcc"). */
    source: string;
    /** Short headline, e.g. "expected ';' before 'return'". */
    title: string;
    /**
     * Raw message exactly as emitted by the toolchain (for View Raw).
     */
    rawMessage: string;
    /** 1-based line in the user's source, when reliably known. */
    line: number | null;
    /** 1-based column, when reliably known. */
    column: number | null;
    severity: "error" | "warning";
    confidence: ErrorConfidence;
    /** Plain-language description of what went wrong. */
    explanation: string;
    /** Possible reasons (bullet list items). Empty when unknown. */
    possibleCauses: string[];
    /** Concrete remediation steps (bullet list items). */
    suggestedFix: string[];
    /** Optional illustrative code snippet the user can imitate. */
    fixExample: string | null;
    /** Deterministic quick fix payload when a safe automatic edit exists. */
    quickFix?: QuickFix;
}

/** A mechanical, safe edit the user may accept (never applied silently). */
export interface QuickFix {
    id: string;
    /** Menu label shown in the "💡 Quick Fix" menu. */
    label: string;
    kind: "insert-text" | "replace-line";
    /** 1-based line the edit applies to. */
    line: number;
    column: number;
    /** Text to insert at (line, column) or replacement for the line. */
    text: string;
}

export interface ParseContext {
    language: string;
    /** Compiler stderr/stdout (compilation phase). */
    compileOutput?: string | null;
    /** Program stderr (runtime phase). */
    stderr?: string | null;
    /** Program stdout (runtime phase). */
    stdout?: string | null;
    exitCode?: number | null;
    signal?: string | null;
    status?: string | null;
}
