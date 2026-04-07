import { NextRequest, NextResponse } from "next/server"
import { generateSubtopicPlan, generateClassworkPlan, assembleModuleSequence } from "@/lib/subtopic-generator"
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

    const competencyScore =
      profile.competencyModel[module.topic]?.score ??
      profile.diagnosticScore ??
      50

    const errorPatterns = Object.values(profile.competencyModel)
      .filter((v) => v.score < 60)
      .map(() => "low competency area")

    // Step 1: TutorAgent generates subtopic plan
    console.log(`[subtopics] Generating subtopic plan for: ${module.title}`)
    const subtopicPlans = await generateSubtopicPlan(module, competencyScore)

    // Step 2: AssessorAgent designs classwork interleaving
    console.log(`[subtopics] AssessorAgent designing classwork for ${subtopicPlans.length} subtopics`)
    const classworkPlans = await generateClassworkPlan(
      module,
      subtopicPlans,
      competencyScore,
      errorPatterns
    )

    // Step 3: Assemble full sequence
    const { subtopics, classworks, sequence } = assembleModuleSequence(
      moduleId,
      module.faculty,
      subtopicPlans,
      classworkPlans
    )

    // Sanitize nested arrays before Firestore
    const sanitizedSubtopics = sanitizeForFirestore(subtopics)
    const sanitizedClassworks = sanitizeForFirestore(classworks)
    const sanitizedSequence = sanitizeForFirestore(sequence)

    await updateModule(studentId, moduleId, {
      subtopics: sanitizedSubtopics as typeof subtopics,
      classworks: sanitizedClassworks as typeof classworks,
      sequence: sanitizedSequence as typeof sequence,
      currentSequenceIndex: 0,
      sequenceGenerated: true,
    })

    console.log(`[subtopics] Sequence generated: ${sequence.length} items (${subtopics.length} subtopics, ${classworks.length} classworks)`)

    return NextResponse.json({ subtopics, classworks, sequence })
  } catch (err) {
    console.error("[subtopics/generate]", err)
    return NextResponse.json({ error: "Failed to generate subtopics" }, { status: 500 })
  }
}
