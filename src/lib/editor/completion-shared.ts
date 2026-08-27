/**
 * Monaco completion suggestion primitives.
 *
 * All provider data is precomputed; lookup is a cheap prefix filter so
 * typing stays smooth even in large files (requirement §37).
 */

/** Monaco CompletionItemKind values used here (numeric to avoid imports). */
export const CK = {
    KEYWORD: 14,
    METHOD: 2,
    CLASS: 7,
    VARIABLE: 6,
    SNIPPET: 15,
} as const;

export interface Suggestion {
    label: string;
    /** Inserted text; may contain ${1:...} snippet placeholders. */
    insertText: string;
    kind: number;
    detail: string;
}

export function prefixMatches(prefix: string, s: string): boolean {
    return (
        prefix.length === 0 ||
        s.toLowerCase().startsWith(prefix.toLowerCase())
    );
}
