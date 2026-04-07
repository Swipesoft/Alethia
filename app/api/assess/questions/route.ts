import { NextRequest, NextResponse } from "next/server"
import { gemmaJSON } from "@/lib/novita"
import type { AssessmentQuestion } from "@/lib/types"

export async function POST(req: NextRequest) {
  try {
    const { faculty, topic, objectives, assessmentType, assessmentEnvironment } = await req.json()

    const prompt = `Generate 3 assessment questions for: "${topic}" (${faculty} faculty).
Assessment environment: ${assessmentEnvironment}
Objectives: ${objectives.join(", ")}

Return ONLY JSON:
{
  "questions": [
    {
      "questionId": "q1",
      "prompt": "Question text",
      "type": "${assessmentType}",
      "starterCode": "# starter code (only for code_execution type)",
      "options": ["A","B","C","D"],
      "correctIndex": 0,
      "rubric": "Grading rubric"
    }
  ]
}`

    const result = await gemmaJSON<{ questions: AssessmentQuestion[] }>([
      { role: "system", content: "You are Athena's Assessor. Return valid JSON only." },
      { role: "user", content: prompt },
    ])

    return NextResponse.json({ questions: result.questions ?? [] })
  } catch (err) {
    console.error("[assess/questions]", err)
    return NextResponse.json({ questions: [] }, { status: 500 })
  }
}