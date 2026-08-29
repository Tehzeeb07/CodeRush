/**
 * POST /api/ai/explain-error — optional AI-assisted debugging help.
 *
 * Gemini-powered debugging assistant.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are CodeRush's debugging assistant for an online judge.

Rules:
1. The judge already reported deterministic diagnostics. Never contradict or re-invent them; build on them.
2. Clearly separate what is CERTAIN (compiler/runtime output) from what is a POSSIBLE cause (your analysis).
3. Explain concepts briefly; teach, do not lecture.
4. For competitive programming problems give HINTS about bugs or techniques, never a complete solution algorithm unless the user explicitly asks for the full fix of their own code.
5. Keep it under 250 words. Use short sections: What it means / Likely cause / How to debug.
6. Reply in plain text using "- " bullets where helpful.`;

export async function POST(request: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
        return NextResponse.json({ available: false });
    }

    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid request body." },
            { status: 400 },
        );
    }

    const {
        language,
        errorTitle,
        rawMessage,
        line,
        codeExcerpt,
        problemContext,
        mode = "explain",
    } = (body ?? {}) as Record<string, unknown>;

    if (
        typeof language !== "string" ||
        typeof errorTitle !== "string" ||
        typeof rawMessage !== "string"
    ) {
        return NextResponse.json(
            {
                error:
                    "Missing required fields: language, errorTitle, rawMessage.",
            },
            { status: 400 },
        );
    }

    const actionInstruction =
        mode === "hint"
            ? "TASK: Provide a targeted pedagogical hint without giving away the full algorithm solution. Focus on what invariants, edge cases, or logic conditions might have gone wrong."
            : mode === "fix"
                ? "TASK: Suggest how the user can safely fix the specific syntax or runtime issue in their code snippet, with a brief code example if appropriate."
                : "TASK: Explain what the error means, why it happened, and the key programming concept the user should understand.";

    const userPrompt = [
        actionInstruction,
        `Language: ${language}`,
        `Error: ${errorTitle}`,
        typeof line === "number" ? `Location: line ${line}` : null,
        `Raw toolchain output (may be truncated):\n${rawMessage.slice(0, 2000)}`,

        typeof codeExcerpt === "string" && codeExcerpt.length > 0
            ? `Relevant code excerpt:\n\`\`\`\n${codeExcerpt.slice(0, 1500)}\n\`\`\``
            : null,

        typeof problemContext === "string" && problemContext.length > 0
            ? `Problem context (title only): ${problemContext}`
            : null,
    ]
        .filter(Boolean)
        .join("\n\n");

    try {
        const ai = new GoogleGenAI({
            apiKey,
        });

        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
        });

        const explanation = response.text?.trim() ?? "";

        return NextResponse.json({
            available: true,
            explanation:
                explanation.length > 0
                    ? explanation
                    : "No explanation was returned.",
        });
    } catch (err) {
        console.error("[ai-explain] Gemini request failed:", err);

        return NextResponse.json(
            {
                available: true,
                error: "Could not reach the Gemini AI service.",
            },
            { status: 502 },
        );
    }
}