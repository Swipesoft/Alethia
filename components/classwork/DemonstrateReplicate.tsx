"use client"

import { useState } from "react"
import type { Classwork, Faculty } from "@/lib/types"
import { Judge0Terminal } from "./Judge0Terminal"
import { detectLanguage } from "@/lib/detect-language"
import { ChatMessage } from "@/components/shared/ChatMessage"

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
  const [demoLanguage, setDemoLanguage] = useState(
    detectLanguage(classwork.demonstrationCode ?? classwork.starterCode ?? "")
  )
  const [studentLanguage, setStudentLanguage] = useState(
    detectLanguage(classwork.starterCode ?? classwork.demonstrationCode ?? "")
  )

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

  // ─── Result screen ──────────────────────────────────────────────────────────
  if (phase === "result" && score !== null) {
    return (
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
    )
  }

  // ─── Watch phase — full-width demo ──────────────────────────────────────────
  if (phase === "watch") {
    return (
      <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ padding: "1rem 1.25rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: "var(--radius-sm)" }}>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--accent)", marginBottom: "0.5rem" }}>TUTOR DEMONSTRATION</p>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Study this example carefully. When you move to your turn, the demo stays visible on the left so you can refer to it while you type.
          </p>
        </div>

        {classwork.demonstrationExplanation && (
          <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.8, padding: "0 0.25rem" }}>
            <ChatMessage content={classwork.demonstrationExplanation} />
          </div>
        )}

        {classwork.demonstrationCode && (
          <Judge0Terminal
            code={classwork.demonstrationCode}
            language={demoLanguage}
            readOnly={true}
            taskContext={classwork.prompt}
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
    )
  }

  // ─── Replicate phase — split screen ────────────────────────────────────────
  return (
    <div className="animate-fade-up" style={{ display: "flex", gap: "1.5rem", minHeight: "520px" }}>
      {/* Left — tutor reference (read-only, collapsible) */}
      <div style={{
        flex: "0 0 48%",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        minWidth: 0,
      }}>
        <div style={{
          padding: "0.5rem 0.875rem",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--accent)" }}>TUTOR REFERENCE</p>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>read-only — refer to this as you type</p>
          </div>
          <button
            className="btn-ghost"
            onClick={() => setPhase("watch")}
            style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}
          >
            full view
          </button>
        </div>

        {classwork.demonstrationCode ? (
          <Judge0Terminal
            code={classwork.demonstrationCode}
            language={demoLanguage}
            readOnly={true}
            taskContext={classwork.prompt}
          />
        ) : (
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No demonstration code provided.</p>
          </div>
        )}
      </div>

      {/* Right — student workspace */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 0 }}>
        <div style={{
          padding: "0.5rem 0.875rem",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid #6ee7b7",
          borderRadius: "var(--radius-sm)",
        }}>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#6ee7b7" }}>YOUR REPLICATION</p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            type it yourself — don't copy-paste
          </p>
        </div>

        <Judge0Terminal
          code={studentCode}
          language={studentLanguage}
          onCodeChange={setStudentCode}
          onResult={(r) => setExecutionResult(r)}
          onLanguageChange={setStudentLanguage}
          taskContext={classwork.prompt}
        />

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
    </div>
  )
}
