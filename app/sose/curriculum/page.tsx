"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getOrCreateStudentId } from "@/lib/student-identity"
import type { SoSECurriculum, CurriculumItem } from "@/lib/types-sose"

const DIFF_COLORS: Record<string, string> = {
  beginner:     "#6ee7b7",
  intermediate: "#fbbf24",
  advanced:     "#f9a8d4",
  expert:       "#c4b5fd",
}

const INTEREST_LABELS: Record<string, string> = {
  backend:    "Backend Development",
  data_ml:    "Data & ML",
  algorithms: "Algorithms & DS",
  automation: "Automation & Scripting",
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function AssignmentCard({ item, index, onStart }: { item: CurriculumItem; index: number; onStart: () => void }) {
  const isLocked    = item.status === "locked"
  const isComplete  = item.status === "complete"
  const isAvailable = item.status === "available" || item.status === "in_progress"
  const diffColor   = DIFF_COLORS[item.difficulty] ?? "#6ee7b7"

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        gap: "1.5rem",
        alignItems: "flex-start",
      }}
    >
      {/* Connector line */}
      {index < 3 && (
        <div style={{ position: "absolute", left: "23px", top: "52px", width: "2px", height: "calc(100% + 1.5rem)", background: isComplete ? "#6ee7b7" : "var(--border)" }} />
      )}

      {/* Step indicator */}
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isComplete ? "#6ee7b7" : isAvailable ? "rgba(110,231,183,0.1)" : "var(--bg-elevated)",
          border: `2px solid ${isComplete ? "#6ee7b7" : isAvailable ? "#6ee7b7" : "var(--border)"}`,
          color: isComplete ? "#08080f" : isAvailable ? "#6ee7b7" : "var(--text-muted)",
          zIndex: 1,
        }}
      >
        {isComplete ? <CheckIcon /> : isLocked ? <LockIcon /> : (
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.85rem", fontWeight: 700 }}>{index + 1}</span>
        )}
      </div>

      {/* Card */}
      <div
        className="surface"
        style={{
          flex: 1,
          padding: "1.5rem",
          opacity: isLocked ? 0.5 : 1,
          transition: "border-color 0.2s",
          marginBottom: "1.5rem",
          ...(isAvailable ? {
            borderColor: "rgba(110,231,183,0.2)",
            cursor: "pointer",
          } : {}),
        }}
        onMouseEnter={(e) => { if (isAvailable) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(110,231,183,0.4)" }}
        onMouseLeave={(e) => { if (isAvailable) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(110,231,183,0.2)" }}
      >
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: diffColor, background: `${diffColor}14`, border: `1px solid ${diffColor}28`, borderRadius: "999px", padding: "0.15rem 0.6rem" }}>
              {item.difficulty}
            </span>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)" }}>
              ~{item.estimatedMins} min
            </span>
          </div>
          {isComplete && item.score !== undefined && (
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: item.score >= 80 ? "#6ee7b7" : item.score >= 60 ? "#fbbf24" : "#f9a8d4", background: "var(--bg-elevated)", padding: "0.15rem 0.5rem", borderRadius: "6px", border: "1px solid var(--border)" }}>
              {item.score}/100
            </span>
          )}
        </div>

        <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
          {item.title}
        </h3>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>
          {item.subtitle}
        </p>

        {/* Topics */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1rem" }}>
          {item.keyTopics.map((t) => (
            <span key={t} style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.12rem 0.45rem" }}>
              {t}
            </span>
          ))}
        </div>

        {/* Objectives */}
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: isAvailable ? "1.25rem" : "0" }}>
          {item.objectives.slice(0, 3).map((obj, i) => (
            <li key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              <span style={{ color: diffColor, flexShrink: 0 }}>›</span>
              {obj}
            </li>
          ))}
        </ul>

        {/* CTA */}
        {isAvailable && (
          <button
            onClick={onStart}
            className="btn-primary"
            style={{ fontSize: "0.85rem", padding: "0.6rem 1.25rem", background: "#6ee7b7" }}
          >
            {item.status === "in_progress" ? "Continue →" : "Start project →"}
          </button>
        )}
        {isComplete && (
          <button onClick={onStart} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.72rem" }}>
            Reopen workspace →
          </button>
        )}
        {isLocked && (
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "var(--text-muted)" }}>
            Complete the previous project to unlock
          </p>
        )}
      </div>
    </div>
  )
}

export default function CurriculumPage() {
  const router = useRouter()
  const [curriculum,  setCurriculum]  = useState<SoSECurriculum | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const studentId = getOrCreateStudentId()
        // Fetch profile to get curriculumId
        const profileRes = await fetch(`/api/sose/profile?studentId=${studentId}`)
        const profileData = await profileRes.json()

        if (!profileData.profile?.passed) {
          router.replace("/sose/onboarding")
          return
        }

        if (!profileData.profile.curriculumId) {
          setError("Curriculum not found. Please retake the assessment.")
          setLoading(false)
          return
        }

        // Fetch curriculum (stored in Firestore — use profile's curriculumId)
        const currRes  = await fetch(`/api/sose/curriculum?curriculumId=${profileData.profile.curriculumId}`)
        const currData = await currRes.json()

        if (!currRes.ok || !currData.curriculum) {
          setError("Failed to load curriculum.")
          setLoading(false)
          return
        }

        setCurriculum(currData.curriculum)
      } catch {
        setError("Failed to load your curriculum.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  function openAssignment(item: CurriculumItem) {
    router.push(`/sose/curriculum/${item.assignmentId}?curriculumId=${curriculum?.curriculumId}&itemIndex=${item.index}`)
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: "36px", height: "36px", border: "2px solid var(--border)", borderTopColor: "#6ee7b7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: "var(--text-muted)" }}>Loading your curriculum…</p>
      </div>
    )
  }

  if (error || !curriculum) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#f9a8d4", marginBottom: "1rem" }}>{error ?? "Curriculum not found"}</p>
          <button className="btn-primary" style={{ background: "#6ee7b7" }} onClick={() => router.push("/sose/onboarding")}>Retake assessment</button>
        </div>
      </div>
    )
  }

  const completed   = curriculum.items.filter((i) => i.status === "complete").length
  const avgScore    = curriculum.items.filter((i) => i.score !== undefined).map((i) => i.score!)
  const avg         = avgScore.length ? Math.round(avgScore.reduce((a, b) => a + b, 0) / avgScore.length) : null

  return (
    <>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 50% 30% at 50% -5%, rgba(110,231,183,0.04) 0%, transparent 60%)", pointerEvents: "none" }} />

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 2rem", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => router.push("/sose")} style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <span style={{ fontFamily: "Playfair Display, serif", fontSize: "1.25rem", fontWeight: 900, color: "var(--accent)" }}>Athena</span>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>My Curriculum</span>
          </button>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button onClick={() => router.push("/sose")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.7rem" }}>
              Practice library →
            </button>
          </div>
        </header>

        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "3rem 2rem 6rem", animation: "fadeUp 0.3s ease" }}>
          {/* Profile summary */}
          <div style={{ marginBottom: "3rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.66rem", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Your adaptive curriculum
                </p>
                <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.5rem" }}>
                  {INTEREST_LABELS[curriculum.interest] ?? curriculum.interest}
                </h1>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  {curriculum.language === "python" ? "Python 3" : "Node.js"} ·{" "}
                  <span style={{ textTransform: "capitalize", color: DIFF_COLORS[curriculum.proficiencyLevel] ?? "#6ee7b7" }}>
                    {curriculum.proficiencyLevel}
                  </span>
                  {" "}starting level
                </p>
              </div>

              {/* Progress */}
              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.25rem", minWidth: "160px" }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Progress</p>
                <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1.6rem", fontWeight: 700, color: "#6ee7b7" }}>{completed}/{curriculum.items.length}</p>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)" }}>projects complete{avg !== null ? ` · avg ${avg}/100` : ""}</p>
                <div style={{ marginTop: "0.5rem", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
                  <div style={{ height: "100%", width: `${(completed / curriculum.items.length) * 100}%`, background: "#6ee7b7", borderRadius: "2px", transition: "width 1s ease" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Assignment roadmap */}
          <div>
            {curriculum.items.map((item, i) => (
              <AssignmentCard
                key={item.assignmentId}
                item={item}
                index={i}
                onStart={() => openAssignment(item)}
              />
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
