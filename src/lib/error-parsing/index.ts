/**
 * Error parsing entry point.
 *
 * Normalize one failed execution into a structured ParsedError, plus
 * judge-derived factories (TLE / MLE / internal) that do not come from
 * a compiler but from the runner itself.
 */

import type { ParsedError, ParseContext } from "./types";
import { base } from "./shared";
import { parseCpp } from "./parsers-cpp";
import { parsePython } from "./parsers-python";
import { parseJava } from "./parsers-java";
import { parseJavaScript } from "./parsers-javascript";

const PARSERS_BY_LANGUAGE: Record<
    string,
    (ctx: ParseContext) => ParsedError | null
> = {
    cpp: parseCpp,
    python: parsePython,
    java: parseJava,
    javascript: parseJavaScript,
};

/**
 * Normalize one failed execution into a structured ParsedError.
 * Returns null when there is nothing meaningful to explain.
 */
export function parseError(ctx: ParseContext): ParsedError | null {
    const parser = PARSERS_BY_LANGUAGE[ctx.language];
    if (!parser) return null;

    if (
        typeof ctx.compileOutput === "string" &&
        ctx.compileOutput.trim().length > 0
    ) {
        return (
            parser({ ...ctx }) ?? genericCompile(ctx.language, ctx.compileOutput)
        );
    }

    if (typeof ctx.stderr === "string" && ctx.stderr.trim().length > 0) {
        return parser(ctx);
    }
    return null;
}

function genericCompile(language: string, raw: string): ParsedError {
    return base({
        type: "compilation_error",
        source: `${language}/unknown`,
        title: "Compilation failed",
        rawMessage: raw,
        severity: "error",
        confidence: "certain",
        explanation: "The compiler rejected your program before execution.",
        possibleCauses: [],
        suggestedFix: ["Address the first diagnostic reported above."],
    });
}

export function makeTimeLimitError(opts: {
    timeLimitMs: number;
    actualMs: number | null;
}): ParsedError {
    return base({
        type: "time_limit",
        source: "judge/time-limit",
        title: "Time limit exceeded",
        rawMessage: `Execution killed after ${opts.actualMs ?? opts.timeLimitMs} ms`,
        severity: "error",
        confidence: "certain",
        explanation:
            "Your program exceeded the allowed execution time and was terminated by the judge.",
        possibleCauses: [
            "Algorithm complexity higher than required (e.g. O(n²) where O(n log n) suffices)",
            "Very slow I/O patterns",
            "Infinite loop on edge-case input",
        ],
        suggestedFix: [
            "Analyze worst-case complexity against the stated constraints.",
            "Only consider algorithmic changes when the asymptotic bound clearly exceeds what the constraints allow.",
        ],
    });
}

export function makeMemoryLimitError(opts: {
    memoryLimitMb: number;
    actualKb: number | null;
}): ParsedError {
    return base({
        type: "memory_limit",
        source: "judge/memory-limit",
        title: "Memory limit exceeded",
        rawMessage:
            opts.actualKb !== null
                ? `Peak usage ≈ ${(opts.actualKb / 1024).toFixed(1)} MB`
                : "Process killed by memory exhaustion",
        severity: "error",
        confidence: "probable",
        explanation:
            "Your program used more memory than the judge allows.",
        possibleCauses: [
            "Large arrays/data structures",
            "Excessive recursion",
            "Unnecessary copies of data",
        ],
        suggestedFix: ["Right-size allocations for the given constraints."],
    });
}

export function makeInternalError(message: string): ParsedError {
    return base({
        type: "internal_error",
        source: "coderush/runner",
        title: "Execution infrastructure issue",
        rawMessage: message,
        severity: "error",
        confidence: "certain",
        explanation:
            "Something went wrong inside CodeRush's execution service — this is not necessarily a bug in your code.",
        possibleCauses: [],
        suggestedFix: ["Try again in a moment."],
    });
}
