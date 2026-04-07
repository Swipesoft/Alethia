"use client"

import { useState } from "react"

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
}

const STATUS_COLORS: Record<string, string> = {
  "Accepted": "#6ee7b7",
  "Wrong Answer": "#f9a8d4",
  "Compilation Error": "#fbbf24",
  "Runtime Error (SIGSEGV)": "#f9a8d4",
  "Time Limit Exceeded": "#fcd34d",
  "Processing": "#93c5fd",
}

export function Judge0Terminal({ code, language, onResult, readOnly = false, onCodeChange }: Props) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [localCode, setLocalCode] = useState(code)

  const displayCode = readOnly ? code : localCode

  async function runCode() {
    if (running) return
    setRunning(true)
    setResult(null)

    try {
      const res = await fetch("/api/assess/judge0", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: displayCode,
          language,
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

  const statusColor = result ? (STATUS_COLORS[result.status] ?? "var(--text-muted)") : "var(--text-muted)"

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
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--text-muted)" }}>
            {language}
          </span>
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
              <>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
                Running...
              </>
            ) : (
              <>▶ Run</>
            )}
          </button>
        </div>

        {/* Code area */}
        <textarea
          value={displayCode}
          onChange={(e) => !readOnly && handleCodeChange(e.target.value)}
          readOnly={readOnly}
          style={{
            width: "100%",
            minHeight: "220px",
            background: "transparent",
            border: "none",
            color: "#a0aec0",
            fontFamily: "DM Mono, monospace",
            fontSize: "0.875rem",
            padding: "1rem 1.25rem",
            resize: "vertical",
            outline: "none",
            lineHeight: 1.7,
            cursor: readOnly ? "default" : "text",
          }}
        />
      </div>

      {/* Terminal output */}
      {(running || result) && (
        <div
          style={{
            background: "#030308",
            border: `1px solid ${result ? statusColor + "40" : "var(--border)"}`,
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}
        >
          {/* Terminal header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)", background: "#0a0a12" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: result ? statusColor : "#93c5fd", animation: running ? "pulse 1s ease infinite" : "none" }} />
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Terminal
              </span>
            </div>
            {result && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: statusColor }}>
                  {result.status}
                </span>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)" }}>
                  {result.time}s
                </span>
              </div>
            )}
          </div>

          {/* Output */}
          <div style={{ padding: "0.875rem 1.25rem", minHeight: "80px" }}>
            {running && (
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: "#93c5fd" }}>
                Executing...
              </p>
            )}
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
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                (no output)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
