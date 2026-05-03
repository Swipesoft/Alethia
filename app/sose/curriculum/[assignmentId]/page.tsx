"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { getOrCreateStudentId } from "@/lib/student-identity"

const STAGE_LABELS: Record<string, string> = {
  default:    "Preparing your assignment…",
  planning:   "Planning assignment structure…",
  reference:  "Writing reference solution…",
  tests:      "Authoring the test suite…",
  metadata:   "Writing assignment brief…",
  starters:   "Creating starter files…",
  validating: "Validating in sandbox…",
  saving:     "Saving to your curriculum…",
}

export default function CurriculumAssignmentPage() {
  const router       = useRouter()
  const params       = useParams()
  const searchParams = useSearchParams()

  const assignmentId = params.assignmentId as string
  const curriculumId = searchParams.get("curriculumId") ?? ""
  const itemIndex    = parseInt(searchParams.get("itemIndex") ?? "0")

  const [step,    setStep]    = useState(0)
  const [total,   setTotal]   = useState(6)
  const [label,   setLabel]   = useState(STAGE_LABELS.default)
  const [error,   setError]   = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function generate() {
      try {
        const res = await fetch("/api/sose/generate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ curriculumId, itemIndex }),
        })

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}))
          throw new Error((data as { error?: string }).error ?? "Generation failed")
        }

        // Read SSE events from the streaming response body
        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        let   buffer  = ""
        let   done_assignment: unknown = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Split on double newlines (SSE event separator)
          const events = buffer.split("\n\n")
          buffer = events.pop() ?? ""

          for (const raw of events) {
            if (!raw.trim()) continue
            const lines     = raw.split("\n")
            const eventLine = lines.find((l) => l.startsWith("event:"))
            const dataLine  = lines.find((l) => l.startsWith("data:"))
            if (!eventLine || !dataLine) continue

            const eventType = eventLine.slice(6).trim()
            const data      = JSON.parse(dataLine.slice(5).trim())

            if (eventType === "progress") {
              setStep(data.step ?? 0)
              setTotal(data.total ?? 6)
              setLabel(data.label ?? STAGE_LABELS.default)
            } else if (eventType === "done") {
              done_assignment = data.assignment
            } else if (eventType === "error") {
              throw new Error(data.message ?? "Generation failed")
            }
          }
        }

        if (!done_assignment) throw new Error("Generation completed without an assignment")

        // Open workspace for this assignment
        const studentId = getOrCreateStudentId()
        setLabel(STAGE_LABELS.saving)

        const wsRes  = await fetch("/api/sose/workspace", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ studentId, assignmentId }),
        })
        const wsData = await wsRes.json()
        if (!wsRes.ok) throw new Error((wsData as { error?: string }).error ?? "Failed to open workspace")

        router.replace(`/sose/workspace/${(wsData as { workspace: { workspaceId: string } }).workspace.workspaceId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed")
      }
    }

    generate()
  }, [assignmentId, curriculumId, itemIndex, router])

  const pct = total > 0 ? Math.round((step / total) * 100) : 0

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg) } }
        @keyframes pulse  { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes grow   { from { width: 0 } }
      `}</style>
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2rem" }}>

        {error ? (
          <div style={{ textAlign: "center", maxWidth: "480px", padding: "2rem" }}>
            <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1.2rem", fontWeight: 600, color: "#f9a8d4", marginBottom: "0.75rem" }}>
              Generation failed
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.5rem", lineHeight: 1.65 }}>{error}</p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button className="btn-primary" style={{ background: "#6ee7b7", fontSize: "0.875rem" }}
                onClick={() => { setError(null); setStep(0); setLabel(STAGE_LABELS.default); started.current = false; window.location.reload() }}>
                Retry
              </button>
              <button className="btn-ghost" style={{ fontSize: "0.875rem" }} onClick={() => router.push("/sose/curriculum")}>
                Back to curriculum
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ width: "52px", height: "52px", border: "2px solid var(--border)", borderTopColor: "#6ee7b7", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />

            <div style={{ textAlign: "center", maxWidth: "380px" }}>
              <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1.3rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>
                {label}
              </p>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)", animation: "pulse 2s ease-in-out infinite" }}>
                Building and validating your bespoke assignment…
              </p>
            </div>

            {/* Progress bar */}
            <div style={{ width: "280px", height: "4px", background: "var(--border)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "#6ee7b7", borderRadius: "2px", transition: "width 0.6s ease", animation: step === 0 ? "grow 0.4s ease" : "none" }} />
            </div>

            {/* Step counter */}
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)" }}>
              {step > 0 ? `Step ${step} of ${total}` : "Starting up…"}
            </p>

            {/* Dots */}
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {Array.from({ length: total }).map((_, i) => (
                <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: i < step ? "#6ee7b7" : "var(--border)", transition: "background 0.3s" }} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
