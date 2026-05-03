"use client"

import { useEffect, useRef, useState } from "react"
import type { LectureBeat } from "@/lib/types"

type Props = { beat: Extract<LectureBeat, { type: "equation" }> }

export function EquationBeat({ beat }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    async function render() {
      if (!ref.current) return
      try {
        const katex = (await import("katex")).default
        katex.render(beat.latex, ref.current, {
          displayMode: true,
          throwOnError: false,
          output: "html",
        })
        setRendered(true)
      } catch {
        if (ref.current) ref.current.textContent = beat.latex
        setRendered(true)
      }
    }
    render()
  }, [beat.latex])

  return (
    <div className="surface" style={{ padding: "2.5rem", display: "flex", flexDirection: "column", gap: "2rem", alignItems: "center" }}>
      {/* Equation display */}
      <div
        style={{
          width: "100%",
          background: "#0d0d16",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "2rem",
          textAlign: "center",
          opacity: rendered ? 1 : 0,
          transition: "opacity 0.4s ease",
          minHeight: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div ref={ref} style={{ fontSize: "1.4rem", color: "var(--text-primary)" }} />
      </div>

      {/* Explanation */}
      <div
        style={{
          width: "100%",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--faculty-stem)",
          borderRadius: "var(--radius-sm)",
          padding: "1.25rem",
          fontSize: "0.95rem",
          color: "var(--text-secondary)",
          lineHeight: 1.75,
        }}
      >
        {beat.explanation}
      </div>
    </div>
  )
}
