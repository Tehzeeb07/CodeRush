/**
 * GCC/g++ diagnostic and signal parser.
 */

import type { ParsedError, ParseContext, QuickFix } from "./types";
import { base, CAUSES, makeQuickFix } from "./shared";

interface CompilerRule {
    test: RegExp;
    title?: string;
    explanation: string;
    causes?: string[];
    fix: string[];
    example?: string;
    quickFix?: "semicolon" | null;
}

const CPP_COMPILER_RULES: CompilerRule[] = [
    {
        test: /expected\s+';'/i,
        title: "Missing semicolon",
        explanation:
            "The compiler expected a semicolon at the end of the previous statement.",
        fix: ["Add a ';' at the end of the offending statement."],
        example: "cout << result;",
        quickFix: "semicolon",
    },
    {
        test: /was not declared in this scope/i,
        title: "Undeclared identifier",
        explanation:
            "The compiler encountered a name it has never seen up to this point.",
        causes: [
            "A typo in the variable, function or class name",
            "The name is used before being declared",
            "A missing #include (e.g. <string>)",
            "Using std:: names without 'using namespace std;'",
        ],
        fix: [
            "Check the spelling of the identifier.",
            "Declare it before first use.",
            "Include the header that defines it.",
        ],
    },
    {
        test: /No such file or directory/i,
        title: "Unknown include/header",
        explanation:
            "An #include directive refers to a header that does not exist on the judge.",
        causes: [
            "Misspelled header name",
            "Non-standard header unavailable in the judge environment",
        ],
        fix: ["Correct the header name (use standard headers)."],
    },
    {
        test: /redefinition/i,
        title: "Redefinition",
        explanation: "The same name was defined more than once in this scope.",
        fix: ["Remove or rename the duplicate definition."],
    },
];


/** Runtime failure signals emitted by the OS / C++ runtime. */
function parseCppRuntime(ctx: ParseContext): ParsedError | null {
    const stderr = ctx.stderr ?? "";
    const trimmed = stderr.trim();
    if (trimmed.length === 0) return null;

    if (/Segmentation fault/i.test(stderr)) {
        return base({
            type: "runtime_error",
            source: "cpp/signal",
            title: "Segmentation fault",
            rawMessage: stderr,
            severity: "error",
            confidence: "probable",
            explanation:
                "Your program accessed memory it does not own and was terminated by the operating system.",
            possibleCauses: CAUSES.segfault,
            suggestedFix: [
                "Check every array/index access against the container size.",
                "Verify pointers/references are initialized before use.",
                "Reduce recursion depth or convert to iteration.",
            ],
        });
    }
    if (/std::bad_alloc|out of memory/i.test(stderr)) {
        return base({
            type: "memory_limit",
            source: "cpp/std::bad_alloc",
            title: "Memory limit exceeded",
            rawMessage: stderr,
            severity: "error",
            confidence: "probable",
            explanation:
                "Your program requested more memory than was available.",
            possibleCauses: [
                "Very large arrays/vectors",
                "Excessive recursion",
                "Unnecessary data duplication",
            ],
            suggestedFix: [
                "Right-size containers to the problem constraints.",
                "Avoid copying large structures; pass references.",
            ],
        });
    }
    if (/Floating point exception|division by zero/i.test(stderr)) {
        return base({
            type: "runtime_error",
            source: "cpp/signal",
            title: "Division by zero",
            rawMessage: stderr,
            severity: "error",
            confidence: "probable",
            explanation:
                "An integer/floating-point division used a zero divisor.",
            possibleCauses: CAUSES.divideByZero,
            suggestedFix: ["Guard the divisor before dividing."],
            fixExample: "if (b != 0) cout << a / b;",
        });
    }
    if (/std::out_of_range/.test(stderr)) {
        return base({
            type: "runtime_error",
            source: "cpp/std::out_of_range",
            title: "Index out of range",
            rawMessage: stderr,
            severity: "error",
            confidence: "probable",
            explanation:
                "A bounds-checked container access (.at(), substr, …) used an invalid position.",
            possibleCauses: CAUSES.indexOutRange,
            suggestedFix: [
                "Validate the index/position before accessing the element.",
            ],
        });
    }
    return base({
        type: "runtime_error",
        source: "cpp/stderr",
        title: "Runtime error",
        rawMessage: stderr,
        severity: "error",
        confidence: "certain",
        explanation:
            "Your program terminated abnormally and printed the message above.",
        possibleCauses: [],
        suggestedFix: [
            "Reproduce locally with the failing input and inspect the aborting operation.",
        ],
    });
}

export function parseCpp(ctx: ParseContext): ParsedError | null {
    const compile = ctx.compileOutput?.trim();
    if (compile) {
        // g++ format: main.cpp:7:18: error: expected ';' before 'return'
        const m = compile.match(/^[^:\n]+\.cpp:(\d+):(\d+):\s*error:\s*(.+)$/m);
        if (!m) return null;

        const line = Number(m[1]);
        const column = Number(m[2]);
        const message = m[3].trim();
        const rule =
            CPP_COMPILER_RULES.find((r) => r.test.test(message)) ?? null;

        let quick: QuickFix | undefined;
        if (rule?.quickFix === "semicolon" && line > 1) {
            quick = makeQuickFix(
                "cpp-add-semicolon",
                "💡 Add missing semicolon to previous line",
                "insert-text",
                line - 1,
                1e9,
                ";",
            );
        }

        return base({
            type: "compilation_error",
            source: "cpp/gcc",
            title: rule?.title ?? message.split("\n")[0],
            rawMessage: compile,
            line,
            column,
            severity: "error",
            confidence: "certain",
            explanation: rule?.explanation ?? message,
            possibleCauses: rule?.causes ?? [],
            suggestedFix:
                rule?.fix ??
                ["Read the compiler note above and adjust the flagged code."],
            fixExample: rule?.example ?? null,
            quickFix: quick,
        });
    }
    return parseCppRuntime(ctx);
}
