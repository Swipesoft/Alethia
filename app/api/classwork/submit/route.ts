import { NextRequest, NextResponse } from "next/server"
import { gemmaJSON } from "@/lib/novita"
import { ClassworkGradingSchema } from "@/lib/schemas"
import { getStudent, completeClassworkAndAdvanceSequence, logEvent } from "@/lib/firestore"

export async function POST(req: NextRequest) {
  try {
    const { studentId, moduleId, classworkId, studentAnswer, executionResult } = await req.json()

    const profile = await getStudent(studentId)
    if (!profile) return NextResponse.json({ error: "Student not found" }, { status: 404 })

    const module = profile.curriculum.find((m) => m.moduleId === moduleId)
    if (!module) return NextResponse.json({ error: "Module not found" }, { status: 404 })

    const classwork = module.classworks?.find((cw) => cw.classworkId === classworkId)
    if (!classwork) return NextResponse.json({ error: "Classwork not found" }, { status: 404 })

    let score = 0
    let feedback = ""

    if (classwork.assessmentType === "mcq") {
      const selectedIdx = parseInt(studentAnswer ?? "-1")
      score = selectedIdx === classwork.correctIndex ? 100 : 0
      feedback = score === 100
        ? "Correct!"
        : `Incorrect. The correct answer was option ${["A","B","C","D"][classwork.correctIndex ?? 0]}.`
    } else {
      const gradingPrompt = classwork.assessmentType === "code_execution" && executionResult
        ? `Grade this classwork code submission.
Task: ${classwork.prompt}
Classwork Type: ${classwork.classworkType}
${classwork.demonstrationCode ? `Tutor demo: ${classwork.demonstrationCode}` : ""}
Student code: ${studentAnswer}
Execution: ${JSON.stringify(executionResult)}
Rubric: ${classwork.rubric ?? "Assess correctness and understanding"}
For collaborative: be generous — goal is learning. Return ONLY JSON: {"score":0-100,"feedback":"..."}`
        : `Grade this classwork response.
Task: ${classwork.prompt}
Type: ${classwork.classworkType}
Student response: "${studentAnswer}"
Rubric: ${classwork.rubric ?? "Assess depth of understanding"}
For collaborative: award full marks for genuine engagement. Return ONLY JSON: {"score":0-100,"feedback":"..."}`

      const result = await gemmaJSON(
        [
          { role: "system", content: "You are Athena's Assessor. Return valid JSON only." },
          { role: "user", content: gradingPrompt },
        ],
        ClassworkGradingSchema,
        { temperature: 0.3 }
      )
      score = result.score
      feedback = result.feedback ?? "Classwork complete."
    }

    await completeClassworkAndAdvanceSequence(studentId, moduleId, classworkId, score, feedback, studentAnswer)
    await logEvent({ studentId, type: "classwork_completed", moduleId, timestamp: Date.now(), payload: { classworkId, classworkType: classwork.classworkType, score } })

    return NextResponse.json({ score, feedback })
  } catch (err) {
    console.error("[classwork/submit]", err)
    return NextResponse.json({ error: "Grading failed" }, { status: 500 })
  }
}
