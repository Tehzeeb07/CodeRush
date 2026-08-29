/**
 * Static completion dictionaries for C++ and Python.
 */

import { CK, prefixMatches, type Suggestion } from "./completion-shared";

// ---------------------------------------------------------------------------
// C++
// ---------------------------------------------------------------------------

export const CPP_KEYWORDS = [
    "auto", "bool", "break", "case", "catch", "char", "class", "const",
    "continue", "default", "delete", "do", "double", "else", "enum", "false",
    "float", "for", "if", "int", "long", "namespace", "new", "nullptr",
    "private", "public", "return", "short", "sizeof", "static", "struct",
    "switch", "template", "throw", "true", "try", "typedef", "typename",
    "union", "unsigned", "using", "virtual", "void", "while",
];

export const CPP_STD_MEMBERS: Suggestion[] = [
    { label: "cout", insertText: "cout << $0 << endl;", kind: CK.VARIABLE, detail: "std::cout — standard output stream" },
    { label: "cin", insertText: "cin >> $0;", kind: CK.VARIABLE, detail: "std::cin — standard input stream" },
    { label: "string", insertText: "string$0", kind: CK.CLASS, detail: "std::string" },
    { label: "vector<T>", insertText: "vector<${1:T}> ${2:v};$0", kind: CK.CLASS, detail: "std::vector — dynamic array" },
    { label: "map<K,V>", insertText: "map<${1:K}, ${2:V}> ${3:m};$0", kind: CK.CLASS, detail: "std::map — ordered map" },
    { label: "unordered_map<K,V>", insertText: "unordered_map<${1:K}, ${2:V}> ${3:m};$0", kind: CK.CLASS, detail: "std::unordered_map — hash map" },
    { label: "set<T>", insertText: "set<${1:T}> ${2:s};$0", kind: CK.CLASS, detail: "std::set — ordered set" },
    { label: "pair<A,B>", insertText: "pair<${1:A}, ${2:B}>$0", kind: CK.CLASS, detail: "std::pair" },
    { label: "priority_queue<T>", insertText: "priority_queue<${1:T}> ${2:pq};$0", kind: CK.CLASS, detail: "max-heap" },
    { label: "sort(v.begin(), v.end())", insertText: "sort(${1:v}.begin(), ${1:v}.end());$0", kind: CK.METHOD, detail: "sort a range ascending" },
    { label: "reverse(v.begin(), v.end())", insertText: "reverse(${1:v}.begin(), ${1:v}.end());$0", kind: CK.METHOD, detail: "reverse a range" },
    { label: "max(a, b)", insertText: "max(${1:a}, ${2:b})$0", kind: CK.METHOD, detail: "larger of two values" },
    { label: "min(a, b)", insertText: "min(${1:a}, ${2:b})$0", kind: CK.METHOD, detail: "smaller of two values" },
    { label: "abs(x)", insertText: "abs(${1:x})$0", kind: CK.METHOD, detail: "absolute value" },
    { label: "swap(a, b)", insertText: "swap(${1:a}, ${2:b});$0", kind: CK.METHOD, detail: "exchange values" },
    { label: "endl", insertText: "endl", kind: CK.KEYWORD, detail: "newline + flush" },
];

/** Main C++ suggestion list (keywords). std:: handled separately below. */
export function cppSuggestions(prefix: string): Suggestion[] {
    return CPP_KEYWORDS.filter((k) => prefixMatches(prefix, k)).map((k) => ({
        label: k,
        insertText: k,
        kind: CK.KEYWORD,
        detail: "C++ keyword",
    }));
}

/** C++ main() snippet offered when typing `main`. */
export const CPP_SNIPPETS: Suggestion[] = [
    {
        label: "main scaffold",
        insertText:
            "int main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    $0\n\n    return 0;\n}",
        kind: CK.SNIPPET,
        detail: "competitive-programming main() with fast I/O",
    },
];
