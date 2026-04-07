"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getStudentId } from "@/lib/student-identity"
import { subscribeToStudent } from "@/lib/firestore"
import type { StudentProfile, Module } from "@/lib/types"
import { FACULTY_META } from "@/lib/types"

const STATUS_STYLES: Record<Module["status"], { color: string; label: string; bg: string }> = {
  locked:    { color: "var(--text-muted)", label: "Locked", bg: "var(--bg-elevated)" },
  active:    { color: "var(--accent)", label: "Active", bg: "var(--accent-dim)" },
  completed: { color: "#6ee7b7", label: "Completed", bg: "rgba(110,231,183,0.1)" },
  remedial:  { color: "#f9a8d4", label: "Remedial", bg: "rgba(249,168,212,0.1)" },
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const studentId = getStudentId()
    if (!studentId) {
      router.push("/onboarding")
      return
    }

    const unsub = subscribeToStudent(studentId, (p) => {
      if (!p) { router.push("/onboarding"); return }
      setProfile(p)
      setLoading(false)
    })

    return () => unsub()
  }, [router])

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--text-muted)", fontFamily: "DM Mono, monospace", fontSize: "0.875rem" }}>
          Loading your learning environment...
        </p>
      </div>
    )
  }

  if (!profile) return null

  const facultyMeta = FACULTY_META[profile.faculty]
  const completedCount = profile.curriculum.filter((m) => m.status === "completed").length
  const progressPct = Math.round((completedCount / profile.curriculum.length) * 100)
  const activeModule = profile.curriculum[profile.currentModuleIndex]

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* ── Sidebar + main layout ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
        <aside
          style={{
            width: "260px",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            padding: "1.5rem",
            gap: "1.5rem",
            flexShrink: 0,
          }}
        >
          {/* Logo */}
          <div style={{ paddingBottom: "1rem", borderBottom: "1px solid var(--border)" }}>
            <h1
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: "1.3rem",
                fontWeight: 900,
                color: "var(--accent)",
              }}
            >
              Athena
            </h1>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace" }}>
              ArchAgent
            </p>
          </div>

          {/* Student info */}
          <div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace", marginBottom: "0.5rem" }}>
              STUDENT
            </p>
            <p style={{ fontWeight: 500, fontSize: "1rem" }}>{profile.name}</p>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                marginTop: "0.4rem",
                background: "var(--bg-elevated)",
                borderRadius: "999px",
                padding: "0.2rem 0.7rem",
                fontSize: "0.75rem",
                color: facultyMeta.color,
                border: `1px solid var(--border)`,
              }}
            >
              {facultyMeta.icon} {facultyMeta.label}
            </div>
          </div>

          {/* Progress */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace" }}>PROGRESS</p>
              <p style={{ fontSize: "0.7rem", color: "var(--accent)", fontFamily: "DM Mono, monospace" }}>{progressPct}%</p>
            </div>
            <div style={{ height: "4px", background: "var(--bg-elevated)", borderRadius: "2px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background: "var(--accent)",
                  borderRadius: "2px",
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
              {completedCount} of {profile.curriculum.length} modules
            </p>
          </div>

          {/* Competency scores */}
          {Object.keys(profile.competencyModel).length > 0 && (
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace", marginBottom: "0.75rem" }}>
                COMPETENCY
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {Object.entries(profile.competencyModel).slice(0, 5).map(([topic, score]) => (
                  <div key={topic}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                        {topic}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace" }}>
                        {score.score}
                      </span>
                    </div>
                    <div style={{ height: "3px", background: "var(--bg-elevated)", borderRadius: "1.5px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${score.score}%`,
                          background: facultyMeta.color,
                          borderRadius: "1.5px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nav */}
          <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => router.push("/")}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontFamily: "DM Mono, monospace",
              }}
            >
              ← Home
            </button>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, padding: "2rem 2.5rem", overflow: "auto" }}>

          {/* Active module hero */}
          {activeModule && (
            <div
              className="animate-fade-up glow-border"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-glow)",
                borderRadius: "var(--radius)",
                padding: "2rem",
                marginBottom: "2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1.5rem",
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--accent)", marginBottom: "0.5rem", letterSpacing: "0.1em" }}>
                  CURRENT MODULE · {activeModule.index + 1} of {profile.curriculum.length}
                </p>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>{activeModule.title}</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                  {activeModule.objectives.slice(0, 2).join(" · ")}
                </p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "999px",
                      padding: "0.2rem 0.7rem",
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {activeModule.assessmentEnvironment}
                  </span>
                  <span
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "999px",
                      padding: "0.2rem 0.7rem",
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    ~{activeModule.estimatedDurationMins} min
                  </span>
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={() => router.push(`/lecture/${activeModule.moduleId}`)}
                style={{ whiteSpace: "nowrap" }}
              >
                {activeModule.lectureGenerated ? "Resume Lecture →" : "Start Lecture →"}
              </button>
            </div>
          )}

          {/* Curriculum map */}
          <div>
            <p
              style={{
                fontFamily: "DM Mono, monospace",
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              Curriculum Map
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {profile.curriculum.map((module, i) => {
                const st = STATUS_STYLES[module.status]
                return (
                  <div
                    key={module.moduleId}
                    className={i < 3 ? `animate-fade-up-delay-${i + 1}` : ""}
                    onClick={() => {
                      if (module.status === "active" || module.status === "remedial") {
                        router.push(`/lecture/${module.moduleId}`)
                      }
                    }}
                    style={{
                      background: st.bg,
                      border: `1px solid ${module.status === "active" ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "var(--radius-sm)",
                      padding: "1.25rem",
                      cursor: module.status === "locked" ? "default" : "pointer",
                      opacity: module.status === "locked" ? 0.5 : 1,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                      <span
                        style={{
                          fontFamily: "DM Mono, monospace",
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          color: st.color,
                          fontFamily: "DM Mono, monospace",
                          background: st.bg,
                          padding: "0.15rem 0.5rem",
                          borderRadius: "999px",
                          border: `1px solid ${st.color}30`,
                        }}
                      >
                        {st.label}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.9rem", fontWeight: 500, marginBottom: "0.25rem", color: "var(--text-primary)", lineHeight: 1.3 }}>
                      {module.title}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {module.assessmentEnvironment} · {module.estimatedDurationMins}min
                    </p>
                    {module.score !== undefined && (
                      <div style={{ marginTop: "0.75rem" }}>
                        <div style={{ height: "3px", background: "var(--bg-elevated)", borderRadius: "1.5px" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${module.score}%`,
                              background: module.score >= 70 ? "#6ee7b7" : module.score >= 50 ? "var(--accent)" : "#f9a8d4",
                              borderRadius: "1.5px",
                            }}
                          />
                        </div>
                        <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.25rem", fontFamily: "DM Mono, monospace" }}>
                          Score: {module.score}/100
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ArchAgent activity log */}
          <div style={{ marginTop: "2.5rem", paddingTop: "2rem", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "0.12em", marginBottom: "0.75rem" }}>
              ARCHAGENT DECISIONS
            </p>
            {profile.curriculum.filter((m) => m.archagetNotes).length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                No decisions yet. Complete your first module to see the ArchAgent at work.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {profile.curriculum.filter((m) => m.archagetNotes).map((m) => (
                  <div
                    key={m.moduleId}
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      padding: "0.75rem 1rem",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span style={{ color: "var(--accent)", fontFamily: "DM Mono, monospace", fontSize: "0.7rem" }}>
                      Module {m.index + 1}
                    </span>
                    <span style={{ color: "var(--text-secondary)", marginLeft: "0.75rem" }}>{m.archagetNotes}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
