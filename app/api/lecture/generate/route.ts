import { NextRequest, NextResponse } from "next/server"
import { generateLectureJSON } from "@/lib/lecture-generator"
import { getStudent, updateModule } from "@/lib/firestore"
import { sanitizeForFirestore } from "@/lib/firestore-utils"

export async function POST(req: NextRequest) {
  try {
    const { studentId, moduleId } = await req.json()

    const profile = await getStudent(studentId)
    if (!profile) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const module = profile.curriculum.find((m) => m.moduleId === moduleId)
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 })
    }

    const competencyScore = profile.competencyModel[module.topic]?.score ?? profile.diagnosticScore ?? 50

    const lectureJSON = await generateLectureJSON(
      module.faculty,
      module.topic,
      module.objectives,
      competencyScore
    )

    const sanitized = sanitizeForFirestore(lectureJSON)

    await updateModule(studentId, moduleId, {
      lectureGenerated: true,
      lectureJSON: sanitized as typeof lectureJSON,
    })

    return NextResponse.json({ lectureJSON })
  } catch (err) {
    console.error("[lecture/generate]", err)
    return NextResponse.json({ error: "Failed to generate lecture" }, { status: 500 })
  }
}
