import { gemmaJSON } from "./novita"
import { ReviewerDecisionSchema } from "./schemas"
import type {
  Module,
  Subtopic,
  Classwork,
  ModuleSequenceItem,
  ReviewerDecision,
} from "./types"
import { v4 as uuidv4 } from "uuid"

// ─── Diagnostician: maps weaknesses ──────────────────────────────────────────
export async function diagnoseWeaknesses(
  module: Module,
  moduleScore: number,
  errorPatterns: string[],
  classworkScores: Array<{ classworkId: string; title: string; score: number }>
): Promise<ReviewerDecision> {
  const subtopicList = module.subtopics
    .map((s, i) => `${i}: "${s.title}" — ${s.description}`)
    .join("\n")

  const classworkResults = classworkScores
    .map((c) => `"${c.title}": ${c.score}/100`)
    .join(", ") || "No classwork scores yet"

  const prompt = `You are Athena's Diagnostician — an expert educational analyst.

Student failed module: "${module.title}"
Module score: ${moduleScore}/100
Error patterns: ${errorPatterns.join(", ") || "None"}
Classwork performance: ${classworkResults}

Subtopics covered:
${subtopicList}

Tasks:
1. Identify which subtopic indices (0-based) the student is weakest in
2. Write a clear weakness analysis
3. Design 2-3 focused remedial subtopic lectures targeting weak areas
4. Design one final collaborative classwork where tutor and student solve the
   original assessment together — student learns from their own errors (RL-style)

Return ONLY valid JSON (no markdown):
{
  "weakSubtopicIndices": [0, 2],
  "weaknessNotes": "Clear analysis of struggles",
  "remedialSubtopics": [
    {
      "title": "Remedial title",
      "description": "What this remedial session covers",
      "targetSubtopicIndex": 0
    }
  ],
  "collaborativeTaskPrompt": "Detailed prompt for collaborative session revisiting original mistakes",
  "collaborativeStarterCode": "# optional starter code"
}`

  const result = await gemmaJSON(
    [
      { role: "system", content: "You are Athena's Diagnostician. Return valid JSON only." },
      { role: "user", content: prompt },
    ],
    ReviewerDecisionSchema,
    { temperature: 0.3 }
  )

  // Zod defaults make fields technically optional — cast to ensure required fields
  return {
    weakSubtopicIndices: result.weakSubtopicIndices ?? [],
    weaknessNotes: result.weaknessNotes ?? "Areas for improvement identified.",
    remedialSubtopics: result.remedialSubtopics,
    collaborativeTaskPrompt: result.collaborativeTaskPrompt,
    collaborativeStarterCode: result.collaborativeStarterCode,
  } satisfies ReviewerDecision
}

// ─── Build remedial sequence ──────────────────────────────────────────────────
export function buildRemedialSequence(
  module: Module,
  decision: ReviewerDecision
): {
  remedialSubtopics: Subtopic[]
  collaborativeClasswork: Classwork
  remedialSequence: ModuleSequenceItem[]
} {
  const remedialSubtopics: Subtopic[] = decision.remedialSubtopics.map((r, i) => ({
    subtopicId: uuidv4(),
    moduleId: module.moduleId,
    index: module.subtopics.length + i,
    title: `[Remedial] ${r.title}`,
    description: r.description,
    type: "lecture" as const,
    status: i === 0 ? "active" : "locked",
    lectureGenerated: false,
  }))

  const collaborativeClasswork: Classwork = {
    classworkId: uuidv4(),
    moduleId: module.moduleId,
    insertAfterSubtopicIndex: module.subtopics.length + remedialSubtopics.length - 1,
    classworkType: "collaborative",
    assessmentType: module.assessmentType,
    assessmentEnvironment: module.assessmentEnvironment,
    title: "Collaborative Review — Learn From Your Mistakes",
    prompt: decision.collaborativeTaskPrompt,
    starterCode: decision.collaborativeStarterCode,
    rubric: "Full marks for active participation and demonstrated understanding of corrections",
    status: "locked",
  }

  const remedialSequence: ModuleSequenceItem[] = [
    { kind: "subtopic", id: "reviewer_intro", title: "📋 Reviewer Analysis", status: "active" },
    ...remedialSubtopics.map((s): ModuleSequenceItem => ({
      kind: "subtopic", id: s.subtopicId, title: s.title, status: "locked",
    })),
    { kind: "classwork", id: collaborativeClasswork.classworkId, title: collaborativeClasswork.title, status: "locked" },
    { kind: "module_assessment", id: "module_assessment_retry", title: "Module Assessment (Retry)", status: "locked" },
  ]

  return { remedialSubtopics, collaborativeClasswork, remedialSequence }
}
