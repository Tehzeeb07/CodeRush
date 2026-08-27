/**
 * CPython diagnostic parsers (SyntaxError block + runtime tracebacks).
 */

import type { ParsedError, ParseContext, QuickFix } from "./types";
import { base, CAUSES, makeQuickFix } from "./shared";

interface PyRule {
    test: RegExp;
    title: string;
    explanation: string;
    causes?: string[];
    fix: string[];
    example?: string;
}

const PY_RUNTIME_RULES: PyRule[] = [
    {
        test: /^IndexError/,
        title: "Index out of range",
        explanation:
            "Your program accessed a list/string index that does not exist.",
        causes: CAUSES.indexOutRange,
        fix: [
            "Check len(...) bounds before indexing.",
            "Remember indices run from 0 to len-1.",
        ],
    },
    {
        test: /^ZeroDivisionError/,
        title: "Division by zero",
        explanation: "A division (or modulo) used zero as the divisor.",
        causes: CAUSES.divideByZero,
        fix: ["Check the divisor is non-zero before dividing."],
        example: "if b != 0:\n    print(a / b)",
    },
    {
        test: /^NameError/,
        title: "Undefined name",
        explanation:
            "Python evaluated a name that has not been assigned or imported yet.",
        causes: CAUSES.undefinedName,
        fix: ["Fix any typos.", "Define/import the name before it is used."],
    },
    {
        test: /^RecursionError/,
        title: "Recursion limit exceeded",
        explanation:
            "Recursive calls exceeded Python's recursion depth (~1000).",
        causes: CAUSES.recursionLimit,
        fix: [
            "Ensure the base case is reachable.",
            "Consider an iterative rewrite.",
        ],
    },
    {
        test: /^TypeError/,
        title: "Type error",
        explanation:
            "An operation combined values of incompatible types.",
        causes: CAUSES.typeMismatch,
        fix: [
            "Print/diagnose types around the failing expression.",
            "Convert inputs explicitly (e.g. int(input())).",
        ],
    },
];

const PY_RUNTIME_RULES_TAIL: PyRule[] = [
    {
        test: /^ValueError/,
        title: "Value error",
        explanation:
            "A value had the right type but was unacceptable for the operation.",
        fix: ["Validate converted values (e.g. int('abc'))."],
    },
    {
        test: /^KeyError/,
        title: "Missing dictionary key",
        explanation: "A dictionary lookup referenced a key that is not present.",
        fix: ["Use dict.get(key) or check membership before access."],
    },
    {
        test: /^EOFError/,
        title: "Unexpected end of input",
        explanation: "input() tried to read another line but stdin was exhausted.",
        fix: [
            "Match the number of reads to the problem's input format.",
            "Prefer sys.stdin.read() then split() once.",
        ],
    },

    {
        test: /^ModuleNotFoundError|^ImportError/,
        title: "Module not found",
        explanation: "An imported module is not available on the judge.",
        fix: ["Only use the Python standard library on the judge."],
    },
];

function findPyLocation(text: string): number | null {
    const matches = [...text.matchAll(/File\s+"[^"]*",\s*line\s+(\d+)/g)];
    const last = matches.at(-1);
    return last ? Number(last[1]) : null;
}

export function parsePython(ctx: ParseContext): ParsedError | null {
    const stderr = ctx.stderr?.trim();
    if (!stderr) return null;

    const headLine = stderr.split("\n").at(-1)?.trim() ?? "";
    const line = findPyLocation(stderr);

    // Syntax errors print two File markers followed by the caret/message.
    const syn = headLine.match(/^(SyntaxError|IndentationError):\s*(.+)$/);
    if (syn) {
        const isIndent = syn[1] === "IndentationError";
        const msg = syn[2];
        let quick: QuickFix | undefined;
        if (line && /expected ':'/.test(msg)) {
            quick = makeQuickFix(
                "py-add-colon",
                "💡 Add missing ':' at end of line",
                "insert-text",
                line,
                1e9,
                ":",
            );
        }
        return base({
            type: "compilation_error",
            source: "python/cpython",
            title: isIndent ? "Invalid indentation" : "Syntax error",
            rawMessage: stderr,
            line,
            severity: "error",
            confidence: "certain",
            explanation:
                "Python could not parse your program because of invalid syntax or inconsistent indentation.",
            possibleCauses: [],
            suggestedFix: [
                isIndent
                    ? "Make indentation consistent (4 spaces per level)."
                    : "Fix the syntax on the reported line (often a missing ':' or bracket).",
            ],
            quickFix: quick,
        });
    }

    const err = headLine.match(/^([\w.]+(?:Error|Exception))(?::\s*(.*))?$/);
    if (err) {
        const kind = err[1];
        const detail = err[2]?.trim() ?? "";
        const rule =
            [...PY_RUNTIME_RULES, ...PY_RUNTIME_RULES_TAIL].find((r) =>
                r.test.test(kind),
            ) ?? null;
        return base({
            type: /^EOFError/.test(kind) ? "input_error" : "runtime_error",
            source: "python/cpython",
            title: rule?.title ?? kind,
            rawMessage: stderr,
            line,
            severity: "error",
            confidence: "certain",
            explanation:
                rule?.explanation ??
                `Python raised ${kind}${detail ? `: ${detail}` : ""}.`,
            possibleCauses: rule?.causes ?? [],
            suggestedFix:
                rule?.fix ?? [`Handle the case reported: ${kind}: ${detail}`],
            fixExample: rule?.example ?? null,
        });
    }

    return base({
        type: "runtime_error",
        source: "python/cpython",
        title: "Runtime error",
        rawMessage: stderr,
        line,
        severity: "error",
        confidence: "certain",
        explanation:
            "Your program stopped unexpectedly and printed the message above.",
        possibleCauses: [],
        suggestedFix: [
            "Run with sample input locally and inspect the traceback above.",
        ],
    });
}
