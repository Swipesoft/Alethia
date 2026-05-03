import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { saveProfile, saveCurriculum } from "@/lib/firestore-sose"
import {
  computeProficiencyScore,
  getProficiencyLevel,
  buildCurriculumSpecs,
} from "@/lib/sose-calibrator"
import { generateCurriculumSpecs } from "@/lib/sose-generator"
import type { SoSELanguage, SoSEInterest, SoSEProfile, SoSECurriculum } from "@/lib/types-sose"

export const runtime = "nodejs"
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const {
      studentId,
      language,
      interest,
      mcqScore,        // 0–100
      practicalScore,  // 0–100 (0, 50, or 100 based on challenges passed)
    } = await req.json() as {
      studentId:      string
      language:       SoSELanguage
      interest:       SoSEInterest
      mcqScore:       number
      practicalScore: number
    }

    if (!studentId || !language || !interest) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // ── Score and gate ────────────────────────────────────────────────────────
    const proficiencyScore  = computeProficiencyScore(mcqScore, practicalScore)
    const levelOrFail       = getProficiencyLevel(proficiencyScore)
    const passed            = levelOrFail !== "fail"
    const proficiencyLevel  = passed ? levelOrFail : "beginner"  // store beginner for failed

    // ── Save profile ──────────────────────────────────────────────────────────
    const profile: SoSEProfile = {
      studentId,
      language,
      interest,
      mcqScore,
      practicalScore,
      proficiencyScore,
      proficiencyLevel,
      passed,
      curriculumId: null,
      createdAt:    Date.now(),
    }

    // If failed, save profile and return early
    if (!passed) {
      await saveProfile(profile)
      return NextResponse.json({ passed: false, proficiencyScore, proficiencyLevel: "fail" })
    }

    // ── Build curriculum ──────────────────────────────────────────────────────
    const itemSpecs    = buildCurriculumSpecs(proficiencyLevel, interest, language)
    const curriculumId = uuidv4()

    // Generate curriculum specs (titles, descriptions — no code yet)
    const specItems = await generateCurriculumSpecs(
      language,
      interest,
      proficiencyLevel,
      itemSpecs
    )

    const curriculumItems = specItems.map((item, i) => ({
      ...item,
      status:        i === 0 ? ("available" as const) : ("locked" as const),
      codeGenerated: false,
    }))

    const curriculum: SoSECurriculum = {
      curriculumId,
      studentId,
      language,
      interest,
      proficiencyLevel,
      items:     curriculumItems,
      createdAt: Date.now(),
    }

    // ── Persist both ──────────────────────────────────────────────────────────
    profile.curriculumId = curriculumId
    await Promise.all([saveProfile(profile), saveCurriculum(curriculum)])

    return NextResponse.json({
      passed:           true,
      proficiencyScore,
      proficiencyLevel,
      curriculumId,
      items:            curriculumItems,
    })
  } catch (err) {
    console.error("[onboarding/complete]", err)
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 })
  }
}
