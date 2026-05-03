export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { generateSubtopicLecture } from "@/lib/subtopic-generator"
import { getStudent, updateSubtopic } from "@/lib/firestore"
import { sanitizeForFirestore } from "@/lib/firestore-utils"

export async function POST(req: NextRequest) {
  try {
    const { studentId, moduleId, subtopicId } = await req.json()

    const profile = await getStudent(studentId)
    if (!profile) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const module = profile.curriculum.find((m) => m.moduleId === moduleId)
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    const subtopic = module.subtopics?.find((s) => s.subtopicId === subtopicId)
    if (!subtopic) {
      return NextResponse.json({ error: "Subtopic not found" }, { status: 404 })
    }

    const competencyScore =
      profile.competencyModel[module.topic]?.score ??
      profile.diagnosticScore ??
      50

    console.log(`[subtopic/lecture] Generating lecture for: ${subtopic.title}`)
    const lectureJSON = await generateSubtopicLecture(subtopic, module, competencyScore)

    // Sanitize before saving
    const sanitized = sanitizeForFirestore(lectureJSON)

    await updateSubtopic(studentId, moduleId, subtopicId, {
      lectureGenerated: true,
      lectureJSON: sanitized as typeof lectureJSON,
    })

    return NextResponse.json({ lectureJSON })
  } catch (err) {
    console.error("[subtopics/lecture]", err)
    return NextResponse.json({ error: "Failed to generate subtopic lecture" }, { status: 500 })
  }
}
