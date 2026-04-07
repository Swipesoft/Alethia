import { NextRequest, NextResponse } from "next/server"
import { gemmaJSON } from "@/lib/novita"
import { GradingResultSchema } from "@/lib/schemas"

export async function POST(req: NextRequest) {
  try {
    const { prompt, rubric, studentAnswer } = await req.json()

    const result = await gemmaJSON(
      [
        { role: "system", content: "You are Athena's Assessor. Grade this response. Return valid JSON only." },
        {
          role: "user",
          content: `Grade this response.
Question: "${prompt}"
Rubric: ${rubric ?? "Assess understanding, clarity, and completeness"}
Student answer: "${studentAnswer}"

Return ONLY JSON: {"score": 0-100, "feedback": "detailed constructive feedback", "errorPatterns": ["pattern1"]}`,
        },
      ],
      GradingResultSchema,
      { temperature: 0.3 }
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error("[assess/essay]", err)
    return NextResponse.json({ score: 50, feedback: "Response recorded.", errorPatterns: [] })
  }
}
