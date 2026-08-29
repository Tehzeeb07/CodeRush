#!/usr/bin/env node
/**
 * Seeds judged coding problems into Convex (one-time bootstrap).
 *
 * Usage:
 *   NEXT_PUBLIC_CONVEX_URL=https://... node scripts/seed-problems.mjs
 *
 * The `seedProblems` mutation is idempotent: seeding only proceeds when
 * the problems table is empty or a valid JUDGE_SECRET is provided.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!url) {
    console.error("Set NEXT_PUBLIC_CONVEX_URL to your Convex deployment.");
    process.exit(1);
}

const problems = [
    {
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "easy",
        tags: ["arrays", "hash-map"],
        description: [
            "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to the target.",
            "",
            "You may assume that each input has exactly one solution, and you may not use the same element twice.",
            "",
            "**Input format** — first line contains n and target; second line contains n space-separated integers.",
            "**Output format** — print the two 0-based indices separated by one space.",
        ].join("\n"),
        constraints: [
            "2 <= n <= 10^4",
            "-10^9 <= nums[i] <= 10^9",
            "Exactly one valid answer exists.",
        ],
        timeLimitMs: 5000,
        memoryLimitMb: 256,
        examples: [
            {
                id: "ex-1",
                input: "4 9\n2 7 11 15",
                output: "0 1",
                explanation: "nums[0] + nums[1] = 2 + 7 = 9.",
            },
        ],
        testCases: [
            { id: "t1", input: "4 9\n2 7 11 15\n", expectedOutput: "0 1", isSample: true },
            { id: "t2", input: "3 6\n3 2 4\n", expectedOutput: "1 2", isSample: true },
            { id: "t3", input: "3 6\n3 3 5\n", expectedOutput: "0 1", isSample: false },
            { id: "t4", input: "2 -8\n-3 -5\n", expectedOutput: "0 1", isSample: false },
            { id: "t5", input: "5 100\n50 50 1 2 3\n", expectedOutput: "0 1", isSample: true },
            { id: "t6", input: "4 0\n-1 -3 4 5\n", expectedOutput: "0 1", isSample: false },
        ],
    },
    {
        slug: "reverse-words",
        title: "Reverse Words",
        difficulty: "easy",
        tags: ["strings"],
        description: [
            "Read all whitespace-separated words from stdin and print them in reverse order, separated by single spaces.",
            "",
            "**Input format** — one line containing up to 10^4 words.",
            "**Output format** — one line with the words reversed.",
        ].join("\n"),
        constraints: [
            "1 <= number of words <= 10^4",
            "Each word length <= 20 characters.",
        ],
        timeLimitMs: 3000,
        memoryLimitMb: 128,
        examples: [
            {
                id: "ex-1",
                input: "the quick brown fox",
                output: "fox brown quick the",
            },
        ],
        testCases: [
            { id: "t1", input: "the quick brown fox\n", expectedOutput: "fox brown quick the", isSample: true },
            { id: "t2", input: "hello\n", expectedOutput: "hello", isSample: true },
            { id: "t3", input: "a b c d e f g h\n", expectedOutput: "h g f e d c b a", isSample: false },
            { id: "t4", input: "  spaced   out   \n", expectedOutput: "out spaced", isSample: false },
            { id: "t5", input: "x y\n", expectedOutput: "y x", isSample: true },
        ],
    },
];

const client = new ConvexHttpClient(url);

try {
    const count = await client.query(api.problems.seedStatus, {});
    if (count > 0) {
        console.log(
            `Problems already seeded (${count} rows). Nothing to do.`,
        );
        process.exit(0);
    }

    for (const problem of problems) {
        await client.mutation(api.problems.seedProblem, problem);
        console.log(`Seeded ${problem.slug} (${problem.testCases.length} tests).`);
    }
    console.log("Done.");
} catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
}
