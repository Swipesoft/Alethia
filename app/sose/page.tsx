"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SOSE_ASSIGNMENTS } from "@/data/sose-assignments"
import { getOrCreateStudentId } from "@/lib/student-identity"
import type { SoSEAssignment, SoSESubmission } from "@/lib/types-sose"

const DIFF_META = {
  beginner:     { label: "Beginner",     color: "#6ee7b7" },
  intermediate: { label: "Intermediate", color: "#fbbf24" },
  advanced:     { label: "Advanced",     color: "#f9a8d4" },
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#6ee7b7" : score >= 60 ? "#fbbf24" : "#f9a8d4"
  return (
    <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color, background: `${color}14`, border: `1px solid ${color}33`, borderRadius: "6px", padding: "0.2rem 0.6rem" }}>
      {score}/100
    </span>
  )
}

export default function SoSEPage() {
  const router = useRouter()
  const [opening,     setOpening]     = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<SoSESubmission[]>([])
  const [subsLoading, setSubsLoading] = useState(true)

  // Gate check: if student has a passing profile, send to curriculum
  useEffect(() => {
    async function init() {
      try {
        const studentId = getOrCreateStudentId()
        const profileRes = await fetch(`/api/sose/profile?studentId=${studentId}`)
        if (profileRes.ok) {
          const { profile } = await profileRes.json()
          if (profile?.passed && profile?.curriculumId) {
            router.replace("/sose/curriculum")
            return
          }
        }
        const subRes = await fetch(`/api/sose/submissions?studentId=${studentId}`)
        if (subRes.ok) setSubmissions((await subRes.json()).submissions ?? [])
      } catch { /* non-critical */ }
      finally { setSubsLoading(false) }
    }
    init()
  }, [router])

  async function openWorkspace(assignment: SoSEAssignment) {
    setOpening(assignment.assignmentId)
    try {
      const studentId = getOrCreateStudentId()
      const res = await fetch("/api/sose/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, assignmentId: assignment.assignmentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      router.push(`/sose/workspace/${data.workspace.workspaceId}`)
    } catch (err) {
      console.error(err)
      alert("Failed to open workspace. Please try again.")
      setOpening(null)
    }
  }

  // Map assignmentId → best submission score
  const bestScores: Record<string, number> = {}
  submissions.forEach((s) => {
    if (s.status === "complete" && s.score !== undefined) {
      if (!bestScores[s.assignmentId] || s.score > bestScores[s.assignmentId]) {
        bestScores[s.assignmentId] = s.score
      }
    }
  })

  const completedCount = Object.keys(bestScores).length
  const avgScore = completedCount > 0
    ? Math.round(Object.values(bestScores).reduce((a, b) => a + b, 0) / completedCount)
    : null

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 60% 35% at 50% -5%, rgba(110,231,183,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 2rem", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <span style={{ fontFamily: "Playfair Display, serif", fontSize: "1.25rem", fontWeight: 900, color: "var(--accent)" }}>Athena</span>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>School of Software Engineering</span>
        </button>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button onClick={() => router.push("/sose/instructor")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", padding: 0 }}>
            Instructor view →
          </button>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "#6ee7b7", letterSpacing: "0.06em", background: "rgba(110,231,183,0.07)", border: "1px solid rgba(110,231,183,0.18)", padding: "0.25rem 0.8rem", borderRadius: "999px" }}>
            ● SoSE Beta
          </span>
        </div>
      </header>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "3.5rem 2rem 6rem" }}>

        {/* Hero */}
        <div style={{ marginBottom: "3.5rem" }}>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1rem" }}>
            School of Software Engineering
          </p>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.875rem" }}>
            Build real{" "}
            <em style={{ color: "#6ee7b7", fontStyle: "italic" }}>software</em>.{" "}
            Get graded by AI agents.
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: "540px", lineHeight: 1.8 }}>
            Write multi-file Python projects in a live sandbox environment. An orchestrated
            grading agent builds your code, runs your tests, and synthesises feedback in under 90 seconds.
          </p>
        </div>

        {/* How it works strip */}
        <div style={{ display: "flex", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", marginBottom: "3.5rem", overflowX: "auto" }}>
          {[
            { icon: "✏️", step: "Write",  desc: "Multi-file editor, syntax highlighting, file creation" },
            { icon: "▶",  step: "Run",    desc: "Execute code in a real E2B sandbox. Install packages." },
            { icon: "📤", step: "Submit", desc: "Submit when satisfied with your implementation" },
            { icon: "🤖", step: "Grade",  desc: "Build → tests → quality → Gemma synthesis, ~60s" },
          ].map((item, i) => (
            <div key={i} style={{ flex: "1 1 160px", padding: "1.1rem 1.25rem", borderRight: i < 3 ? "1px solid var(--border)" : "none", minWidth: "130px" }}>
              <div style={{ fontSize: "1rem", marginBottom: "0.35rem" }}>{item.icon}</div>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "#6ee7b7", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "0.2rem" }}>{item.step}</p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Student progress bar (if has submissions) */}
        {!subsLoading && completedCount > 0 && (
          <div className="surface" style={{ padding: "1.25rem 1.5rem", marginBottom: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.3rem" }}>Your progress</p>
              <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {completedCount}/{SOSE_ASSIGNMENTS.length} assignments completed
                {avgScore !== null && (
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.85rem", fontWeight: 400, color: "#6ee7b7", marginLeft: "0.75rem" }}>avg {avgScore}/100</span>
                )}
              </p>
            </div>
            {/* Progress bar */}
            <div style={{ flex: 1, minWidth: "160px", maxWidth: "300px" }}>
              <div style={{ height: "6px", background: "var(--bg-elevated)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(completedCount / SOSE_ASSIGNMENTS.length) * 100}%`, background: "#6ee7b7", borderRadius: "3px", transition: "width 1s ease" }} />
              </div>
            </div>
          </div>
        )}

        {/* Assignment grid */}
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.66rem", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
          Assignments — {SOSE_ASSIGNMENTS.length} available
        </p>

        {/* Adaptive Curriculum CTA */}
        <div
          style={{
            padding: "1.5rem 1.75rem",
            background: "rgba(110,231,183,0.05)",
            border: "1px solid rgba(110,231,183,0.2)",
            borderRadius: "12px",
            marginBottom: "2.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#6ee7b7", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              ✦ Adaptive · AI-generated
            </p>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.3rem" }}>
              Get a personalised curriculum
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "480px", lineHeight: 1.6 }}>
              Take a 10-minute proficiency assessment. Gemma designs 4 bespoke projects calibrated to your level and interest — validated in a real sandbox before you see them.
            </p>
          </div>
          <button
            onClick={() => router.push("/sose/onboarding")}
            className="btn-primary"
            style={{ background: "#6ee7b7", fontSize: "0.9rem", padding: "0.75rem 1.5rem", flexShrink: 0 }}
          >
            Take the assessment →
          </button>
        </div>

        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.66rem", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
          Practice assignments — static library
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1rem", marginBottom: "4rem" }}>
          {SOSE_ASSIGNMENTS.map((assignment) => {
            const diff         = DIFF_META[assignment.difficulty]
            const isOpening    = opening === assignment.assignmentId
            const bestScore    = bestScores[assignment.assignmentId]
            const isComplete   = bestScore !== undefined

            return (
              <div
                key={assignment.assignmentId}
                className="surface"
                style={{ padding: "1.4rem", display: "flex", flexDirection: "column", gap: "0.875rem", transition: "border-color 0.2s ease", position: "relative" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(110,231,183,0.22)" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)" }}
              >
                {/* Completed badge */}
                {isComplete && (
                  <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
                    <ScoreBadge score={bestScore} />
                  </div>
                )}

                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.64rem", color: diff.color, background: `${diff.color}12`, border: `1px solid ${diff.color}30`, borderRadius: "999px", padding: "0.18rem 0.65rem" }}>
                    {diff.label}
                  </span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)" }}>
                    {assignment.estimatedMins} min
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                    {assignment.title}
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {assignment.subtitle}
                  </p>
                </div>

                {/* Objectives */}
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.28rem" }}>
                  {assignment.objectives.slice(0, 3).map((obj, i) => (
                    <li key={i} style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "flex", alignItems: "flex-start", gap: "0.45rem" }}>
                      <span style={{ color: "#6ee7b7", flexShrink: 0, marginTop: "1px", fontSize: "0.7rem" }}>›</span>
                      {obj}
                    </li>
                  ))}
                </ul>

                {/* Grade distribution */}
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  {assignment.checks.map((c) => (
                    <span key={c.id} style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.12rem 0.45rem" }}>
                      {c.label.split(" ")[0]} {c.weight}pt
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <button
                  className="btn-primary"
                  style={{ marginTop: "auto", fontSize: "0.84rem", padding: "0.6rem 1.1rem", background: isComplete ? "rgba(110,231,183,0.15)" : "#6ee7b7", color: isComplete ? "#6ee7b7" : "#08080f", border: isComplete ? "1px solid rgba(110,231,183,0.3)" : "none", opacity: isOpening ? 0.7 : 1 }}
                  disabled={!!opening}
                  onClick={() => openWorkspace(assignment)}
                >
                  {isOpening ? "Opening…" : isComplete ? "Reopen Workspace →" : "Open Workspace →"}
                </button>
              </div>
            )
          })}
        </div>

        {/* Recent submissions */}
        {!subsLoading && submissions.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.66rem", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Recent submissions
              </p>
              <button onClick={() => router.push("/sose/history")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.66rem" }}>
                Full history →
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {submissions.slice(0, 5).map((sub) => {
                const a = SOSE_ASSIGNMENTS.find((x) => x.assignmentId === sub.assignmentId)
                const statusColor = sub.status === "complete" ? "#6ee7b7" : sub.status === "error" ? "#f9a8d4" : "#fbbf24"
                return (
                  <div
                    key={sub.submissionId}
                    className="surface"
                    style={{ padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", cursor: sub.status === "complete" ? "pointer" : "default" }}
                    onClick={() => sub.status === "complete" && router.push(`/sose/report/${sub.submissionId}`)}
                    onMouseEnter={(e) => { if (sub.status === "complete") (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(110,231,183,0.2)" }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0 }}>
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a?.title ?? sub.assignmentId}
                        </p>
                        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)" }}>
                          {new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", flexShrink: 0 }}>
                      {sub.status === "complete" && sub.score !== undefined && (
                        <ScoreBadge score={sub.score} />
                      )}
                      {sub.status === "grading" && (
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "#fbbf24" }}>Grading…</span>
                      )}
                      {sub.status === "error" && (
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "#f9a8d4" }}>Error</span>
                      )}
                      {sub.status === "complete" && (
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)" }}>View report →</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
