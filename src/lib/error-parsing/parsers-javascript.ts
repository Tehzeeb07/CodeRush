/**
 * Node.js error parser (V8 parse errors + runtime exceptions).
 */

import type { ParsedError, ParseContext, ParsedErrorType } from "./types";
import { base, CAUSES } from "./shared";

const CAUSES_TYPE = [
    "Accessing a property/method of undefined or null",
    "Calling something that is not a function",
    "Mixing incompatible operand types",
];

interface JsRule {
    test: RegExp;
    title: string;
    type: ParsedErrorType;
    explanation: string;
    causes?: string[];
    fix: string[];
}

const JS_RULES: JsRule[] = [
    {
        test: /^SyntaxError/,
        title: "Syntax error",
        type: "compilation_error",
        explanation:
            "Node could not parse your script because of invalid syntax.",
        fix: ["Look for missing brackets/parentheses near the reported location."],
    },
    {
        test: /^ReferenceError/,
        title: "Undefined variable",
        type: "runtime_error",
        explanation:
            "Node evaluated an identifier that was never declared or is out of scope.",
        causes: CAUSES.undefinedName,
        fix: [
            "Declare variables with let/const before use.",
            "Check spelling and scope.",
        ],
    },
    {
        test: /^TypeError/,
        title: "Type error",
        type: "runtime_error",
        explanation:
            "An operation ran against an unexpected value (e.g. property of undefined).",
        causes: CAUSES_TYPE,
        fix: [
            "Log the object before use to confirm it exists.",
            "Guard optional chains (obj?.prop).",
        ],
    },
    {
        test: /^RangeError/,
        title: "Range error",
        type: "runtime_error",
        explanation:
            "A value exceeded its allowed range (often infinite recursion).",
        causes: CAUSES.recursionLimit,
        fix: ["Check recursion termination conditions."],
    },
];

export function parseJavaScript(ctx: ParseContext): ParsedError | null {
    const stderr = ctx.stderr?.trim();
    if (!stderr) return null;

    // Node prints the throwing location as path/main.js:<line>:<col> or similar.
    const loc = stderr.match(/(?:main\.js|index\.js|code\.js|script\.js|\.js):(\d+)(?::(\d+))?/i);
    const line = loc ? Number(loc[1]) : null;
    const column = loc && loc[2] ? Number(loc[2]) : null;

    const err = stderr.match(/^(\w*Error)(?::\s*(.*))?$/m);
    const kind = err?.[1] ?? "";
    const detail = err?.[2]?.trim() ?? "";
    const rule = JS_RULES.find((r) => r.test.test(kind));

    const title = detail
        ? `${kind || "Error"}: ${detail}`
        : (rule?.title ?? kind) || "Runtime error";

    return base({
        type: rule?.type ?? "runtime_error",
        source: "javascript/node",
        title,
        rawMessage: stderr,
        line,
        column,
        severity: "error",
        confidence: "certain",
        explanation:
            detail
                ? `Node.js reported ${kind || "an error"}: ${detail}.`
                : (rule?.explanation ?? `Node.js reported ${kind || "a runtime failure"}.`),
        possibleCauses: rule?.causes ?? [],
        suggestedFix: rule?.fix ?? [
            "Inspect the reported line and stack frame for the source of the error.",
        ],
    });
}
