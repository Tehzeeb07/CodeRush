"use client";

/**
 * Custom stdin input panel for the code editor.
 */

export interface InputPanelProps {
    value: string;
    onChange: (value: string) => void;
}

export default function InputPanel({ value, onChange }: InputPanelProps) {
    return (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Custom Input (stdin)
                </h2>
                {value.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        className="text-xs text-neutral-500 transition-colors hover:text-neutral-300"
                    >
                        Clear
                    </button>
                )}
            </div>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Provide input your program will read from stdin…"
                spellCheck={false}
                rows={3}
                className="w-full resize-y bg-transparent px-4 py-3 font-mono text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
            />
        </div>
    );
}