"use client"

import { useEffect, useState } from "react"
import type { LectureBeat } from "@/lib/types"

type Props = { beat: Extract<LectureBeat, { type: "concept_reveal" }> }

export function ConceptBeat({ beat }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [beat.text])

  // Highlight emphasis words in the text
  function renderText(text: string, emphasis: string[]) {
    if (!emphasis?.length) return <span>{text}</span>

    const pattern = new RegExp(`(${(emphasis ?? []).map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi")
    const parts = text.split(pattern)

    return (
      <>
        {parts.map((part, i) => {
          const isEm = emphasis.some((e) => e.toLowerCase() === part.toLowerCase())
          return isEm ? (
            <mark
              key={i}
              style={{
                background: "var(--accent-dim)",
                color: "var(--accent)",
                borderRadius: "3px",
                padding: "0 4px",
                fontWeight: 500,
              }}
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        })}
      </>
    )
  }

  return (
    <div
      className="surface"
      style={{
        padding: "2.5rem",
        minHeight: "220px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <p
        style={{
          fontSize: "1.25rem",
          lineHeight: 1.85,
          color: "var(--text-primary)",
          fontWeight: 300,
        }}
      >
        {renderText(beat.text, beat.emphasis)}
      </p>

      {(beat.emphasis?.length ?? 0) > 0 && (
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {(beat.emphasis ?? []).map((term) => (
            <span
              key={term}
              style={{
                background: "var(--accent-dim)",
                border: "1px solid var(--border-glow)",
                borderRadius: "999px",
                padding: "0.2rem 0.75rem",
                fontSize: "0.75rem",
                color: "var(--accent)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              {term}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
