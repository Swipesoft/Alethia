"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getOrCreateStudentId } from "@/lib/student-identity"
import { createStudent } from "@/lib/firestore"
import { FACULTY_META } from "@/lib/types"
import type { Faculty, LearnerPreferences } from "@/lib/types"
import { OnboardingNameSchema, OnboardingGoalsSchema } from "@/lib/schemas"

type Step = "identity" | "faculty" | "goals" | "diagnostic" | "generating"

type DiagnosticQuestion = {
  id: string
  question: string
  type: string
  options: string[]
  correctIndex: number
  difficulty: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("identity")
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState("")
  const [faculty, setFaculty] = useState<Faculty | null>(null)
  const [goals, setGoals] = useState("")
  const [goalsError, setGoalsError] = useState("")
  const [pace, setPace] = useState<LearnerPreferences["pace"]>("normal")
  const [style, setStyle] = useState<LearnerPreferences["learningStyle"]>("visual")
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [statusMsg, setStatusMsg] = useState("")

  function validateName(): boolean {
    const result = OnboardingNameSchema.safeParse({ name })
    if (!result.success) {
      setNameError(result.error.issues[0]?.message ?? "Invalid name")
      return false
    }
    setNameError("")
    return true
  }

  function validateGoals(): boolean {
    const result = OnboardingGoalsSchema.safeParse({ goals, pace, learningStyle: style })
    if (!result.success) {
      setGoalsError(result.error.issues[0]?.message ?? "Invalid goals")
      return false
    }
    setGoalsError("")
    return true
  }

  // ── Step handlers ────────────────────────────────────────────────────────────
  async function handleGoalsSubmit() {
    if (!faculty || !goals.trim()) return
    setStep("diagnostic")
    setStatusMsg("Generating your diagnostic assessment...")
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faculty, goals }),
      })
      const result = await res.json()
      setQuestions(result.questions)
    } catch {
      setStatusMsg("Failed to generate diagnostic. Please refresh.")
    }
  }

  async function handleDiagnosticSubmit() {
    if (!faculty) return
    setStep("generating")
    const correct = questions.filter((q) => answers[q.id] === q.correctIndex).length
    const diagnosticScore = Math.round((correct / questions.length) * 100)
    const preferences: LearnerPreferences = { pace, learningStyle: style, goals }
    setStatusMsg("ArchAgent is designing your personal curriculum...")
    try {
      const res = await fetch("/api/archagent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_curriculum",
          studentId: getOrCreateStudentId(),
          payload: { diagnosticScore, preferences, goals, faculty },
        }),
      })
      const { modules } = await res.json()
      const studentId = getOrCreateStudentId()
      await createStudent({
        studentId, name, faculty,
        enrolledAt: Date.now(), lastActiveAt: Date.now(),
        currentModuleIndex: 0, competencyModel: {},
        curriculum: modules, preferences, diagnosticScore,
      })
      router.push("/dashboard")
    } catch {
      setStatusMsg("Something went wrong. Please try again.")
      setStep("diagnostic")
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "2rem",
              fontWeight: 900,
              color: "var(--accent)",
            }}
          >
            Athena
          </h1>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace", marginTop: "0.25rem" }}>
            {step === "identity" && "Step 1 of 4 — Who are you?"}
            {step === "faculty" && "Step 2 of 4 — Choose your faculty"}
            {step === "goals" && "Step 3 of 4 — Your learning goals"}
            {step === "diagnostic" && "Step 4 of 4 — Diagnostic Assessment"}
            {step === "generating" && "ArchAgent at work..."}
          </p>
        </div>

        {/* ── STEP: Identity ────────────────────────────────────────────────── */}
        {step === "identity" && (
          <div className="animate-fade-up surface" style={{ padding: "2.5rem", gap: "1.5rem", display: "flex", flexDirection: "column" }}>
            <div>
              <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>What&apos;s your name?</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                No account needed. Athena will remember you via your browser.
              </p>
            </div>
            <input
              className="input-field"
              placeholder="Enter your name..."
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError("") }}
              onKeyDown={(e) => e.key === "Enter" && validateName() && setStep("faculty")}
              autoFocus
            />
            {nameError && (
              <p style={{ fontSize: "0.8rem", color: "#f9a8d4", fontFamily: "DM Mono, monospace" }}>
                ⚠ {nameError}
              </p>
            )}
            <button
              className="btn-primary"
              onClick={() => validateName() && setStep("faculty")}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP: Faculty ─────────────────────────────────────────────────── */}
        {step === "faculty" && (
          <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="surface" style={{ padding: "2rem 2.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                Hello, {name}. Choose your faculty.
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Athena will specialise your entire learning environment around this.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {(Object.entries(FACULTY_META) as Array<[Faculty, typeof FACULTY_META[Faculty]]>).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setFaculty(key)}
                  style={{
                    background: faculty === key ? "var(--accent-dim)" : "var(--bg-surface)",
                    border: `1px solid ${faculty === key ? meta.color : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    padding: "1.25rem",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                    color: "var(--text-primary)",
                  }}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{meta.icon}</div>
                  <div style={{ fontWeight: 500, marginBottom: "0.25rem", color: meta.color }}>{meta.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{meta.description}</div>
                </button>
              ))}
            </div>
            <button
              className="btn-primary"
              disabled={!faculty}
              onClick={() => setStep("goals")}
              style={{ opacity: faculty ? 1 : 0.4 }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP: Goals ───────────────────────────────────────────────────── */}
        {step === "goals" && (
          <div className="animate-fade-up surface" style={{ padding: "2.5rem", gap: "1.5rem", display: "flex", flexDirection: "column" }}>
            <div>
              <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>What&apos;s your goal?</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Be specific. The ArchAgent uses this to tailor your curriculum.
              </p>
            </div>
            <textarea
              className="input-field"
              placeholder={`e.g. "I want to master Python for data science. I already know JavaScript."`}
              value={goals}
              onChange={(e) => { setGoals(e.target.value); setGoalsError("") }}
              rows={3}
              style={{ resize: "none" }}
            />
            {goalsError && (
              <p style={{ fontSize: "0.8rem", color: "#f9a8d4", fontFamily: "DM Mono, monospace" }}>
                ⚠ {goalsError}
              </p>
            )}
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace", display: "block", marginBottom: "0.5rem" }}>
                  PACE
                </label>
                <select
                  className="input-field"
                  value={pace}
                  onChange={(e) => setPace(e.target.value as LearnerPreferences["pace"])}
                  style={{ cursor: "pointer" }}
                >
                  <option value="slow">Slow & thorough</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Fast-paced</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace", display: "block", marginBottom: "0.5rem" }}>
                  STYLE
                </label>
                <select
                  className="input-field"
                  value={style}
                  onChange={(e) => setStyle(e.target.value as LearnerPreferences["learningStyle"])}
                  style={{ cursor: "pointer" }}
                >
                  <option value="visual">Visual</option>
                  <option value="textual">Textual</option>
                  <option value="hands-on">Hands-on</option>
                </select>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={() => validateGoals() && handleGoalsSubmit()}
            >
              Generate Diagnostic →
            </button>
          </div>
        )}

        {/* ── STEP: Diagnostic ──────────────────────────────────────────────── */}
        {step === "diagnostic" && (
          <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {questions.length === 0 ? (
              <div className="surface" style={{ padding: "2.5rem", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "1rem", animation: "spin 1s linear infinite" }}>⏳</div>
                <p style={{ color: "var(--text-secondary)" }}>{statusMsg}</p>
              </div>
            ) : (
              <>
                <div className="surface" style={{ padding: "2rem 2.5rem" }}>
                  <h2 style={{ fontSize: "1.4rem", marginBottom: "0.4rem" }}>Quick Diagnostic</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    5 questions to calibrate your starting point. No pressure — honest answers give better results.
                  </p>
                </div>
                {questions.map((q, i) => (
                  <div key={q.id} className="surface" style={{ padding: "1.5rem" }}>
                    <p style={{ fontWeight: 400, marginBottom: "1rem", lineHeight: 1.5 }}>
                      <span style={{ color: "var(--accent)", fontFamily: "DM Mono, monospace", fontSize: "0.75rem", marginRight: "0.5rem" }}>Q{i + 1}</span>
                      {q.question}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {q.options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                          style={{
                            background: answers[q.id] === idx ? "var(--accent-dim)" : "var(--bg-elevated)",
                            border: `1px solid ${answers[q.id] === idx ? "var(--accent)" : "var(--border)"}`,
                            borderRadius: "var(--radius-sm)",
                            padding: "0.6rem 1rem",
                            cursor: "pointer",
                            textAlign: "left",
                            color: answers[q.id] === idx ? "var(--accent)" : "var(--text-secondary)",
                            fontSize: "0.875rem",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {["A", "B", "C", "D"][idx]}. {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  className="btn-primary"
                  disabled={Object.keys(answers).length < questions.length}
                  onClick={handleDiagnosticSubmit}
                  style={{ opacity: Object.keys(answers).length < questions.length ? 0.4 : 1 }}
                >
                  Submit & Build My Curriculum →
                </button>
              </>
            )}
          </div>
        )}

        {/* ── STEP: Generating ──────────────────────────────────────────────── */}
        {step === "generating" && (
          <div className="animate-fade-up surface glow-border" style={{ padding: "3rem 2.5rem", textAlign: "center", gap: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: "3rem" }}>🏛️</div>
            <h2 style={{ fontSize: "1.4rem" }}>Athena is working...</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {statusMsg}
            </p>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    animation: `fade-in 0.6s ease ${i * 0.2}s infinite alternate`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
