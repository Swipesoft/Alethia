import { NextRequest, NextResponse } from "next/server"
import { generateLectureJSON } from "@/lib/lecture-generator"
import { getStudent, updateModule } from "@/lib/firestore"

// Firestore doesn't support nested arrays — flatten them before saving
function sanitizeForFirestore(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (Array.isArray(item)) {
        return JSON.stringify(item) // flatten nested array to string
      }
      return sanitizeForFirestore(item)
    })
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k,
        sanitizeForFirestore(v),
      ])
    )
  }
  return obj
}

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

    const competencyScore =
      profile.competencyModel[module.topic]?.score ??
      profile.diagnosticScore ??
      50

    const lectureJSON = await generateLectureJSON(
      module.faculty,
      module.topic,
      module.objectives,
      competencyScore
    )

    // Sanitize before saving to Firestore
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