import { gemmaJSON } from "./novita"
import type {
  Faculty,
  Module,
  Subtopic,
  Classwork,
  ModuleSequenceItem,
  AssessmentType,
  AssessmentEnvironment,
  ClassworkType,
  LectureJSON,
} from "./types"
import { v4 as uuidv4 } from "uuid"

// ─── Step 1: TutorAgent generates subtopic plan ───────────────────────────────
export async function generateSubtopicPlan(
  module: Module,
  studentCompetencyScore: number
): Promise<Array<{ title: string; description: string }>> {

  const levelDesc = studentCompetencyScore < 40
    ? "beginner — needs fundamentals explained from scratch"
    : studentCompetencyScore < 70
      ? "intermediate — familiar with basics, needs depth"
      : "advanced — needs expert-level depth and edge cases"

  const prompt = `You are Athena's TutorAgent — an expert professor designing a detailed chapter plan.

Module: "${module.title}"
Topic: ${module.topic}
Faculty: ${module.faculty}
Student Level: ${levelDesc} (score: ${studentCompetencyScore}/100)
Learning Objectives: ${module.objectives.join(", ")}

Generate between 4 and 7 subtopic lectures that together fully cover this module.
Think like a university professor structuring a chapter — each subtopic should be
a complete, standalone lesson that builds on the previous one.

For a beginner, start from first principles and build up slowly.
For an advanced student, skip obvious basics and go deep immediately.

Each subtopic should have enough depth for 10-15 lecture beats (roughly 8-12 minutes of content).

Return ONLY valid JSON (no markdown):
[
  {
    "title": "Subtopic title",
    "description": "1-2 sentence description of exactly what this subtopic covers and why it matters"
  }
]`

  return gemmaJSON<Array<{ title: string; description: string }>>(
    [
      { role: "system", content: "You are Athena's TutorAgent. Return valid JSON only." },
      { role: "user", content: prompt },
    ],
    { temperature: 0.4 }
  )
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
    programming: "Prefer code_execution with Judge0. Use demonstrate_then_replicate for syntax-heavy topics, socratic for logic/algorithms.",
    medicine: "Use mcq for factual recall, essay for clinical reasoning. Prefer socratic classwork style.",
    stem: "Use code_execution for computation problems, essay for proofs. demonstrate_then_replicate works well.",
    law: "Use essay exclusively. Prefer socratic style to develop argumentation skills.",
    humanities: "Use essay. Prefer socratic style for analysis, collaborative for synthesis tasks.",
    arts: "Use image_upload where possible. Socratic for critique, collaborative for final creative task.",
  }

  const subtopicList = subtopics
    .map((s, i) => `${i}: "${s.title}" — ${s.description}`)
    .join("\n")

  const prompt = `You are Athena's AssessorAgent — an expert educational designer.

You have reviewed the following subtopic lectures for module "${module.title}":
${subtopicList}

Student competency score: ${studentCompetencyScore}/100
Known error patterns: ${errorPatterns.join(", ") || "None yet"}
Faculty: ${module.faculty}
Assessment guidance: ${facultyAssessmentGuidance[module.faculty]}

Design classwork sessions to be interleaved between subtopics.
Rules:
- Do NOT place classwork after every subtopic — use your pedagogical judgment
- Place classwork after subtopics where practice is most valuable
- A student with low competency needs MORE classworks (3-4 total)
- A student with high competency needs FEWER classworks (1-2 total)  
- The FINAL classwork before module assessment must ALWAYS be "collaborative" type
- For demonstrate_then_replicate: include a demonstrationCode example the tutor shows first
- For socratic: write a prompt that guides discovery through questions
- For collaborative: write a comprehensive task that ties the whole module together

classworkType options:
- "demonstrate_then_replicate": tutor shows worked example → student replicates
- "socratic": student attempts → tutor gives hints if stuck
- "collaborative": both work together simultaneously (use for final classwork only)

assessmentType options: "code_execution", "mcq", "essay", "image_upload"

Return ONLY valid JSON array (no markdown):
[
  {
    "insertAfterSubtopicIndex": 1,
    "classworkType": "demonstrate_then_replicate",
    "assessmentType": "code_execution",
    "title": "Classwork title",
    "prompt": "Detailed task description for the student",
    "starterCode": "# starter code here (for code_execution only)",
    "demonstrationCode": "# tutor's worked example (for demonstrate_then_replicate only)",
    "demonstrationExplanation": "Step by step explanation of the demo",
    "options": ["A","B","C","D"],
    "correctIndex": 0,
    "rubric": "Grading criteria"
  }
]`

  return gemmaJSON(
    [
      { role: "system", content: "You are Athena's AssessorAgent. Return valid JSON only." },
      { role: "user", content: prompt },
    ],
    { temperature: 0.3 }
  )
}

// ─── Step 3: Assemble full module sequence ────────────────────────────────────
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
  // Build subtopics
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

  // Build classworks
  const classworks: Classwork[] = classworkPlans.map((c, i) => {
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

  // Build interleaved sequence
  const sequence: ModuleSequenceItem[] = []

  subtopics.forEach((sub, i) => {
    // Add the subtopic
    sequence.push({
      kind: "subtopic",
      id: sub.subtopicId,
      title: sub.title,
      status: i === 0 ? "active" : "locked",
    })

    // Add any classworks that go after this subtopic
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

  // Final module assessment always last
  sequence.push({
    kind: "module_assessment",
    id: "module_assessment",
    title: "Module Assessment",
    status: "locked",
  })

  return { subtopics, classworks, sequence }
}

// ─── Generate a single subtopic's LectureJSON ─────────────────────────────────
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
    module.topic  // parent module context
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
  if (assessmentType === "essay" || assessmentType === "mcq") return "essay_box"
  return "judge0"
}
