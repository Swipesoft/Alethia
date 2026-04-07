import { NextRequest, NextResponse } from "next/server"
import { gemmaJSON } from "@/lib/novita"
import { getStudent, completeClassworkAndAdvanceSequence, logEvent } from "@/lib/firestore"

export async function POST(req: NextRequest) {
  try {
    const { studentId, moduleId, classworkId, studentAnswer, executionResult } = await req.json()

    const profile = await getStudent(studentId)
    if (!profile) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const module = profile.curriculum.find((m) => m.moduleId === moduleId)
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    const classwork = module.classworks?.find((cw) => cw.classworkId === classworkId)
    if (!classwork) {
      return NextResponse.json({ error: "Classwork not found" }, { status: 404 })
    }

    let score = 0
    let feedback = ""

    if (classwork.assessmentType === "mcq") {
      const selectedIdx = parseInt(studentAnswer ?? "-1")
      score = selectedIdx === classwork.correctIndex ? 100 : 0
      feedback = score === 100
        ? "Correct! Well done."
        : `Incorrect. The correct answer was option ${["A", "B", "C", "D"][classwork.correctIndex ?? 0]}.`
    } else if (classwork.assessmentType === "code_execution" && executionResult) {
      // Grade using execution result from Judge0 (already run on client)
      const gradingResult = await gemmaJSON<{ score: number; feedback: string }>([
        { role: "system", content: "You are Athena's Assessor grading a classwork submission. Return JSON only." },
        {
          role: "user",
          content: `Grade this classwork submission.

Task: ${classwork.prompt}
Classwork Type: ${classwork.classworkType}
${classwork.demonstrationCode ? `Tutor's demonstration: ${classwork.demonstrationCode}` : ""}

Student's code:
${studentAnswer}

Execution result: ${JSON.stringify(executionResult)}
Rubric: ${classwork.rubric ?? "Assess correctness, code quality, and understanding"}

For collaborative classwork, be generous — the goal is learning, not perfection.
For demonstrate_then_replicate, check if they correctly replicated the pattern.
For socratic, check if they showed understanding through their reasoning.

Return ONLY JSON: {"score": 0-100, "feedback": "constructive detailed feedback"}`,
        },
      ], { temperature: 0.3 })

      score = gradingResult.score ?? 0
      feedback = gradingResult.feedback ?? "Submission graded."
    } else {
      // Essay / collaborative
      const gradingResult = await gemmaJSON<{ score: number; feedback: string }>([
        { role: "system", content: "You are Athena's Assessor. Return JSON only." },
        {
          role: "user",
          content: `Grade this classwork response.

Task: ${classwork.prompt}
Classwork Type: ${classwork.classworkType}
Student response: "${studentAnswer}"
Rubric: ${classwork.rubric ?? "Assess depth of understanding and quality of response"}

For collaborative classwork, award full marks for genuine engagement.
Return ONLY JSON: {"score": 0-100, "feedback": "..."}`,
        },
      ], { temperature: 0.3 })

      score = gradingResult.score ?? 70
      feedback = gradingResult.feedback ?? "Response recorded."
    }

    await completeClassworkAndAdvanceSequence(
      studentId,
      moduleId,
      classworkId,
      score,
      feedback,
      studentAnswer
    )

    await logEvent({
      studentId,
      type: "classwork_completed",
      moduleId,
      timestamp: Date.now(),
      payload: { classworkId, classworkType: classwork.classworkType, score },
    })

    return NextResponse.json({ score, feedback })
  } catch (err) {
    console.error("[classwork/submit]", err)
    return NextResponse.json({ error: "Grading failed" }, { status: 500 })
  }
}
