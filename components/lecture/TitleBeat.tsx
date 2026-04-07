"use client"

import type { LectureBeat } from "@/lib/types"

type Props = { beat: Extract<LectureBeat, { type: "title_card" }> }

export function TitleBeat({ beat }: Props) {
  return (
    <div
      className="animate-fade-up"
      style={{
        minHeight: "320px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "3rem 2rem",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-glow)",
        borderRadius: "var(--radius)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, var(--accent-glow) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          fontFamily: "DM Mono, monospace",
          fontSize: "0.7rem",
          color: "var(--accent)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          marginBottom: "1.5rem",
          position: "relative",
        }}
      >
        ◆ Lecture
      </div>

      <h1
        style={{
          fontFamily: "Playfair Display, serif",
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          fontWeight: 900,
          lineHeight: 1.1,
          marginBottom: "1.25rem",
          maxWidth: "640px",
          position: "relative",
        }}
      >
        {beat.heading}
      </h1>

      <p
        style={{
          fontSize: "1.1rem",
          color: "var(--text-secondary)",
          maxWidth: "480px",
          lineHeight: 1.7,
          position: "relative",
        }}
      >
        {beat.subheading}
      </p>
    </div>
  )
}
