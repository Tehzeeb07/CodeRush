/**
 * Shared building blocks used by all language error parsers.
 */

import type { ParsedError, QuickFix } from "./types";

export function base(
    partial: Omit<ParsedError, "line" | "column" | "fixExample" | "possibleCauses"> & {
        line?: number | null;
        column?: number | null;
        fixExample?: string | null;
        possibleCauses?: string[];
    },
): ParsedError {
    return {
        line: null,
        column: null,
        fixExample: null,
        possibleCauses: [],
        ...partial,
    };
}

/** Convenience builder for deterministic Quick Fix payloads. */
export function makeQuickFix(
    id: string,
    label: string,
    kind: QuickFix["kind"],
    line: number,
    /** 1e9 means "end of that line" for insertion fixes. */
    column: number,
    text: string,
): QuickFix {
    return { id, label, kind, line, column, text };
}

/** Explanation sets reused across languages. */
export const CAUSES = {
    segfault: [
        "Accessing an array/vector outside its valid bounds",
        "Dereferencing a null pointer",
        "Using an invalid or dangling iterator",
        "Deep recursion overflowing the call stack",
    ],
    indexOutRange: [
        "Accessing an index ≥ the length of the collection",
        "Indexing an empty collection",
        "An off-by-one loop bound",
    ],
    divideByZero: ["Dividing a number by zero"],
    recursionLimit: [
        "A recursive function without a reachable base case",
        "Recursion depth exceeding platform limits",
    ],
    typeMismatch: [
        "Operating on incompatible types (e.g. string + number)",
        "Passing arguments of the wrong type to a function",
        "Reading input into a variable of the wrong type",
    ],
    undefinedName: [
        "Typo in a variable or function name",
        "Using a name before it is declared",
        "Missing import/include of the defining module",
    ],
};
