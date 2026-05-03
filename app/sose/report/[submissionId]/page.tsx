"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getSubmission, getGeneratedAssignment } from "@/lib/firestore-sose"
import { getAssignment } from "@/data/sose-assignments"
import type { SoSESubmission, SoSEAssignment, GeneratedAssignment, CheckResult } from "@/lib/types-sose"

// ─── Score ring SVG ───────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference
  const color = score >= 80 ? "#6ee7b7" : score >= 60 ? "#fbbf24" : "#f9a8d4"

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {/* Track */}
      <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      {/* Progress */}
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        strokeDashoffset={circumference * 0.25}   // start from top
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      {/* Score text */}
      <text x="70" y="65" textAnchor="middle" fill={color} fontSize="26" fontWeight="700" fontFamily="Playfair Display, serif">
        {score}
      </text>
      <text x="70" y="83" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="11" fontFamily="DM Mono, monospace">
        / 100
      </text>
    </svg>
  )
}

// ─── Check result row ─────────────────────────────────────────────────────────
function CheckRow({ check }: { check: CheckResult }) {
  const pct = check.weight > 0 ? (check.score / check.weight) * 100 : 0
  const color = check.passed ? "#6ee7b7" : check.score > 0 ? "#fbbf24" : "#f9a8d4"

  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "0.625rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <span style={{ fontSize: "1rem" }}>{check.passed ? "✓" : check.score > 0 ? "◐" : "✗"}</span>
          <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500 }}>
            {check.label}
          </span>
        </div>
        <span
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: "0.82rem",
            color,
          }}
        >
          {check.score}/{check.weight} pts
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: "4px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: "2px",
            transition: "width 0.8s ease",
          }}
        />
      </div>

      {/* Feedback */}
      {check.feedback && (
        <p
          style={{
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            fontFamily: "DM Mono, monospace",
          }}
        >
          {check.feedback}
        </p>
      )}

      {/* Raw output (collapsed) */}
      {check.raw && (
        <details style={{ marginTop: "0.25rem" }}>
          <summary
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              cursor: "pointer",
              userSelect: "none",
              letterSpacing: "0.06em",
            }}
          >
            Raw output
          </summary>
          <pre
            style={{
              marginTop: "0.5rem",
              padding: "0.75rem",
              background: "#07070e",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              fontFamily: "DM Mono, monospace",
              fontSize: "0.72rem",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {check.raw}
          </pre>
        </details>
      )}
    </div>
  )
}

// ─── Main report page ─────────────────────────────────────────────────────────
export default function ReportPage() {
  const router = useRouter()
  const params = useParams()
  const submissionId = params.submissionId as string

  const [submission, setSubmission] = useState<SoSESubmission | null>(null)
  const [assignment, setAssignment] = useState<SoSEAssignment | GeneratedAssignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null

    async function load() {
      try {
        const sub = await getSubmission(submissionId)
        if (!sub) { setError("Submission not found."); setLoading(false); return }
        setSubmission(sub)
        const a = getAssignment(sub.assignmentId) ?? await getGeneratedAssignment(sub.assignmentId)
        if (a) setAssignment(a)
        setLoading(false)

        // If still grading, poll every 4 seconds until complete or error
        if (sub.status === "grading" || sub.status === "queued") {
          pollTimer = setInterval(async () => {
            try {
              const updated = await getSubmission(submissionId)
              if (!updated) return
              setSubmission(updated)
              if (updated.status === "complete" || updated.status === "error") {
                if (pollTimer) clearInterval(pollTimer)
              }
            } catch { /* keep polling */ }
          }, 4000)
        }
      } catch {
        setError("Failed to load report.")
        setLoading(false)
      }
    }
    load()
    return () => { if (pollTimer) clearInterval(pollTimer) }
  }, [submissionId])

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "2px solid var(--border)",
            borderTopColor: "#6ee7b7",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Loading report…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Grading in progress ──────────────────────────────────────────────────────
  if (!loading && submission && (submission.status === "grading" || submission.status === "queued")) {
    return (
      <>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ width: "48px", height: "48px", border: "2px solid var(--border)", borderTopColor: "#6ee7b7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              Grading in progress…
            </p>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              {assignment?.title ?? "Your submission"} is being evaluated
            </p>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.3rem", animation: "pulse 2s ease-in-out infinite" }}>
              Checking every 4 seconds…
            </p>
          </div>
          <button onClick={() => router.push("/sose")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.72rem" }}>
            ← Back to assignments
          </button>
        </div>
      </>
    )
  }

  // ── Error state ───────────────────────────────────────────────────────────────
  if (!loading && submission?.status === "error") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: "480px", padding: "2rem" }}>
          <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1.25rem", fontWeight: 600, color: "#f9a8d4", marginBottom: "0.75rem" }}>Grading failed</p>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            {submission.errorMessage ?? "An unexpected error occurred during grading. Please check your E2B API key and try again."}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button className="btn-primary" style={{ background: "#6ee7b7", fontSize: "0.875rem" }} onClick={() => router.push(`/sose/workspace/${submission.workspaceId}`)}>
              Back to Workspace
            </button>
            <button className="btn-ghost" style={{ fontSize: "0.875rem" }} onClick={() => router.push("/sose")}>
              All assignments
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#f9a8d4", marginBottom: "1rem" }}>{error ?? "Not found"}</p>
          <button className="btn-primary" onClick={() => router.push("/sose")}>Back to SoSE</button>
        </div>
      </div>
    )
  }

  const score = submission.score ?? 0
  const scoreColor = score >= 80 ? "#6ee7b7" : score >= 60 ? "#fbbf24" : "#f9a8d4"
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F"
  const gradeLabel =
    score >= 90 ? "Excellent" :
    score >= 80 ? "Good" :
    score >= 70 ? "Satisfactory" :
    score >= 60 ? "Needs Work" : "Incomplete"

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
        {/* Ambient glow */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: `radial-gradient(ellipse 50% 30% at 50% -5%, ${scoreColor}0a 0%, transparent 60%)`,
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 2.5rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => router.push("/sose")}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "DM Mono, monospace",
              fontSize: "0.78rem",
              padding: "0.25rem 0",
            }}
          >
            ← Back to School of Software Engineering
          </button>

          <span
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
            }}
          >
            {new Date(submission.submittedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </header>

        {/* Body */}
        <div style={{ maxWidth: "860px", margin: "0 auto", padding: "3rem 2rem 5rem" }}>

          {/* ── Hero score section ─────────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "2.5rem",
              alignItems: "center",
              marginBottom: "3rem",
              paddingBottom: "3rem",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <ScoreRing score={score} />

            <div>
              <p
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: "0.68rem",
                  color: "var(--text-muted)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                }}
              >
                {assignment?.title ?? "Assignment"} · Grading Report
              </p>
              <h1
                style={{
                  fontFamily: "Playfair Display, serif",
                  fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                  fontWeight: 900,
                  color: "var(--text-primary)",
                  lineHeight: 1.1,
                  marginBottom: "0.5rem",
                }}
              >
                Grade{" "}
                <em style={{ color: scoreColor, fontStyle: "italic" }}>{grade}</em>
                <span
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: "0.9rem",
                    color: "var(--text-muted)",
                    fontStyle: "normal",
                    fontWeight: 400,
                    marginLeft: "0.75rem",
                  }}
                >
                  {gradeLabel}
                </span>
              </h1>

              {/* Summary */}
              {submission.summary && (
                <p
                  style={{
                    fontSize: "1rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.75,
                    maxWidth: "540px",
                  }}
                >
                  {submission.summary}
                </p>
              )}
            </div>
          </div>

          {/* ── Strengths & improvements ───────────────────────────────────── */}
          {(submission.strengths?.length || submission.improvements?.length) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "2.5rem",
              }}
            >
              {/* Strengths */}
              {submission.strengths && submission.strengths.length > 0 && (
                <div
                  className="surface"
                  style={{ padding: "1.25rem", borderColor: "rgba(110,231,183,0.15)" }}
                >
                  <p
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: "0.65rem",
                      color: "#6ee7b7",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: "0.875rem",
                    }}
                  >
                    ✓ Strengths
                  </p>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                    {submission.strengths.map((s, i) => (
                      <li key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                        <span style={{ color: "#6ee7b7", flexShrink: 0, marginTop: "1px" }}>›</span>
                        <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {submission.improvements && submission.improvements.length > 0 && (
                <div
                  className="surface"
                  style={{ padding: "1.25rem", borderColor: "rgba(251,191,36,0.15)" }}
                >
                  <p
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: "0.65rem",
                      color: "#fbbf24",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: "0.875rem",
                    }}
                  >
                    ↑ Improvements
                  </p>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                    {submission.improvements.map((s, i) => (
                      <li key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                        <span style={{ color: "#fbbf24", flexShrink: 0, marginTop: "1px" }}>›</span>
                        <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ── Encouragement ─────────────────────────────────────────────── */}
          {submission.encouragement && (
            <div
              style={{
                padding: "1.25rem 1.5rem",
                background: "var(--accent-dim)",
                border: "1px solid var(--border-glow)",
                borderRadius: "10px",
                marginBottom: "2.5rem",
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>💡</span>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--accent)",
                  lineHeight: 1.7,
                  fontStyle: "italic",
                }}
              >
                {submission.encouragement}
              </p>
            </div>
          )}

          {/* ── Check-by-check breakdown ───────────────────────────────────── */}
          {submission.checkResults && submission.checkResults.length > 0 && (
            <section style={{ marginBottom: "3rem" }}>
              <p
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: "0.65rem",
                  color: "var(--text-muted)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: "1rem",
                }}
              >
                Grading breakdown
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {submission.checkResults.map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </div>
            </section>
          )}

          {/* ── Action buttons ─────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button
              className="btn-primary"
              style={{ background: "#6ee7b7", fontSize: "0.9rem", padding: "0.75rem 1.75rem" }}
              onClick={() => router.push(`/sose/workspace/${submission.workspaceId}`)}
            >
              Back to Workspace
            </button>
            <button
              className="btn-ghost"
              style={{ fontSize: "0.9rem", padding: "0.75rem 1.75rem" }}
              onClick={() => router.push("/sose")}
            >
              All Assignments →
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
