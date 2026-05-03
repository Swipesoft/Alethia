"use client"

import { use, useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { getStudentId } from "@/lib/student-identity"
import { getStudent, updateModule, logEvent } from "@/lib/firestore"
import type { StudentProfile, Module, LectureJSON, LectureBeat } from "@/lib/types"
import { CodeBeat } from "@/components/lecture/CodeBeat"
import { ConceptBeat } from "@/components/lecture/ConceptBeat"
import { DiagramBeat } from "@/components/lecture/DiagramBeat"
import { EquationBeat } from "@/components/lecture/EquationBeat"
import { GraphBeat } from "@/components/lecture/GraphBeat"
//import { SummaryBeat } from "@/components/lecture/SummaryBeat"
import { SummaryBeat } from "@/components/lecture/TableBeat"
import { TitleBeat } from "@/components/lecture/TitleBeat"
import { TableBeat } from "@/components/lecture/TableBeat"
import { QAChat } from "@/components/lecture/QAChat"

export default function LecturePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [module, setModule] = useState<Module | null>(null)
  const [lecture, setLecture] = useState<LectureJSON | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [lectureComplete, setLectureComplete] = useState(false)
  const [showQA, setShowQA] = useState(false)
  const beatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

      if (m.lectureJSON) {
        setLecture(m.lectureJSON)
        setLoading(false)
      } else {
        setLoading(false)
        setGenerating(true)
        try {
          const res = await fetch("/api/lecture/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, moduleId }),
          })
          const { lectureJSON } = await res.json()
          setLecture(lectureJSON)
          setGenerating(false)
        } catch {
          setGenerating(false)
        }
      }
    }
    load()
  }, [moduleId, router])

  // Auto-advance beats
  useEffect(() => {
    if (!lecture || lectureComplete) return
    const beat = lecture.beats[currentBeat]
    if (!beat) return

    beatTimerRef.current = setTimeout(() => {
      if (currentBeat < lecture.beats.length - 1) {
        setCurrentBeat((prev) => prev + 1)
      } else {
        setLectureComplete(true)
        const studentId = getStudentId()
        if (studentId && module) {
          logEvent({
            studentId,
            type: "lecture_completed",
            moduleId: module.moduleId,
            timestamp: Date.now(),
            payload: { moduleTitle: module.title },
          })
          updateModule(studentId, module.moduleId, { lectureGenerated: true })
        }
      }
    }, beat.durationMs)

    return () => { if (beatTimerRef.current) clearTimeout(beatTimerRef.current) }
  }, [lecture, currentBeat, lectureComplete, module])

  if (loading || generating) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          gap: "1rem",
        }}
      >
        <div style={{ fontSize: "3rem" }}>🏛️</div>
        <p style={{ color: "var(--text-secondary)", fontFamily: "DM Mono, monospace", fontSize: "0.875rem" }}>
          {generating ? "Generating your personalised lecture..." : "Loading..."}
        </p>
        {generating && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
            Athena is crafting this lecture specifically for you.
          </p>
        )}
      </div>
    )
  }

  if (!lecture || !module) return null

  const beat = lecture.beats[currentBeat]
  const progressPct = ((currentBeat + 1) / lecture.beats.length) * 100

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 2rem",
          borderBottom: "1px solid var(--border)",
          gap: "1rem",
        }}
      >
        <button
          onClick={() => router.push("/dashboard")}
          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem", fontFamily: "DM Mono, monospace" }}
        >
          ← Dashboard
        </button>

        {/* Progress bar */}
        <div style={{ flex: 1, maxWidth: "400px" }}>
          <div style={{ height: "3px", background: "var(--bg-elevated)", borderRadius: "1.5px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: "var(--accent)",
                borderRadius: "1.5px",
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace", marginTop: "0.25rem", textAlign: "center" }}>
            Beat {currentBeat + 1} / {lecture.beats.length}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn-ghost"
            style={{ fontSize: "0.8rem", padding: "0.4rem 1rem" }}
            onClick={() => setShowQA((v) => !v)}
          >
            {showQA ? "Close Q&A" : "Ask Tutor"}
          </button>
          {lectureComplete && (
            <button
              className="btn-primary"
              style={{ fontSize: "0.8rem", padding: "0.4rem 1rem" }}
              onClick={() => router.push(`/assess/${moduleId}`)}
            >
              Take Assessment →
            </button>
          )}
        </div>
      </header>

      {/* Lecture title */}
      <div style={{ padding: "1rem 2rem 0", textAlign: "center" }}>
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--accent)", marginBottom: "0.25rem" }}>
          {module.faculty.toUpperCase()} · {module.topic}
        </p>
        <h2 style={{ fontSize: "1.25rem", fontFamily: "Playfair Display, serif" }}>{lecture.title}</h2>
      </div>

      {/* Beat player */}
      <div style={{ flex: 1, display: "flex", gap: "1.5rem", padding: "1.5rem 2rem", overflow: "hidden" }}>
        <div
          style={{
            flex: showQA ? "0 0 55%" : "1",
            transition: "flex 0.3s ease",
            overflow: "auto",
          }}
        >
          <BeatRenderer beat={beat} narration={lecture.narration[currentBeat]} />

          {/* Beat nav */}
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
            {lecture.beats.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (beatTimerRef.current) clearTimeout(beatTimerRef.current)
                  setCurrentBeat(i)
                  if (i === lecture.beats.length - 1) setLectureComplete(true)
                }}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  background: i === currentBeat ? "var(--accent)" : i < currentBeat ? "rgba(251,191,36,0.4)" : "var(--bg-elevated)",
                  transition: "all 0.2s ease",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>

        {showQA && profile && (
          <div style={{ flex: "0 0 40%", minWidth: "300px" }}>
            <QAChat studentId={profile.studentId} moduleId={moduleId} />
          </div>
        )}
      </div>
    </main>
  )
}

function BeatRenderer({ beat, narration }: { beat: LectureBeat; narration: string }) {
  return (
    <div className="animate-fade-in" style={{ maxWidth: "760px", margin: "0 auto" }}>
      {/* Narration */}
      {narration && (
        <div
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "0.75rem 1.25rem",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            fontStyle: "italic",
            lineHeight: 1.7,
          }}
        >
          🎙 {narration}
        </div>
      )}

      {beat.type === "title_card" && <TitleBeat beat={beat} />}
      {beat.type === "concept_reveal" && <ConceptBeat beat={beat} />}
      {beat.type === "code_walkthrough" && <CodeBeat beat={beat} />}
      {beat.type === "animated_diagram" && <DiagramBeat beat={beat} />}
      {beat.type === "equation" && <EquationBeat beat={beat} />}
      {beat.type === "graph_plot" && <GraphBeat beat={beat} />}
      {beat.type === "comparison_table" && <TableBeat beat={beat} />}
      {beat.type === "summary_card" && <SummaryBeat beat={beat} />}
      {beat.type === "clinical_case" && (
        <div className="surface" style={{ padding: "2rem" }}>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--faculty-medicine)", marginBottom: "1rem" }}>CLINICAL CASE</p>
          <p style={{ lineHeight: 1.8, marginBottom: "1rem" }}>{beat.scenario}</p>
          {beat.question && (
            <div style={{ background: "var(--bg-elevated)", padding: "1rem", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--faculty-medicine)" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{beat.question}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
