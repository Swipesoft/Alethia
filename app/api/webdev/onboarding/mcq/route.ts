import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { gemmaJSON } from "@/lib/novita"
import type { WebDevInterest } from "@/lib/types-webdev"

export const runtime = "nodejs"
export const maxDuration = 60

const MCQSchema = z.object({
  questions: z.array(z.object({
    id:           z.string(),
    question:     z.string().min(10),
    options:      z.tuple([z.string(), z.string(), z.string(), z.string()]),
    correctIndex: z.number().int().min(0).max(3),
    explanation:  z.string().min(10),
    difficulty:   z.enum(["easy", "medium", "hard"]),
    topic:        z.string(),
  })).length(8),
})

const INTEREST_LABELS: Record<WebDevInterest, string> = {
  ui_design:     "visual design, typography, and CSS layout",
  interactivity: "DOM manipulation, events, and user interaction",
  components:    "reusable component design and composition",
  data_driven:   "rendering dynamic data and API integration",
}

export async function POST(req: NextRequest) {
  try {
    const { interest } = await req.json() as { interest: WebDevInterest }
    if (!interest) return NextResponse.json({ error: "interest required" }, { status: 400 })

    const result = await gemmaJSON(
      [
        {
          role: "system",
          content: "You are Athena's frontend proficiency assessor. Generate MCQ questions testing web development knowledge. Return valid JSON only.",
        },
        {
          role: "user",
          content: `Generate 8 multiple-choice questions assessing frontend web development knowledge for a student interested in ${INTEREST_LABELS[interest]}.

Distribution: 3 easy, 3 medium, 2 hard.

Cover these topics (mix them):
- HTML: semantic elements, attributes, forms, accessibility
- CSS: box model, flexbox, grid, selectors, specificity, variables
- JavaScript: DOM API, events, array methods, async/await, fetch
- React: components, props, useState, useEffect, JSX rules
- ${INTEREST_LABELS[interest]} specific concepts

Rules:
- ONE correct answer per question
- All 4 options must be plausible
- Use code snippets where helpful (backticks inline)
- correctIndex is 0-based

Return ONLY:
{
  "questions": [
    {
      "id": "q1",
      "question": "<question>",
      "options": ["A", "B", "C", "D"],
      "correctIndex": <0-3>,
      "explanation": "<why correct>",
      "difficulty": "easy|medium|hard",
      "topic": "<topic>"
    }
  ]
}`,
        },
      ],
      MCQSchema,
      { temperature: 0.7 }
    )

    return NextResponse.json({ questions: result.questions })
  } catch (err) {
    console.error("[webdev/mcq]", err)
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
  }
}
