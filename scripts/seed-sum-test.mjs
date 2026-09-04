#!/usr/bin/env node
/**
 * TEMP — seeds a "sum-two" problem with visible + hidden cases so the
 * multi-test judge path can be exercised. Delete after verification.
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = new ConvexHttpClient(url);

const cases = [
  { id: "v1", input: "2 7\n", expectedOutput: "9", isSample: true },
  { id: "v2", input: "10 20\n", expectedOutput: "30", isSample: true },
  { id: "v3", input: "-5 3\n", expectedOutput: "-2", isSample: true },
  { id: "h1", input: "100 200\n", expectedOutput: "300", isSample: false },
  { id: "h2", input: "0 0\n", expectedOutput: "0", isSample: false },
  { id: "h3", input: "7 8\n", expectedOutput: "15", isSample: false },
];

await client.mutation(api.problems.seedProblem, {
  slug: "sum-two",
  title: "Sum Any Two Numbers",
  difficulty: "easy",
  tags: ["math"],
  description:
    "Read two integers a and b from stdin and print their sum on a single line.\n\n**Input format** — one line with two space-separated integers.\n**Output format** — the integer a + b.",
  constraints: ["-10^9 <= a, b <= 10^9"],
  timeLimitMs: 2000,
  memoryLimitMb: 256,
  examples: [
    { id: "ex-1", input: "2 7", output: "9", explanation: "2 + 7 = 9." },
  ],
  testCases: cases,
  supportedLanguages: ["cpp", "python", "javascript", "java"],
});
console.log("Seeded sum-two with", cases.length, "test cases");