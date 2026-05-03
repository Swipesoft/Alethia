export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { gemmaJSON } from "@/lib/novita"
import { GradingResultSchema } from "@/lib/schemas"

const JUDGE0_URL = process.env.JUDGE0_URL ?? "https://judge0-ce.p.rapidapi.com"
const JUDGE0_KEY = process.env.JUDGE0_API_KEY!

const LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  javascript: 63,
  typescript: 74,
  java: 62,
  cpp: 54,
  c: 50,
  rust: 73,
  go: 60,
  ruby: 72,
  kotlin: 78,
  swift: 83,
  r: 80,
}

async function executeCode(code: string, language: string, stdin?: string) {
  const languageId = LANGUAGE_IDS[language.toLowerCase()] ?? 71

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
    const { code, language, expectedOutput, rubric } = await req.json()

    const execution = await executeCode(code, language ?? "python")

    const grading = await gemmaJSON(
      [
        { role: "system", content: "You are Athena's Assessor grading code. Return valid JSON only." },
        {
          role: "user",
          content: `Grade this code submission.

Language: ${language ?? "python"}
Code:
\`\`\`${language ?? "python"}
${code}
\`\`\`

Execution:
- Status: ${execution.status}
- Output: ${execution.stdout || "(no output)"}
- Errors: ${execution.stderr || "(none)"}
${expectedOutput ? `\nExpected output: ${expectedOutput}` : ""}
${rubric ? `\nRubric: ${rubric}` : ""}

Return ONLY JSON: {"score": 0-100, "feedback": "detailed feedback", "errorPatterns": ["pattern"], "passed": true}`,
        },
      ],
      GradingResultSchema,
      { temperature: 0.2 }
    )

    return NextResponse.json({ execution, grading })
  } catch (err) {
    console.error("[assess/judge0]", err)
    return NextResponse.json({ error: "Assessment failed" }, { status: 500 })
  }
}
