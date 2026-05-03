"use client"
// app/school/webdev/curriculum/page.tsx

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getOrCreateStudentId } from "@/lib/student-identity"
import type { WebDevCurriculum, WebDevCurriculumItem } from "@/lib/types-webdev"

const FW_LABELS: Record<string, string> = {
  html_css_js: "HTML · CSS · JS",
  react:       "React",
  react_api:   "React + API",
}
const FW_COLORS: Record<string, string> = {
  html_css_js: "#f59e0b",
  react:       "#3b82f6",
  react_api:   "#c4b5fd",
}
const DIFF_COLORS: Record<string, string> = {
  beginner:     "#22c55e",
  intermediate: "#f59e0b",
  advanced:     "#f9a8d4",
  expert:       "#c4b5fd",
}
const INTEREST_LABELS: Record<string, string> = {
  ui_design:     "UI Design",
  interactivity: "Interactivity",
  components:    "Components",
  data_driven:   "Data & APIs",
}

function AssignmentCard({ item, index, onStart }: { item: WebDevCurriculumItem; index: number; onStart: () => void }) {
  const locked    = item.status === "locked"
  const complete  = item.status === "complete"
  const available = !locked
  const fwColor   = FW_COLORS[item.framework] ?? "#3b82f6"
  const diffColor = DIFF_COLORS[item.difficulty] ?? "#3b82f6"

  return (
    <div style={{ position: "relative", display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
      {index < 3 && <div style={{ position: "absolute", left: "23px", top: "52px", width: "2px", height: "calc(100% + 1.5rem)", background: complete ? "#3b82f6" : "rgba(255,255,255,0.06)" }} />}
      <div style={{ width: "48px", height: "48px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: complete ? "#3b82f6" : available ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.03)", border: `2px solid ${complete ? "#3b82f6" : available ? "#3b82f6" : "rgba(255,255,255,0.1)"}`, color: complete ? "#fff" : available ? "#3b82f6" : "#475569", zIndex: 1, fontFamily: "DM Mono, monospace", fontSize: "0.85rem", fontWeight: 700 }}>
        {complete ? "✓" : locked ? "🔒" : index + 1}
      </div>
      <div style={{ flex: 1, padding: "1.5rem", background: "rgba(255,255,255,0.02)", border: `1px solid ${available && !locked ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: "12px", opacity: locked ? 0.5 : 1, marginBottom: "1.5rem", cursor: available ? "pointer" : "default", transition: "border-color 0.2s" }}
        onMouseEnter={(e) => { if (available) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.4)" }}
        onMouseLeave={(e) => { if (available) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.2)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: fwColor, background: `${fwColor}14`, border: `1px solid ${fwColor}28`, borderRadius: "999px", padding: "0.15rem 0.6rem" }}>{FW_LABELS[item.framework]}</span>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: diffColor, background: `${diffColor}14`, border: `1px solid ${diffColor}28`, borderRadius: "999px", padding: "0.15rem 0.6rem" }}>{item.difficulty}</span>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#64748b" }}>~{item.estimatedMins} min</span>
          </div>
          {complete && item.score !== undefined && (
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: item.score >= 80 ? "#22c55e" : item.score >= 60 ? "#f59e0b" : "#f43f5e", flexShrink: 0 }}>{item.score}/100</span>
          )}
        </div>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600, color: "#f1f5f9", marginBottom: "0.35rem" }}>{item.title}</h3>
        <p style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: "0.875rem" }}>{item.subtitle}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.875rem" }}>
          {item.keyTopics.map((t) => <span key={t} style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "#64748b", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px", padding: "0.12rem 0.45rem" }}>{t}</span>)}
        </div>
        {available && !locked && (
          <button onClick={onStart} style={{ fontSize: "0.85rem", padding: "0.6rem 1.25rem", background: "#3b82f6", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
            {complete ? "Reopen →" : item.status === "in_progress" ? "Continue →" : "Start project →"}
          </button>
        )}
        {locked && <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "#475569" }}>Complete the previous project to unlock</p>}
      </div>
    </div>
  )
}

export default function WebDevCurriculumPage() {
  const router = useRouter()
  const [curriculum, setCurriculum] = useState<WebDevCurriculum | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const studentId   = getOrCreateStudentId()
        const profileRes  = await fetch(`/api/webdev/profile?studentId=${studentId}`)
        const { profile } = await profileRes.json()
        if (!profile?.passed) { router.replace("/school/webdev/onboarding"); return }

        const currRes  = await fetch(`/api/webdev/curriculum?curriculumId=${profile.curriculumId}`)
        const currData = await currRes.json()
        if (!currRes.ok) throw new Error("Failed to load curriculum")
        setCurriculum(currData.curriculum)
      } catch { setError("Failed to load curriculum") }
      finally  { setLoading(false) }
    }
    load()
  }, [router])

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: "36px", height: "36px", border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: "#64748b" }}>Loading curriculum…</p>
    </div>
  )

  if (error || !curriculum) return (
    <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#f43f5e", marginBottom: "1rem" }}>{error ?? "Not found"}</p>
        <button onClick={() => router.push("/school/webdev/onboarding")} style={{ background: "#3b82f6", border: "none", borderRadius: "8px", color: "#fff", padding: "0.75rem 1.5rem", cursor: "pointer" }}>Retake assessment</button>
      </div>
    </div>
  )

  const completed = curriculum.items.filter((i) => i.status === "complete").length
  const avg = curriculum.items.filter((i) => i.score !== undefined)
  const avgScore = avg.length ? Math.round(avg.reduce((a, b) => a + (b.score ?? 0), 0) / avg.length) : null

  function openAssignment(item: WebDevCurriculumItem) {
    router.push(`/school/webdev/curriculum/${item.assignmentId}?curriculumId=${curriculum!.curriculumId}&itemIndex=${item.index}`)
  }

  return (
    <>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} *{box-sizing:border-box}`}</style>
      <main style={{ minHeight: "100vh", background: "#07070e" }}>
        <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 50% 30% at 50% -5%, rgba(59,130,246,0.04) 0%, transparent 60%)", pointerEvents: "none" }} />
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0a14" }}>
          <button onClick={() => router.push("/school/webdev")} style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 900, color: "#3b82f6" }}>Athena</span>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>My Web Dev Curriculum</span>
          </button>
        </header>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "3rem 2rem 6rem", animation: "fadeUp 0.3s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3rem", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.66rem", color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Your adaptive curriculum</p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "#f1f5f9", lineHeight: 1.1, marginBottom: "0.4rem" }}>
                {INTEREST_LABELS[curriculum.interest] ?? curriculum.interest}
              </h1>
              <p style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
                <span style={{ textTransform: "capitalize", color: DIFF_COLORS[curriculum.proficiencyLevel] ?? "#3b82f6" }}>{curriculum.proficiencyLevel}</span> starting level
              </p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "1rem 1.25rem", minWidth: "160px" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>Progress</p>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color: "#3b82f6" }}>{completed}/{curriculum.items.length}</p>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "#64748b" }}>complete{avgScore !== null ? ` · avg ${avgScore}/100` : ""}</p>
              <div style={{ marginTop: "0.5rem", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
                <div style={{ height: "100%", width: `${(completed / curriculum.items.length) * 100}%`, background: "#3b82f6", borderRadius: "2px", transition: "width 1s ease" }} />
              </div>
            </div>
          </div>
          {curriculum.items.map((item, i) => (
            <AssignmentCard key={item.assignmentId} item={item} index={i} onStart={() => openAssignment(item)} />
          ))}
        </div>
      </main>
    </>
  )
}
