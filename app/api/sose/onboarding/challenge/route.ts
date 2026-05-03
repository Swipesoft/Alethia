import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { gemmaJSON } from "@/lib/novita"
import type { SoSELanguage, SoSEInterest } from "@/lib/types-sose"

export const runtime = "nodejs"
export const maxDuration = 60

const ChallengesSchema = z.object({
  challenges: z.array(z.object({
    id:          z.string().min(1),
    title:       z.string().min(5).max(60),
    description: z.string().min(20),
    starterCode: z.string().min(10),
    testCode:    z.string().min(10),
    difficulty:  z.enum(["easy", "medium"]),
  })).length(2),
})

export async function POST(req: NextRequest) {
  try {
    const { language, interest } = await req.json() as {
      language: SoSELanguage
      interest: SoSEInterest
    }

    const langLabel = language === "python" ? "Python 3" : "JavaScript"
    const ext       = language === "python" ? "py" : "js"
    const fnStyle   = language === "python"
      ? "def function_name(params):\n    # TODO\n    pass"
      : "function functionName(params) {\n    // TODO\n}"
    const testStyle = language === "python"
      ? 'print("PASS" if function_call == expected else "FAIL")'
      : 'console.log(functionCall === expected ? "PASS" : "FAIL")'

    const result = await gemmaJSON(
      [
        {
          role: "system",
          content:
            "You are Athena's coding challenge designer. Generate beginner-friendly coding challenges. Return valid JSON only.",
        },
        {
          role: "user",
          content: `Generate 2 short coding challenges in ${langLabel} to test basic programming ability.

Challenge 1: EASY (write a simple function from scratch)
Challenge 2: MEDIUM (debug/fix a function OR implement a slightly more complex function)

Rules:
- No imports or external libraries — use only built-in types and functions
- Each challenge = one function to implement or fix
- The starterCode shows the function signature with TODO body
- The testCode is appended to the student's solution and run as a single script
- testCode must print exactly "PASS" if correct, "FAIL" otherwise (nothing else)
- Test at least 3 cases including one edge case (empty, zero, negative, etc.)
- The challenges must be solvable in under 5 minutes

Test code pattern for ${langLabel}:
${testStyle}

Example starter code pattern:
${fnStyle}

Return ONLY this JSON:
{
  "challenges": [
    {
      "id": "c1",
      "title": "<short action title>",
      "description": "<2-3 sentences: what to implement, with input/output examples>",
      "starterCode": "<function signature + TODO body>",
      "testCode": "<appended to student code — must print PASS or FAIL>",
      "difficulty": "easy"
    },
    {
      "id": "c2",
      ...same shape...,
      "difficulty": "medium"
    }
  ]
}`,
        },
      ],
      ChallengesSchema,
      { temperature: 0.6 }
    )

    return NextResponse.json({ challenges: result.challenges })
  } catch (err) {
    console.error("[onboarding/challenge]", err)
    return NextResponse.json({ error: "Failed to generate challenges" }, { status: 500 })
  }
}
