import { NextRequest, NextResponse } from "next/server"
import { gemmaJSON } from "@/lib/novita"
import { AssessmentQuestionsSchema } from "@/lib/schemas"

export async function POST(req: NextRequest) {
  try {
    const { faculty, topic, objectives, assessmentType, assessmentEnvironment } = await req.json()

    const typeInstructions: Record<string, string> = {
      code_execution: `
TYPE RULES for code_execution (Judge0 terminal):
- The "prompt" must be a PURE CODING TASK. Do NOT use words like "explain", "describe", "analyze", "what is the complexity", "define", or "summarize". The student's answer is executed directly as code — any prose will crash the terminal.
- Always set "starterCode" to a function scaffold (signature + inline comment hints).
- Always set "expectedOutput" to the exact stdout a correct solution should print (e.g. "120" or "True\nFalse").
- Format any code in the prompt using fenced markdown code blocks with a language tag (e.g. \`\`\`python).
- Format any math notation using $...$ for inline math or $$...$$ for display math.
- Example prompt: "Complete the function below so that it returns the factorial of n.\n\`\`\`python\ndef factorial(n): ...\n\`\`\`\nFor n=5 your function should print 120."`,

      mcq: `
TYPE RULES for mcq:
- Provide exactly 4 options in the "options" array.
- Set "correctIndex" to the 0-based index of the correct option (0, 1, 2, or 3).
- Analytical and conceptual questions are fine.
- Format any code or math in the prompt and options using markdown (backtick code spans or fenced blocks, $...$ for math).`,

      essay: `
TYPE RULES for essay:
- Ask for a written explanation, analysis, or description.
- Do NOT require code submission.
- The student answers in a plain text box.`,
    }

    const prompt = `Generate 3 assessment questions for: "${topic}" (${faculty} faculty).
Assessment environment: ${assessmentEnvironment}
Question type: ${assessmentType}
Objectives: ${objectives.join(", ")}

${typeInstructions[assessmentType] ?? ""}

Return ONLY valid JSON (no markdown wrapper):
{
  "questions": [
    {
      "questionId": "q1",
      "prompt": "Question text (use markdown for code blocks and math)",
      "type": "${assessmentType}",
      "starterCode": "# scaffold — required for code_execution, omit otherwise",
      "expectedOutput": "expected stdout — required for code_execution, omit otherwise",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "rubric": "Grading criteria"
    }
  ]
}`

    const result = await gemmaJSON(
      [
        { role: "system", content: "You are Athena's Assessor. Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      AssessmentQuestionsSchema,
      { temperature: 0.3 }
    )

    return NextResponse.json({ questions: result.questions })
  } catch (err) {
    console.error("[assess/questions]", err)
    return NextResponse.json({ questions: [] }, { status: 500 })
  }
}
