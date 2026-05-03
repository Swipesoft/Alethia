import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getWorkspace, createSubmission, updateSubmission, getGeneratedAssignment } from "@/lib/firestore-sose"
import { getAssignment } from "@/data/sose-assignments"
import { runGradingPipeline } from "@/lib/e2b-client"
import { gemmaJSON } from "@/lib/novita"
import type { CheckResult } from "@/lib/types-sose"

export const runtime = "nodejs"
export const maxDuration = 600

// ─── Gemma synthesis schema ───────────────────────────────────────────────────
const SynthesisSchema = z.object({
  qualityScore:  z.number().min(0).max(100),
  designScore:   z.number().min(0).max(100),
  summary:       z.string().min(1),
  strengths:     z.array(z.string()).min(1).max(5),
  improvements:  z.array(z.string()).min(0).max(5),
  encouragement: z.string().min(1),
})

// ─── Test output parser — handles both pytest and Jest ────────────────────────
function parseTestOutput(output: string): {
  passed: number
  total: number
  failures: string[]
  framework: "pytest" | "jest" | "unknown"
} {
  // ── Jest: "Tests:  X passed, Y total" ─────────────────────────────────────
  const jestMatch = output.match(/Tests:\s+(?:(\d+) failed,\s*)?(\d+) passed,\s*(\d+) total/)
  if (jestMatch) {
    const failed = jestMatch[1] ? parseInt(jestMatch[1]) : 0
    const passed = parseInt(jestMatch[2])
    const total  = parseInt(jestMatch[3])
    const failures: string[] = []
    // Jest failure lines: "  ✕ test name" or "  ● test name"
    for (const line of output.split("\n")) {
      const m = line.match(/^\s+[✕●×]\s+(.+)/)
      if (m) failures.push(m[1].trim())
    }
    return { passed, total: Math.max(total, passed + failed), failures, framework: "jest" }
  }

  // ── Pytest: "X passed" or "X passed, Y failed" ────────────────────────────
  const pytestMatch = output.match(/(\d+) passed(?:,?\s*(\d+) failed)?/)
  const pytestFail  = output.match(/(\d+) failed/)
  if (pytestMatch) {
    const passed = parseInt(pytestMatch[1])
    const failed = pytestFail ? parseInt(pytestFail[1]) : 0
    const total  = passed + failed
    const failures: string[] = []
    for (const line of output.split("\n")) {
      if (line.startsWith("FAILED ")) failures.push(line.slice(7).split(" ")[0])
    }
    return { passed, total: total || 1, failures, framework: "pytest" }
  }

  // ── No recognisable output (test runner may have crashed) ─────────────────
  return { passed: 0, total: 1, failures: ["Test runner produced no recognisable output"], framework: "unknown" }
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let submissionId = ""

  try {
    // ── Guard: E2B key must be present ────────────────────────────────────────
    if (!process.env.E2B_API_KEY) {
      return NextResponse.json(
        { error: "E2B_API_KEY is not configured. Add it to .env.local and restart. Free key at https://e2b.dev" },
        { status: 503 }
      )
    }

    const { workspaceId, studentId, lastTestCmd } = await req.json()
    if (!workspaceId || !studentId) {
      return NextResponse.json({ error: "workspaceId and studentId required" }, { status: 400 })
    }

    // If the student ran a test command themselves, prefer it (ensures grader uses exactly what they tested with)
    const SAFE_TEST_PREFIXES = ["python -m pytest", "pytest", "npx jest", "npm test", "npm run test"]
    const safeLastTestCmd = typeof lastTestCmd === "string" &&
      SAFE_TEST_PREFIXES.some((p) => lastTestCmd.trim().startsWith(p))
      ? lastTestCmd.trim()
      : null

    // ── Load workspace & assignment ───────────────────────────────────────────
    const workspace  = await getWorkspace(workspaceId)
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    if (workspace.studentId !== studentId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const assignment =
      getAssignment(workspace.assignmentId) ??
      (await getGeneratedAssignment(workspace.assignmentId))
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })

    // ── Create submission record ──────────────────────────────────────────────
    const submission = await createSubmission(studentId, workspaceId, workspace.assignmentId)
    submissionId = submission.submissionId
    await updateSubmission(submissionId, { status: "grading" })

    // ── Run E2B pipeline ──────────────────────────────────────────────────────
    // Prefer the student's last run command so grading matches what they tested
    const effectiveTestCmd = safeLastTestCmd ?? assignment.grading.testCmd
    // Ensure -s flag so print() output is captured in grading output
    const gradingTestCmd = effectiveTestCmd?.includes(" -s")
      ? effectiveTestCmd
      : effectiveTestCmd
        ? effectiveTestCmd.replace(/\s*2>&1\s*$/, "").trim() + " -s 2>&1"
        : undefined

    const pipeline = await runGradingPipeline({
      files:      workspace.files,
      installCmd: assignment.grading.installCmd,
      buildCmd:   assignment.grading.buildCmd,
      testCmd:    gradingTestCmd,
    })

    const checkResults: CheckResult[] = []

    // ── Check: syntax / build ─────────────────────────────────────────────────
    const syntaxCheck = assignment.checks.find((c) => c.id === "syntax")
    if (syntaxCheck && pipeline.buildResult) {
      const passed = pipeline.buildResult.exitCode === 0
      const errText = (pipeline.buildResult.stderr || pipeline.buildResult.stdout).slice(0, 500)
      checkResults.push({
        id:       syntaxCheck.id,
        label:    syntaxCheck.label,
        weight:   syntaxCheck.weight,
        score:    passed ? syntaxCheck.weight : 0,
        passed,
        feedback: passed ? "Code is syntactically valid." : `Syntax / load error:\n${errText}`,
        raw:      errText,
      })
    }

    // ── Check: tests ──────────────────────────────────────────────────────────
    const testCheck = assignment.checks.find((c) => c.id === "tests")
    if (testCheck && pipeline.testResult) {
      const rawOut = pipeline.testResult.stdout + "\n" + pipeline.testResult.stderr
      const { passed: passedTests, total, failures, framework } = parseTestOutput(rawOut)
      const passRate = total > 0 ? passedTests / total : 0
      const score    = Math.round(passRate * testCheck.weight)

      let feedback = `${passedTests}/${total} tests passed (${Math.round(passRate * 100)}%) — ${framework}.`
      if (failures.length > 0) feedback += `\nFailing: ${failures.slice(0, 4).join(", ")}`
      if (framework === "unknown") feedback = "Test runner crashed or produced no output. Check that your test file exists and imports correctly."

      checkResults.push({
        id:      testCheck.id,
        label:   testCheck.label,
        weight:  testCheck.weight,
        score,
        passed:  passRate >= 0.7,
        feedback,
        raw:     rawOut.slice(0, 2500),
      })
    }

    // ── Required-gate: if syntax fails and check is required, zero out downstream ─
    const syntaxPassed  = checkResults.find((c) => c.id === "syntax")?.passed ?? true
    const mainContent   = workspace.files[assignment.grading.entryFile] ?? "(not found)"
    const syntaxRequired = assignment.checks.find((c) => c.id === "syntax")?.required ?? false
    if (!syntaxPassed && syntaxRequired) {
      // Still run Gemma for feedback, but note the syntax failure prominently
      console.log("[sose/submit] Syntax check failed — downstream scores penalised")
    }

    // ── Detect stub-only submission (nothing implemented) ─────────────────────
    // Handles both Python (# TODO) and JavaScript (// TODO) stubs
    const pythonStubs = (mainContent.match(/# TODO: implement/g) || []).length
    const jsStubs     = (mainContent.match(/\/\/ TODO: implement/g) || []).length
    const isStubOnly  = (pythonStubs >= 3) || (jsStubs >= 3)
    if (isStubOnly) {
      console.log("[sose/submit] Stub-only submission detected — skipping Gemma synthesis")
      const qualityCheck2 = assignment.checks.find((c) => c.id === "quality")
      const designCheck2  = assignment.checks.find((c) => c.id === "design")
      if (qualityCheck2) checkResults.push({ id: qualityCheck2.id, label: qualityCheck2.label, weight: qualityCheck2.weight, score: 0, passed: false, feedback: "No implementation detected — starter code was returned unchanged." })
      if (designCheck2)  checkResults.push({ id: designCheck2.id,  label: designCheck2.label,  weight: designCheck2.weight,  score: 0, passed: false, feedback: "No implementation detected." })
      const totalScore2 = Math.min(100, checkResults.reduce((s, c) => s + c.score, 0))
      await updateSubmission(submissionId, { status: "complete", score: totalScore2, checkResults, summary: "The submission appears to be the unchanged starter code. Implement the required functions and resubmit.", strengths: ["Starter code structure is in place"], improvements: ["Implement all functions marked with TODO", "Run the test suite to verify your implementation"], encouragement: "Start with one function at a time — the tests will guide you!", gradedAt: Date.now() })
      return NextResponse.json({ submissionId, score: totalScore2, checkResults, summary: "The submission appears to be the unchanged starter code. Implement the required functions and resubmit.", strengths: ["Starter code structure is in place"], improvements: ["Implement all functions marked with TODO", "Run the test suite locally first"], encouragement: "Start with one function at a time — the tests will guide you!" })
    }

    // ── Gemma synthesis ───────────────────────────────────────────────────────
    const buildPassed  = syntaxPassed
    const testScore    = checkResults.find((c) => c.id === "tests")?.score   ?? 0
    const testWeight   = checkResults.find((c) => c.id === "tests")?.weight  ?? 50
    const testOutput   = pipeline.testResult?.stdout?.slice(0, 1200) ?? "No test output"
    const qualityCheck = assignment.checks.find((c) => c.id === "quality")
    const designCheck  = assignment.checks.find((c) => c.id === "design")
    const lang         = assignment.language === "javascript" ? "JavaScript" : "Python"

    const synthesis = await gemmaJSON(
      [
        {
          role: "system",
          content:
            "You are Athena's senior software engineering instructor. Grade the code concisely and specifically. Return valid JSON only, no markdown fences.",
        },
        {
          role: "user",
          content: `Grade this ${lang} submission for: "${assignment.title}"

EXPECTED BEHAVIOUR:
${assignment.grading.expectedBehaviourDesc}

RUBRIC NOTES:
${assignment.grading.rubric.slice(0, 700)}

STUDENT CODE (${assignment.grading.entryFile}):
\`\`\`${assignment.language}
${mainContent.slice(0, 2200)}
\`\`\`

TEST RESULTS:
${testOutput}

AUTOMATED SCORES SO FAR:
- Build/syntax: ${buildPassed ? "pass" : "fail"}
- Tests: ${testScore}/${testWeight} pts

Now score:
- qualityScore (0–${qualityCheck?.weight ?? 25}): naming, structure, error handling, readability, edge-case coverage
- designScore (0–${designCheck?.weight ?? 15}): algorithm correctness, data structure choices, OOP design, logic

Write:
- summary: 2–3 sentences, specific to this code (not generic praise)
- strengths: 2–3 concrete things done well
- improvements: 1–3 specific, actionable fixes
- encouragement: 1 warm, concrete sentence

Return ONLY this JSON object:
{"qualityScore":<n>,"designScore":<n>,"summary":"<s>","strengths":["<s>"],"improvements":["<s>"],"encouragement":"<s>"}`,
        },
      ],
      SynthesisSchema,
      { temperature: 0 }
    )

    // ── Add LLM-scored checks ─────────────────────────────────────────────────
    if (qualityCheck) {
      const score = Math.min(Math.round(synthesis.qualityScore), qualityCheck.weight)
      checkResults.push({
        id: qualityCheck.id, label: qualityCheck.label, weight: qualityCheck.weight,
        score, passed: score >= qualityCheck.weight * 0.6,
        feedback: "AI-assessed code quality, naming, structure, and error handling.",
      })
    }
    if (designCheck) {
      const score = Math.min(Math.round(synthesis.designScore), designCheck.weight)
      checkResults.push({
        id: designCheck.id, label: designCheck.label, weight: designCheck.weight,
        score, passed: score >= designCheck.weight * 0.6,
        feedback: "AI-assessed algorithm design and data structure choices.",
      })
    }

    const totalScore = Math.min(100, checkResults.reduce((s, c) => s + c.score, 0))

    // ── Persist ───────────────────────────────────────────────────────────────
    await updateSubmission(submissionId, {
      status:        "complete",
      score:         totalScore,
      checkResults,
      summary:       synthesis.summary,
      strengths:     synthesis.strengths,
      improvements:  synthesis.improvements,
      encouragement: synthesis.encouragement,
      gradedAt:      Date.now(),
    })

    return NextResponse.json({
      submissionId, score: totalScore, checkResults,
      summary: synthesis.summary, strengths: synthesis.strengths,
      improvements: synthesis.improvements, encouragement: synthesis.encouragement,
    })
  } catch (err) {
    console.error("[sose/submit]", err)
    const message = err instanceof Error ? err.message : "Grading failed"
    if (submissionId) {
      await updateSubmission(submissionId, { status: "error", errorMessage: message }).catch(() => {})
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
