export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { gemmaJSON } from "@/lib/novita"
import { z } from "zod"

// ─── What Judge0 sandboxes can and cannot do ──────────────────────────────────
const SANDBOX_CONSTRAINTS = `
JUDGE0 SANDBOX HARD LIMITS (memorise these):
• JavaScript/TypeScript → runs in Node.js, NOT a browser.
  UNAVAILABLE: fetch, XMLHttpRequest, localStorage, sessionStorage, window,
  document, navigator, alert, confirm, prompt, WebSocket, canvas, IndexedDB,
  crypto.subtle, Worker, URL (Web API), Blob, File, FormData, Headers, Request, Response (Web API)
  AVAILABLE: require(), Buffer, process, fs (read /tmp only), path, util, crypto (Node), stream
• Python → standard library only.
  UNAVAILABLE: requests, httpx, aiohttp, flask, django, FastAPI, numpy, pandas,
  matplotlib, PIL/Pillow, tkinter, PyQt, socket to external IPs
  AVAILABLE: json, os, sys, math, re, collections, itertools, functools, datetime
• Java → JDK standard library only. No Spring, Hibernate, external HTTP.
• C/C++ → standard library only. No POSIX network beyond loopback.
• Go/Rust/Ruby → standard library only.
• ALL languages: no outbound network, no GPU, ~256MB RAM, ~5s time limit.

LANGUAGE ID MISMATCHES TO WATCH FOR:
• TypeScript code filed as "javascript" → switch to language "typescript"
• C++ code filed as "c" → switch to language "cpp"
• Kotlin filed as "java" → switch to language "kotlin"
`

// ─── Response schema ──────────────────────────────────────────────────────────
const OnCallSchema = z.object({
  action: z.enum(["patch", "change_environment"]),
  patchedCode: z.string().optional().describe("Full patched code — only set when action is patch"),
  patchedLanguage: z.string().optional().describe("Corrected language key (e.g. typescript, cpp) if misdetected"),
  explanation: z.string().describe("2-3 sentence plain-English summary of the diagnosis and fix"),
  environmentChange: z.string().optional().describe("What the task/demo code needs to change — only set when action is change_environment"),
})

export type OnCallResult = z.infer<typeof OnCallSchema>

export async function POST(req: NextRequest) {
  try {
    const { code, language, executionResult, taskContext } = await req.json()

    const systemPrompt = `You are the On-Call Agent for Athena, an AI-powered coding school.
Students write and run code inside Judge0 sandboxes. When execution fails, you diagnose the root cause and either patch the code or explain what must change in the task itself.

${SANDBOX_CONSTRAINTS}

RULES:
1. Preserve ALL student logic and educational content — only add minimal scaffolding.
2. If a browser API (fetch, window, etc.) is missing in JS/TS → inject a mock at the top of the file that returns realistic dummy data matching the function's purpose.
3. If a Python package is unavailable → mock the import with a local stub that simulates realistic output.
4. If the language label is wrong (TypeScript filed as javascript, C++ filed as c, etc.) → set patchedLanguage to the correct key and return the unchanged code.
5. If the problem genuinely cannot be fixed by patching (e.g. code requires an external database, real OAuth, live camera feed) → set action to "change_environment" and explain clearly.
6. The patched code must be a COMPLETE, RUNNABLE file — not a diff or snippet.
7. Return ONLY valid JSON matching the schema. No markdown fences around the JSON.`

    const userMessage = `Diagnose this execution failure and fix it.

Language: ${language}
Task context: ${taskContext ?? "General programming exercise"}

Code:
\`\`\`${language}
${code}
\`\`\`

Execution result:
Status: ${executionResult?.status ?? "Unknown"}
stdout: ${executionResult?.stdout || "(none)"}
stderr: ${executionResult?.stderr || "(none)"}`

    const result = await gemmaJSON(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      OnCallSchema,
      { temperature: 0.3 }
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error("[oncall]", err)
    return NextResponse.json({ error: "On-call agent failed" }, { status: 500 })
  }
}
