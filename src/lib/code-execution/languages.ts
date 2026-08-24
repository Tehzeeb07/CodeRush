/**
 * Centralized language registry for CodeRush.
 *
 * Every language-specific detail (Monaco language id, file name,
 * sandbox image, run command, starter template) lives here so that
 * no other module needs to hardcode per-language logic.
 */

import type { LanguageId } from "./types";

export interface LanguageConfig {
    /** Stable identifier used in API requests. */
    id: LanguageId;
    /** Human-readable label shown in the UI. */
    label: string;
    /** Monaco editor language id (https://microsoft.github.io/monaco-editor/). */
    monacoLanguage: string;
    /**
     * Default file name the code is written to inside the sandbox.
     * Java submissions override this at runtime via
     * `resolveEntryFileName` when the public class name differs.
     */
    fileName: string;
    /** Docker image used by the containerized backend. */
    dockerImage: string;
    /**
     * Shell command executed inside the sandbox working directory.
     * May compile and then run (e.g. C++ / Java).
     */
    runCommand: string;
    /**
     * Piston (https://github.com/engineer-man/piston) language id sent
     * to the execution service. Resolved against `/runtimes` (which
     * knows aliases such as "cpp" -> "c++") into an exact name/version.
     */
    pistonLanguage: string;
    /** Human-readable runtime behind this language (Node.js, g++, …). */
    pistonRuntime: string;
    /** Fallback Piston runtime version pin ("*" resolves to latest). */
    pistonVersion: string;
    /** Starter template inserted when the editor opens or is reset. */
    starterCode: string;
}

export const LANGUAGES: Record<LanguageId, LanguageConfig> = {
    javascript: {
        id: "javascript",
        label: "JavaScript",
        monacoLanguage: "javascript",
        fileName: "main.js",
        dockerImage: "node:22-slim",
        runCommand: "node main.js",
        pistonLanguage: "javascript",
        pistonRuntime: "Node.js",
        pistonVersion: "*",
        starterCode: `// CodeRush — JavaScript
// Read stdin with require("fs").readFileSync(0, "utf8")

console.log("Hello CodeRush");
`,
    },
    python: {
        id: "python",
        label: "Python 3",
        monacoLanguage: "python",
        fileName: "main.py",
        dockerImage: "python:3.12-slim",
        runCommand: "python3 main.py",
        pistonLanguage: "python",
        pistonRuntime: "Python 3",
        pistonVersion: "*",
        starterCode: `# CodeRush — Python 3
# Read stdin with: input() or sys.stdin.read()

print("Hello CodeRush")
`,
    },
    cpp: {
        id: "cpp",
        label: "C++",
        monacoLanguage: "cpp",
        fileName: "main.cpp",
        dockerImage: "gcc:13-bookworm",
        runCommand:
            "g++ -O2 -std=c++17 -o program main.cpp && ./program",
        // "cpp" is accepted as an alias of Piston's canonical "c++";
        // the HTTP backend resolves the exact name via /runtimes.
        pistonLanguage: "cpp",
        pistonRuntime: "g++",
        pistonVersion: "*",
        starterCode: `// CodeRush — C++17
#include <iostream>
using namespace std;

int main() {
    cout << "Hello CodeRush" << endl;
    return 0;
}
`,
    },
    java: {
        id: "java",
        label: "Java",
        monacoLanguage: "java",
        /**
         * Default entry file. The HTTP backend auto-detects the public
         * class name from the submitted source (see resolveEntryFileName)
         * and writes the code to <ClassName>.java instead, so users never
         * need to configure a class/file name manually.
         */
        fileName: "Main.java",
        dockerImage: "eclipse-temurin:21-jdk",
        runCommand: "java Main.java",
        pistonLanguage: "java",
        pistonRuntime: "OpenJDK (javac/java)",
        pistonVersion: "*",
        starterCode: `// CodeRush — Java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello CodeRush");
    }
}
`,
    },
};

/** Ordered list used to render selectors. */
export const LANGUAGE_LIST: LanguageConfig[] = [
    LANGUAGES.javascript,
    LANGUAGES.python,
    LANGUAGES.cpp,
    LANGUAGES.java,
];

/** Type guard: is this string a supported language id? */
export function isSupportedLanguage(value: unknown): value is LanguageId {
    return (
        typeof value === "string" &&
        Object.prototype.hasOwnProperty.call(LANGUAGES, value)
    );
}

export function getLanguage(id: LanguageId): LanguageConfig {
    return LANGUAGES[id];
}

/**
 * Determine the file name a submission must be written to inside the
 * sandbox. For Java this auto-detects the public class name from the
 * source (javac requires `<PublicClass>.java`), so users can submit any
 * class name without configuring anything. Falls back to the default
 * file name when there is no public class declaration.
 */
export function resolveEntryFileName(
    id: LanguageId,
    code: string,
): string {
    if (id !== "java") return LANGUAGES[id].fileName;

    const match = code.match(
        /\bpublic\s+(?:final\s+|abstract\s+|strictfp\s+|sealed\s+|non-sealed\s+)*class\s+([A-Za-z_$][A-Za-z0-9_$]*)/,
    );
    return match ? `${match[1]}.java` : LANGUAGES.java.fileName;
}