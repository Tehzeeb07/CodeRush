"use client";

/**
 * Dropdown for choosing the active programming language.
 * Options are driven entirely by the centralized language registry.
 */

import { LANGUAGE_LIST } from "@/lib/code-execution/languages";
import type { LanguageId } from "@/lib/code-execution/types";

export interface LanguageSelectorProps {
    value: LanguageId;
    onChange: (language: LanguageId) => void;
    disabled?: boolean;
}

export default function LanguageSelector({
    value,
    onChange,
    disabled = false,
}: LanguageSelectorProps) {
    return (
        <label className="flex items-center gap-2 text-sm text-neutral-400">
            <span className="hidden sm:inline">Language</span>
            <select
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value as LanguageId)}
                className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 outline-none transition-colors hover:border-neutral-600 focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {LANGUAGE_LIST.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                        {lang.label}
                    </option>
                ))}
            </select>
        </label>
    );
}