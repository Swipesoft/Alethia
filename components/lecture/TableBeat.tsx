"use client"

import { useEffect, useState } from "react"
import type { LectureBeat } from "@/lib/types"

// ── Comparison Table ──────────────────────────────────────────────────────────
type TableProps = { beat: Extract<LectureBeat, { type: "comparison_table" }> }

export function TableBeat({ beat }: TableProps) {
  const [visibleRows, setVisibleRows] = useState(0)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i++
      setVisibleRows(i)
      if (i >= beat.rows.length) clearInterval(interval)
    }, 300)
    return () => clearInterval(interval)
  }, [beat.rows?.length ?? 0])

  return (
    <div className="surface" style={{ padding: "1.5rem", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {beat.headers.map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: "left",
                  padding: "0.6rem 1rem",
                  fontFamily: "DM Mono, monospace",
                  fontSize: "0.7rem",
                  color: "var(--accent)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(beat.rows ?? []).slice(0, visibleRows).filter(Boolean).map((row, i) => (
            <tr
              key={i}
              style={{
                borderBottom: "1px solid var(--border)",
                opacity: 0,
                animation: "fade-up 0.3s ease forwards",
              }}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: "0.75rem 1rem",
                    fontSize: "0.875rem",
                    color: j === 0 ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: j === 0 ? 500 : 300,
                    background: i % 2 === 0 ? "transparent" : "var(--bg-elevated)",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Summary Card ──────────────────────────────────────────────────────────────
type SummaryProps = { beat: Extract<LectureBeat, { type: "summary_card" }> }

export function SummaryBeat({ beat }: SummaryProps) {
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i++
      setVisible(i)
      if (i >= beat.points.length) clearInterval(interval)
    }, 400)
    return () => clearInterval(interval)
  }, [beat.points?.length ?? 0])

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-glow)",
        borderRadius: "var(--radius)",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ fontSize: "1.5rem" }}>✦</span>
        <h3 style={{ fontSize: "1.15rem", fontFamily: "Playfair Display, serif", color: "var(--accent)" }}>
          Key Takeaways
        </h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {(beat.points ?? []).slice(0, visible).map((point, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start",
              opacity: 0,
              animation: "fade-up 0.4s ease forwards",
            }}
          >
            <span
              style={{
                minWidth: "22px",
                height: "22px",
                borderRadius: "50%",
                background: "var(--accent-dim)",
                border: "1px solid var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.65rem",
                color: "var(--accent)",
                fontFamily: "DM Mono, monospace",
                flexShrink: 0,
                marginTop: "2px",
              }}
            >
              {i + 1}
            </span>
            <p style={{ fontSize: "0.925rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
              {point}
            </p>
          </div>
        ))}
      </div>

      {visible >= beat.points.length && (
        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.75rem 1rem",
            background: "var(--accent-dim)",
            border: "1px solid var(--border-glow)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8rem",
            color: "var(--accent)",
            fontFamily: "DM Mono, monospace",
            textAlign: "center",
            animation: "fade-up 0.4s ease forwards",
            opacity: 0,
          }}
        >
          Lecture complete — take the assessment when ready
        </div>
      )}
    </div>
  )
}
