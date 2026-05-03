import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { gemmaJSON } from "@/lib/novita"
import type { SoSELanguage, SoSEInterest } from "@/lib/types-sose"

export const runtime = "nodejs"
export const maxDuration = 60

const MCQSchema = z.object({
  questions: z.array(z.object({
    id:           z.string().min(1),
    question:     z.string().min(10),
    options:      z.tuple([z.string(), z.string(), z.string(), z.string()]),
    correctIndex: z.number().int().min(0).max(3),
    explanation:  z.string().min(10),
    difficulty:   z.enum(["easy", "medium", "hard"]),
    topic:        z.string().min(2),
  })).length(8),
})

const INTEREST_LABELS: Record<SoSEInterest, string> = {
  backend:    "backend development (APIs, servers, databases)",
  data_ml:    "data processing and machine learning",
  algorithms: "algorithms, data structures, and problem solving",
  automation: "scripting, automation, and CLI tools",
}

export async function POST(req: NextRequest) {
  try {
    const { language, interest } = await req.json() as {
      language: SoSELanguage
      interest: SoSEInterest
    }

    if (!language || !interest) {
      return NextResponse.json({ error: "language and interest required" }, { status: 400 })
    }

    const langLabel    = language === "python" ? "Python 3" : "JavaScript (Node.js)"
    const interestDesc = INTEREST_LABELS[interest] ?? interest

    const result = await gemmaJSON(
      [
        {
          role: "system",
          content:
            "You are Athena's programming proficiency assessor. Generate MCQ questions to test a student's theoretical programming knowledge. Return valid JSON only.",
        },
        {
          role: "user",
          content: `Generate 8 multiple-choice questions to assess ${langLabel} programming proficiency for a student interested in ${interestDesc}.

Question distribution:
- 3 easy (fundamental syntax, basic concepts)
- 3 medium (functions, OOP, common patterns)  
- 2 hard (advanced concepts, tricky edge cases)

Topics to cover (mix them):
- Variables, types, and operators
- Control flow (loops, conditionals)
- Functions (scope, default args, return values)
- Data structures (lists/arrays, dicts/objects, sets)
- OOP basics (classes, methods, inheritance) — skip for easy questions
- Error handling
- ${interestDesc} specific concept

Rules:
- Questions must have exactly ONE correct answer
- All 4 options must be plausible (no obviously wrong distractors)
- correctIndex is 0-based (0=A, 1=B, 2=C, 3=D)
- explanation explains WHY the correct answer is right
- Use short code snippets in questions where relevant (use backticks)

Return ONLY this JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "<question text>",
      "options": ["<A>", "<B>", "<C>", "<D>"],
      "correctIndex": <0-3>,
      "explanation": "<why the correct answer is right>",
      "difficulty": "easy|medium|hard",
      "topic": "<topic name>"
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
    console.error("[onboarding/mcq]", err)
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
  }
}
