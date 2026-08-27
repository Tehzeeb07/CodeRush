/**
 * Static completion dictionaries for Python and JavaScript/Java.
 */

import { CK, prefixMatches, type Suggestion } from "./completion-shared";

// ---------------------------------------------------------------------------
// Python
// ---------------------------------------------------------------------------

const PY_KEYWORDS = [
    "and", "as", "assert", "break", "class", "continue", "def", "del",
    "elif", "else", "except", "False", "finally", "for", "from", "global",
    "if", "import", "in", "is", "lambda", "None", "nonlocal", "not", "or",
    "pass", "raise", "return", "True", "try", "while", "with", "yield",
];

export const PY_BUILTINS: Suggestion[] = [
    { label: "print(...)", insertText: "print($0)", kind: CK.METHOD, detail: "print values to stdout" },
    { label: "input()", insertText: "input()$0", kind: CK.METHOD, detail: "read one line from stdin" },
    { label: "int(x)", insertText: "int(${1:x})$0", kind: CK.METHOD, detail: "convert to integer" },
    { label: "float(x)", insertText: "float(${1:x})$0", kind: CK.METHOD, detail: "convert to float" },
    { label: "len(obj)", insertText: "len(${1:obj})$0", kind: CK.METHOD, detail: "length of a sequence" },
    { label: "range(stop)", insertText: "range(${1:n})$0", kind: CK.METHOD, detail: "integer range 0..n-1" },
    { label: "sorted(iterable)", insertText: "sorted(${1:iterable})$0", kind: CK.METHOD, detail: "returns sorted list" },
    { label: "map(fn, iterable)", insertText: "map(${1:fn}, ${2:iterable})$0", kind: CK.METHOD, detail: "apply fn over elements" },
    { label: "abs(x)", insertText: "abs(${1:x})$0", kind: CK.METHOD, detail: "absolute value" },
    { label: "sum(iterable)", insertText: "sum(${1:iterable})$0", kind: CK.METHOD, detail: "total of numbers" },
    { label: "min(...)", insertText: "min(${1:args})$0", kind: CK.METHOD, detail: "smallest item" },
    { label: "max(...)", insertText: "max(${1:args})$0", kind: CK.METHOD, detail: "largest item" },
    { label: "enumerate(iterable)", insertText: "enumerate(${1:it})$0", kind: CK.METHOD, detail: "(index, value) pairs" },
    { label: "list.append(x)", insertText: "append($0)", kind: CK.METHOD, detail: "add item to end" },
    { label: "list.sort()", insertText: "sort()$0", kind: CK.METHOD, detail: "in-place sort" },
    { label: "dict.get(k)", insertText: "get(${1:key}${2:, default})$0", kind: CK.METHOD, detail: "value or default" },
    { label: "str.split(sep)", insertText: "split(${1:sep})$0", kind: CK.METHOD, detail: "split into tokens" },
    { label: "str.join(seq)", insertText: "join(${1:seq})$0", kind: CK.METHOD, detail: "concatenate sequence" },
    { label: "str.strip()", insertText: "strip()$0", kind: CK.METHOD, detail: "trim whitespace" },
];

// ---------------------------------------------------------------------------
// JavaScript (Node)
// ---------------------------------------------------------------------------

const JS_KEYWORDS = [
    "async", "await", "break", "case", "catch", "class", "const",
    "continue", "default", "do", "else", "export", "extends", "finally",
    "for", "function", "if", "import", "in", "instanceof", "let", "new",
    "null", "of", "return", "switch", "this", "throw", "true", "false",
    "try", "typeof", "undefined", "var", "while",
];

const JS_ITEMS: Suggestion[] = [
    { label: "console.log(...)", insertText: "console.log($0)", kind: CK.METHOD, detail: "print to stdout" },
    { label: "JSON.parse(text)", insertText: "JSON.parse(${1:text})$0", kind: CK.METHOD, detail: "string → value" },
    { label: "JSON.stringify(value)", insertText: "JSON.stringify(${1:value})$0", kind: CK.METHOD, detail: "value → string" },
    { label: "Number.parseInt(s)", insertText: "parseInt(${1:s})$0", kind: CK.METHOD, detail: "parse integer" },
    { label: "Array.isArray(v)", insertText: "Array.isArray(${1:v})$0", kind: CK.METHOD, detail: "type check" },
    { label: "arr.map(fn)", insertText: "map((${1:x}) => ${2})$0", kind: CK.METHOD, detail: "transform elements" },
    { label: "arr.filter(fn)", insertText: "filter((${1:x}) => ${2})$0", kind: CK.METHOD, detail: "keep matching elements" },
    { label: "arr.reduce(fn, init)", insertText: "reduce((${1:acc}, ${2:x}) => ${3}, ${4:0})$0", kind: CK.METHOD, detail: "fold to single value" },
    { label: "arr.sort()", insertText: "sort((${1:a}, ${2:b}) => ${3:a - b})$0", kind: CK.METHOD, detail: "numeric sort" },
    { label: "readFileSync(0, 'utf8')", insertText: "require(\"fs\").readFileSync(0, \"utf8\")$0", kind: CK.METHOD, detail: "read all stdin" },
    { label: "Math.max(...)", insertText: "Math.max(${1:...args})$0", kind: CK.METHOD, detail: "largest number" },
    { label: "Math.min(...)", insertText: "Math.min(${1:...args})$0", kind: CK.METHOD, detail: "smallest number" },
];

export function javascriptSuggestions(prefix: string): Suggestion[] {
    return [
        ...JS_KEYWORDS.filter((k) => prefixMatches(prefix, k)).map(
            (k): Suggestion => ({
                label: k,
                insertText: k,
                kind: CK.KEYWORD,
                detail: "JavaScript keyword",
            }),
        ),
        ...JS_ITEMS.filter((s) => prefixMatches(prefix, s.label)),
    ];
}

// ---------------------------------------------------------------------------
// Java
// ---------------------------------------------------------------------------

const JAVA_KEYWORDS = [
    "abstract", "boolean", "break", "byte", "case", "catch", "char",
    "class", "continue", "default", "do", "double", "else", "enum",
    "extends", "final", "finally", "float", "for", "if", "implements",
    "import", "instanceof", "int", "interface", "long", "new", "null",
    "package", "private", "protected", "public", "return", "short",
    "static", "super", "switch", "synchronized", "this", "throw", "throws",
    "true", "false", "try", "void", "while", "var",
];

const JAVA_ITEMS: Suggestion[] = [
    { label: "System.out.println(...)", insertText: "System.out.println($0);", kind: CK.METHOD, detail: "print line to stdout" },
    { label: "System.out.printf(...)", insertText: "System.out.printf($0);", kind: CK.METHOD, detail: "formatted output" },
    { label: "Scanner scan", insertText: "Scanner ${1:sc} = new Scanner(System.in);$0", kind: CK.SNIPPET, detail: "stdin scanner" },
    { label: "Integer.parseInt(s)", insertText: "Integer.parseInt(${1:s})$0", kind: CK.METHOD, detail: "string → int" },
    { label: "Long.parseLong(s)", insertText: "Long.parseLong(${1:s})$0", kind: CK.METHOD, detail: "string → long" },
    { label: "String.valueOf(x)", insertText: "String.valueOf(${1:x})$0", kind: CK.METHOD, detail: "value → string" },
    { label: "new ArrayList<>()", insertText: "new ArrayList<${1:T}>()$0", kind: CK.CLASS, detail: "dynamic list" },
    { label: "new HashMap<>()", insertText: "new HashMap<${1:K}, ${2:V}>()$0", kind: CK.CLASS, detail: "hash map" },
    { label: "Arrays.sort(a)", insertText: "Arrays.sort(${1:a});$0", kind: CK.METHOD, detail: "sort array/collection" },
    { label: "Collections.sort(list)", insertText: "Collections.sort(${1:list});$0", kind: CK.METHOD, detail: "sort list" },
];

export function javaSuggestions(prefix: string): Suggestion[] {
    return [
        ...JAVA_KEYWORDS.filter((k) => prefixMatches(prefix, k)).map(
            (k): Suggestion => ({
                label: k,
                insertText: k,
                kind: CK.KEYWORD,
                detail: "Java keyword",
            }),
        ),
        ...JAVA_ITEMS.filter((s) => prefixMatches(prefix, s.label)),
    ];
}


export function pythonSuggestions(prefix: string): Suggestion[] {
    const kw = PY_KEYWORDS.filter((k) => prefixMatches(prefix, k)).map(
        (k): Suggestion => ({
            label: k,
            insertText: k,
            kind: CK.KEYWORD,
            detail: "Python keyword",
        }),
    );
    return [
        ...kw,
        ...PY_BUILTINS.filter((s) => prefixMatches(prefix, s.label)),
    ];
}

export const PY_SNIPPETS: Suggestion[] = [
    {
        label: "solve scaffold",
        insertText:
            "def solve():\n    ${1:...}\n\nif __name__ == \"__main__\":\n    solve()",
        kind: CK.SNIPPET,
        detail: "typical CodeRush Python structure",
    },
];
