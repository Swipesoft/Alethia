import { gemmaJSON } from "./novita"
import { LectureJSONSchema } from "./schemas"
import type { Faculty, LectureJSON } from "./types"

const FACULTY_DIAGRAM_HINTS: Record<Faculty, string> = {
  programming: "Use code_walkthrough, call_stack, sorting_viz, tree_traversal beats liberally.",
  medicine: "Use clinical_case, organ_highlight, comparison_table beats.",
  stem: "Use equation, wave_function, vector_field, graph_plot beats.",
  law: "Use timeline, comparison_table, concept_reveal beats.",
  humanities: "Use quote_reveal, concept_reveal, comparison_table beats.",
  arts: "Use color_theory, concept_reveal, comparison_table beats.",
}

export async function generateLectureJSON(
  faculty: Faculty,
  topic: string,
  objectives: string[],
  studentLevel: number,
  parentModuleTopic?: string
): Promise<LectureJSON> {
  const diagramHints = FACULTY_DIAGRAM_HINTS[faculty]
  const levelDesc = studentLevel < 40 ? "beginner" : studentLevel < 70 ? "intermediate" : "advanced"
  const contextNote = parentModuleTopic
    ? `\nThis is a subtopic within the broader module: "${parentModuleTopic}". Focus specifically on this subtopic.`
    : ""

  const prompt = `You are Athena's Tutor subagent — an expert professor generating a lecture.

Faculty: ${faculty}
Topic: ${topic}
Student Level: ${levelDesc} (score: ${studentLevel}/100)
Learning Objectives: ${objectives.join(", ")}
${contextNote}

${diagramHints}

Generate a lecture with 10-15 beats. Be thorough like a university professor.
First beat MUST be title_card. Last beat MUST be summary_card.
Mix concept_reveal, code_walkthrough, animated_diagram, equation, graph_plot,
comparison_table, clinical_case as appropriate.

Generate one narration string per beat (professor-style explanation).

Return ONLY valid JSON (no markdown):
{
  "title": "Lecture title",
  "faculty": "${faculty}",
  "topic": "${topic}",
  "totalDurationMs": <sum of beat durations>,
  "narration": ["narration beat 1", "narration beat 2", ...],
  "beats": [
    { "type": "title_card", "heading": "...", "subheading": "...", "durationMs": 4000 },
    { "type": "concept_reveal", "text": "...", "emphasis": ["word1"], "durationMs": 7000 },
    { "type": "code_walkthrough", "language": "python", "code": "...", "highlights": [[1,2]], "explanation": "...", "durationMs": 10000 },
    { "type": "animated_diagram", "variant": "call_stack", "data": {}, "caption": "...", "durationMs": 8000 },
    { "type": "equation", "latex": "...", "explanation": "...", "durationMs": 6000 },
    { "type": "graph_plot", "x": [1,2,3], "y": [1,4,9], "xLabel": "x", "yLabel": "y", "title": "...", "chartType": "line", "durationMs": 7000 },
    { "type": "comparison_table", "headers": ["A","B"], "rows": [["a1","b1"],["a2","b2"]], "durationMs": 6000 },
    { "type": "summary_card", "points": ["point 1", "point 2", "point 3"], "durationMs": 6000 }
  ]
}

Valid animated_diagram variants: call_stack, sorting_viz, tree_traversal, organ_highlight,
drug_pathway, vector_field, wave_function, timeline, quote_reveal, color_theory, bar_chart, line_chart`

  const validated = await gemmaJSON(
    [
      { role: "system", content: "You are Athena's Tutor. Return valid JSON only. No markdown fences." },
      { role: "user", content: prompt },
    ],
    LectureJSONSchema,
    { temperature: 0.5, maxTokens: 8192 }
  )

  return validated as LectureJSON
}
