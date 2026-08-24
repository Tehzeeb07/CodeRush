/**
 * Minimal in-memory, per-IP sliding-window rate limiter for the
 * execute endpoint. Protects the sandbox from request floods without
 * external dependencies.
 *
 * Note: state is per server instance; use a shared store (e.g. Redis)
 * if you scale horizontally.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;

interface Bucket {
    timestamps: number[];
}

const buckets = new Map<string, Bucket>();

/** Returns true when the request is allowed. */
export function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const bucket = buckets.get(key) ?? { timestamps: [] };

    // Drop entries outside the current window.
    bucket.timestamps = bucket.timestamps.filter(
        (ts) => now - ts < WINDOW_MS,
    );

    if (bucket.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        buckets.set(key, bucket);
        return false;
    }

    bucket.timestamps.push(now);
    buckets.set(key, bucket);

    // Opportunistic cleanup so the map cannot grow unbounded.
    if (buckets.size > 10_000) {
        for (const [k, v] of buckets) {
            if (v.timestamps.every((ts) => now - ts >= WINDOW_MS)) {
                buckets.delete(k);
            }
        }
    }

    return true;
}