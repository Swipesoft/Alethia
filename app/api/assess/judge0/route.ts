import { NextRequest, NextResponse } from "next/server"
import { gemmaComplete } from "@/lib/novita"

const JUDGE0_URL = process.env.JUDGE0_URL ?? "https://judge0-ce.p.rapidapi.com"
const JUDGE0_KEY = process.env.JUDGE0_API_KEY!

const LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  javascript: 63,
  typescript: 74,
  java: 62,
  cpp: 54,
  c: 50,
}

async function executeCode(
  code: string,
  language: string,
  stdin?: string
): Promise<{ stdout: string; stderr: string; status: string; time: string }> {
  const languageId = LANGUAGE_IDS[language.toLowerCase()] ?? 71

  // Submit
  const submitRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Key": JUDGE0_KEY,
      "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
    },
    body: JSON.stringify({
      source_code: code,
      language_id: languageId,
      stdin: stdin ?? "",
    }),
  })

  const result = await submitRes.json()

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? result.compile_output ?? "",
    status: result.status?.description ?? "Unknown",
    time: result.time ?? "0",
  }
}

export async function POST(req: NextRequest) {
  try {
    const { code, language, expectedOutput, rubric, studentId, moduleId } = await req.json()

    // Execute code
    const execution = await executeCode(code, language)

    // AI grading: Gemma reviews code quality + correctness
    const gradingPrompt = `You are Athena's Assessor subagent. Grade this student's code submission.

Language: ${language}
Student Code:
\`\`\`${language}
${code}
\`\`\`

Execution Result:
- Status: ${execution.status}
- Output: ${execution.stdout || "(no output)"}
- Errors: ${execution.stderr || "(none)"}
${expectedOutput ? `\nExpected Output: ${expectedOutput}` : ""}
${rubric ? `\nGrading Rubric: ${rubric}` : ""}

Grade this submission and return ONLY JSON (no markdown):
{
  "score": <0-100>,
  "passed": <true|false>,
  "feedback": "Detailed, constructive feedback mentioning what was right and what to improve",
  "errorPatterns": ["pattern1", "pattern2"]
}`

    const grading = await gemmaComplete([
      { role: "system", content: "You are Athena's Assessor. Return valid JSON only." },
      { role: "user", content: gradingPrompt },
    ])

    const cleaned = grading.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const gradingResult = JSON.parse(cleaned)

    return NextResponse.json({
      execution,
      grading: gradingResult,
    })
  } catch (err) {
    console.error("[assess/judge0]", err)
    return NextResponse.json({ error: "Assessment failed" }, { status: 500 })
  }
}
