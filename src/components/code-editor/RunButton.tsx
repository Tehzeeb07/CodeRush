"use client";

/**
 * Primary "Run Code" button with loading/disabled states.
 */

export interface RunButtonProps {
    onClick: () => void;
    running: boolean;
    disabled?: boolean;
}

export default function RunButton({
    onClick,
    running,
    disabled = false,
}: RunButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={running || disabled}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
        >
            {running ? (
                <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
                    Running…
                </>
            ) : (
                <>
                    <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                    >
                        <path d="M4 2.5v11l9-5.5-9-5.5z" />
                    </svg>
                    Run Code
                </>
            )}
        </button>
    );
}