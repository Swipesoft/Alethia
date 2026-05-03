"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { MarkdownBrief } from "@/components/sose/MarkdownBrief"
import { useRouter, useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { getStudentId } from "@/lib/student-identity"
import type { SoSEWorkspace, SoSEAssignment, GeneratedAssignment, RunResult } from "@/lib/types-sose"

type AnyAssignment = SoSEAssignment | GeneratedAssignment

const ProgrammingEditor = dynamic(
  () => import("@/components/shared/ProgrammingEditor").then((m) => m.ProgrammingEditor),
  { ssr: false, loading: () => <div style={{ flex: 1, background: "#0d0d16" }} /> }
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

type EditorLang = "python" | "javascript" | "typescript" | "text"

function detectLang(filename: string): EditorLang {
  if (filename.endsWith(".py")) return "python"
  if (filename.endsWith(".ts")) return "typescript"
  if (filename.endsWith(".js")) return "javascript"
  return "text"
}

function isEditable(filename: string): boolean {
  return [".py", ".js", ".ts", ".md", ".txt", ".json", ".toml", ".cfg"].some((e) =>
    filename.endsWith(e)
  )
}

function sortFiles(names: string[], entryFile?: string): string[] {
  return [...names].sort((a, b) => {
    if (a === entryFile)          return -1
    if (b === entryFile)          return 1
    if (a === "requirements.txt") return -1
    if (b === "requirements.txt") return 1
    if (a === "README.md")        return 1
    if (b === "README.md")        return -1
    if (a.startsWith("test_") && !b.startsWith("test_")) return 1
    if (!a.startsWith("test_") && b.startsWith("test_")) return -1
    return a.localeCompare(b)
  })
}

function buildRunCmd(filename: string): string {
  if (filename.startsWith("test_") && filename.endsWith(".py"))
    return `python -m pytest ${filename} -v -s --tb=short --no-header`
  if (filename.endsWith(".test.js") || filename.endsWith(".spec.js"))
    return `npx jest ${filename} --no-coverage --forceExit`
  if (filename.endsWith(".py")) return `python ${filename}`
  if (filename.endsWith(".js")) return `node ${filename}`
  return `python ${filename}`
}

function validateFilename(name: string, existing: string[]): string | null {
  if (!name.trim())                      return "Filename is required"
  if (!/^[\w.\-]+$/.test(name))         return "Only letters, numbers, _ . - allowed"
  if (!name.includes("."))              return "Include a file extension (.py, .txt, etc)"
  if (existing.includes(name.trim()))    return "A file with this name already exists"
  if (name.startsWith("."))             return "Hidden files not supported"
  return null
}

const STARTER_CONTENT: Record<string, string> = {
  ".py":   "# New file\n",
  ".js":   "// New file\n",
  ".ts":   "// New file\n",
  ".md":   "# Title\n\n",
  ".txt":  "",
  ".json": "{\n}\n",
}

function FileTag({ name }: { name: string }) {
  if (name.endsWith(".py"))
    return <span style={{ fontFamily: "DM Mono", fontSize: "0.56rem", color: "#6ee7b7", background: "rgba(110,231,183,0.12)", padding: "0 4px", borderRadius: "3px", letterSpacing: "0.04em" }}>PY</span>
  if (name.endsWith(".md"))
    return <span style={{ fontFamily: "DM Mono", fontSize: "0.56rem", color: "#93c5fd", background: "rgba(147,197,253,0.12)", padding: "0 4px", borderRadius: "3px" }}>MD</span>
  if (name.endsWith(".json") || name.endsWith(".toml"))
    return <span style={{ fontFamily: "DM Mono", fontSize: "0.56rem", color: "#fbbf24", background: "rgba(251,191,36,0.12)", padding: "0 4px", borderRadius: "3px" }}>CF</span>
  if (name.endsWith(".txt"))
    return <span style={{ fontFamily: "DM Mono", fontSize: "0.56rem", color: "var(--text-muted)", background: "var(--bg-elevated)", padding: "0 4px", borderRadius: "3px" }}>TX</span>
  return <span style={{ width: "24px", display: "inline-block" }} />
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const router      = useRouter()
  const params      = useParams()
  const workspaceId = params.workspaceId as string

  // Core
  const [workspace,   setWorkspace]   = useState<SoSEWorkspace | null>(null)
  const [assignment,  setAssignment]  = useState<AnyAssignment | null>(null)
  const [files,       setFiles]       = useState<Record<string, string>>({})
  const [activeFile,  setActiveFile]  = useState("")
  const [pageLoading, setPageLoading] = useState(true)
  const [saveStatus,  setSaveStatus]  = useState<"saved" | "saving" | "unsaved">("saved")
  const [e2bMissing,  setE2bMissing]  = useState(false)

  // Terminal
  const [termOpen,    setTermOpen]    = useState(true)
  const [output,      setOutput]      = useState<RunResult | null>(null)
  const [running,     setRunning]     = useState(false)
  const [termInput,   setTermInput]   = useState("")
  const [lastRunCmd,  setLastRunCmd]  = useState<string | null>(null)
  const termRef      = useRef<HTMLDivElement>(null)
  const termInputRef = useRef<HTMLInputElement>(null)

  // New-file modal
  const [newFileOpen,  setNewFileOpen]  = useState(false)
  const [newFileName,  setNewFileName]  = useState("")
  const [newFileError, setNewFileError] = useState<string | null>(null)
  const newFileRef = useRef<HTMLInputElement>(null)

  // Package installer
  const [pkgInput,   setPkgInput]   = useState("")
  const [pkgStatus,  setPkgStatus]  = useState<"idle" | "installing" | "done" | "error">("idle")
  const [pkgMessage, setPkgMessage] = useState<string | null>(null)

  // Submit
  const [submitting,    setSubmitting]    = useState(false)
  const [submitError,   setSubmitError]   = useState<string | null>(null)
  const [gradingStage,  setGradingStage]  = useState(0)
  const GRADING_STAGES = [
    "Provisioning sandbox…",
    "Installing dependencies…",
    "Running test suite…",
    "Analysing code quality…",
    "Synthesising feedback…",
    "Almost done…",
  ]

  // Brief
  const [briefOpen, setBriefOpen] = useState(false)

  // Debounce timer
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Cycle grading stage text while submitting ──────────────────────────────
  useEffect(() => {
    if (!submitting) { setGradingStage(0); return }
    const interval = setInterval(() => {
      setGradingStage((s) => Math.min(s + 1, GRADING_STAGES.length - 1))
    }, 12000)
    return () => clearInterval(interval)
  }, [submitting])

  // ── Load workspace ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/sose/workspace?id=${workspaceId}`)
        const data = await res.json()
        if (!res.ok) { router.push("/sose"); return }
        const ws: SoSEWorkspace = data.workspace
        const a: AnyAssignment | null = data.assignment ?? null
        setWorkspace(ws)
        setFiles(ws.files)
        if (a) {
          setAssignment(a)
          setActiveFile(sortFiles(Object.keys(ws.files), a.grading.entryFile)[0] ?? "")
        } else {
          setActiveFile(Object.keys(ws.files)[0] ?? "")
        }
      } catch { router.push("/sose") }
      finally  { setPageLoading(false) }
    }
    load()
  }, [workspaceId, router])

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight
  }, [output])

  useEffect(() => {
    if (newFileOpen) setTimeout(() => newFileRef.current?.focus(), 50)
  }, [newFileOpen])

  // ── Cmd+S / Ctrl+S → immediate save ────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setSaveStatus("saving")
        fetch("/api/sose/workspace", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, files }),
        }).then(() => setSaveStatus("saved")).catch(() => setSaveStatus("unsaved"))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [workspaceId, files])

  // ── Debounced save ──────────────────────────────────────────────────────────
  const scheduleSave = useCallback((updated: Record<string, string>) => {
    setSaveStatus("unsaved")
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus("saving")
      try {
        await fetch("/api/sose/workspace", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, files: updated }),
        })
        setSaveStatus("saved")
      } catch { setSaveStatus("unsaved") }
    }, 1200)
  }, [workspaceId])

  function handleEditorChange(content: string) {
    if (!activeFile) return
    const updated = { ...files, [activeFile]: content }
    setFiles(updated)
    scheduleSave(updated)
  }

  // ── New file ────────────────────────────────────────────────────────────────
  function confirmNewFile() {
    const name = newFileName.trim()
    const err  = validateFilename(name, Object.keys(files))
    if (err) { setNewFileError(err); return }
    const ext     = name.slice(name.lastIndexOf("."))
    const content = STARTER_CONTENT[ext] ?? ""
    const updated = { ...files, [name]: content }
    setFiles(updated)
    setActiveFile(name)
    scheduleSave(updated)
    setNewFileOpen(false)
    setNewFileName("")
  }

  // ── Delete file ─────────────────────────────────────────────────────────────
  function deleteFile(filename: string) {
    if (!confirm(`Delete "${filename}"?`)) return
    const updated = { ...files }
    delete updated[filename]
    setFiles(updated)
    const remaining = sortFiles(Object.keys(updated), assignment?.grading.entryFile)
    setActiveFile(remaining[0] ?? "")
    scheduleSave(updated)
  }

  // ── Install package ─────────────────────────────────────────────────────────
  async function installPackage() {
    const pkg = pkgInput.trim()
    if (!pkg || pkgStatus === "installing") return
    setPkgStatus("installing")
    setPkgMessage(null)

    // Append to requirements.txt
    const reqs = files["requirements.txt"] ?? ""
    const lines = reqs.split("\n").map((l) => l.trim()).filter(Boolean)
    if (!lines.includes(pkg)) {
      const updated = { ...files, "requirements.txt": [...lines, pkg].join("\n") + "\n" }
      setFiles(updated)
      scheduleSave(updated)
    }

    // Verify in sandbox
    try {
      const res = await fetch("/api/sose/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: { ...files, "requirements.txt": (files["requirements.txt"] ?? "") + "\n" + pkg },
          command: `python -c "import ${pkg.split("[")[0].replace("-", "_").replace("==", "").split(">=")[0].split("<=")[0].trim()}" 2>&1 || python -m pip install ${pkg} -q 2>&1`,
        }),
      })
      const data = await res.json()
      if (data.stderr?.includes("E2B_API_KEY")) {
        setE2bMissing(true)
        setPkgStatus("done")
        setPkgMessage(`${pkg} added to requirements.txt (install will run on next Run)`)
      } else if (data.exitCode === 0) {
        setPkgStatus("done")
        setPkgMessage(`${pkg} added ✓`)
      } else {
        setPkgStatus("done")
        setPkgMessage(`${pkg} added to requirements.txt`)
      }
      setPkgInput("")
    } catch {
      setPkgStatus("done")
      setPkgMessage(`${pkg} added to requirements.txt`)
      setPkgInput("")
    }
    setTimeout(() => { setPkgStatus("idle"); setPkgMessage(null) }, 4000)
  }

  // ── Execute ─────────────────────────────────────────────────────────────────
  async function execute(command: string) {
    if (running) return
    setRunning(true)
    setTermOpen(true)
    setOutput(null)
    setLastRunCmd(command)
    try {
      const res  = await fetch("/api/sose/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, command }),
      })
      const data = await res.json()
      if (data.stderr?.includes("E2B_API_KEY")) setE2bMissing(true)
      setOutput({ stdout: data.stdout ?? "", stderr: data.stderr ?? "", exitCode: data.exitCode ?? 0, durationMs: data.durationMs ?? 0 })
    } catch {
      setOutput({ stdout: "", stderr: "Run failed — check your connection.", exitCode: 1, durationMs: 0 })
    } finally {
      setRunning(false)
    }
  }

  function runFile()  { execute(buildRunCmd(activeFile)) }
  function runTests() {
    const isJS = assignment?.language === "javascript" || assignment?.language === "typescript"

    if (isJS) {
      const testFile = Object.keys(files).find((f) => f.endsWith(".test.js") || f.endsWith(".spec.js"))
      execute(testFile
        ? `npx jest ${testFile} --no-coverage --forceExit --verbose`
        : "npx jest --no-coverage --forceExit --verbose"
      )
    } else {
      // Prefer the grading testCmd so filename/flags stay consistent with what was validated
      const gradingCmd = assignment?.grading.testCmd
      if (gradingCmd) {
        // Strip the trailing 2>&1 (run route captures stderr separately) and add -s for print output
        const baseCmd = gradingCmd.replace(/\s*2>&1\s*$/, "").trim()
        const withCapture = baseCmd.includes(" -s ") || baseCmd.endsWith(" -s") ? baseCmd : baseCmd + " -s"
        execute(withCapture)
      } else {
        const tf = Object.keys(files).find((f) => f.startsWith("test_") && f.endsWith(".py"))
        execute(tf ? `python -m pytest ${tf} -v -s --tb=short --no-header` : "python -m pytest -v -s --tb=short --no-header")
      }
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function submit() {
    if (!workspace || submitting) return
    const studentId = getStudentId()
    if (!studentId) { router.push("/sose"); return }
    setSubmitting(true)
    setSubmitError(null)
    try {
      // Force save first
      if (saveTimer.current) clearTimeout(saveTimer.current)
      await fetch("/api/sose/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, files }),
      })
      setSaveStatus("saved")

      const res  = await fetch("/api/sose/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, studentId, lastTestCmd: lastRunCmd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Submission failed")
      router.push(`/sose/report/${data.submissionId}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed. Please retry.")
      setSubmitting(false)
    }
  }

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div style={{ height: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <div style={{ width: "36px", height: "36px", border: "2px solid var(--border)", borderTopColor: "#6ee7b7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: "var(--text-muted)" }}>Loading workspace…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const sortedFiles   = sortFiles(Object.keys(files), assignment?.grading.entryFile)
  const lang          = detectLang(activeFile)
  const currentContent = files[activeFile] ?? ""
  const readonly      = !isEditable(activeFile)
  const hasTestFile   = sortedFiles.some(
    (f) => f.startsWith("test_") || f.endsWith(".test.js") || f.endsWith(".spec.js")
  )
  const canRunFile    = activeFile.endsWith(".py") || activeFile.endsWith(".js") || activeFile.endsWith(".ts")
  const wasSubmitted  = !!(workspace?.submissionId)
  const lastReportId  = workspace?.submissionId ?? null

  return (
    <>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
      `}</style>

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>

        {/* ══════ TOP BAR ══════════════════════════════════════════════════════ */}
        <header style={{ height: "50px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 0.875rem", borderBottom: "1px solid var(--border)", flexShrink: 0, gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1 }}>
            <button onClick={() => router.push("/sose")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.7rem", padding: "0.2rem 0.4rem", borderRadius: "4px", flexShrink: 0 }}>
              ← SoSE
            </button>
            <span style={{ color: "var(--border)", flexShrink: 0 }}>|</span>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.74rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {assignment?.title ?? "Workspace"}
            </span>
          </div>

          {/* Save indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
            <span style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: saveStatus === "saved" ? "#6ee7b7" : saveStatus === "saving" ? "#fbbf24" : "#f9a8d4",
              animation: saveStatus === "saving" ? "pulse 1s ease-in-out infinite" : "none",
              transition: "background 0.3s",
            }} />
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)" }}>
              {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving…" : "Unsaved"}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
            <button onClick={() => setBriefOpen((v) => !v)} style={{ background: briefOpen ? "var(--accent-dim)" : "var(--bg-elevated)", border: `1px solid ${briefOpen ? "var(--border-glow)" : "var(--border)"}`, color: briefOpen ? "var(--accent)" : "var(--text-muted)", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", padding: "0.28rem 0.65rem", borderRadius: "6px", cursor: "pointer" }}>
              Brief
            </button>
            {hasTestFile && (
              <button onClick={runTests} disabled={running} style={{ background: "rgba(110,231,183,0.08)", border: "1px solid rgba(110,231,183,0.2)", color: "#6ee7b7", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", padding: "0.28rem 0.65rem", borderRadius: "6px", cursor: running ? "wait" : "pointer", opacity: running ? 0.6 : 1 }}>
                {running ? "Running…" : "▶ Tests"}
              </button>
            )}
            <button onClick={runFile} disabled={running || !canRunFile} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", padding: "0.28rem 0.65rem", borderRadius: "6px", cursor: (!canRunFile || running) ? "not-allowed" : "pointer", opacity: (!canRunFile || running) ? 0.4 : 1 }}>
              ▶ Run
            </button>
            {wasSubmitted && lastReportId && (
              <button
                onClick={() => router.push(`/sose/report/${lastReportId}`)}
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", padding: "0.28rem 0.65rem", borderRadius: "6px", cursor: "pointer" }}
              >
                Last Report ↗
              </button>
            )}
            <button onClick={submit} disabled={submitting || running} className="btn-primary" style={{ fontSize: "0.74rem", padding: "0.32rem 0.95rem", background: "#6ee7b7", opacity: submitting || running ? 0.7 : 1, cursor: submitting ? "wait" : "pointer" }}>
              {submitting ? "Grading…" : wasSubmitted ? "Resubmit →" : "Submit →"}
            </button>
          </div>
        </header>

        {/* ── Warning bars ─────────────────────────────────────────────────── */}
        {e2bMissing && (
          <div style={{ padding: "0.5rem 1rem", background: "rgba(251,191,36,0.06)", borderBottom: "1px solid rgba(251,191,36,0.18)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#fbbf24" }}>
              ⚠ E2B_API_KEY not set — sandbox execution disabled. Add it to .env.local (free at e2b.dev).
            </span>
            <button onClick={() => setE2bMissing(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>×</button>
          </div>
        )}
        {submitError && (
          <div style={{ padding: "0.5rem 1rem", background: "rgba(249,168,212,0.06)", borderBottom: "1px solid rgba(249,168,212,0.18)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#f9a8d4" }}>⚠ {submitError}</span>
            <button onClick={() => setSubmitError(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>×</button>
          </div>
        )}

        {/* ── Submitting overlay ───────────────────────────────────────────── */}
        {submitting && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(8,8,15,0.9)", zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
            <div style={{ width: "48px", height: "48px", border: "2px solid var(--border)", borderTopColor: "#6ee7b7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>Grading your project…</p>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: "#6ee7b7", lineHeight: 1.6 }}>
                {GRADING_STAGES[gradingStage]}
              </p>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                Stage {gradingStage + 1} of {GRADING_STAGES.length} · typically 30–90 seconds total
              </p>
            </div>
          </div>
        )}

        {/* ══════ MAIN LAYOUT ══════════════════════════════════════════════════ */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
          <aside style={{ width: "208px", flexShrink: 0, borderRight: "1px solid var(--border)", background: "#07070d", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Explorer header */}
            <div style={{ padding: "0.45rem 0.7rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Explorer</span>
              <button
                onClick={() => { setNewFileName(""); setNewFileError(null); setNewFileOpen(true) }}
                title="New file"
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: "0 2px", transition: "color 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6ee7b7" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)" }}
              >
                +
              </button>
            </div>

            {/* File list */}
            <div style={{ flex: 1, overflowY: "auto", paddingTop: "2px" }}>
              {sortedFiles.map((f) => {
                const active  = f === activeFile
                const isTest  = f.startsWith("test_")
                const isMain  = f === assignment?.grading.entryFile
                const isDirty = active && saveStatus === "unsaved"
                return (
                  <div
                    key={f}
                    style={{ display: "flex", alignItems: "center", position: "relative" }}
                    onMouseEnter={(e) => { const d = e.currentTarget.querySelector<HTMLElement>(".del") ; if (d) d.style.opacity = "1" }}
                    onMouseLeave={(e) => { const d = e.currentTarget.querySelector<HTMLElement>(".del") ; if (d) d.style.opacity = "0" }}
                  >
                    <button
                      onClick={() => setActiveFile(f)}
                      style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.7rem 0.35rem 0.6rem", background: active ? "rgba(110,231,183,0.05)" : "none", border: "none", borderLeft: active ? "2px solid #6ee7b7" : "2px solid transparent", cursor: "pointer", textAlign: "left", minWidth: 0 }}
                    >
                      <FileTag name={f} />
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.71rem", color: active ? "#6ee7b7" : isTest ? "#93c5fd" : isMain ? "var(--text-primary)" : "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {f}
                      </span>
                      {isDirty && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#fbbf24", flexShrink: 0 }} />}
                    </button>
                    <button
                      className="del"
                      onClick={() => deleteFile(f)}
                      title="Delete"
                      style={{ opacity: 0, background: "none", border: "none", color: "#f9a8d4", cursor: "pointer", fontSize: "0.78rem", padding: "0.35rem 0.5rem", flexShrink: 0, transition: "opacity 0.15s" }}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Package installer */}
            <div style={{ borderTop: "1px solid var(--border)", padding: "0.65rem 0.7rem" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.45rem" }}>Packages</p>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                <input
                  value={pkgInput}
                  onChange={(e) => setPkgInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && installPackage()}
                  placeholder="e.g. requests"
                  style={{ flex: 1, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text-primary)", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", padding: "0.3rem 0.45rem", outline: "none", minWidth: 0 }}
                />
                <button
                  onClick={installPackage}
                  disabled={!pkgInput.trim() || pkgStatus === "installing"}
                  style={{ background: pkgStatus === "done" ? "rgba(110,231,183,0.12)" : "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "4px", color: pkgStatus === "done" ? "#6ee7b7" : pkgStatus === "error" ? "#f9a8d4" : "var(--text-muted)", cursor: pkgStatus === "installing" ? "wait" : "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.7rem", padding: "0.3rem 0.5rem", flexShrink: 0, transition: "all 0.2s" }}
                >
                  {pkgStatus === "installing" ? "…" : "+"}
                </button>
              </div>
              {pkgMessage && (
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: pkgStatus === "done" ? "#6ee7b7" : "#f9a8d4", marginTop: "0.3rem", lineHeight: 1.4, animation: "fadeUp 0.2s ease" }}>
                  {pkgMessage}
                </p>
              )}
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)", marginTop: "0.25rem", lineHeight: 1.35 }}>
                Adds to requirements.txt · installed on run
              </p>
            </div>

            {/* Grading checks */}
            {assignment && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "0.65rem 0.7rem" }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.45rem" }}>Grading</p>
                {assignment.checks.map((c) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.61rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</span>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.61rem", color: "#6ee7b7", flexShrink: 0, marginLeft: "0.35rem" }}>{c.weight}pt</span>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* ── EDITOR + TERMINAL ──────────────────────────────────────────── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

            {/* Tab bar */}
            <div style={{ height: "33px", display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)", background: "#07070d", overflowX: "auto", flexShrink: 0, scrollbarWidth: "none" }}>
              {sortedFiles.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFile(f)}
                  style={{ height: "100%", padding: "0 0.8rem", background: f === activeFile ? "var(--bg-surface)" : "transparent", border: "none", borderRight: "1px solid var(--border)", borderBottom: f === activeFile ? "2px solid #6ee7b7" : "2px solid transparent", color: f === activeFile ? "#6ee7b7" : "var(--text-muted)", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "color 0.15s" }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Editor area */}
            <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
              {activeFile ? (
                readonly ? (
                  <pre style={{ margin: 0, padding: "1rem 1.25rem", fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {currentContent || "(empty file)"}
                  </pre>
                ) : (
                  <ProgrammingEditor
                    key={activeFile}
                    value={currentContent}
                    onChange={handleEditorChange}
                    language={lang}
                    minHeight="100%"
                  />
                )
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontFamily: "DM Mono, monospace", fontSize: "0.8rem" }}>
                  Select a file to edit
                </div>
              )}
            </div>

            {/* ── Terminal panel ─────────────────────────────────────────── */}
            <div style={{ flexShrink: 0, height: termOpen ? "250px" : "33px", transition: "height 0.2s ease", borderTop: "1px solid var(--border)", background: "#050510", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ height: "33px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 0.8rem", borderBottom: termOpen ? "1px solid var(--border)" : "none", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Output</span>
                  {running && <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "#6ee7b7", animation: "pulse 1s ease-in-out infinite" }}>● Running…</span>}
                  {output && !running && (
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: output.exitCode === 0 ? "#6ee7b7" : "#f9a8d4" }}>
                      Exit {output.exitCode} · {(output.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {output && <button onClick={() => setOutput(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.6rem" }}>Clear</button>}
                  <button onClick={() => setTermOpen((v) => !v)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.82rem", lineHeight: 1 }}>
                    {termOpen ? "▾" : "▴"}
                  </button>
                </div>
              </div>
              {termOpen && (
                <>
                  <div ref={termRef} style={{ flex: 1, overflowY: "auto", padding: "0.65rem 0.875rem", fontFamily: "DM Mono, monospace", fontSize: "0.76rem", lineHeight: 1.75 }}>
                    {!output && !running && (
                      <span style={{ color: "var(--text-muted)" }}>
                        Click ▶ Run / ▶ Tests, or type a command below and press Enter.
                      </span>
                    )}
                    {running && (
                      <span style={{ color: "#6ee7b7" }}>
                        $ {lastRunCmd ?? "Executing in sandbox…"}
                      </span>
                    )}
                    {output && (
                      <>
                        <div style={{ color: "var(--text-muted)", marginBottom: "0.35rem", fontSize: "0.68rem" }}>$ {lastRunCmd}</div>
                        {output.stdout && <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text-primary)" }}>{output.stdout}</pre>}
                        {output.stderr && <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: output.exitCode === 0 ? "#fbbf24" : "#f9a8d4", marginTop: output.stdout ? "0.4rem" : 0 }}>{output.stderr}</pre>}
                        {!output.stdout && !output.stderr && <span style={{ color: "var(--text-muted)" }}>(no output)</span>}
                      </>
                    )}
                  </div>
                  {/* Shell-style command input */}
                  <div style={{ borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 0.6rem", gap: "0.4rem", flexShrink: 0 }}>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#6ee7b7", flexShrink: 0 }}>$</span>
                    <input
                      ref={termInputRef}
                      value={termInput}
                      onChange={(e) => setTermInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && termInput.trim() && !running) {
                          execute(termInput.trim())
                          setTermInput("")
                        }
                      }}
                      placeholder={running ? "Running…" : "python -m pytest test_main.py -v -s"}
                      disabled={running}
                      style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "var(--text-primary)", padding: "0.4rem 0", caretColor: "#6ee7b7" }}
                    />
                    {termInput.trim() && !running && (
                      <button
                        onClick={() => { execute(termInput.trim()); setTermInput("") }}
                        style={{ background: "none", border: "none", color: "#6ee7b7", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", padding: "0.2rem 0.4rem", flexShrink: 0 }}
                      >
                        ↵
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ══════ NEW FILE MODAL ════════════════════════════════════════════════ */}
        {newFileOpen && (
          <>
            <div onClick={() => setNewFileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 40 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem", zIndex: 50, width: "360px", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", animation: "fadeUp 0.15s ease" }}>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1rem" }}>New file</h3>
              <input
                ref={newFileRef}
                value={newFileName}
                onChange={(e) => { setNewFileName(e.target.value); setNewFileError(null) }}
                onKeyDown={(e) => { if (e.key === "Enter") confirmNewFile(); if (e.key === "Escape") setNewFileOpen(false) }}
                placeholder="e.g. utils.py"
                className="input-field"
                style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}
              />
              {newFileError && <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#f9a8d4", marginBottom: "0.75rem" }}>{newFileError}</p>}
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Supported: .py · .js · .ts · .md · .txt · .json
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={confirmNewFile} className="btn-primary" style={{ flex: 1, fontSize: "0.875rem", padding: "0.6rem", background: "#6ee7b7" }}>Create</button>
                <button onClick={() => setNewFileOpen(false)} className="btn-ghost" style={{ flex: 1, fontSize: "0.875rem", padding: "0.6rem" }}>Cancel</button>
              </div>
            </div>
          </>
        )}

        {/* ══════ BRIEF PANEL ══════════════════════════════════════════════════ */}
        {briefOpen && assignment && (
          <>
            <div onClick={() => setBriefOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30 }} />
            <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 90vw)", background: "var(--bg-surface)", borderLeft: "1px solid var(--border)", zIndex: 40, display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideIn 0.2s ease" }}>
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
                <div>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>Assignment Brief</p>
                  <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.2rem", fontWeight: 600, color: "var(--text-primary)" }}>{assignment.title}</h2>
                </div>
                <button onClick={() => setBriefOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
                <section style={{ marginBottom: "1.75rem" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Learning objectives</p>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {assignment.objectives.map((obj, i) => (
                      <li key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                        <span style={{ color: "#6ee7b7", flexShrink: 0, marginTop: "1px" }}>✓</span>
                        <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section style={{ marginBottom: "1.75rem" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Task description</p>
                  <MarkdownBrief content={assignment.description} />
                </section>
                <section>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Grading breakdown</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {assignment.checks.map((c) => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.875rem", background: "var(--bg-elevated)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                        <div>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{c.label}</span>
                          {c.required && <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#f9a8d4", marginLeft: "0.5rem" }}>required</span>}
                        </div>
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.76rem", color: "#6ee7b7", background: "rgba(110,231,183,0.08)", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>{c.weight} pts</span>
                      </div>
                    ))}
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
