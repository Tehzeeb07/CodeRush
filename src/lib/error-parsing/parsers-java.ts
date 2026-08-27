/**
 * javac diagnostic + JVM runtime exception parser.
 */

import type { ParsedError, ParseContext, ParsedErrorType, QuickFix } from "./types";
import { base, CAUSES, makeQuickFix } from "./shared";

export function parseJava(ctx: ParseContext): ParsedError | null {
    const compile = ctx.compileOutput?.trim();
    if (compile) {
        return parseJavaCompile(compile);
    }
    return parseJavaRuntime(ctx.stderr ?? "");
}


function parseJavaRuntime(stderr: string): ParsedError | null {
    const trimmed = stderr.trim();
    if (trimmed.length === 0) return null;

    const exLine = trimmed.match(
        /^([a-zA-Z0-9.$_]+(?:Error|Exception))(?::\s*(.*))?$/m,
    );
    if (!exLine) {
        return base({
            type: "runtime_error",
            source: "java/jvm",
            title: "Runtime error",
            rawMessage: stderr,
            severity: "error",
            confidence: "certain",
            explanation:
                "The JVM aborted your program and printed the trace above.",
            suggestedFix: [
                "Follow the deepest 'at Main.main(Main.java:N)' frame in the trace.",
            ],
        });
    }

    const className = exLine[1].split(".").at(-1)!;
    const detail = exLine[2]?.trim() ?? "";
    const frame = trimmed.match(/\tat ([\w.$]+)\.([\w$<>]+)\(.*\.java:(\d+)\)/);
    const line = frame ? Number(frame[3]) : null;

    const RULES: Record<
        string,
        {
            title: string;
            type?: ParsedErrorType;
            explanation: string;
            causes?: string[];
            fix: string[];
        }
    > = {
        ArrayIndexOutOfBoundsException: {
            title: "Array index out of bounds",
            explanation:
                "Your program indexed beyond the bounds of an array.",
            causes: CAUSES.indexOutRange,
            fix: ["Validate i < arr.length before arr[i]."],
        },
        NullPointerException: {
            title: "Null pointer dereference",
            explanation:
                "A method/field was used on a reference that is null.",
            causes: [
                "Uninitialized object or array slot",
                "An API returned null where you assumed non-null",
            ],
            fix: [
                "Initialize objects before use.",
                "Null-check results before dereferencing.",
            ],
        },
        ArithmeticException: {
            title: detail.includes("/ by zero")
                ? "Division by zero"
                : "Arithmetic error",
            explanation:
                detail.includes("/ by zero")
                    ? "Integer division used zero as the divisor."
                    : "An arithmetic condition failed.",
            causes: CAUSES.divideByZero,
            fix: ["Guard the divisor before dividing."],
        },
        NumberFormatException: {
            title: "Number parse failure",
            explanation: `parseInt/parseLong received text that is not a valid integer${detail ? ` (${detail})` : ""}.`,
            causes: [
                "Input tokens are not numeric",
                "Wrong splitting of the input line",
            ],
            fix: [
                "Verify the parsed token matches the documented input format.",
            ],
        },
        InputMismatchException: {
            title: "Input mismatch",
            type: "input_error",
            explanation:
                "Scanner read a token that did not match the expected type.",
            causes: [
                "Input order differs from the problem statement",
                "Extra/missing whitespace handling",
            ],
            fix: [
                "Re-read the input format section and match every read exactly.",
            ],
        },
        NoSuchElementException: {
            title: "Input exhausted",
            type: "input_error",
            explanation:
                "Scanner/BufferedReader tried to read more tokens than the input contains.",
            fix: ["Only read as many values as the input provides."],
        },
        StackOverflowError: {
            title: "Stack overflow",
            explanation:
                "Call stack depth exceeded the JVM limit — runaway recursion.",
            causes: CAUSES.recursionLimit,
            fix: [
                "Confirm the base case fires for all inputs.",
                "Convert deep recursion to iteration.",
            ],
        },
        OutOfMemoryError: {
            title: "Memory limit exceeded",
            explanation: "The JVM ran out of heap memory.",
            causes: ["Large arrays/lists", "String churn inside hot loops"],
            fix: ["Allocate only what the constraints require."],
        },
    };

    const rule = RULES[className];
    return base({
        type: rule?.type ?? "runtime_error",
        source: "java/jvm",
        title: rule?.title ?? className,
        rawMessage: stderr,
        line,
        severity: "error",
        confidence: "certain",
        explanation:
            rule?.explanation ?? `${className}${detail ? `: ${detail}` : ""}`,
        possibleCauses: rule?.causes ?? [],
        suggestedFix: rule?.fix ?? [
            `Locate where ${className} originates using the stack trace.`,
        ],
    });
}

function parseJavaCompile(compile: string): ParsedError | null {
    // javac format: Main.java:10: error: ';' expected
    const m = compile.match(/^.+\.java:(\d+):\s*error:\s*(.+)$/m);
    const line = m ? Number(m[1]) : null;
    const msg = m ? m[2].trim() : "Compilation failed";

    let quick: QuickFix | undefined;
    if (line && /';' expected/.test(msg)) {
        quick = makeQuickFix(
            "java-add-semicolon",
            "💡 Add missing semicolon to flagged line",
            "insert-text",
            line,
            1e9,
            "",
        );
    }

    const missingBrace = /reached end of file while parsing/.test(msg);
    const unknownSymbol = /cannot find symbol/.test(msg);

    return base({
        type: "compilation_error",
        source: "java/javac",
        title: /';' expected/.test(msg)
            ? "Missing semicolon"
            : missingBrace
              ? "Missing closing brace"
              : unknownSymbol
                ? "Unknown symbol"
                : msg.split("\n")[0],
        rawMessage: compile,
        line,
        severity: "error",
        confidence: "certain",
        explanation: unknownSymbol
            ? "javac could not resolve a name used in your code."
            : "javac reported a syntax problem that prevents compilation.",
        possibleCauses: unknownSymbol
            ? ["Typo in identifier", "Variable declared in a different scope"]
            : [],
        suggestedFix: [
            /';' expected/.test(msg)
                ? "Add a ';' at the end of the flagged statement."
                : missingBrace
                  ? "Close every open brace { … }."
                  : "Fix the flagged construct shown in the javac output.",
        ],
        quickFix: quick,
    });
}
