"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { hasExistingSession, getStudentId } from "@/lib/student-identity"
import { getStudent } from "@/lib/firestore"
import type { StudentProfile } from "@/lib/types"
import { FACULTY_META } from "@/lib/types"

export default function HomePage() {
  const router = useRouter()
  const [returning, setReturning] = useState<StudentProfile | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    async function checkSession() {
      try {
        if (hasExistingSession()) {
          const id = getStudentId()
          if (id) {
            const profile = await getStudent(id)
            if (profile) setReturning(profile)
          }
        }
      } catch (e) {
        console.error("Session check failed:", e)
      } finally {
        setChecked(true)
      }
    }
    checkSession()
  }, [])

  if (!checked) return null

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* ── Ambient background ───────────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(251,191,36,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.5rem 3rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
          <span
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "1.4rem",
              fontWeight: 900,
              color: "var(--accent)",
              letterSpacing: "-0.02em",
            }}
          >
            Athena
          </span>
          <span
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: "0.65rem",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            ArchAgent v0.1
          </span>
        </div>
        <a
          href="https://arxiv.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            textDecoration: "none",
            letterSpacing: "0.05em",
          }}
        >
          Read the Paper ↗
        </a>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "5rem 2rem",
          textAlign: "center",
          gap: "2.5rem",
        }}
      >
        {/* Badge */}
        <div
          className="animate-fade-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "var(--accent-dim)",
            border: "1px solid var(--border-glow)",
            borderRadius: "999px",
            padding: "0.35rem 1rem",
            fontSize: "0.75rem",
            color: "var(--accent)",
            fontFamily: "DM Mono, monospace",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span>●</span> World&apos;s First Education ArchAgent
        </div>

        {/* Headline */}
        <div className="animate-fade-up-delay-1">
          <h1
            style={{
              fontSize: "clamp(3rem, 8vw, 6.5rem)",
              fontWeight: 900,
              color: "var(--text-primary)",
              lineHeight: 1.05,
              maxWidth: "900px",
            }}
          >
            Your education,{" "}
            <em style={{ color: "var(--accent)", fontStyle: "italic" }}>
              architected
            </em>{" "}
            for you.
          </h1>
        </div>

        {/* Subheading */}
        <p
          className="animate-fade-up-delay-2"
          style={{
            fontSize: "1.15rem",
            color: "var(--text-secondary)",
            maxWidth: "560px",
            lineHeight: 1.75,
            fontWeight: 300,
          }}
        >
          Athena doesn&apos;t just teach. It designs your entire learning ecosystem —
          curriculum, lectures, assessments, and environments — then evolves them as you grow.
        </p>

        {/* Returning session banner */}
        {returning && (
          <div
            className="animate-fade-up-delay-3 surface glow-border"
            style={{
              padding: "1.25rem 2rem",
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              maxWidth: "480px",
              width: "100%",
            }}
          >
            <div style={{ textAlign: "left", flex: 1 }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace", marginBottom: "0.25rem" }}>
                RETURNING STUDENT
              </p>
              <p style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                Welcome back, {returning.name}
              </p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {FACULTY_META[returning.faculty].label} · Module {returning.currentModuleIndex + 1} of {returning.curriculum.length}
              </p>
            </div>
            <button
              className="btn-primary"
              style={{ whiteSpace: "nowrap", padding: "0.6rem 1.25rem", fontSize: "0.875rem" }}
              onClick={() => router.push("/dashboard")}
            >
              Resume →
            </button>
          </div>
        )}

        {/* CTA buttons */}
        <div
          className="animate-fade-up-delay-3"
          style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}
        >
          <button
            className="btn-primary"
            style={{ fontSize: "1rem", padding: "0.875rem 2.5rem" }}
            onClick={() => router.push("/onboarding")}
          >
            {returning ? "Start Fresh" : "Begin Learning"} →
          </button>
          <button
            className="btn-ghost"
            style={{ fontSize: "1rem" }}
            onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
          >
            How it works
          </button>
        </div>

        {/* SoSE entry */}
        <div className="animate-fade-up-delay-4">
          <button
            onClick={() => router.push("/sose")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.625rem",
              background: "rgba(110,231,183,0.06)",
              border: "1px solid rgba(110,231,183,0.2)",
              borderRadius: "10px",
              padding: "0.75rem 1.5rem",
              cursor: "pointer",
              color: "#6ee7b7",
              fontFamily: "DM Mono, monospace",
              fontSize: "0.8rem",
              letterSpacing: "0.04em",
            }}
          >
            <span>⌨</span>
            School of Software Engineering — Build real projects →
          </button>
          <button
            onClick={() => router.push("/school/webdev")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.625rem",
              background: "rgba(59,130,246,0.06)",
              border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: "10px",
              padding: "0.75rem 1.5rem",
              cursor: "pointer",
              color: "#3b82f6",
              fontFamily: "DM Mono, monospace",
              fontSize: "0.8rem",
              letterSpacing: "0.04em",
            }}
          >
            <span>🌐</span>
            School of Web Development — Live browser editor →
          </button>
        </div>

        {/* Faculty pills */}
        <div
          className="animate-fade-up-delay-4"
          style={{
            display: "flex",
            gap: "0.6rem",
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: "600px",
          }}
        >
          {(Object.entries(FACULTY_META) as Array<[string, typeof FACULTY_META[keyof typeof FACULTY_META]]>).map(([key, meta]) => (
            <span
              key={key}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                padding: "0.3rem 0.875rem",
                fontSize: "0.78rem",
                color: meta.color,
                fontFamily: "DM Mono, monospace",
              }}
            >
              {meta.icon} {meta.label}
            </span>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          padding: "5rem 3rem",
          borderTop: "1px solid var(--border)",
          maxWidth: "1100px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <p
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "2rem",
          }}
        >
          The ArchAgent Loop
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {[
            { step: "01", title: "Diagnostic", desc: "Athena assesses your current knowledge to calibrate your starting point." },
            { step: "02", title: "Curriculum Design", desc: "The ArchAgent architects a fully personalized 12-module curriculum." },
            { step: "03", title: "Adaptive Lecture", desc: "Each lecture is generated fresh — animated, narrated, and calibrated to you." },
            { step: "04", title: "Live Assessment", desc: "Code runs in real sandboxes. Essays graded by AI. Art judged by vision models." },
            { step: "05", title: "Evidence Review", desc: "The ArchAgent reads your performance patterns and restructures if needed." },
            { step: "06", title: "Evolve & Advance", desc: "Your curriculum evolves with you — never static, always optimal." },
          ].map((item) => (
            <div key={item.step} className="surface" style={{ padding: "1.5rem" }}>
              <p
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: "0.7rem",
                  color: "var(--accent)",
                  marginBottom: "0.75rem",
                  letterSpacing: "0.1em",
                }}
              >
                {item.step}
              </p>
              <h3 style={{ fontSize: "1.05rem", marginBottom: "0.5rem", fontWeight: 600 }}>
                {item.title}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer
        style={{
          padding: "2rem 3rem",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          fontFamily: "DM Mono, monospace",
        }}
      >
        <span>Athena · Gemma 4 Good Hackathon 2026</span>
        <span>Powered by Gemma 4-31B</span>
      </footer>
    </main>
  )
}
