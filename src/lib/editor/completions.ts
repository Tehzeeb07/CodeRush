/**
 * Registers CodeRush completion providers on a Monaco instance.
 *
 * Providers are tiny (precomputed dictionaries + prefix filter), so no
 * debounce machinery is required beyond Monaco's own async pipeline —
 * results stay instant without blocking keystrokes (requirement §37).
 */

import type { Monaco } from "@monaco-editor/react";

import type { Suggestion } from "./completion-shared";
import { CPP_STD_MEMBERS, CPP_SNIPPETS, CPP_KEYWORDS } from "./completion-data-cpp";
import { PY_BUILTINS, PY_SNIPPETS, pythonSuggestions } from "./completion-data-py-js";
import { javaSuggestions, javascriptSuggestions } from "./completion-data-py-js";

type Model = import("monaco-editor").editor.ITextModel;
type Position = import("monaco-editor").Position;
type Range = import("monaco-editor").IRange;

function toMonaco(
    monaco: Monaco,
    s: Suggestion[],
    range: Range,
): import("monaco-editor").languages.CompletionItem[] {
    return s.map((item) => ({
        label: item.label,
        kind: item.kind,
        insertText: item.insertText,
        detail: item.detail,
        range,
        insertTextRules:
            item.insertText.includes("$")
                ? monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet
                : undefined,
    }));
}

export function registerCompletionProviders(monaco: Monaco): void {
    const linePrefix = (model: Model, position: Position): string =>
        model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
        });

    // ------------------------------------------------------------------
    // C++
    // ------------------------------------------------------------------
    monaco.languages.registerCompletionItemProvider("cpp", {
        triggerCharacters: [":", "<"],
        provideCompletionItems(model: Model, position: Position) {
            const before = linePrefix(model, position);
            const word = model.getWordUntilPosition(position);
            const defaultRange: Range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            if (/std::[\w<>]*$/.test(before)) {
                return {
                    suggestions: toMonaco(monaco, [...CPP_STD_MEMBERS], defaultRange),
                };
            }
            const kw = CPP_KEYWORDS.filter((k) => k.startsWith(word.word))
                .map((k) => ({ label: k, insertText: k, kind: 14, detail: "C++ keyword" }));
            return {
                suggestions: toMonaco(monaco, [...kw, ...CPP_SNIPPETS], defaultRange),
            };
        },
    });

    // ------------------------------------------------------------------
    // Python
    // ------------------------------------------------------------------
    monaco.languages.registerCompletionItemProvider("python", {
        triggerCharacters: ["."],
        provideCompletionItems(model: Model, position: Position) {
            const before = linePrefix(model, position);
            const word = model.getWordUntilPosition(position);
            const defaultRange: Range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            if (/\w+\.$/.test(before)) {
                return {
                    suggestions: toMonaco(monaco, PY_BUILTINS, defaultRange),
                };
            }
            return {
                suggestions: toMonaco(
                    monaco,
                    [...pythonSuggestions(word.word), ...PY_SNIPPETS],
                    defaultRange,
                ),
            };
        },
    });

    // ------------------------------------------------------------------
    // JavaScript / Java
    // ------------------------------------------------------------------
    const simpleProvider = (
        select: (prefix: string) => Suggestion[],
    ) => ({
        provideCompletionItems(model: Model, position: Position) {
            const word = model.getWordUntilPosition(position);
            const defaultRange: Range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };
            return {
                suggestions: toMonaco(monaco, select(word.word), defaultRange),
            };
        },
    });

    monaco.languages.registerCompletionItemProvider("javascript", {
        triggerCharacters: ["."],
        provideCompletionItems(model: Model, position: Position) {
            const before = linePrefix(model, position);
            const word = model.getWordUntilPosition(position);
            const defaultRange: Range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };
            if (/\w+\.$/.test(before)) {
                return { suggestions: toMonaco(monaco, javascriptSuggestions(""), defaultRange) };
            }
            return simpleProvider(javascriptSuggestions).provideCompletionItems(
                model,
                position,
            );
        },
    });

    monaco.languages.registerCompletionItemProvider("java", {
        triggerCharacters: ["."],
        provideCompletionItems(model: Model, position: Position) {
            const before = linePrefix(model, position);
            const word = model.getWordUntilPosition(position);
            const defaultRange: Range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };
            if (/\w+\.$/.test(before)) {
                return { suggestions: toMonaco(monaco, javaSuggestions(""), defaultRange) };
            }
            return simpleProvider(javaSuggestions).provideCompletionItems(
                model,
                position,
            );
        },
    });
}
