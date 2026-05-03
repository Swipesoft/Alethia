import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  getWebDevWorkspace, getWebDevAssignment,
  createWebDevSubmission, updateWebDevSubmission,
} from "@/lib/firestore-webdev"
import { runPatternChecks } from "@/lib/webdev-generator"
import { gemmaJSON } from "@/lib/novita"

export const runtime = "nodejs"
export const maxDuration = 60

const GemmaReviewSchema = z.object({
  qualityScore:  z.number().int().min(0).max(60),
  designScore:   z.number().int().min(0).max(60),
  summary:       z.string().min(20),
  strengths:     z.array(z.string().min(5)).min(1).max(4),
  improvements:  z.array(z.string().min(5)).min(0).max(4),
  encouragement: z.string().min(10),
})

export async function POST(req: NextRequest) {
  let submissionId = ""

  try {
    const { workspaceId, studentId } = await req.json()
    if (!workspaceId || !studentId) {
      return NextResponse.json({ error: "workspaceId and studentId required" }, { status: 400 })
    }

    const workspace = await getWebDevWorkspace(workspaceId)
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    if (workspace.studentId !== studentId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const assignment = await getWebDevAssignment(workspace.assignmentId)
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })

    // Create submission
    const submission = await createWebDevSubmission(
      studentId, workspaceId, workspace.assignmentId, workspace.curriculumId
    )
    submissionId = submission.submissionId

    // ── 1. Pattern checks (40pts) ─────────────────────────────────────────────
    const patternResults = runPatternChecks(workspace.files, assignment.patternChecks)
    const patternScore   = patternResults.reduce((s, r) => s + r.score, 0)

    // ── 2. Gemma code review (60pts) ─────────────────────────────────────────
    const codeSnapshot = Object.entries(workspace.files)
      .map(([f, c]) => `\n// ===== ${f} =====\n${c}`)
      .join("\n")
      .slice(0, 4000)

    const passedPatterns  = patternResults.filter((r) => r.passed).map((r) => r.label)
    const failedPatterns  = patternResults.filter((r) => !r.passed).map((r) => r.label)
    const framework       = assignment.framework

    const review = await gemmaJSON(
      [
        {
          role: "system",
          content: "You are Athena's senior frontend engineering instructor. Grade the student's code. Return valid JSON only.",
        },
        {
          role: "user",
          content: `Grade this ${framework} frontend project: "${assignment.title}"

ASSIGNMENT:
${assignment.description.slice(0, 400)}

RUBRIC (use this to grade):
${assignment.gradingRubric}

STUDENT'S CODE:
${codeSnapshot}

AUTOMATED CHECKS ALREADY SCORED (40pts):
- Passed (${passedPatterns.length}): ${passedPatterns.join(", ") || "none"}
- Failed (${failedPatterns.length}): ${failedPatterns.join(", ") || "none"}

YOU ARE GRADING the remaining 60 points:
- qualityScore (0–35): code organisation, naming, structure, CSS quality, maintainability
- designScore (0–25): visual design decisions, UX choices, responsiveness approach, best practices

Write:
- summary: 2–3 specific sentences about this code (not generic)
- strengths: 2–3 concrete things done well
- improvements: 1–3 specific actionable fixes
- encouragement: 1 warm, specific sentence

Return ONLY:
{"qualityScore":<n>,"designScore":<n>,"summary":"<s>","strengths":["<s>"],"improvements":["<s>"],"encouragement":"<s>"}`,
        },
      ],
      GemmaReviewSchema,
      { temperature: 0 }
    )

    // ── 3. Final score ────────────────────────────────────────────────────────
    const qualityScore = Math.min(review.qualityScore, 35)
    const designScore  = Math.min(review.designScore, 25)
    const totalScore   = Math.min(100, patternScore + qualityScore + designScore)

    // ── 4. Persist ────────────────────────────────────────────────────────────
    await updateWebDevSubmission(submissionId, {
      status:         "complete",
      score:          totalScore,
      patternResults,
      qualityScore,
      designScore,
      summary:        review.summary,
      strengths:      review.strengths,
      improvements:   review.improvements,
      encouragement:  review.encouragement,
      gradedAt:       Date.now(),
    })

    return NextResponse.json({
      submissionId, score: totalScore,
      patternResults, qualityScore, designScore,
      summary: review.summary, strengths: review.strengths,
      improvements: review.improvements, encouragement: review.encouragement,
    })
  } catch (err) {
    console.error("[webdev/submit]", err)
    const message = err instanceof Error ? err.message : "Grading failed"
    if (submissionId) {
      await updateWebDevSubmission(submissionId, { status: "error", errorMessage: message }).catch(() => {})
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
