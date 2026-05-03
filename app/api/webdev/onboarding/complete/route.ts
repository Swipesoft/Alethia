import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { saveWebDevProfile, saveWebDevCurriculum } from "@/lib/firestore-webdev"
import {
  computeWebDevScore, getWebDevProficiencyLevel, buildWebDevCurriculumSpecs,
} from "@/lib/webdev-calibrator"
import { generateWebDevCurriculumSpecs } from "@/lib/webdev-generator"
import type { WebDevInterest, WebDevProfile, WebDevCurriculum } from "@/lib/types-webdev"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(req: NextRequest) {
  try {
    const { studentId, interest, mcqScore, practicalScore } = await req.json() as {
      studentId:      string
      interest:       WebDevInterest
      mcqScore:       number
      practicalScore: number
    }

    if (!studentId || !interest) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const proficiencyScore  = computeWebDevScore(mcqScore, practicalScore)
    const levelOrFail       = getWebDevProficiencyLevel(proficiencyScore)
    const passed            = levelOrFail !== "fail"
    const proficiencyLevel  = passed ? levelOrFail : "beginner"

    const profile: WebDevProfile = {
      studentId, interest, mcqScore, practicalScore,
      proficiencyScore, proficiencyLevel, passed,
      curriculumId: null, createdAt: Date.now(),
    }

    if (!passed) {
      await saveWebDevProfile(profile)
      return NextResponse.json({ passed: false, proficiencyScore })
    }

    const itemSpecs    = buildWebDevCurriculumSpecs(proficiencyLevel, interest)
    const curriculumId = uuidv4()
    const specItems    = await generateWebDevCurriculumSpecs(interest, proficiencyLevel, itemSpecs)

    const curriculumItems = specItems.map((item, i) => ({
      ...item,
      status:        i === 0 ? ("available" as const) : ("locked" as const),
      codeGenerated: false,
    }))

    const curriculum: WebDevCurriculum = {
      curriculumId, studentId, interest, proficiencyLevel,
      items: curriculumItems, createdAt: Date.now(),
    }

    profile.curriculumId = curriculumId
    await Promise.all([saveWebDevProfile(profile), saveWebDevCurriculum(curriculum)])

    return NextResponse.json({
      passed: true, proficiencyScore, proficiencyLevel,
      curriculumId, items: curriculumItems,
    })
  } catch (err) {
    console.error("[webdev/complete]", err)
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 })
  }
}
