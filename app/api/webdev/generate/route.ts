import { NextRequest, NextResponse } from "next/server"
import {
  getWebDevCurriculum, getWebDevAssignment,
  saveWebDevAssignment, updateWebDevCurriculumItem,
} from "@/lib/firestore-webdev"
import { buildWebDevCurriculumSpecs } from "@/lib/webdev-calibrator"
import { generateWebDevAssignmentCode } from "@/lib/webdev-generator"
import type { WebDevAssignment } from "@/lib/types-webdev"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { curriculumId, itemIndex } = await req.json() as {
      curriculumId: string
      itemIndex:    number
    }

    if (!curriculumId || itemIndex === undefined) {
      return NextResponse.json({ error: "curriculumId and itemIndex required" }, { status: 400 })
    }

    const curriculum = await getWebDevCurriculum(curriculumId)
    if (!curriculum) return NextResponse.json({ error: "Curriculum not found" }, { status: 404 })

    const item = curriculum.items[itemIndex]
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 })

    // Already generated — return cached
    if (item.codeGenerated) {
      const existing = await getWebDevAssignment(item.assignmentId)
      if (existing) return NextResponse.json({ assignment: existing })
    }

    const allSpecs = buildWebDevCurriculumSpecs(curriculum.proficiencyLevel, curriculum.interest)
    const { spec, hint } = allSpecs[itemIndex] ?? allSpecs[0]

    const generated = await generateWebDevAssignmentCode(item, curriculum.interest, spec, hint)

    const assignment: WebDevAssignment = {
      assignmentId: item.assignmentId,
      curriculumId,
      itemIndex,
      generatedAt:  Date.now(),
      ...generated,
    }

    await Promise.all([
      saveWebDevAssignment(assignment),
      updateWebDevCurriculumItem(curriculumId, itemIndex, { codeGenerated: true }),
    ])

    return NextResponse.json({ assignment })
  } catch (err) {
    console.error("[webdev/generate]", err)
    return NextResponse.json({ error: "Generation failed" }, { status: 500 })
  }
}
