"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getOrCreateStudentId } from "@/lib/student-identity"
import { SOSE_ASSIGNMENTS } from "@/data/sose-assignments"
import type { SoSESubmission, SoSEWorkspace } from "@/lib/types-sose"

function ScorePill({ score, compact }: { score: number; compact?: boolean }) {
  const color = score >= 80 ? "#6ee7b7" : score >= 60 ? "#fbbf24" : "#f9a8d4"
  return (
    <span
      style={{
        fontFamily: "DM Mono, monospace",
        fontSize: compact ? "0.7rem" : "0.78rem",
        color,
        background: `${color}12`,
        border: `1px solid ${color}28`,
        borderRadius: "6px",
        padding: compact ? "0.1rem 0.45rem" : "0.18rem 0.6rem",
        flexShrink: 0,
      }}
    >
      {score}/100
    </span>
  )
}

function StatusDot({ status }: { status: SoSESubmission["status"] }) {
  const colors: Record<string, string> = {
    complete: "#6ee7b7",
    grading:  "#fbbf24",
    queued:   "#93c5fd",
    error:    "#f9a8d4",
  }
  return (
    <span
      style={{
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: colors[status] ?? "var(--text-muted)",
        flexShrink: 0,
        animation: status === "grading" ? "pulse 1s ease-in-out infinite" : "none",
      }}
    />
  )
}

export default function HistoryPage() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<SoSESubmission[]>([])
  const [workspaces,  setWorkspaces]  = useState<SoSEWorkspace[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const studentId = getOrCreateStudentId()
        const [subRes, wsRes] = await Promise.all([
          fetch(`/api/sose/submissions?studentId=${studentId}`),
          fetch(`/api/sose/workspaces?studentId=${studentId}`),
        ])
        if (subRes.ok) setSubmissions((await subRes.json()).submissions ?? [])
        if (wsRes.ok)  setWorkspaces((await wsRes.json()).workspaces ?? [])
      } catch { /* non-critical */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // Group by assignment
  const byAssignment = SOSE_ASSIGNMENTS.map((a) => ({
    assignment: a,
    attempts: submissions
      .filter((s) => s.assignmentId === a.assignmentId)
      .sort((x, y) => y.submittedAt - x.submittedAt),
  }))

  const totalAttempts  = submissions.filter((s) => s.status === "complete").length
  const bestScores     = byAssignment.map((g) => g.attempts.find((s) => s.status === "complete")?.score ?? null).filter((s) => s !== null) as number[]
  const avgScore       = bestScores.length > 0 ? Math.round(bestScores.reduce((a, b) => a + b, 0) / bestScores.length) : null
  const perfectScores  = bestScores.filter((s) => s >= 90).length

  return (
    <>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>

      <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
        {/* Glow */}
        <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 50% 30% at 50% -5%, rgba(110,231,183,0.04) 0%, transparent 60%)", pointerEvents: "none" }} />

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 2rem", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => router.push("/sose")} style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <span style={{ fontFamily: "Playfair Display, serif", fontSize: "1.25rem", fontWeight: 900, color: "var(--accent)" }}>Athena</span>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>SoSE · History</span>
          </button>
          <button onClick={() => router.push("/sose")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.72rem" }}>
            ← All assignments
          </button>
        </header>

        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 2rem 6rem" }}>

          {/* Title */}
          <div style={{ marginBottom: "3rem" }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.66rem", color: "var(--text-muted)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Submission history
            </p>
            <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.75rem" }}>
              Your progress
            </h1>
          </div>

          {/* Stats strip */}
          {!loading && totalAttempts > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "3rem" }}>
              {[
                { label: "Assignments attempted", value: bestScores.length.toString(), sub: `of ${SOSE_ASSIGNMENTS.length} total` },
                { label: "Total submissions",      value: submissions.filter(s => s.status === "complete").length.toString(), sub: "graded runs" },
                { label: "Average best score",     value: avgScore !== null ? `${avgScore}/100` : "—", sub: "across completed" },
                { label: "A-grade submissions",    value: perfectScores.toString(), sub: "score ≥ 90" },
              ].map((stat) => (
                <div key={stat.label} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.1rem" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                    {stat.label}
                  </p>
                  <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1.5rem", fontWeight: 700, color: "#6ee7b7", lineHeight: 1 }}>
                    {stat.value}
                  </p>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    {stat.sub}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", gap: "1rem", flexDirection: "column" }}>
              <div style={{ width: "32px", height: "32px", border: "2px solid var(--border)", borderTopColor: "#6ee7b7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: "var(--text-muted)" }}>Loading…</p>
            </div>
          )}

          {/* No submissions state */}
          {!loading && submissions.length === 0 && (
            <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
              <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1.5rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.75rem" }}>No submissions yet</p>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Complete an assignment and submit for grading to see your history here.</p>
              <button className="btn-primary" style={{ background: "#6ee7b7", fontSize: "0.9rem" }} onClick={() => router.push("/sose")}>
                Browse assignments →
              </button>
            </div>
          )}

          {/* Assignment groups */}
          {!loading && byAssignment.filter((g) => g.attempts.length > 0).map(({ assignment, attempts }) => {
            const bestAttempt = attempts.find((s) => s.status === "complete")
            const bestScore   = bestAttempt?.score
            const DIFF_COLORS: Record<string, string> = { beginner: "#6ee7b7", intermediate: "#fbbf24", advanced: "#f9a8d4" }

            return (
              <section key={assignment.assignmentId} style={{ marginBottom: "2.5rem" }}>
                {/* Assignment header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "0.875rem", paddingBottom: "0.875rem", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", minWidth: 0 }}>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: DIFF_COLORS[assignment.difficulty], background: `${DIFF_COLORS[assignment.difficulty]}12`, border: `1px solid ${DIFF_COLORS[assignment.difficulty]}28`, borderRadius: "999px", padding: "0.15rem 0.6rem", flexShrink: 0 }}>
                      {assignment.difficulty}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {assignment.title}
                      </h2>
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)" }}>
                        {attempts.length} submission{attempts.length !== 1 ? "s" : ""} · {assignment.language}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                    {bestScore !== undefined && <ScorePill score={bestScore} />}
                    <button
                      onClick={() => {
                        const ws = workspaces.find((w) => w.assignmentId === assignment.assignmentId)
                        router.push(ws ? `/sose/workspace/${ws.workspaceId}` : "/sose")
                      }}
                      style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--text-muted)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.67rem", padding: "0.28rem 0.65rem" }}
                    >
                      Reopen →
                    </button>
                  </div>
                </div>

                {/* Attempt list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {attempts.map((attempt, idx) => (
                    <div
                      key={attempt.submissionId}
                      onClick={() => attempt.status === "complete" && router.push(`/sose/report/${attempt.submissionId}`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "0.75rem 1rem",
                        background: idx === 0 ? "var(--bg-surface)" : "var(--bg)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        cursor: attempt.status === "complete" ? "pointer" : "default",
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={(e) => { if (attempt.status === "complete") (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(110,231,183,0.2)" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)" }}
                    >
                      <StatusDot status={attempt.status} />

                      {/* Attempt number */}
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)", flexShrink: 0, minWidth: "60px" }}>
                        #{attempts.length - idx}
                        {idx === 0 && <span style={{ color: "#6ee7b7", marginLeft: "0.4rem" }}>latest</span>}
                      </span>

                      {/* Date */}
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--text-secondary)", flex: 1 }}>
                        {new Date(attempt.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>

                      {/* Score or status */}
                      {attempt.status === "complete" && attempt.score !== undefined ? (
                        <ScorePill score={attempt.score} compact />
                      ) : attempt.status === "error" ? (
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.67rem", color: "#f9a8d4" }}>Error</span>
                      ) : (
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.67rem", color: "#fbbf24" }}>
                          {attempt.status === "grading" ? "Grading…" : "Queued"}
                        </span>
                      )}

                      {/* View arrow */}
                      {attempt.status === "complete" && (
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)" }}>
                          View →
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Score progression chart (if > 1 complete attempt) */}
                {attempts.filter((a) => a.status === "complete").length > 1 && (
                  <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                      Score progression
                    </p>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "40px" }}>
                      {[...attempts].reverse().filter((a) => a.status === "complete").map((a, j) => {
                        const h = `${((a.score ?? 0) / 100) * 38}px`
                        const c = (a.score ?? 0) >= 80 ? "#6ee7b7" : (a.score ?? 0) >= 60 ? "#fbbf24" : "#f9a8d4"
                        return (
                          <div
                            key={j}
                            title={`Attempt ${j + 1}: ${a.score}/100`}
                            style={{ flex: 1, maxWidth: "32px", height: h, background: c, borderRadius: "2px 2px 0 0", opacity: j === attempts.filter(a => a.status === "complete").length - 1 ? 1 : 0.5, transition: "opacity 0.2s", cursor: "pointer" }}
                            onClick={() => router.push(`/sose/report/${a.submissionId}`)}
                          />
                        )
                      })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)" }}>first</span>
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)" }}>latest</span>
                    </div>
                  </div>
                )}
              </section>
            )
          })}

          {/* Empty assignments (not yet attempted) */}
          {!loading && submissions.length > 0 && (
            <section>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.64rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>
                Not yet attempted
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {byAssignment.filter((g) => g.attempts.length === 0).map(({ assignment }) => (
                  <div
                    key={assignment.assignmentId}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", opacity: 0.6 }}
                  >
                    <div>
                      <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{assignment.title}</span>
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)", marginLeft: "0.75rem" }}>{assignment.difficulty}</span>
                    </div>
                    <button
                      onClick={() => router.push("/sose")}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.67rem" }}
                    >
                      Start →
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  )
}
