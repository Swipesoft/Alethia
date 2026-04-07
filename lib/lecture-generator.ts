import { gemmaJSON } from "./novita"
import type { Faculty, LectureJSON } from "./types"

const FACULTY_DIAGRAM_HINTS: Record<Faculty, string> = {
  programming: "Use code_walkthrough, call_stack, sorting_viz, tree_traversal beats liberally.",
  medicine: "Use clinical_case, organ_highlight, comparison_table beats. Include image references where relevant.",
  stem: "Use equation, wave_function, vector_field, graph_plot beats to show mathematical intuition.",
  law: "Use timeline, comparison_table, concept_reveal beats. Focus on case precedents and principles.",
  humanities: "Use quote_reveal, concept_reveal, comparison_table beats. Rich textual depth.",
  arts: "Use color_theory, concept_reveal, comparison_table beats. Visual and aesthetic focus.",
}

export async function generateLectureJSON(
  faculty: Faculty,
  topic: string,
  objectives: string[],
  studentLevel: number  // 0-100 competency score
): Promise<LectureJSON> {
  const diagramHints = FACULTY_DIAGRAM_HINTS[faculty]
  const levelDesc = studentLevel < 40 ? "beginner" : studentLevel < 70 ? "intermediate" : "advanced"

  const prompt = `You are Athena's Tutor subagent. Generate a structured lecture for the following:

Faculty: ${faculty}
Topic: ${topic}
Student Level: ${levelDesc} (competency score: ${studentLevel}/100)
Learning Objectives: ${objectives.join(", ")}

${diagramHints}

Create a lecture with 6-8 beats total. Each beat has a durationMs field.
First beat MUST be a title_card. Last beat MUST be a summary_card.
Middle beats should mix concept_reveal, code_walkthrough, animated_diagram, equation, graph_plot, comparison_table, clinical_case as appropriate for this faculty.

Also generate one narration string per beat (what the tutor voice says during that beat).

Return ONLY valid JSON matching this schema exactly (no markdown fences):
{
  "title": "Lecture title",
  "faculty": "${faculty}",
  "topic": "${topic}",
  "totalDurationMs": <sum of all beat durations>,
  "narration": ["narration for beat 1", "narration for beat 2", ...],
  "beats": [
    { "type": "title_card", "heading": "...", "subheading": "...", "durationMs": 4000 },
    ...beat objects matching the LectureBeat union type...
    { "type": "summary_card", "points": ["...", "...", "..."], "durationMs": 5000 }
  ]
}

For animated_diagram beats, use this structure:
{ "type": "animated_diagram", "variant": "<DiagramVariant>", "data": {}, "caption": "...", "durationMs": 6000 }

Valid DiagramVariant values: call_stack, sorting_viz, tree_traversal, organ_highlight, drug_pathway, vector_field, wave_function, timeline, quote_reveal, color_theory, bar_chart, line_chart

For code_walkthrough beats:
{ "type": "code_walkthrough", "language": "python", "code": "...", "highlights": [[1,2],[3,4]], "explanation": "...", "durationMs": 8000 }

For equation beats:
{ "type": "equation", "latex": "...", "explanation": "...", "durationMs": 5000 }

Make the content genuinely educational, not superficial. Adapt depth to the student's ${levelDesc} level.`

  return gemmaJSON<LectureJSON>(
    [
      {
        role: "system",
        content: "You are Athena's Tutor subagent. Generate structured lecture JSON. Return valid JSON only, no markdown.",
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0.5, maxTokens: 8192 }
  )
}
