/**
 * Format Code (requirement §6).
 *
 * SAFETY-FIRST design: the formatter performs ONLY behavior-preserving,
 * whitespace-level edits:
 *
 *   - normalizes indentation according to brace nesting (C-like languages)
 *   - trims trailing whitespace on every line
 *   - collapses runs of blank lines to at most one
 *   - ensures exactly one trailing newline
 *
 * It deliberately does NOT insert/delete tokens or reorder statements,
 * which guarantees program behavior is preserved.
 */

export type FormattableLanguage =
    | "cpp"
    | "java"
    | "javascript"
    | "python";

const TRAILING_WS_RE = /[ \t]+$/;

interface ScanState {
    depth: number;
    inString: null | '"' | "'" | "`";
    escape: boolean;
    inLineComment: boolean;
    inBlockComment: boolean;
}

function createScanState(): ScanState {
    return {
        depth: 0,
        inString: null,
        escape: false,
        inLineComment: false,
        inBlockComment: false,
    };
}

/** Update scanner state across one line of C-like code. */
function scanLine(state: ScanState, line: string): void {
    let i = 0;
    while (i < line.length) {
        const ch = line[i];
        const next = i + 1 < line.length ? line[i + 1] : "";

        if (state.inLineComment) break;
        if (state.inBlockComment) {
            if (ch === "*" && next === "/") {
                state.inBlockComment = false;
                i += 2;
                continue;
            }
            i += 1;
            continue;
        }
        if (state.inString) {
            if (state.escape) {
                state.escape = false;
            } else if (ch === "\\") {
                state.escape = true;
            } else if (ch === state.inString) {
                state.inString = null;
            }
            i += 1;
            continue;
        }

        if (ch === "/" && next === "/") {
            state.inLineComment = true;
            break;
        }
        if (ch === "/" && next === "*") {
            state.inBlockComment = true;
            i += 2;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") {
            state.inString = ch as ScanState["inString"];
            i += 1;
            continue;
        }
        if (ch === "{" || ch === "(" || ch === "[") {
            state.depth += 1;
        } else if (ch === "}" || ch === ")" || ch === "]") {
            state.depth = Math.max(0, state.depth - 1);
        }
        i += 1;
    }
    // A line comment ends with the line itself.
    state.inLineComment = false;
}

function collapseBlankLines(lines: string[]): string[] {
    const out: string[] = [];
    let blanks = 0;
    for (const l of lines) {
        if (l.trim().length === 0) {
            blanks += 1;
            if (blanks >= 2) continue;
            out.push("");
        } else {
            blanks = 0;
            out.push(l);
        }
    }
    while (out.length > 0 && out[out.length - 1] === "") out.pop();
    return out;
}

/** Public API: whitespace-normalizing, behavior-preserving formatter. */
export function formatCode(
    code: string,
    language: FormattableLanguage,
    tabSize: number,
): string {
    const unit = [2, 4, 8].includes(tabSize) ? tabSize : 4;
    const normalized =
        language === "python"
            ? normalizeWhitespaceOnly(code)
            : normalizeBraceIndent(code, unit);
    return `${normalized}\n`;
}

function normalizeWhitespaceOnly(code: string): string {
    const lines = code.replace(/\r\n/g, "\n").split("\n");
    const cleaned = lines.map((l) => l.replace(TRAILING_WS_RE, ""));
    return collapseBlankLines(cleaned).join("\n");
}

function normalizeBraceIndent(code: string, unit: number): string {
    const state = createScanState();
    const raw = code.replace(/\r\n/g, "\n").split("\n");

    interface LineInfo {
        text: string;
        depthBefore: number;
    }
    const infos: LineInfo[] = [];
    for (const line of raw) {
        const content = line.trim();
        const startsWithCloser = /^[\})\]]/.test(content);
        // A line that opens with a closer aligns one level above.
        infos.push({
            text: content,
            depthBefore: Math.max(
                0,
                state.depth - (startsWithCloser ? 1 : 0),
            ),
        });
        scanLine(state, content);
    }

    const out = infos.map(({ text, depthBefore }) =>
        text.length === 0
            ? ""
            : " ".repeat(Math.min(depthBefore, 40) * unit) + text.replace(TRAILING_WS_RE, ""),
    );
    return collapseBlankLines(out).join("\n");
}
