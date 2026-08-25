"use client";

/**
 * Shared loading / error UI primitives used by the leaderboard and
 * bookmarks pages so both feature areas behave consistently while
 * Convex queries are in flight or fail.
 */

import { Component, type ReactNode } from "react";

export function SkeletonRow({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded bg-neutral-800 ${className}`} />;
}

export function SkeletonCard() {
    return (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <SkeletonRow className="mb-3 h-4 w-1/3" />
            <SkeletonRow className="mb-2 h-3 w-1/2" />
            <SkeletonRow className="h-3 w-1/4" />
        </div>
    );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }, (_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

/** Friendly full-section fallback when a query/render fails. */
export class UiErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: unknown) {
        // Details stay in the console; users see a friendly message only.
        console.error("[coderush] UI error:", error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="rounded-lg border border-red-900 bg-red-950/40 p-6 text-center">
                    <p className="text-sm text-red-200">
                        Something went wrong while loading this section.
                    </p>
                    <button
                        type="button"
                        onClick={() => this.setState({ hasError: false })}
                        className="mt-3 rounded-md border border-red-700 px-4 py-1.5 text-sm text-red-100 transition-colors hover:border-red-500"
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
