"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { getStudentId } from "@/lib/student-identity"
import type { WebDevWorkspace, WebDevAssignment } from "@/lib/types-webdev"
import { MarkdownBrief } from "@/components/sose/MarkdownBrief"

// Lazy-load Sandpack — it's heavy
const SandpackEditor = dynamic(() => import("@/components/webdev/SandpackEditor"), { ssr: false, loading: () => (
  <div style={{ flex: 1, background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: "var(--text-muted)" }}>Loading editor…</p>
  </div>
)})

const GRADING_STAGES = [
  "Analysing your code…",
  "Checking requirements…",
  "Reviewing design decisions…",
  "Synthesising feedback…",
  "Almost done…",
]

function Spinner({ size = 32 }: { size?: number }) {
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: size, height: size, border: "2px solid var(--border)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
    </>
  )
}

const FRAMEWORK_LABELS: Record<string, string> = {
  html_css_js: "HTML · CSS · JS",
  react:       "React",
  react_api:   "React + API",
}

export default function WebDevWorkspacePage() {
  const router      = useRouter()
  const params      = useParams()
  const workspaceId = params.workspaceId as string

  const [workspace,    setWorkspace]    = useState<WebDevWorkspace | null>(null)
  const [assignment,   setAssignment]   = useState<WebDevAssignment | null>(null)
  const [files,        setFiles]        = useState<Record<string, string>>({})
  const [pageLoading,  setPageLoading]  = useState(true)
  const [saveStatus,   setSaveStatus]   = useState<"saved" | "saving" | "unsaved">("saved")
  const [briefOpen,    setBriefOpen]    = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [gradingStage, setGradingStage] = useState(0)
  const [submitError,  setSubmitError]  = useState<string | null>(null)
  const [wasSubmitted, setWasSubmitted] = useState(false)
  const [lastReportId, setLastReportId] = useState<string | null>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load workspace ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/webdev/workspace?id=${workspaceId}`)
        const data = await res.json()
        if (!res.ok) { router.push("/school/webdev"); return }

        const ws: WebDevWorkspace = data.workspace
        setWorkspace(ws)
        setFiles(ws.files)
        setWasSubmitted(ws.status === "submitted")
        setLastReportId(ws.submissionId ?? null)

        // Fetch assignment for brief + pattern checks
        const aRes  = await fetch(`/api/webdev/assignment?id=${ws.assignmentId}`)
        const aData = await aRes.json()
        if (aRes.ok && aData.assignment) setAssignment(aData.assignment)
      } catch { router.push("/school/webdev") }
      finally  { setPageLoading(false) }
    }
    load()
  }, [workspaceId, router])

  // ── Grading stage cycle ────────────────────────────────────────────────────
  useEffect(() => {
    if (!submitting) { setGradingStage(0); return }
    const interval = setInterval(() => {
      setGradingStage((s) => Math.min(s + 1, GRADING_STAGES.length - 1))
    }, 10_000)
    return () => clearInterval(interval)
  }, [submitting])

  // ── Cmd+S save ─────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setSaveStatus("saving")
        fetch("/api/webdev/workspace", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, files }),
        }).then(() => setSaveStatus("saved")).catch(() => setSaveStatus("unsaved"))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [workspaceId, files])

  // ── Debounced save ─────────────────────────────────────────────────────────
  const scheduleSave = useCallback((updatedFiles: Record<string, string>) => {
    setSaveStatus("unsaved")
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving")
      try {
        await fetch("/api/webdev/workspace", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, files: updatedFiles }),
        })
        setSaveStatus("saved")
      } catch { setSaveStatus("unsaved") }
    }, 1500)
  }, [workspaceId])

  function handleFilesChange(updatedFiles: Record<string, string>) {
    setFiles(updatedFiles)
    scheduleSave(updatedFiles)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function submit() {
    if (!workspace || submitting) return
    const studentId = getStudentId()
    if (!studentId) { router.push("/school/webdev"); return }
    setSubmitting(true)
    setSubmitError(null)

    try {
      // Force save
      if (saveTimer.current) clearTimeout(saveTimer.current)
      await fetch("/api/webdev/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, files }),
      })
      setSaveStatus("saved")

      const res  = await fetch("/api/webdev/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, studentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Submission failed")
      router.push(`/school/webdev/report/${data.submissionId}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed")
      setSubmitting(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div style={{ height: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <Spinner size={40} />
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: "#64748b" }}>Loading workspace…</p>
      </div>
    )
  }

  const frameworkLabel = assignment ? FRAMEWORK_LABELS[assignment.framework] ?? assignment.framework : ""

  return (
    <>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        *{box-sizing:border-box}
      `}</style>

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#07070e", overflow: "hidden" }}>

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <header style={{ height: "50px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0, gap: "0.75rem", background: "#0a0a14" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", minWidth: 0, flex: 1 }}>
            <button onClick={() => router.push("/school/webdev/curriculum")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.7rem", flexShrink: 0 }}>
              ← Curriculum
            </button>
            <span style={{ color: "rgba(255,255,255,0.06)", flexShrink: 0 }}>|</span>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.74rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {assignment?.title ?? "Workspace"}
            </span>
            {frameworkLabel && (
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#3b82f6", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "999px", padding: "0.1rem 0.55rem", flexShrink: 0 }}>
                {frameworkLabel}
              </span>
            )}
          </div>

          {/* Save indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
            <span style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: saveStatus === "saved" ? "#22c55e" : saveStatus === "saving" ? "#f59e0b" : "#f43f5e",
              animation: saveStatus === "saving" ? "pulse 1s ease-in-out infinite" : "none",
              transition: "background 0.3s",
            }} />
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#64748b" }}>
              {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving…" : "Unsaved"}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            <button onClick={() => setBriefOpen((v) => !v)} style={{ background: briefOpen ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${briefOpen ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)"}`, color: briefOpen ? "#3b82f6" : "#64748b", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", padding: "0.28rem 0.65rem", borderRadius: "6px", cursor: "pointer" }}>
              Brief
            </button>
            {wasSubmitted && lastReportId && (
              <button onClick={() => router.push(`/school/webdev/report/${lastReportId}`)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", padding: "0.28rem 0.65rem", borderRadius: "6px", cursor: "pointer" }}>
                Last report ↗
              </button>
            )}
            <button onClick={submit} disabled={submitting} style={{ background: submitting ? "rgba(59,130,246,0.4)" : "#3b82f6", border: "none", color: "#fff", fontFamily: "DM Mono, monospace", fontSize: "0.74rem", padding: "0.32rem 1rem", borderRadius: "6px", cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Grading…" : wasSubmitted ? "Resubmit →" : "Submit →"}
            </button>
          </div>
        </header>

        {/* Submit error */}
        {submitError && (
          <div style={{ padding: "0.5rem 1rem", background: "rgba(244,63,94,0.06)", borderBottom: "1px solid rgba(244,63,94,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#f43f5e" }}>⚠ {submitError}</span>
            <button onClick={() => setSubmitError(null)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>×</button>
          </div>
        )}

        {/* Submitting overlay */}
        {submitting && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(5,5,12,0.92)", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
            <Spinner size={52} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 600, color: "#f1f5f9", marginBottom: "0.5rem" }}>
                {GRADING_STAGES[gradingStage]}
              </p>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#64748b", animation: "pulse 2s ease-in-out infinite" }}>
                Stage {gradingStage + 1} of {GRADING_STAGES.length}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {GRADING_STAGES.map((_, i) => (
                <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: i <= gradingStage ? "#3b82f6" : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />
              ))}
            </div>
          </div>
        )}

        {/* Sandpack editor */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {!pageLoading && workspace && (
            <SandpackEditor
              files={files}
              framework={assignment?.framework ?? "html_css_js"}
              onChange={handleFilesChange}
            />
          )}
        </div>

        {/* Brief panel */}
        {briefOpen && assignment && (
          <>
            <div onClick={() => setBriefOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 30 }} />
            <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 90vw)", background: "#0f0f1a", borderLeft: "1px solid rgba(255,255,255,0.07)", zIndex: 40, display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideIn 0.2s ease" }}>
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
                <div>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>Assignment Brief</p>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 600, color: "#f1f5f9" }}>{assignment.title}</h2>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#3b82f6", marginTop: "0.3rem" }}>{frameworkLabel}</p>
                </div>
                <button onClick={() => setBriefOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
                <section style={{ marginBottom: "1.75rem" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Objectives</p>
                  <ul style={{ listStyle: "none" }}>
                    {assignment.objectives.map((obj, i) => (
                      <li key={i} style={{ display: "flex", gap: "0.6rem", marginBottom: "0.4rem" }}>
                        <span style={{ color: "#3b82f6", flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.6 }}>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section style={{ marginBottom: "1.75rem" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Description</p>
                  <MarkdownBrief content={assignment.description} />
                </section>
                <section>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Grading (100pts)</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {assignment.patternChecks.map((c) => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px" }}>
                        <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{c.label}</span>
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#3b82f6" }}>{c.weight}pt</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0.75rem", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: "6px" }}>
                      <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Code quality (AI review)</span>
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#3b82f6" }}>35pt</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0.75rem", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: "6px" }}>
                      <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Design decisions (AI review)</span>
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#3b82f6" }}>25pt</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
