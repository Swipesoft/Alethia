import { gemmaJSON } from "./novita"
import type {
  Faculty,
  Module,
  StudentProfile,
  ArchAgentDecision,
  AssessmentType,
  AssessmentEnvironment,
  LearnerPreferences,
} from "./types"
import { v4 as uuidv4 } from "uuid"

// ─── Compiler: validate ArchAgent decisions against policy ────────────────────
function compile(decision: ArchAgentDecision, profile: StudentProfile): {
  valid: boolean
  reason?: string
} {
  const current = profile.curriculum[profile.currentModuleIndex]

  // Policy: cannot advance if score < 60
  if (decision.action === "advance" && (current?.score ?? 0) < 60) {
    return {
      valid: false,
      reason: "Compiler: Score below 60 threshold. Triggering remedial instead.",
    }
  }

  // Policy: cannot complete course if more than 20% modules are in remedial
  if (decision.action === "complete") {
    const remedialCount = profile.curriculum.filter((m) => m.status === "remedial").length
    const ratio = remedialCount / profile.curriculum.length
    if (ratio > 0.2) {
      return {
        valid: false,
        reason: "Compiler: Too many unresolved remedial modules. Cannot mark complete.",
      }
    }
  }

  return { valid: true }
}

// ─── Faculty → default assessment environment mapping ────────────────────────
function getDefaultEnvironment(faculty: Faculty, topic: string): {
  assessmentType: AssessmentType
  assessmentEnvironment: AssessmentEnvironment
} {
  switch (faculty) {
    case "programming":
      return topic.toLowerCase().includes("project") || topic.toLowerCase().includes("build")
        ? { assessmentType: "github_actions", assessmentEnvironment: "github_ci" }
        : { assessmentType: "code_execution", assessmentEnvironment: "judge0" }
    case "medicine":
      return topic.toLowerCase().includes("imaging") || topic.toLowerCase().includes("radiolog")
        ? { assessmentType: "image_upload", assessmentEnvironment: "image_canvas" }
        : { assessmentType: "mcq", assessmentEnvironment: "essay_box" }
    case "stem":
      return { assessmentType: "code_execution", assessmentEnvironment: "jupyter" }
    case "law":
      return { assessmentType: "essay", assessmentEnvironment: "essay_box" }
    case "humanities":
      return { assessmentType: "essay", assessmentEnvironment: "essay_box" }
    case "arts":
      return { assessmentType: "image_upload", assessmentEnvironment: "image_canvas" }
  }
}

// ─── Generate curriculum from diagnostic ─────────────────────────────────────
export async function generateCurriculum(
  faculty: Faculty,
  diagnosticScore: number,
  preferences: LearnerPreferences,
  goals: string
): Promise<Module[]> {
  const prompt = `You are Athena, the world's first ArchAgent for education.

A student has just completed their diagnostic assessment for the ${faculty} faculty.

Diagnostic Score: ${diagnosticScore}/100
Learning Goals: ${goals}
Learning Style: ${preferences.learningStyle}
Pace: ${preferences.pace}

Generate a personalized curriculum of exactly 12 modules for this student.
The curriculum must be adaptive — if their score is low, start from fundamentals.
If their score is high, skip basics and go deeper into advanced topics.

Return ONLY a JSON array with this exact structure (no markdown, no explanation):
[
  {
    "title": "Module title",
    "topic": "Specific topic name",
    "objectives": ["objective 1", "objective 2", "objective 3"],
    "estimatedDurationMins": 45
  }
]

The 12 modules should form a coherent learning journey from their current level to mastery.`

  type RawModule = {
    title: string
    topic: string
    objectives: string[]
    estimatedDurationMins: number
  }

  const raw = await gemmaJSON<RawModule[]>([
    { role: "system", content: "You are Athena, an adaptive education ArchAgent. Always return valid JSON only." },
    { role: "user", content: prompt },
  ])

  return raw.map((m, i) => {
    const env = getDefaultEnvironment(faculty, m.topic)
    return {
      moduleId: uuidv4(),
      index: i,
      title: m.title,
      topic: m.topic,
      faculty,
      objectives: m.objectives,
      status: i === 0 ? "active" : "locked",
      estimatedDurationMins: m.estimatedDurationMins,
      lectureGenerated: false,
      ...env,
    } satisfies Module
  })
}

// ─── ArchAgent progression decision ──────────────────────────────────────────
export async function archAgentDecide(
  profile: StudentProfile,
  moduleScore: number,
  errorPatterns: string[]
): Promise<ArchAgentDecision> {
  const currentModule = profile.curriculum[profile.currentModuleIndex]
  const isLastModule = profile.currentModuleIndex >= profile.curriculum.length - 1

  const prompt = `You are Athena's ArchAgent decision engine.

Student: ${profile.name}
Faculty: ${profile.faculty}
Current Module: "${currentModule?.title}" (index ${profile.currentModuleIndex})
Score on this module: ${moduleScore}/100
Error patterns observed: ${errorPatterns.join(", ") || "None"}
Is this the last module: ${isLastModule}

Previous module scores: ${profile.curriculum
    .filter((m) => m.status === "completed")
    .map((m) => `${m.title}: ${m.score ?? "N/A"}`)
    .join(", ") || "None yet"}

Based on this evidence, decide what the ArchAgent should do next.

Rules:
- Score >= 80: advance to next module
- Score 60-79: advance but flag for review
- Score < 60: trigger remedial loop
- If this is the last module and score >= 60: complete the course
- If you detect a pattern of repeated failures on same concept: restructure curriculum

Return ONLY a JSON object (no markdown):
{
  "action": "advance" | "remedial" | "restructure" | "complete",
  "reason": "Brief explanation of why this decision was made",
  "nextModuleIndex": <number, only if restructuring>
}`

  const decision = await gemmaJSON<ArchAgentDecision>([
    { role: "system", content: "You are Athena's ArchAgent. Return valid JSON only." },
    { role: "user", content: prompt },
  ])

  // Pass through Compiler
  const compilerResult = compile(decision, profile)
  if (!compilerResult.valid) {
    // Compiler override
    return {
      action: "remedial",
      reason: compilerResult.reason ?? "Compiler policy override",
    }
  }

  return decision
}

// ─── Generate diagnostic assessment ──────────────────────────────────────────
export async function generateDiagnostic(faculty: Faculty, goals: string) {
  const prompt = `Generate a 5-question diagnostic assessment for the ${faculty} faculty.
Student goals: ${goals}

Return ONLY JSON (no markdown):
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "type": "mcq",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "difficulty": "beginner" | "intermediate" | "advanced"
    }
  ]
}`

  return gemmaJSON<{ questions: Array<{
    id: string
    question: string
    type: string
    options: string[]
    correctIndex: number
    difficulty: string
  }> }>([
    { role: "system", content: "You are Athena, an adaptive education ArchAgent. Return valid JSON only." },
    { role: "user", content: prompt },
  ])
}
