import { NextRequest, NextResponse } from "next/server"
import { gemmaJSON } from "@/lib/novita"
import { AssessmentQuestionsSchema } from "@/lib/schemas"

export async function POST(req: NextRequest) {
  try {
    const { faculty, topic, objectives, assessmentType, assessmentEnvironment } = await req.json()

    const prompt = `Generate 3 assessment questions for: "${topic}" (${faculty} faculty).
Assessment environment: ${assessmentEnvironment}
Objectives: ${objectives.join(", ")}

Return ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "questionId": "q1",
      "prompt": "Question text",
      "type": "${assessmentType}",
      "starterCode": "# starter code (for code_execution only)",
      "options": ["A","B","C","D"],
      "correctIndex": 0,
      "rubric": "Grading criteria"
    }
  ]
}`

    const result = await gemmaJSON(
      [
        { role: "system", content: "You are Athena's Assessor. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      AssessmentQuestionsSchema,
      { temperature: 0.3 }
    )

    return NextResponse.json({ questions: result.questions })
  } catch (err) {
    console.error("[assess/questions]", err)
    return NextResponse.json({ questions: [] }, { status: 500 })
  }
}
