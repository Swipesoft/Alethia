export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { diagnoseWeaknesses, buildRemedialSequence } from "@/lib/reviewer"
import { getStudent, applyRemedialSequence, logEvent, updateCompetencyModel } from "@/lib/firestore"
import { sanitizeForFirestore } from "@/lib/firestore-utils"

export async function POST(req: NextRequest) {
  try {
    const { studentId, moduleId, moduleScore, errorPatterns } = await req.json()

    const profile = await getStudent(studentId)
    if (!profile) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const module = profile.curriculum.find((m) => m.moduleId === moduleId)
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    // Collect classwork scores for diagnostician
    const classworkScores = (module.classworks ?? [])
      .filter((cw) => cw.score !== undefined)
      .map((cw) => ({
        classworkId: cw.classworkId,
        title: cw.title,
        score: cw.score!,
      }))

    console.log(`[reviewer] Diagnosing weaknesses for: ${module.title} (score: ${moduleScore})`)

    // Diagnostician analyses weaknesses
    const decision = await diagnoseWeaknesses(
      module,
      moduleScore,
      errorPatterns ?? [],
      classworkScores
    )

    // Build remedial sequence
    const { remedialSubtopics, collaborativeClasswork, remedialSequence } =
      buildRemedialSequence(module, decision)

    // Sanitize for Firestore
    const sanitizedRemedialSubtopics = sanitizeForFirestore(remedialSubtopics)
    const sanitizedCollaborative = sanitizeForFirestore(collaborativeClasswork)
    const sanitizedSequence = sanitizeForFirestore(remedialSequence)

    await applyRemedialSequence(
      studentId,
      moduleId,
      sanitizedRemedialSubtopics as typeof remedialSubtopics,
      sanitizedCollaborative as typeof collaborativeClasswork,
      sanitizedSequence as typeof remedialSequence
    )

    // Update competency model with failure
    await updateCompetencyModel(studentId, module.topic, moduleScore)

    await logEvent({
      studentId,
      type: "reviewer_triggered",
      moduleId,
      timestamp: Date.now(),
      payload: {
        moduleScore,
        weakSubtopicIndices: decision.weakSubtopicIndices,
        weaknessNotes: decision.weaknessNotes,
        remedialSubtopicsCount: remedialSubtopics.length,
      },
      archagentDecision: `Reviewer triggered: ${decision.weaknessNotes}`,
    })

    console.log(`[reviewer] Remedial plan ready: ${remedialSubtopics.length} subtopics + collaborative session`)

    return NextResponse.json({
      decision,
      remedialSubtopicsCount: remedialSubtopics.length,
      message: "Reviewer has designed your remedial plan.",
    })
  } catch (err) {
    console.error("[reviewer]", err)
    return NextResponse.json({ error: "Reviewer failed" }, { status: 500 })
  }
}
