import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { gemmaJSON } from "@/lib/novita"
import type { WebDevInterest } from "@/lib/types-webdev"

export const runtime = "nodejs"
export const maxDuration = 60

const ChallengeSchema = z.object({
  challenges: z.array(z.object({
    id:           z.string(),
    title:        z.string().min(5).max(60),
    description:  z.string().min(20),
    difficulty:   z.enum(["easy", "medium"]),
    starterFiles: z.record(z.string()),
    requirements: z.array(z.string().min(5)).min(2).max(5),
  })).length(2),
})

export async function POST(req: NextRequest) {
  try {
    const { interest } = await req.json() as { interest: WebDevInterest }

    const result = await gemmaJSON(
      [
        {
          role: "system",
          content: "You are Athena's frontend challenge designer. Return valid JSON only.",
        },
        {
          role: "user",
          content: `Generate 2 short HTML/CSS/JS coding challenges to assess basic frontend ability.

Challenge 1: EASY — style a given HTML structure (no JS needed)
Challenge 2: MEDIUM — add simple interactivity with vanilla JS

Interest context: ${interest}

Rules:
- Challenge 1: pure HTML + CSS only. Provide an index.html with some content, student must style it.
- Challenge 2: HTML + CSS + JS. Provide starter HTML, student must write JS to add behaviour.
- No React, no build tools, no imports — pure HTML/CSS/JS
- Keep it completable in 5 minutes
- requirements: 2-4 specific things the student must achieve

Sandpack file format — use "/" prefix for filenames.

Return ONLY:
{
  "challenges": [
    {
      "id": "c1",
      "title": "<title>",
      "description": "<2-3 sentences describing what to build>",
      "difficulty": "easy",
      "starterFiles": {
        "/index.html": "<complete HTML>",
        "/style.css": "/* TODO: style this page */",
        "/script.js": "// empty or minimal starter"
      },
      "requirements": ["<specific requirement>"]
    },
    {
      "id": "c2",
      ...same shape...
      "difficulty": "medium"
    }
  ]
}`,
        },
      ],
      ChallengeSchema,
      { temperature: 0.6 }
    )

    return NextResponse.json({ challenges: result.challenges })
  } catch (err) {
    console.error("[webdev/challenge]", err)
    return NextResponse.json({ error: "Failed to generate challenges" }, { status: 500 })
  }
}

// POST /api/webdev/onboarding/challenge/review — Gemma reviews student's submission
export async function PUT(req: NextRequest) {
  try {
    const { studentFiles, requirements } = await req.json() as {
      studentFiles: Record<string, string>
      requirements: string[]
    }

    const ReviewSchema = z.object({
      passed:   z.boolean(),
      score:    z.number().int().min(0).max(100),
      feedback: z.string().min(10),
    })

    const code = Object.entries(studentFiles)
      .map(([f, c]) => `\n// === ${f} ===\n${c}`)
      .join("\n")

    const result = await gemmaJSON(
      [
        {
          role: "system",
          content: "You are grading a student's frontend code submission. Return valid JSON only.",
        },
        {
          role: "user",
          content: `Grade this student's HTML/CSS/JS code.

REQUIREMENTS TO CHECK:
${requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}

STUDENT'S CODE:
${code.slice(0, 3000)}

Score 0-100 based on how well they met the requirements.
Pass threshold: 50.

Return ONLY:
{"passed": true/false, "score": <0-100>, "feedback": "<one sentence>"}`,
        },
      ],
      ReviewSchema,
      { temperature: 0 }
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error("[webdev/challenge/review]", err)
    return NextResponse.json({ passed: false, score: 0, feedback: "Review failed" }, { status: 500 })
  }
}
