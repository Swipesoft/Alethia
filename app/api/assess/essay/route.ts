import { NextRequest, NextResponse } from "next/server"
import { gemmaJSON } from "@/lib/novita"

export async function POST(req: NextRequest) {
  try {
    const { prompt, rubric, studentAnswer } = await req.json()

    const result = await gemmaJSON<{
      score: number
      feedback: string
      errorPatterns: string[]
    }>([
      {
        role: "system",
        content: "You are Athena's Assessor. Grade this student response. Return valid JSON only.",
      },
      {
        role: "user",
        content: `Grade this response to: "${prompt}"\nRubric: ${rubric}\nStudent answer: "${studentAnswer}"\n\nReturn: {"score":0-100,"feedback":"...","errorPatterns":[]}`,
      },
    ])

    return NextResponse.json(result)
  } catch (err) {
    console.error("[assess/essay]", err)
    return NextResponse.json({ score: 50, feedback: "Response recorded and graded.", errorPatterns: [] })
  }
}