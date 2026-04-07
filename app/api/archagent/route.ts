import { NextRequest, NextResponse } from "next/server"
import { archAgentDecide, generateCurriculum } from "@/lib/archagent"
import { getStudent, applyArchAgentDecision, logEvent, updateModule } from "@/lib/firestore"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, studentId, payload } = body

    if (!studentId) {
      return NextResponse.json({ error: "studentId required" }, { status: 400 })
    }

    switch (action) {
      case "generate_curriculum": {
        const { diagnosticScore, preferences, goals, faculty } = payload
        const modules = await generateCurriculum(faculty, diagnosticScore, preferences, goals)
        return NextResponse.json({ modules })
      }

      case "decide_progression": {
        const profile = await getStudent(studentId)
        if (!profile) {
          return NextResponse.json({ error: "Student not found" }, { status: 404 })
        }
        const { moduleScore, errorPatterns } = payload
        const decision = await archAgentDecide(profile, moduleScore, errorPatterns ?? [])

        const currentModule = profile.curriculum[profile.currentModuleIndex]
        if (currentModule) {
          await updateModule(studentId, currentModule.moduleId, {
            archagetNotes: decision.reason,
          })
        }

        await applyArchAgentDecision(profile.studentId, decision, profile.currentModuleIndex)
        await logEvent({
          studentId,
          type: "module_advanced",
          moduleId: currentModule?.moduleId,
          timestamp: Date.now(),
          payload: { moduleScore, decision },
          archagentDecision: decision.reason,
        })
        return NextResponse.json({ decision })
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (err) {
    console.error("[archagent]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
