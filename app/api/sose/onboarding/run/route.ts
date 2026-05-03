export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"

const JUDGE0_URL = process.env.JUDGE0_URL ?? "https://judge0-ce.p.rapidapi.com"
const JUDGE0_KEY = process.env.JUDGE0_API_KEY!

const LANGUAGE_IDS: Record<string, number> = {
  python:     71,
  javascript: 63,
}

export async function POST(req: NextRequest) {
  try {
    const { studentCode, testCode, language } = await req.json() as {
      studentCode: string
      testCode:    string
      language:    string
    }

    if (!studentCode || !testCode || !language) {
      return NextResponse.json({ error: "studentCode, testCode, and language required" }, { status: 400 })
    }

    if (!JUDGE0_KEY) {
      return NextResponse.json({ error: "JUDGE0_API_KEY not configured" }, { status: 503 })
    }

    // Combine student answer + hidden test
    const fullCode    = `${studentCode}\n\n${testCode}`
    const languageId  = LANGUAGE_IDS[language.toLowerCase()] ?? 71

    const submitRes = await fetch(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
      {
        method: "POST",
        headers: {
          "Content-Type":    "application/json",
          "X-RapidAPI-Key":  JUDGE0_KEY,
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({
          source_code: fullCode,
          language_id: languageId,
          stdin:       "",
        }),
      }
    )

    const result = await submitRes.json()

    const stdout  = (result.stdout ?? "").trim()
    const stderr  = (result.stderr ?? result.compile_output ?? "").trim()
    const status  = result.status?.description ?? "Unknown"
    const passed  = stdout === "PASS" && !stderr

    return NextResponse.json({
      passed,
      stdout,
      stderr,
      status,
      executionTime: result.time ?? "0",
    })
  } catch (err) {
    console.error("[onboarding/run]", err)
    return NextResponse.json({ error: "Execution failed" }, { status: 500 })
  }
}
