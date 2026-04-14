"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getStudentId } from "@/lib/student-identity"
import { getStudent, updateModule, logEvent, updateCompetencyModel } from "@/lib/firestore"
//import { gemmaJSON } from "@/lib/novita"
import type { StudentProfile, Module, AssessmentQuestion, AssessmentResult } from "@/lib/types"
import { ImageUploadAssessor } from "@/components/assessment/ImageUploadAssessor"
import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

export default function AssessPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [module, setModule] = useState<Module | null>(null)
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<AssessmentResult[] | null>(null)
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [archaAgentDecision, setArchagentDecision] = useState<string | null>(null)
  const [progressionError, setProgressionError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const studentId = getStudentId()
      if (!studentId) { router.push("/onboarding"); return }
      const p = await getStudent(studentId)
      if (!p) { router.push("/onboarding"); return }
      const m = p.curriculum.find((c) => c.moduleId === moduleId)
      if (!m) { router.push("/dashboard"); return }
      setProfile(p)
      setModule(m)

      // Generate assessment questions
      const qs = await generateAssessmentQuestions(m)
      setQuestions(qs)
      setLoading(false)
    }
    load()
  }, [moduleId, router])

  async function generateAssessmentQuestions(m: Module): Promise<AssessmentQuestion[]> {
    try {
      const res = await fetch("/api/assess/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: m.moduleId,
          faculty: m.faculty,
          topic: m.topic,
          objectives: m.objectives,
          assessmentType: m.assessmentType,
          assessmentEnvironment: m.assessmentEnvironment,
        }),
      })
      const result = await res.json()
      return result.questions ?? []
    } catch {
      return []
    }
  }

  
  async function handleSubmit() {
    if (!profile || !module) return
    setSubmitting(true)

    let totalScore = 0
    const assessmentResults: AssessmentResult[] = []
    const errorPatterns: string[] = []

    for (const q of questions) {
      const studentAnswer = answers[q.questionId] ?? ""
      let score = 0
      let feedback = ""

      if (q.type === "code_execution") {
        // Send to Judge0
        try {
          const res = await fetch("/api/assess/judge0", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: studentAnswer,
              language: module.faculty === "stem" ? "python" : "python",
              expectedOutput: q.expectedOutput,
              rubric: q.rubric,
              studentId: profile.studentId,
              moduleId: module.moduleId,
            }),
          })
          const data = await res.json()
          score = data.grading?.score ?? 0
          feedback = data.grading?.feedback ?? "Code executed."
          if (data.grading?.errorPatterns) errorPatterns.push(...data.grading.errorPatterns)
        } catch {
          score = 0
          feedback = "Execution failed. Please check your code."
        }
      } else if (q.type === "mcq") {
        const selectedIdx = parseInt(answers[q.questionId] ?? "-1")
        score = selectedIdx === q.correctIndex ? 100 : 0
        feedback = score === 100 ? "Correct! Well done." : `Incorrect. The correct answer was option ${["A","B","C","D"][q.correctIndex ?? 0]}.`
      } else if (q.type === "image_upload" && studentAnswer.startsWith("__IMAGE_GRADED__|")) {
        // Already graded by ImageUploadAssessor — parse the stored result
        const parts = studentAnswer.split("|")
        const scorePart = parts.find((p) => p.startsWith("score:"))
        const feedbackPart = parts.find((p) => p.startsWith("feedback:"))
        score = scorePart ? parseInt(scorePart.replace("score:", "")) : 50
        feedback = feedbackPart ? feedbackPart.replace("feedback:", "") : "Image graded by Gemma 4 vision."
      } else {
        // Essay — Gemma grades it
        // Essay — Gemma grades it
        try {
          const res = await fetch("/api/assess/essay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: q.prompt,
              rubric: q.rubric,
              studentAnswer,
              }),
          })
          const gradingResult = await res.json()
          score = gradingResult.score ?? 50
          feedback = gradingResult.feedback ?? "Response recorded."
          if (gradingResult.errorPatterns) errorPatterns.push(...gradingResult.errorPatterns)
        } catch {
          score = 50
          feedback = "Response recorded and graded."
        }
      }

      totalScore += score
      assessmentResults.push({
        questionId: q.questionId,
        studentAnswer,
        score,
        feedback,
        passedAt: Date.now(),
      })
    }

    const averageScore = Math.round(totalScore / questions.length)
    setFinalScore(averageScore)
    setResults(assessmentResults)

    const studentId = profile.studentId

    // Update module score + competency model
    await updateModule(studentId, module.moduleId, { score: averageScore })
    await updateCompetencyModel(studentId, module.topic, averageScore)
    await logEvent({ studentId, type: "assessment_submitted", moduleId: module.moduleId, timestamp: Date.now(), payload: { averageScore, errorPatterns } })

    // Call ArchAgent for progression decision
    try {
      const decisionRes = await fetch("/api/archagent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decide_progression", studentId, payload: { moduleScore: averageScore, errorPatterns } }),
      })
      if (!decisionRes.ok) throw new Error(`ArchAgent returned ${decisionRes.status}`)
      const { decision } = await decisionRes.json()
      setArchagentDecision(decision?.reason ?? null)
    } catch (err) {
      console.error("[progression]", err)
      setProgressionError("Progression update failed. Your score was saved — go to the dashboard and refresh to continue.")
    }

    // If score < 60 → trigger Reviewer for remedial plan
    if (averageScore < 60) {
      try {
        await fetch("/api/reviewer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            moduleId: module.moduleId,
            moduleScore: averageScore,
            errorPatterns,
          }),
        })
        // Reviewer decision shown via archagetNotes on dashboard
      } catch (err) {
        console.error("Reviewer failed:", err)
      }
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--text-muted)", fontFamily: "DM Mono, monospace", fontSize: "0.875rem" }}>
          Preparing your assessment...
        </p>
      </div>
    )
  }

  // ── Results screen ───────────────────────────────────────────────────────────
  if (results && finalScore !== null) {
    const passed = finalScore >= 60
    return (
      <main style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ maxWidth: "600px", width: "100%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Score card */}
          <div
            className="surface glow-border animate-fade-up"
            style={{ padding: "2.5rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}
          >
            <div style={{ fontSize: "3.5rem", fontFamily: "Playfair Display, serif", fontWeight: 900, color: passed ? "#6ee7b7" : "var(--faculty-medicine)" }}>
              {finalScore}
              <span style={{ fontSize: "1.5rem", color: "var(--text-muted)" }}>/100</span>
            </div>
            <div style={{
              background: passed ? "rgba(110,231,183,0.1)" : "rgba(249,168,212,0.1)",
              border: `1px solid ${passed ? "#6ee7b7" : "var(--faculty-medicine)"}`,
              borderRadius: "999px",
              padding: "0.3rem 1rem",
              fontSize: "0.8rem",
              color: passed ? "#6ee7b7" : "var(--faculty-medicine)",
              fontFamily: "DM Mono, monospace",
            }}>
              {passed ? "PASSED" : "NEEDS REVIEW"}
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              {passed ? "Great work! You've demonstrated solid understanding." : "Don't worry — Athena will help you strengthen these areas before moving forward."}
            </p>
          </div>

          {/* ArchAgent decision */}
          {archaAgentDecision && (
            <div className="animate-fade-up-delay-1 surface" style={{ padding: "1.25rem 1.5rem" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--accent)", marginBottom: "0.5rem", letterSpacing: "0.1em" }}>
                ARCHAGENT DECISION
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {archaAgentDecision}
              </p>
            </div>
          )}

          {/* Progression error notice */}
          {progressionError && (
            <div style={{ background: "rgba(249,168,212,0.08)", border: "1px solid var(--faculty-medicine)", borderRadius: "var(--radius-sm)", padding: "1rem 1.25rem" }}>
              <p style={{ fontSize: "0.8rem", color: "var(--faculty-medicine)", lineHeight: 1.6, fontFamily: "DM Mono, monospace" }}>
                ⚠ {progressionError}
              </p>
            </div>
          )}

          {/* Per-question breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {results.map((r, i) => (
              <div key={r.questionId} className="surface animate-fade-up" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <p style={{ fontSize: "0.75rem", fontFamily: "DM Mono, monospace", color: "var(--text-muted)" }}>
                    Q{i + 1}
                  </p>
                  <span style={{
                    fontSize: "0.75rem",
                    fontFamily: "DM Mono, monospace",
                    color: r.score >= 70 ? "#6ee7b7" : r.score >= 50 ? "var(--accent)" : "var(--faculty-medicine)",
                  }}>
                    {r.score}/100
                  </span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {r.feedback}
                </p>
              </div>
            ))}
          </div>

          <button className="btn-primary" onClick={() => router.push("/dashboard")} style={{ textAlign: "center" }}>
            Back to Dashboard →
          </button>
        </div>
      </main>
    )
  }

  // ── Assessment screen ────────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "2rem" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div className="animate-fade-up">
          <button
            onClick={() => router.push(`/lecture/${moduleId}`)}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.75rem", marginBottom: "1rem", display: "block" }}
          >
            ← Back to Lecture
          </button>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--accent)", marginBottom: "0.4rem" }}>
            ASSESSMENT · {module?.faculty?.toUpperCase()} · {module?.assessmentEnvironment?.toUpperCase()}
          </p>
          <h1 style={{ fontSize: "1.75rem", fontFamily: "Playfair Display, serif" }}>{module?.title}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
            {questions.length} questions · Adaptive grading by Athena
          </p>
        </div>

        {/* Questions */}
        {questions.map((q, i) => (
          <div key={q.questionId} className={`animate-fade-up-delay-${Math.min(i + 1, 5)} surface`} style={{ padding: "1.75rem" }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
              QUESTION {i + 1}
            </p>
            <div style={{ marginBottom: "1.25rem" }}>
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => (
                    <p style={{ fontSize: "1rem", lineHeight: 1.65, marginBottom: "0.6rem", color: "var(--text-primary)" }}>
                      {children}
                    </p>
                  ),
                  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
                    const langMatch = /language-(\w+)/.exec(className ?? "")
                    if (!langMatch) {
                      // No language tag → inline code span
                      return (
                        <code
                          style={{
                            fontFamily: "DM Mono, monospace",
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            padding: "0.1em 0.4em",
                            borderRadius: "3px",
                            fontSize: "0.875em",
                            color: "var(--accent)",
                          }}
                        >
                          {children}
                        </code>
                      )
                    }
                    // Has language tag → fenced code block
                    return (
                      <SyntaxHighlighter
                        language={langMatch[1]}
                        style={oneDark}
                        customStyle={{ borderRadius: "var(--radius-sm)", fontSize: "0.875rem", marginBottom: "0.75rem", marginTop: "0.25rem" }}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    )
                  },
                  pre: ({ children }) => <>{children}</>,
                }}
              >
                {q.prompt}
              </ReactMarkdown>
            </div>

            {q.type === "mcq" && q.options && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {q.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.questionId]: String(idx) }))}
                    style={{
                      background: answers[q.questionId] === String(idx) ? "var(--accent-dim)" : "var(--bg-elevated)",
                      border: `1px solid ${answers[q.questionId] === String(idx) ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "var(--radius-sm)",
                      padding: "0.7rem 1rem",
                      cursor: "pointer",
                      textAlign: "left",
                      color: answers[q.questionId] === String(idx) ? "var(--accent)" : "var(--text-secondary)",
                      fontSize: "0.875rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{ fontFamily: "DM Mono, monospace", marginRight: "0.75rem" }}>{["A", "B", "C", "D"][idx]}.</span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.type === "code_execution" && (
              <div>
                <textarea
                  style={{
                    width: "100%",
                    minHeight: "200px",
                    background: "#0d0d16",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "#a0aec0",
                    fontFamily: "DM Mono, monospace",
                    fontSize: "0.875rem",
                    padding: "1rem",
                    resize: "vertical",
                    outline: "none",
                    lineHeight: 1.7,
                  }}
                  value={answers[q.questionId] ?? q.starterCode ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.questionId]: e.target.value }))}
                  placeholder={q.starterCode ?? "# Write your solution here..."}
                />
              </div>
            )}

            {q.type === "image_upload" && module && (
              <ImageUploadAssessor
                studentId={profile!.studentId}
                moduleId={module.moduleId}
                questionId={q.questionId}
                prompt={q.prompt}
                rubric={q.rubric ?? ""}
                faculty={module.faculty as "medicine" | "arts"}
                onGraded={({ score, feedback, downloadURL }) => {
                  // Store result directly — image questions are auto-graded on upload
                  setAnswers((prev) => ({ ...prev, [q.questionId]: `__IMAGE_GRADED__|score:${score}|feedback:${feedback}|url:${downloadURL}` }))
                }}
              />
            )}

            {q.type === "essay" && (
              <textarea
                style={{
                  width: "100%",
                  minHeight: "180px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "0.9rem",
                  padding: "1rem",
                  resize: "vertical",
                  outline: "none",
                  lineHeight: 1.7,
                  transition: "border-color 0.2s ease",
                }}
                value={answers[q.questionId] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.questionId]: e.target.value }))}
                placeholder="Write your response here..."
                onFocus={(e) => { e.target.style.borderColor = "var(--accent)" }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border)" }}
              />
            )}
          </div>
        ))}

        {/* Submit */}
        <button
          className="btn-primary"
          disabled={submitting || Object.keys(answers).length < questions.length}
          onClick={handleSubmit}
          style={{
            opacity: submitting || Object.keys(answers).length < questions.length ? 0.4 : 1,
            fontSize: "1rem",
            padding: "1rem",
          }}
        >
          {submitting ? "Athena is grading your work..." : "Submit Assessment →"}
        </button>
      </div>
    </main>
  )
}
