import { gemmaJSON } from "./novita"
import {
  RawCurriculumSchema,
  ArchAgentDecisionSchema,
  DiagnosticSchema,
} from "./schemas"
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

// ─── Compiler ─────────────────────────────────────────────────────────────────
function compile(decision: ArchAgentDecision, profile: StudentProfile): {
  valid: boolean
  reason?: string
} {
  const current = profile.curriculum[profile.currentModuleIndex]
  if (decision.action === "advance" && (current?.score ?? 0) < 60) {
    return { valid: false, reason: "Compiler: Score below 60. Triggering remedial." }
  }
  if (decision.action === "complete") {
    const remedialCount = profile.curriculum.filter((m) => m.status === "remedial").length
    if (remedialCount / profile.curriculum.length > 0.2) {
      return { valid: false, reason: "Compiler: Too many unresolved remedial modules." }
    }
  }
  return { valid: true }
}

// ─── Faculty → assessment environment ────────────────────────────────────────
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

// ─── Generate curriculum ──────────────────────────────────────────────────────
export async function generateCurriculum(
  faculty: Faculty,
  diagnosticScore: number,
  preferences: LearnerPreferences,
  goals: string
): Promise<Module[]> {
  const prompt = `You are Athena, the world's first ArchAgent for education.

A student has completed their diagnostic assessment for the ${faculty} faculty.
Diagnostic Score: ${diagnosticScore}/100
Learning Goals: ${goals}
Learning Style: ${preferences.learningStyle}
Pace: ${preferences.pace}

Generate a personalised curriculum of exactly 12 modules.
If score is low, start from fundamentals. If high, go deeper into advanced topics.

Return ONLY a JSON array (no markdown):
[
  {
    "title": "Module title",
    "topic": "Specific topic name",
    "objectives": ["objective 1", "objective 2", "objective 3"],
    "estimatedDurationMins": 60
  }
]`

  const raw = await gemmaJSON(
    [
      { role: "system", content: "You are Athena, an adaptive education ArchAgent. Return valid JSON only." },
      { role: "user", content: prompt },
    ],
    RawCurriculumSchema,
    { temperature: 0.4 }
  )

  return raw.map((m, i) => {
    const env = getDefaultEnvironment(faculty, m.topic)
    return {
      moduleId: uuidv4(),
      index: i,
      title: m.title,
      topic: m.topic,
      faculty,
      objectives: m.objectives ?? ["Understand the topic"],
      status: (i === 0 ? "active" : "locked") as "active" | "locked",
      estimatedDurationMins: m.estimatedDurationMins ?? 60,
      lectureGenerated: false,
      subtopics: [],
      classworks: [],
      sequence: [],
      currentSequenceIndex: 0,
      sequenceGenerated: false,
      remedialAttempts: 0,
      weakSubtopicIndices: [],
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
Score: ${moduleScore}/100
Error patterns: ${errorPatterns.join(", ") || "None"}
Is last module: ${isLastModule}
Previous scores: ${profile.curriculum.filter((m) => m.status === "completed").map((m) => `${m.title}: ${m.score ?? "N/A"}`).join(", ") || "None yet"}

Rules:
- Score >= 80: advance
- Score 60-79: advance but flag
- Score < 60: remedial
- Last module + score >= 60: complete
- Repeated failures on same concept: restructure

Return ONLY JSON (no markdown):
{
  "action": "advance" | "remedial" | "restructure" | "complete",
  "reason": "Brief explanation",
  "nextModuleIndex": <number, only if restructuring>
}`

  const decision = await gemmaJSON(
    [
      { role: "system", content: "You are Athena's ArchAgent. Return valid JSON only." },
      { role: "user", content: prompt },
    ],
    ArchAgentDecisionSchema,
    { temperature: 0.2 }
  )

  // Normalise Zod output to match ArchAgentDecision (reason has a default so it's always present)
  const normalisedDecision: ArchAgentDecision = {
    action: decision.action,
    reason: decision.reason ?? "Decision made.",
    nextModuleIndex: decision.nextModuleIndex,
  }

  const compilerResult = compile(normalisedDecision, profile)
  if (!compilerResult.valid) {
    return {
      action: "remedial" as const,
      reason: compilerResult.reason ?? "Compiler policy override",
    }
  }

  return normalisedDecision
}

// ─── Generate diagnostic ──────────────────────────────────────────────────────
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
      "difficulty": "beginner"
    }
  ]
}`

  return gemmaJSON(
    [
      { role: "system", content: "You are Athena, an adaptive education ArchAgent. Return valid JSON only." },
      { role: "user", content: prompt },
    ],
    DiagnosticSchema,
    { temperature: 0.3 }
  )
}
