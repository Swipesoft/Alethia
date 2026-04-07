"use client"

import { useState } from "react"
import type { Classwork, Faculty } from "@/lib/types"
import { Judge0Terminal } from "./Judge0Terminal"

type Props = {
  classwork: Classwork
  studentId: string
  moduleId: string
  faculty: Faculty
  onComplete: (score: number, feedback: string) => void
}

type Phase = "watch" | "replicate" | "result"

export function DemonstrateReplicate({ classwork, studentId, moduleId, faculty, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("watch")
  const [studentCode, setStudentCode] = useState(classwork.starterCode ?? "")
  const [executionResult, setExecutionResult] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const language = faculty === "stem" ? "python" : "python"

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)

    try {
      const res = await fetch("/api/classwork/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          moduleId,
          classworkId: classwork.classworkId,
          studentAnswer: studentCode,
          executionResult,
        }),
      })
      const data = await res.json()
      setScore(data.score)
      setFeedback(data.feedback)
      setPhase("result")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Phase tabs */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {[
          { id: "watch" as Phase, label: "1. Watch Demo" },
          { id: "replicate" as Phase, label: "2. Your Turn" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => phase !== "result" && setPhase(tab.id)}
            style={{
              background: phase === tab.id ? "var(--accent-dim)" : "var(--bg-elevated)",
              border: `1px solid ${phase === tab.id ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "var(--radius-sm)",
              padding: "0.5rem 1.25rem",
              color: phase === tab.id ? "var(--accent)" : "var(--text-secondary)",
              fontFamily: "DM Mono, monospace",
              fontSize: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Watch phase — tutor demonstration */}
      {phase === "watch" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ padding: "1rem 1.25rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: "var(--radius-sm)" }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--accent)", marginBottom: "0.5rem" }}>TUTOR DEMONSTRATION</p>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Study this example carefully before attempting it yourself.
            </p>
          </div>

          {classwork.demonstrationExplanation && (
            <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.8, padding: "0 0.25rem" }}>
              {classwork.demonstrationExplanation}
            </div>
          )}

          {classwork.demonstrationCode && (
            <Judge0Terminal
              code={classwork.demonstrationCode}
              language={language}
              readOnly={true}
            />
          )}

          <button
            className="btn-primary"
            onClick={() => setPhase("replicate")}
            style={{ alignSelf: "flex-end" }}
          >
            I've studied this — now my turn →
          </button>
        </div>
      )}

      {/* Replicate phase — student's turn */}
      {phase === "replicate" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ padding: "1rem 1.25rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderLeft: "3px solid #6ee7b7", borderRadius: "var(--radius-sm)" }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#6ee7b7", marginBottom: "0.4rem" }}>YOUR TURN</p>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Replicate the pattern from the demonstration. Don't just copy — type it yourself to build muscle memory.
            </p>
          </div>

          <Judge0Terminal
            code={studentCode}
            language={language}
            onCodeChange={setStudentCode}
            onResult={(r) => setExecutionResult(r)}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button className="btn-ghost" onClick={() => setPhase("watch")} style={{ fontSize: "0.875rem" }}>
              ← Review Demo
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !studentCode.trim()}
              style={{ opacity: submitting || !studentCode.trim() ? 0.4 : 1 }}
            >
              {submitting ? "Grading..." : "Submit →"}
            </button>
          </div>
        </div>
      )}

      {/* Result phase */}
      {phase === "result" && score !== null && (
        <div className="animate-fade-up surface glow-border" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", fontFamily: "Playfair Display, serif", fontWeight: 900, color: score >= 60 ? "#6ee7b7" : "var(--accent)" }}>
            {score}<span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/100</span>
          </div>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: "480px" }}>
            {feedback}
          </p>
          <button className="btn-primary" onClick={() => onComplete(score, feedback ?? "")}>
            Continue →
          </button>
        </div>
      )}
    </div>
  )
}
