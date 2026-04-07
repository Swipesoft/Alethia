import { gemmaJSON } from "./novita"
import { SubtopicPlanSchema, ClassworkPlanSchema } from "./schemas"
import type {
  Faculty,
  Module,
  Subtopic,
  Classwork,
  ModuleSequenceItem,
  ClassworkType,
  AssessmentType,
  AssessmentEnvironment,
  LectureJSON,
} from "./types"
import { v4 as uuidv4 } from "uuid"

// ─── Step 1: TutorAgent generates subtopic plan ───────────────────────────────
export async function generateSubtopicPlan(
  module: Module,
  studentCompetencyScore: number
): Promise<Array<{ title: string; description: string }>> {
  const levelDesc = studentCompetencyScore < 40
    ? "beginner — needs fundamentals from scratch"
    : studentCompetencyScore < 70
      ? "intermediate — familiar with basics, needs depth"
      : "advanced — needs expert-level depth and edge cases"

  const prompt = `You are Athena's TutorAgent — an expert professor designing a chapter plan.

Module: "${module.title}"
Topic: ${module.topic}
Faculty: ${module.faculty}
Student Level: ${levelDesc} (score: ${studentCompetencyScore}/100)
Learning Objectives: ${module.objectives.join(", ")}

Generate between 4 and 7 subtopic lectures that fully cover this module.
Think like a university professor structuring a chapter.
Each subtopic should be a complete standalone lesson (10-15 beats each, ~8-12 mins).

Return ONLY valid JSON array (no markdown):
[
  {
    "title": "Subtopic title",
    "description": "1-2 sentence description of what this subtopic covers and why it matters"
  }
]`

  const result = await gemmaJSON(
    [
      { role: "system", content: "You are Athena's TutorAgent. Return valid JSON only." },
      { role: "user", content: prompt },
    ],
    SubtopicPlanSchema,
    { temperature: 0.4 }
  )

  // Ensure description is never undefined
  return result.map((s) => ({
    title: s.title,
    description: s.description ?? "",
  }))
}

// ─── Step 2: AssessorAgent designs classwork interleaving ─────────────────────
export async function generateClassworkPlan(
  module: Module,
  subtopics: Array<{ title: string; description: string }>,
  studentCompetencyScore: number,
  errorPatterns: string[]
): Promise<Array<{
  insertAfterSubtopicIndex: number
  classworkType: ClassworkType
  assessmentType: AssessmentType
  title: string
  prompt: string
  starterCode?: string
  demonstrationCode?: string
  demonstrationExplanation?: string
  options?: string[]
  correctIndex?: number
  rubric?: string
}>> {
  const facultyAssessmentGuidance: Record<Faculty, string> = {
    programming: "Prefer code_execution. Use demonstrate_then_replicate for syntax, socratic for logic.",
    medicine: "Use mcq for factual recall, essay for clinical reasoning. Prefer socratic.",
    stem: "Use code_execution for computation. demonstrate_then_replicate works well.",
    law: "Use essay exclusively. Prefer socratic for argumentation.",
    humanities: "Use essay. Prefer socratic for analysis, collaborative for synthesis.",
    arts: "Use image_upload where possible. Socratic for critique, collaborative for final task.",
  }

  const subtopicList = subtopics
    .map((s, i) => `${i}: "${s.title}" — ${s.description}`)
    .join("\n")

  const prompt = `You are Athena's AssessorAgent — an expert educational designer.

Subtopic lectures for module "${module.title}":
${subtopicList}

Student competency: ${studentCompetencyScore}/100
Error patterns: ${errorPatterns.join(", ") || "None"}
Faculty: ${module.faculty}
Guidance: ${facultyAssessmentGuidance[module.faculty]}

Design classwork sessions to interleave between subtopics.
Rules:
- Do NOT place classwork after every subtopic — use pedagogical judgment
- Low competency student (score < 50): 3-4 classworks
- High competency student (score >= 70): 1-2 classworks
- FINAL classwork MUST always be "collaborative" type
- For demonstrate_then_replicate: include demonstrationCode the tutor shows first
- For socratic: write a prompt that guides discovery through questions

Return ONLY valid JSON array (no markdown):
[
  {
    "insertAfterSubtopicIndex": 1,
    "classworkType": "demonstrate_then_replicate",
    "assessmentType": "code_execution",
    "title": "Classwork title",
    "prompt": "Detailed task description",
    "starterCode": "# starter code",
    "demonstrationCode": "# tutor example",
    "demonstrationExplanation": "Step by step walkthrough",
    "rubric": "Grading criteria"
  }
]`

  return gemmaJSON(
    [
      { role: "system", content: "You are Athena's AssessorAgent. Return valid JSON only." },
      { role: "user", content: prompt },
    ],
    ClassworkPlanSchema,
    { temperature: 0.3 }
  )
}

// ─── Step 3: Assemble sequence ────────────────────────────────────────────────
export function assembleModuleSequence(
  moduleId: string,
  faculty: Faculty,
  subtopicPlans: Array<{ title: string; description: string }>,
  classworkPlans: Array<{
    insertAfterSubtopicIndex: number
    classworkType: ClassworkType
    assessmentType: AssessmentType
    title: string
    prompt: string
    starterCode?: string
    demonstrationCode?: string
    demonstrationExplanation?: string
    options?: string[]
    correctIndex?: number
    rubric?: string
  }>
): {
  subtopics: Subtopic[]
  classworks: Classwork[]
  sequence: ModuleSequenceItem[]
} {
  const subtopics: Subtopic[] = subtopicPlans.map((s, i) => ({
    subtopicId: uuidv4(),
    moduleId,
    index: i,
    title: s.title,
    description: s.description,
    type: "lecture" as const,
    status: i === 0 ? "active" : "locked",
    lectureGenerated: false,
  }))

  const classworks: Classwork[] = classworkPlans.map((c) => {
    const env = getClassworkEnvironment(faculty, c.assessmentType)
    return {
      classworkId: uuidv4(),
      moduleId,
      insertAfterSubtopicIndex: c.insertAfterSubtopicIndex,
      classworkType: c.classworkType,
      assessmentType: c.assessmentType,
      assessmentEnvironment: env,
      title: c.title,
      prompt: c.prompt,
      starterCode: c.starterCode,
      demonstrationCode: c.demonstrationCode,
      demonstrationExplanation: c.demonstrationExplanation,
      options: c.options,
      correctIndex: c.correctIndex,
      rubric: c.rubric,
      status: "locked" as const,
    }
  })

  const sequence: ModuleSequenceItem[] = []

  subtopics.forEach((sub, i) => {
    sequence.push({
      kind: "subtopic",
      id: sub.subtopicId,
      title: sub.title,
      status: i === 0 ? "active" : "locked",
    })
    classworks
      .filter((cw) => cw.insertAfterSubtopicIndex === i)
      .forEach((cw) => {
        sequence.push({
          kind: "classwork",
          id: cw.classworkId,
          title: cw.title,
          status: "locked",
        })
      })
  })

  sequence.push({
    kind: "module_assessment",
    id: "module_assessment",
    title: "Module Assessment",
    status: "locked",
  })

  return { subtopics, classworks, sequence }
}

// ─── Generate subtopic lecture ────────────────────────────────────────────────
export async function generateSubtopicLecture(
  subtopic: Subtopic,
  module: Module,
  studentCompetencyScore: number
): Promise<LectureJSON> {
  const { generateLectureJSON } = await import("./lecture-generator")
  return generateLectureJSON(
    module.faculty,
    subtopic.title,
    [subtopic.description],
    studentCompetencyScore,
    module.topic
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function getClassworkEnvironment(
  faculty: Faculty,
  assessmentType: AssessmentType
): AssessmentEnvironment {
  if (assessmentType === "code_execution") {
    return faculty === "stem" ? "jupyter" : "judge0"
  }
  if (assessmentType === "image_upload") return "image_canvas"
  return "essay_box"
}
