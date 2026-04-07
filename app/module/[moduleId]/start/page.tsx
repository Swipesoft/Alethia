"use client"

import { use, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getStudentId } from "@/lib/student-identity"
import { getStudent } from "@/lib/firestore"
import type { Module, ModuleSequenceItem } from "@/lib/types"

type Phase = "loading" | "generating_plan" | "generating_lectures" | "ready" | "error"

export default function ModuleStartPage({
  params,
}: {
  params: Promise<{ moduleId: string }>
}) {
  const { moduleId } = use(params)
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("loading")
  const [module, setModule] = useState<Module | null>(null)
  const [sequence, setSequence] = useState<ModuleSequenceItem[]>([])
  const [statusMsg, setStatusMsg] = useState("")

  useEffect(() => {
    async function init() {
      const studentId = getStudentId()
      if (!studentId) { router.push("/onboarding"); return }

      const profile = await getStudent(studentId)
      if (!profile) { router.push("/onboarding"); return }

      const m = profile.curriculum.find((c) => c.moduleId === moduleId)
      if (!m) { router.push("/dashboard"); return }

      setModule(m)

      // Already generated — route directly
      if (m.sequenceGenerated && (m.sequence ?? []).length > 0) {
        routeToCurrentStep(m)
        return
      }

      // Need to generate the sequence
      setPhase("generating_plan")
      setStatusMsg(`TutorAgent is designing your ${m.title} curriculum...`)

      try {
        const res = await fetch("/api/subtopics/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, moduleId }),
        })

        if (!res.ok) throw new Error("Generation failed")

        const { subtopics, classworks, sequence: seq } = await res.json()
        setSequence(seq)
        setPhase("ready")

        // Small pause so the student can see the sequence before launching
        await new Promise((r) => setTimeout(r, 1200))

        // Route to first subtopic
        const firstSubtopic = seq.find((item: ModuleSequenceItem) => item.kind === "subtopic")
        if (firstSubtopic) {
          router.push(`/subtopic/${firstSubtopic.id}`)
        } else {
          router.push(`/assess/${moduleId}`)
        }
      } catch {
        setPhase("error")
        setStatusMsg("Something went wrong generating your module. Please try again.")
      }
    }

    init()
  }, [moduleId, router])

  function routeToCurrentStep(m: Module) {
    const seq = m.sequence ?? []
    const idx = m.currentSequenceIndex ?? 0
    const item = seq[idx]

    if (!item || item.kind === "module_assessment") {
      router.push(`/assess/${moduleId}`)
    } else if (item.kind === "subtopic") {
      router.push(`/subtopic/${item.id}`)
    } else if (item.kind === "classwork") {
      router.push(`/classwork/${item.id}?moduleId=${moduleId}`)
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: "560px", width: "100%", display: "flex", flexDirection: "column", gap: "2rem", alignItems: "center", textAlign: "center" }}>

        {/* Module title */}
        {module && (
          <div className="animate-fade-up">
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--accent)", marginBottom: "0.5rem", letterSpacing: "0.1em" }}>
              {module.faculty.toUpperCase()} · MODULE {module.index + 1}
            </p>
            <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "2rem", fontWeight: 900, marginBottom: "0.75rem" }}>
              {module.title}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {module.objectives.slice(0, 2).join(" · ")}
            </p>
          </div>
        )}

        {/* Status */}
        {(phase === "generating_plan" || phase === "loading") && (
          <div className="surface glow-border animate-fade-up" style={{ padding: "2rem", width: "100%", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
            <div style={{ fontSize: "2.5rem" }}>🏛️</div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {statusMsg || "Preparing your module..."}
            </p>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", animation: `fade-in 0.6s ease ${i * 0.2}s infinite alternate` }} />
              ))}
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace" }}>
              TutorAgent + AssessorAgent collaborating...
            </p>
          </div>
        )}

        {/* Sequence preview once generated */}
        {phase === "ready" && sequence.length > 0 && (
          <div className="animate-fade-up surface" style={{ padding: "1.5rem", width: "100%" }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--accent)", marginBottom: "1rem", letterSpacing: "0.1em" }}>
              YOUR LEARNING SEQUENCE
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {sequence.map((item, i) => {
                const kindIcon = {
                  subtopic: "📖",
                  classwork: "⚡",
                  module_assessment: "🎯",
                }[item.kind]

                const kindColor = {
                  subtopic: "var(--text-secondary)",
                  classwork: "var(--accent)",
                  module_assessment: "#6ee7b7",
                }[item.kind]

                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", opacity: 0, animation: `fade-up 0.3s ease ${i * 0.05}s forwards` }}>
                    <span style={{ fontSize: "0.85rem" }}>{kindIcon}</span>
                    <span style={{ fontSize: "0.8rem", color: kindColor, flex: 1 }}>{item.title}</span>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)" }}>
                      {item.kind}
                    </span>
                  </div>
                )
              })}
            </div>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "1rem", textAlign: "center" }}>
              Launching first lesson...
            </p>
          </div>
        )}

        {phase === "error" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
            <p style={{ color: "#f9a8d4" }}>{statusMsg}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Try Again →
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
