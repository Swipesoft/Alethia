"use client"

import { useState } from "react"
import { ProgrammingEditor } from "@/components/shared/ProgrammingEditor"
import type { OnCallResult } from "@/app/api/chat/oncall/route"

const LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  javascript: 63,
  typescript: 74,
  java: 62,
  cpp: 54,
  c: 50,
  rust: 73,
  go: 60,
  ruby: 72,
  kotlin: 78,
  swift: 83,
  r: 80,
}

type ExecutionResult = {
  stdout: string
  stderr: string
  status: string
  time: string
}

type Props = {
  code: string
  language: string
  onResult?: (result: ExecutionResult) => void
  readOnly?: boolean
  onCodeChange?: (code: string) => void
  onLanguageChange?: (lang: string) => void
  taskContext?: string
}

const STATUS_COLORS: Record<string, string> = {
  "Accepted": "#6ee7b7",
  "Wrong Answer": "#f9a8d4",
  "Compilation Error": "#fbbf24",
  "Runtime Error (SIGSEGV)": "#f9a8d4",
  "Time Limit Exceeded": "#fcd34d",
  "Processing": "#93c5fd",
}

const ERROR_STATUSES = new Set([
  "Wrong Answer", "Compilation Error", "Runtime Error (SIGSEGV)",
  "Time Limit Exceeded", "Error", "Runtime Error",
])

export function Judge0Terminal({ code, language, onResult, readOnly = false, onCodeChange, onLanguageChange, taskContext }: Props) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [localCode, setLocalCode] = useState(code)
  const [currentLanguage, setCurrentLanguage] = useState(language)

  // On-call agent state
  const [oncallLoading, setOncallLoading] = useState(false)
  const [oncallResult, setOncallResult] = useState<OnCallResult | null>(null)
  const [oncallError, setOncallError] = useState<string | null>(null)

  const displayCode = readOnly ? code : localCode
  const statusColor = result ? (STATUS_COLORS[result.status] ?? "var(--text-muted)") : "var(--text-muted)"
  const showOncallButton = !readOnly && result && ERROR_STATUSES.has(result.status)

  async function runCode() {
    if (running) return
    setRunning(true)
    setResult(null)
    setOncallResult(null)
    setOncallError(null)

    try {
      const res = await fetch("/api/assess/judge0", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: displayCode,
          language: currentLanguage,
          expectedOutput: undefined,
          rubric: undefined,
        }),
      })
      const data = await res.json()
      const execResult: ExecutionResult = {
        stdout: data.execution?.stdout ?? "",
        stderr: data.execution?.stderr ?? "",
        status: data.execution?.status ?? "Unknown",
        time: data.execution?.time ?? "0",
      }
      setResult(execResult)
      onResult?.(execResult)
    } catch {
      setResult({ stdout: "", stderr: "Execution failed. Check your connection.", status: "Error", time: "0" })
    } finally {
      setRunning(false)
    }
  }

  function handleCodeChange(val: string) {
    setLocalCode(val)
    onCodeChange?.(val)
  }

  async function callOncallAgent() {
    if (oncallLoading || !result) return
    setOncallLoading(true)
    setOncallResult(null)
    setOncallError(null)

    try {
      const res = await fetch("/api/chat/oncall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: displayCode,
          language: currentLanguage,
          executionResult: result,
          taskContext,
        }),
      })
      if (!res.ok) throw new Error("Agent request failed")
      const data: OnCallResult = await res.json()
      setOncallResult(data)
    } catch {
      setOncallError("On-call agent failed to respond. Try again.")
    } finally {
      setOncallLoading(false)
    }
  }

  function applyPatch() {
    if (!oncallResult?.patchedCode) return
    const newCode = oncallResult.patchedCode
    const newLang = oncallResult.patchedLanguage ?? currentLanguage
    setLocalCode(newCode)
    onCodeChange?.(newCode)
    if (newLang !== currentLanguage) {
      setCurrentLanguage(newLang)
      onLanguageChange?.(newLang)
    }
    setOncallResult(null)
    setResult(null)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Code editor */}
      <div style={{ background: "#0d0d16", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        {/* Editor header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />
            ))}
          </div>
          {readOnly ? (
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {currentLanguage}
            </span>
          ) : (
            <select
              value={currentLanguage}
              onChange={(e) => {
                setCurrentLanguage(e.target.value)
                onLanguageChange?.(e.target.value)
                setResult(null)
                setOncallResult(null)
              }}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                color: "var(--text-muted)",
                fontFamily: "DM Mono, monospace",
                fontSize: "0.7rem",
                padding: "0.2rem 0.4rem",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {Object.keys(LANGUAGE_IDS).map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          )}
          {!readOnly && (
            <button
              onClick={runCode}
              disabled={running}
              style={{
                background: running ? "var(--bg-elevated)" : "var(--accent)",
                color: running ? "var(--text-muted)" : "#08080f",
                border: "none",
                borderRadius: "4px",
                padding: "0.3rem 0.75rem",
                fontSize: "0.75rem",
                fontFamily: "DM Mono, monospace",
                cursor: running ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                transition: "all 0.2s ease",
              }}
            >
              {running ? (
                <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>Running...</>
              ) : (
                <>▶ Run</>
              )}
            </button>
          )}
        </div>

        {/* Code area */}
        <ProgrammingEditor
          value={displayCode}
          onChange={readOnly ? undefined : handleCodeChange}
          language={currentLanguage as "python" | "javascript" | "typescript" | "java" | "cpp" | "c" | "rust" | "go" | "ruby" | "kotlin" | "swift" | "r" | "text"}
          readOnly={readOnly}
          minHeight="220px"
        />
      </div>

      {/* Terminal output */}
      {(running || result) && (
        <div style={{
          background: "#030308",
          border: `1px solid ${result ? statusColor + "40" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}>
          {/* Terminal header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)", background: "#0a0a12" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: result ? statusColor : "#93c5fd", animation: running ? "pulse 1s ease infinite" : "none" }} />
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--text-muted)" }}>Terminal</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {result && (
                <>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: statusColor }}>{result.status}</span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)" }}>{result.time}s</span>
                  <button
                    onClick={() => { setResult(null); setOncallResult(null); setOncallError(null) }}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", padding: "0 0.25rem" }}
                  >
                    clear ✕
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Output */}
          <div style={{ padding: "0.875rem 1.25rem", minHeight: "80px", maxHeight: "240px", overflowY: "auto" }}>
            {running && <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: "#93c5fd" }}>Executing...</p>}
            {result?.stdout && (
              <pre style={{ fontFamily: "DM Mono, monospace", fontSize: "0.85rem", color: "#6ee7b7", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {result.stdout}
              </pre>
            )}
            {result?.stderr && (
              <pre style={{ fontFamily: "DM Mono, monospace", fontSize: "0.85rem", color: "#f9a8d4", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {result.stderr}
              </pre>
            )}
            {result && !result.stdout && !result.stderr && (
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: "var(--text-muted)" }}>(no output)</p>
            )}
          </div>

          {/* On-call trigger */}
          {showOncallButton && !oncallResult && !oncallLoading && (
            <div style={{ padding: "0.5rem 1rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <button
                onClick={callOncallAgent}
                style={{
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.35)",
                  borderRadius: "6px",
                  padding: "0.4rem 0.875rem",
                  color: "#a78bfa",
                  fontFamily: "DM Mono, monospace",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  transition: "all 0.2s ease",
                }}
              >
                ⚡ Get On-Call Agent help
              </button>
            </div>
          )}

          {/* On-call loading */}
          {oncallLoading && (
            <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: "0.8rem" }}>⚡</span>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "#a78bfa" }}>On-call agent diagnosing...</span>
            </div>
          )}
        </div>
      )}

      {/* On-call agent result card */}
      {oncallResult && (
        <div style={{
          background: "rgba(139,92,246,0.06)",
          border: "1px solid rgba(139,92,246,0.25)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "0.6rem 1rem", borderBottom: "1px solid rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.08)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem" }}>⚡</span>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#a78bfa" }}>ON-CALL AGENT</span>
            <span style={{ marginLeft: "auto", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: oncallResult.action === "patch" ? "#6ee7b7" : "#fbbf24" }}>
              {oncallResult.action === "patch" ? "FIX READY" : "ENV CHANGE NEEDED"}
            </span>
          </div>

          <div style={{ padding: "0.875rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              {oncallResult.explanation}
            </p>

            {oncallResult.action === "patch" && oncallResult.patchedCode && (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button
                  onClick={applyPatch}
                  style={{
                    background: "var(--accent)",
                    color: "#08080f",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.45rem 1rem",
                    fontSize: "0.8rem",
                    fontFamily: "DM Mono, monospace",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Apply Fix →
                </button>
                <button
                  onClick={() => setOncallResult(null)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem" }}
                >
                  Dismiss
                </button>
                {oncallResult.patchedLanguage && oncallResult.patchedLanguage !== currentLanguage && (
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#fbbf24" }}>
                    also switches language: {currentLanguage} → {oncallResult.patchedLanguage}
                  </span>
                )}
              </div>
            )}

            {oncallResult.action === "change_environment" && oncallResult.environmentChange && (
              <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "6px", padding: "0.75rem 1rem" }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#fbbf24", marginBottom: "0.4rem" }}>TASK NEEDS UPDATING</p>
                <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                  {oncallResult.environmentChange}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* On-call error */}
      {oncallError && (
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "#f9a8d4", padding: "0.5rem 0" }}>
          {oncallError}
        </p>
      )}
    </div>
  )
}
