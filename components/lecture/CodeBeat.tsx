"use client"

import { useEffect, useState } from "react"
import type { LectureBeat } from "@/lib/types"

type Props = { beat: Extract<LectureBeat, { type: "code_walkthrough" }> }

export function CodeBeat({ beat }: Props) {
  const [visibleLines, setVisibleLines] = useState(0)
  const lines = beat.code.split("\n")

  useEffect(() => {
    setVisibleLines(0)
    let i = 0
    const interval = setInterval(() => {
      i++
      setVisibleLines(i)
      if (i >= lines.length) clearInterval(interval)
    }, Math.min(120, beat.durationMs / lines.length))
    return () => clearInterval(interval)
  }, [beat.code, beat.durationMs, lines.length])

  // Check if a line index is in any highlight range
  function isHighlighted(lineIdx: number): boolean {
    return beat.highlights.some(([start, end]) => lineIdx >= start - 1 && lineIdx <= end - 1)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Code block */}
      <div
        style={{
          background: "#0d0d16",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1.25rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div key={c} style={{ width: "10px", height: "10px", borderRadius: "50%", background: c }} />
            ))}
          </div>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--text-muted)" }}>
            {beat.language}
          </span>
        </div>

        {/* Lines */}
        <div style={{ padding: "1.25rem 0", overflowX: "auto" }}>
          {lines.map((line, i) => {
            const highlighted = isHighlighted(i)
            const visible = i < visibleLines
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  background: highlighted ? "rgba(251,191,36,0.06)" : "transparent",
                  borderLeft: highlighted ? "2px solid var(--accent)" : "2px solid transparent",
                  opacity: visible ? 1 : 0,
                  transition: "opacity 0.15s ease",
                  paddingRight: "1.25rem",
                }}
              >
                {/* Line number */}
                <span
                  style={{
                    minWidth: "3rem",
                    textAlign: "right",
                    paddingRight: "1.25rem",
                    color: "var(--text-muted)",
                    fontFamily: "DM Mono, monospace",
                    fontSize: "0.78rem",
                    userSelect: "none",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                {/* Code */}
                <pre
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: "0.875rem",
                    color: highlighted ? "var(--text-primary)" : "#a0aec0",
                    whiteSpace: "pre",
                    margin: 0,
                  }}
                >
                  {colorize(line, beat.language)}
                </pre>
              </div>
            )
          })}
        </div>
      </div>

      {/* Explanation */}
      {beat.explanation && (
        <div
          className="animate-fade-up"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--accent)",
            borderRadius: "var(--radius-sm)",
            padding: "1rem 1.25rem",
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            lineHeight: 1.7,
          }}
        >
          💡 {beat.explanation}
        </div>
      )}
    </div>
  )
}

// Lightweight syntax colouring (no heavy deps)
function colorize(line: string, lang: string): React.ReactNode {
  if (!["python", "javascript", "typescript", "js", "ts"].includes(lang.toLowerCase())) {
    return line
  }

  const keywords = /\b(def|class|return|import|from|if|else|elif|for|while|in|not|and|or|True|False|None|const|let|var|function|async|await|export|default|=>|new|this|typeof|null|undefined)\b/g
  const strings = /(["'`])(?:\\.|(?!\1)[^\\])*\1/g
  const comments = /(#.*$|\/\/.*$)/gm
  const numbers = /\b(\d+\.?\d*)\b/g
  const builtins = /\b(print|len|range|list|dict|tuple|set|str|int|float|bool|console|Math|Array|Object|Promise)\b/g

  const colorMap: [RegExp, string][] = [
    [comments, "#6a737d"],
    [strings, "#98c379"],
    [keywords, "#c678dd"],
    [numbers, "#d19a66"],
    [builtins, "#61afef"],
  ]

  // Simple sequential replacement with spans - returns plain string for pre
  let result = line
  // For simplicity in this MVP, return with basic keyword highlighting
  // A production version would use shiki via an API route
  return <span dangerouslySetInnerHTML={{ __html: simpleHighlight(result, lang) }} />
}

function simpleHighlight(code: string, lang: string): string {
  const keywords = lang === "python"
    ? ["def", "class", "return", "import", "from", "if", "else", "elif", "for", "while", "in", "not", "and", "or", "True", "False", "None", "with", "as", "try", "except", "raise", "pass", "lambda", "yield"]
    : ["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "default", "async", "await", "new", "this", "typeof", "null", "undefined", "true", "false"]

  let result = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  // Strings
  result = result.replace(/(["'`])(.*?)\1/g, '<span style="color:#98c379">$1$2$1</span>')
  // Comments
  result = result.replace(/(#|\/\/)(.*)$/, '<span style="color:#6a737d">$1$2</span>')
  // Numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#d19a66">$1</span>')
  // Keywords
  keywords.forEach((kw) => {
    result = result.replace(
      new RegExp(`\\b(${kw})\\b`, "g"),
      '<span style="color:#c678dd">$1</span>'
    )
  })

  return result
}
