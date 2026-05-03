"use client"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import type { WebDevSubmission } from "@/lib/types-webdev"

export default function WebDevReportPage() {
  const router = useRouter()
  const params = useParams()
  const submissionId = params.submissionId as string
  const [sub,     setSub]     = useState<WebDevSubmission | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | null = null
    async function load() {
      const res  = await fetch(`/api/webdev/submission?id=${submissionId}`)
      const data = await res.json()
      if (data.submission) {
        setSub(data.submission)
        if (data.submission.status === "complete" || data.submission.status === "error") {
          if (poll) clearInterval(poll)
        }
      }
      setLoading(false)
    }
    load()
    poll = setInterval(load, 4000)
    return () => { if (poll) clearInterval(poll) }
  }, [submissionId])

  const s = { mono: "DM Mono, monospace", serif: "'Playfair Display', serif" }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: "36px", height: "36px", border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  )

  if (!sub || sub.status === "grading") return (
    <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1.5rem" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{ width: "48px", height: "48px", border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ fontFamily: s.serif, fontSize: "1.2rem", fontWeight: 600, color: "#f1f5f9" }}>Grading your project…</p>
      <p style={{ fontFamily: s.mono, fontSize: "0.7rem", color: "#64748b", animation: "pulse 2s ease-in-out infinite" }}>Checking every 4 seconds…</p>
    </div>
  )

  const score = sub.score ?? 0
  const scoreColor = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#f43f5e"
  const radius = 54, circ = 2 * Math.PI * radius

  return (
    <>
      <style>{`*{box-sizing:border-box} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <main style={{ minHeight: "100vh", background: "#07070e" }}>
        <div style={{ position: "fixed", inset: 0, background: `radial-gradient(ellipse 50% 30% at 50% -5%, ${scoreColor}0a 0%, transparent 60%)`, pointerEvents: "none" }} />
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0a14" }}>
          <button onClick={() => router.push("/school/webdev/curriculum")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontFamily: s.mono, fontSize: "0.75rem" }}>← Back to curriculum</button>
        </header>
        <div style={{ maxWidth: "820px", margin: "0 auto", padding: "3rem 2rem 5rem", animation: "fadeUp 0.4s ease" }}>
          {/* Score hero */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2.5rem", alignItems: "center", marginBottom: "3rem", paddingBottom: "3rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx="70" cy="70" r={radius} fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(score/100)*circ} ${circ}`} strokeDashoffset={circ * 0.25} />
              <text x="70" y="65" textAnchor="middle" fill={scoreColor} fontSize="26" fontWeight="700" fontFamily={s.serif}>{score}</text>
              <text x="70" y="83" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="11" fontFamily={s.mono}>/ 100</text>
            </svg>
            <div>
              <p style={{ fontFamily: s.mono, fontSize: "0.66rem", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Grading Report</p>
              <h1 style={{ fontFamily: s.serif, fontSize: "2.2rem", fontWeight: 900, color: "#f1f5f9", lineHeight: 1.1, marginBottom: "0.75rem" }}>
                {score >= 90 ? "Excellent" : score >= 80 ? "Good" : score >= 60 ? "Satisfactory" : "Needs Work"}
              </h1>
              {sub.summary && <p style={{ fontSize: "1rem", color: "#94a3b8", lineHeight: 1.75 }}>{sub.summary}</p>}
            </div>
          </div>

          {/* Strengths + improvements */}
          {(sub.strengths?.length || sub.improvements?.length) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
              {sub.strengths?.length ? (
                <div style={{ padding: "1.25rem", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "10px" }}>
                  <p style={{ fontFamily: s.mono, fontSize: "0.63rem", color: "#22c55e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>✓ Strengths</p>
                  {sub.strengths.map((str, i) => <p key={i} style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: "0.35rem" }}>› {str}</p>)}
                </div>
              ) : null}
              {sub.improvements?.length ? (
                <div style={{ padding: "1.25rem", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "10px" }}>
                  <p style={{ fontFamily: s.mono, fontSize: "0.63rem", color: "#f59e0b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>↑ Improvements</p>
                  {sub.improvements.map((imp, i) => <p key={i} style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: "0.35rem" }}>› {imp}</p>)}
                </div>
              ) : null}
            </div>
          )}

          {/* Encouragement */}
          {sub.encouragement && (
            <div style={{ padding: "1.25rem 1.5rem", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "10px", marginBottom: "2rem" }}>
              <p style={{ fontSize: "0.9rem", color: "#94a3b8", lineHeight: 1.7, fontStyle: "italic" }}>💡 {sub.encouragement}</p>
            </div>
          )}

          {/* Pattern check breakdown */}
          {sub.patternResults && (
            <div style={{ marginBottom: "2.5rem" }}>
              <p style={{ fontFamily: s.mono, fontSize: "0.63rem", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1rem" }}>Requirement checks (40pts)</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {sub.patternResults.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px" }}>
                    <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>{r.passed ? "✓" : "✗"}</span>
                    <span style={{ fontSize: "0.875rem", color: r.passed ? "#f1f5f9" : "#64748b", flex: 1 }}>{r.label}</span>
                    <span style={{ fontFamily: s.mono, fontSize: "0.72rem", color: r.passed ? "#22c55e" : "#f43f5e" }}>{r.score}/{r.weight}pt</span>
                    <div style={{ width: "80px", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(r.score/r.weight)*100}%`, background: r.passed ? "#22c55e" : "#f43f5e", borderRadius: "2px" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI scores */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "2.5rem" }}>
            {[
              { label: "Code quality",     score: sub.qualityScore ?? 0, max: 35 },
              { label: "Design decisions", score: sub.designScore  ?? 0, max: 25 },
            ].map(({ label, score: s2, max }) => (
              <div key={label} style={{ padding: "1.25rem", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: "10px" }}>
                <p style={{ fontFamily: s.mono, fontSize: "0.62rem", color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>{label} (AI)</p>
                <p style={{ fontFamily: s.serif, fontSize: "1.4rem", fontWeight: 700, color: "#3b82f6" }}>{s2}<span style={{ fontSize: "0.8rem", color: "#64748b" }}>/{max}pt</span></p>
                <div style={{ marginTop: "0.5rem", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
                  <div style={{ height: "100%", width: `${(s2/max)*100}%`, background: "#3b82f6", borderRadius: "2px" }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.875rem" }}>
            <button onClick={() => router.push(`/school/webdev/workspace/${sub.workspaceId}`)} style={{ flex: 1, padding: "0.875rem", background: "#3b82f6", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>Back to Workspace</button>
            <button onClick={() => router.push("/school/webdev/curriculum")} style={{ padding: "0.875rem 1.5rem", background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#64748b", cursor: "pointer", fontSize: "0.9rem" }}>All projects →</button>
          </div>
        </div>
      </main>
    </>
  )
}
