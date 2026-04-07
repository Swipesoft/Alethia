import { gemmaJSON } from "./novita"
import type {
  Module,
  Subtopic,
  Classwork,
  ModuleSequenceItem,
  ReviewerDecision,
} from "./types"
import { v4 as uuidv4 } from "uuid"

// ─── Diagnostician: maps weaknesses from error patterns ───────────────────────
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

A student has failed the module assessment for: "${module.title}"
Module score: ${moduleScore}/100
Error patterns observed: ${errorPatterns.join(", ") || "None recorded"}
Classwork performance: ${classworkResults}

The module had these subtopics:
${subtopicList}

Your job:
1. Identify which subtopic indices (0-based) the student is weakest in based on the evidence
2. Write a clear analysis of their weaknesses
3. Design 2-3 focused remedial subtopic lectures targeting those weak areas
4. Design one final collaborative classwork where the tutor solves the ORIGINAL module 
   assessment WITH the student, walking through mistakes and corrections together
   (this mirrors RL from AI feedback — the student learns from their own errors)

Return ONLY valid JSON (no markdown):
{
  "weakSubtopicIndices": [0, 2],
  "weaknessNotes": "Clear analysis of what the student struggled with and why",
  "remedialSubtopics": [
    {
      "title": "Remedial subtopic title",
      "description": "What this remedial session covers and how it addresses the weakness",
      "targetSubtopicIndex": 0
    }
  ],
  "collaborativeTaskPrompt": "Detailed prompt for the collaborative session where tutor and student work through the original assessment mistakes together. Be specific about what to revisit.",
  "collaborativeStarterCode": "# Optional starter code if code_execution faculty"
}`

  return gemmaJSON<ReviewerDecision>(
    [
      { role: "system", content: "You are Athena's Diagnostician. Return valid JSON only." },
      { role: "user", content: prompt },
    ],
    { temperature: 0.3 }
  )
}

// ─── Build remedial sequence from ReviewerDecision ────────────────────────────
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
    index: module.subtopics.length + i,  // Continue indexing after original subtopics
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
    // Reviewer intro marker
    {
      kind: "subtopic",
      id: "reviewer_intro",
      title: "📋 Reviewer Analysis",
      status: "active",
    },
    // Remedial subtopics
    ...remedialSubtopics.map((s): ModuleSequenceItem => ({
      kind: "subtopic",
      id: s.subtopicId,
      title: s.title,
      status: "locked",
    })),
    // Collaborative classwork
    {
      kind: "classwork",
      id: collaborativeClasswork.classworkId,
      title: collaborativeClasswork.title,
      status: "locked",
    },
    // New module assessment
    {
      kind: "module_assessment",
      id: "module_assessment_retry",
      title: "Module Assessment (Retry)",
      status: "locked",
    },
  ]

  return { remedialSubtopics, collaborativeClasswork, remedialSequence }
}
