// Shared types for the CodeRush Analytics dashboard. These mirror the shape
// returned by convex/analytics.ts (api.analytics.getAnalytics).

export type AnalyticsRange = "7d" | "30d" | "3m" | "6m" | "1y" | "all";

export interface Kpis {
    problemsSolved: number;
    solvesDelta: number;
    acceptanceRate: number;
    acceptanceDelta: number;
    totalSubmissions: number;
    submissionsDelta: number;
    currentStreak: number;
    longestStreak: number;
    totalXp: number;
    xpDelta: number;
}

export interface DifficultyBucket {
    difficulty: "easy" | "medium" | "hard" | "practice";
    solved: number;
    percent: number;
}

export interface LanguageShare {
    language: string;
    total: number;
    accepted: number;
    percent: number;
}

export interface HeatCell {
    iso: string;
    ts: number;
    count: number;
    accepted: number;
    rejected: number;
}

export interface Skill {
    name: string;
    solved: number;
    total: number;
    percent: number;
}

export interface RecentItem {
    status: string;
    language: string;
    executionTime: number | null;
    createdAt: number;
    problemId: string | null;
}

export interface Milestone {
    target: number;
    label: string;
    achieved: boolean;
    isNext: boolean;
}

export interface AnalyticsData {
    range: AnalyticsRange;
    hasSubmissions: boolean;
    kpis: Kpis;
    problems: DifficultyBucket[];
    languages: LanguageShare[];
    languagesTotal: number;
    heatmap: HeatCell[];
    performance: {
        labels: string[];
        acceptance: number[];
        problems: number[];
        submissions: number[];
        runtime: number[];
        xp: number[];
    };
    skills: Skill[];
    recent: RecentItem[];
    insights: { icon: string; text: string }[];
    milestones: {
        stones: Milestone[];
        solved: number;
        next: { target: number; label: string } | null;
        remaining: number;
        percent: number;
    };
    allTimeTotals: {
        problemsSolved: number;
        submissions: number;
        successful: number;
        failed: number;
        points: number;
        profileXp: number;
    };
}

export const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "3m", label: "3 Months" },
    { value: "6m", label: "6 Months" },
    { value: "1y", label: "1 Year" },
    { value: "all", label: "All Time" },
];

/** Human-readable labels + a stable brand color per language id. */
export const LANGUAGE_STYLE: Record<string, { label: string; color: string; soft: string }> = {
    javascript: { label: "JavaScript", color: "#eab308", soft: "rgba(234,179,8,0.16)" },
    python: { label: "Python", color: "#38bdf8", soft: "rgba(56,189,248,0.16)" },
    cpp: { label: "C++", color: "#818cf8", soft: "rgba(129,140,248,0.16)" },
    java: { label: "Java", color: "#f97316", soft: "rgba(249,115,22,0.16)" },
};

export function languageLabel(id: string): string {
    return LANGUAGE_STYLE[id]?.label ?? id;
}

export function languageColor(id: string): string {
    return LANGUAGE_STYLE[id]?.color ?? "#94a3b8";
}

export function formatNumber(n: number): string {
    return n.toLocaleString("en-US");
}