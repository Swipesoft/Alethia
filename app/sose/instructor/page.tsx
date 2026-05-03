"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SOSE_ASSIGNMENTS } from "@/data/sose-assignments"
import type { SoSEAssignment } from "@/lib/types-sose"
import { MarkdownBrief } from "@/components/sose/MarkdownBrief"

const DIFF_COLORS = {
  beginner:     "#6ee7b7",
  intermediate: "#fbbf24",
  advanced:     "#f9a8d4",
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre
      style={{
        background: "#07070e",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "0.875rem 1rem",
        fontFamily: "DM Mono, monospace",
        fontSize: "0.72rem",
        color: "#a0aec0",
        lineHeight: 1.7,
        overflowX: "auto",
        margin: "0.5rem 0 1rem",
      }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function AssignmentDetail({ a }: { a: SoSEAssignment }) {
  const [tab, setTab] = useState<"overview" | "files" | "rubric" | "grading">("overview")
  const [activeFile, setActiveFile] = useState(Object.keys(a.starterFiles)[0] ?? "")

  const tabStyle = (active: boolean) => ({
    fontFamily: "DM Mono, monospace",
    fontSize: "0.68rem",
    padding: "0.35rem 0.75rem",
    border: "none",
    borderBottom: active ? "2px solid #6ee7b7" : "2px solid transparent",
    background: "none",
    color: active ? "#6ee7b7" : "var(--text-muted)",
    cursor: "pointer",
    letterSpacing: "0.05em",
  })

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
      {/* Assignment header */}
      <div style={{ padding: "1.25rem 1.5rem", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: DIFF_COLORS[a.difficulty], background: `${DIFF_COLORS[a.difficulty]}12`, border: `1px solid ${DIFF_COLORS[a.difficulty]}28`, borderRadius: "999px", padding: "0.15rem 0.6rem" }}>
              {a.difficulty}
            </span>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)" }}>
              {a.language} · {a.estimatedMins} min
            </span>
          </div>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.15rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
            {a.title}
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{a.subtitle}</p>
        </div>

        {/* Score breakdown pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-end", flexShrink: 0 }}>
          {a.checks.map((c) => (
            <span key={c.id} style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.1rem 0.45rem" }}>
              {c.label}: {c.weight}pt{c.required ? " ★" : ""}
            </span>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg-surface)", padding: "0 1.25rem" }}>
        {(["overview", "files", "rubric", "grading"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: "1.25rem 1.5rem", background: "var(--bg-surface)" }}>

        {/* ── Overview tab ─────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Learning objectives
            </p>
            <ul style={{ listStyle: "none", marginBottom: "1.5rem" }}>
              {a.objectives.map((obj, i) => (
                <li key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.3rem" }}>
                  <span style={{ color: "#6ee7b7", flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{obj}</span>
                </li>
              ))}
            </ul>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Assignment brief
            </p>
            <MarkdownBrief content={a.description} />
          </div>
        )}

        {/* ── Files tab ────────────────────────────────────────────────────── */}
        {tab === "files" && (
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "1rem", minHeight: "320px" }}>
            {/* File list */}
            <div style={{ borderRight: "1px solid var(--border)", paddingRight: "1rem" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Starter files
              </p>
              {Object.keys(a.starterFiles).map((fname) => (
                <button
                  key={fname}
                  onClick={() => setActiveFile(fname)}
                  style={{ width: "100%", textAlign: "left", padding: "0.3rem 0.5rem", fontFamily: "DM Mono, monospace", fontSize: "0.71rem", color: fname === activeFile ? "#6ee7b7" : "var(--text-muted)", background: fname === activeFile ? "rgba(110,231,183,0.06)" : "none", border: "none", borderLeft: fname === activeFile ? "2px solid #6ee7b7" : "2px solid transparent", cursor: "pointer", borderRadius: "0 4px 4px 0", marginBottom: "2px" }}
                >
                  {fname}
                </button>
              ))}
            </div>
            {/* File content */}
            <div>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                {activeFile} · {(a.starterFiles[activeFile] ?? "").split("\n").length} lines
              </p>
              <pre style={{ margin: 0, padding: "0.875rem", background: "#07070e", border: "1px solid var(--border)", borderRadius: "8px", fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#a0aec0", lineHeight: 1.7, overflowX: "auto", maxHeight: "420px", overflowY: "auto" }}>
                {a.starterFiles[activeFile] ?? ""}
              </pre>
            </div>
          </div>
        )}

        {/* ── Rubric tab ───────────────────────────────────────────────────── */}
        {tab === "rubric" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.5rem" }}>
              {a.checks.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#6ee7b7", background: "rgba(110,231,183,0.08)", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>{c.id}</span>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>{c.label}</span>
                    {c.required && <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#fbbf24", background: "rgba(251,191,36,0.08)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>required gate</span>}
                  </div>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: "#6ee7b7" }}>{c.weight} pts</span>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Full rubric (sent to Gemma synthesis agent)
            </p>
            <pre style={{ margin: 0, padding: "0.875rem", background: "#07070e", border: "1px solid var(--border)", borderRadius: "8px", fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#a0aec0", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {a.grading.rubric}
            </pre>
          </div>
        )}

        {/* ── Grading config tab ───────────────────────────────────────────── */}
        {tab === "grading" && (
          <div>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              E2B sandbox pipeline
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {[
                { label: "Install cmd",  value: a.grading.installCmd ?? "none" },
                { label: "Build cmd",    value: a.grading.buildCmd ?? "none" },
                { label: "Test cmd",     value: a.grading.testCmd ?? "none" },
                { label: "Entry file",   value: a.grading.entryFile },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 0.875rem" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.3rem" }}>{label}</p>
                  <code style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: value === "none" ? "var(--text-muted)" : "#6ee7b7" }}>{value}</code>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Expected behaviour (sent to Gemma)
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.7, padding: "0.75rem 0.875rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px" }}>
              {a.grading.expectedBehaviourDesc}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InstructorPage() {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(SOSE_ASSIGNMENTS[0].assignmentId)

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 50% 25% at 50% -5%, rgba(251,191,36,0.05) 0%, transparent 60%)", pointerEvents: "none" }} />

      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 2rem", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.push("/sose")} style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <span style={{ fontFamily: "Playfair Display, serif", fontSize: "1.25rem", fontWeight: 900, color: "var(--accent)" }}>Athena</span>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>SoSE · Instructor View</span>
        </button>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "#fbbf24", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)", padding: "0.25rem 0.8rem", borderRadius: "999px" }}>
            Instructor view
          </span>
          <button onClick={() => router.push("/sose")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "DM Mono, monospace", fontSize: "0.72rem" }}>
            ← Student view
          </button>
        </div>
      </header>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "3rem 2rem 6rem" }}>
        {/* Hero */}
        <div style={{ marginBottom: "3rem" }}>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.66rem", color: "var(--text-muted)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            Assignment library
          </p>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.1, marginBottom: "0.75rem" }}>
            {SOSE_ASSIGNMENTS.length} assignments configured
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", maxWidth: "540px", lineHeight: 1.75 }}>
            Each assignment ships with starter files, a comprehensive test suite, a detailed rubric, and an E2B grading pipeline definition. Click an assignment to inspect its full configuration.
          </p>
        </div>

        {/* Pipeline overview */}
        <div style={{ padding: "1.25rem 1.5rem", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", marginBottom: "2.5rem" }}>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>
            Grading agent pipeline (runs on every submission)
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0", overflowX: "auto" }}>
            {[
              { step: "01", title: "E2B sandbox",    desc: "Fresh container per submission" },
              { step: "02", title: "Install deps",   desc: "pip install / npm install" },
              { step: "03", title: "Syntax check",   desc: "Required gate — blocks downstream" },
              { step: "04", title: "Test suite",     desc: "pytest / Jest — 50% of score" },
              { step: "05", title: "Gemma synthesis",desc: "Quality + design + holistic feedback" },
              { step: "06", title: "Report",         desc: "Score ring + breakdown + AI narrative" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                <div style={{ padding: "0.75rem 1rem", textAlign: "center", minWidth: "120px" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#6ee7b7", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>{item.step}</p>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--text-primary)", marginBottom: "0.2rem" }}>{item.title}</p>
                  <p style={{ fontSize: "0.67rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{item.desc}</p>
                </div>
                {i < 5 && <span style={{ color: "var(--border)", fontSize: "1.2rem", flexShrink: 0 }}>→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Assignment list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {SOSE_ASSIGNMENTS.map((a) => (
            <div key={a.assignmentId}>
              {/* Accordion toggle */}
              <button
                onClick={() => setExpanded(expanded === a.assignmentId ? null : a.assignmentId)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: expanded === a.assignmentId ? "10px 10px 0 0" : "10px", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: DIFF_COLORS[a.difficulty], background: `${DIFF_COLORS[a.difficulty]}12`, border: `1px solid ${DIFF_COLORS[a.difficulty]}28`, borderRadius: "999px", padding: "0.15rem 0.6rem", flexShrink: 0 }}>
                    {a.difficulty}
                  </span>
                  <div>
                    <p style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 500 }}>{a.title}</p>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)" }}>
                      {a.language} · {Object.keys(a.starterFiles).length} files · {a.checks.reduce((s, c) => s + c.weight, 0)}pts total
                    </p>
                  </div>
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1 }}>
                  {expanded === a.assignmentId ? "▴" : "▾"}
                </span>
              </button>
              {expanded === a.assignmentId && <AssignmentDetail a={a} />}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
