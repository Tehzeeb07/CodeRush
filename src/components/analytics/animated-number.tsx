"use client";

/**
 * AnimatedNumber — count-up transition for KPI figures.
 * Respects prefers-reduced-motion (falls back to an instant value).
 */

import { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
    if (typeof window === "undefined" || typeof matchMedia !== "function") return false;
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function AnimatedNumber({
    value,
    decimals = 0,
    suffix = "",
    duration = 800,
}: {
    value: number;
    decimals?: number;
    suffix?: string;
    duration?: number;
}) {
    const [display, setDisplay] = useState(value);
    const fromRef = useRef(0);

    useEffect(() => {
        let raf = 0;
        const reduced = prefersReducedMotion();
        const from = fromRef.current;
        const to = value;
        const start = performance.now();
        const total = reduced ? 1 : Math.max(1, duration);

        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / total);
            const eased = 1 - Math.pow(1 - t, 3);
            const next = reduced ? to : from + (to - from) * eased;
            fromRef.current = next;
            setDisplay(next);
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value, duration]);

    const formatted =
        decimals > 0
            ? display.toFixed(decimals)
            : Math.round(display).toLocaleString("en-US");

    return (
        <span>
            {formatted}
            {suffix}
        </span>
    );
}