"use client"
// app/school/webdev/page.tsx — Landing page for School of Web Development

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getOrCreateStudentId } from "@/lib/student-identity"

const s = {
  mono:  "DM Mono, monospace",
  serif: "'Playfair Display', serif",
}

export default function WebDevLandingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      try {
        const studentId = getOrCreateStudentId()
        const res = await fetch(`/api/webdev/profile?studentId=${studentId}`)
        if (res.ok) {
          const { profile } = await res.json()
          if (profile?.passed && profile?.curriculumId) {
            router.replace("/school/webdev/curriculum")
            return
          }
        }
      } catch { /* proceed to landing */ }
      setChecking(false)
    }
    check()
  }, [router])

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: "36px", height: "36px", border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    )
  }

  const features = [
    { icon: "🧪", title: "Live preview",    desc: "Write HTML/CSS/React and see your changes instantly in a browser-native sandbox — no servers, no build step." },
    { icon: "🤖", title: "AI curriculum",   desc: "Gemma designs 4 bespoke projects calibrated to your level. Each assignment is generated and validated before you see it." },
    { icon: "📐", title: "Smart grading",   desc: "Pattern matching checks 40 specific requirements. Gemma reviews code quality and design decisions for the remaining 60pts." },
    { icon: "🚀", title: "Real frameworks", desc: "Progress from semantic HTML through vanilla JS interactivity to full React with API integration." },
  ]

  return (
    <>
      <style>{`*{box-sizing:border-box} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <main style={{ minHeight: "100vh", background: "#07070e" }}>
        <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 60% 35% at 50% -5%, rgba(59,130,246,0.06) 0%, transparent 65%)", pointerEvents: "none" }} />

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0a0a14" }}>
          <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <span style={{ fontFamily: s.serif, fontSize: "1.25rem", fontWeight: 900, color: "#3b82f6" }}>Athena</span>
            <span style={{ fontFamily: s.mono, fontSize: "0.58rem", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" }}>School of Web Development</span>
          </button>
          <span style={{ fontFamily: s.mono, fontSize: "0.68rem", color: "#3b82f6", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", padding: "0.25rem 0.8rem", borderRadius: "999px" }}>
            ● Powered by Sandpack
          </span>
        </header>

        <div style={{ maxWidth: "1060px", margin: "0 auto", padding: "4rem 2rem 6rem", animation: "fadeUp 0.4s ease" }}>
          {/* Hero */}
          <div style={{ marginBottom: "4rem" }}>
            <p style={{ fontFamily: s.mono, fontSize: "0.68rem", color: "#64748b", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1rem" }}>School of Web Development</p>
            <h1 style={{ fontFamily: s.serif, fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, color: "#f1f5f9", lineHeight: 1.1, marginBottom: "1rem" }}>
              Build the web.<br />
              <em style={{ color: "#3b82f6" }}>Live in your browser.</em>
            </h1>
            <p style={{ fontSize: "1rem", color: "#94a3b8", maxWidth: "560px", lineHeight: 1.8, marginBottom: "2.5rem" }}>
              Write HTML, CSS, and React in a live sandbox editor. An AI-powered adaptive system designs your curriculum, generates real projects, and grades them like a senior engineer would.
            </p>
            <button onClick={() => router.push("/school/webdev/onboarding")} style={{ fontSize: "1.05rem", padding: "0.9rem 2.5rem", background: "#3b82f6", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
              Take the proficiency assessment →
            </button>
            <p style={{ fontFamily: s.mono, fontSize: "0.65rem", color: "#64748b", marginTop: "0.75rem" }}>
              ~10 minutes · completely free · no account required
            </p>
          </div>

          {/* Feature grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "4rem" }}>
            {features.map((f) => (
              <div key={f.title} style={{ padding: "1.5rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.875rem" }}>{f.icon}</div>
                <h3 style={{ fontFamily: s.mono, fontSize: "0.82rem", color: "#f1f5f9", fontWeight: 600, marginBottom: "0.4rem" }}>{f.title}</h3>
                <p style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Curriculum preview */}
          <div style={{ marginBottom: "3rem" }}>
            <p style={{ fontFamily: s.mono, fontSize: "0.66rem", color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
              Example curriculum progression
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { num: 1, title: "Responsive Profile Page",     fw: "HTML · CSS",          diff: "Beginner",     color: "#22c55e" },
                { num: 2, title: "Interactive To-Do App",       fw: "React",               diff: "Intermediate", color: "#f59e0b" },
                { num: 3, title: "Component Design System",     fw: "React",               diff: "Advanced",     color: "#f9a8d4" },
                { num: 4, title: "Real-Time API Dashboard",     fw: "React + API",         diff: "Expert",       color: "#c4b5fd" },
              ].map((item) => (
                <div key={item.num} style={{ display: "flex", alignItems: "center", gap: "1.25rem", padding: "1rem 1.25rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px" }}>
                  <span style={{ fontFamily: s.mono, fontSize: "0.78rem", color: "#3b82f6", background: "rgba(59,130,246,0.1)", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.num}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.9rem", color: "#f1f5f9", fontWeight: 500 }}>{item.title}</p>
                    <p style={{ fontFamily: s.mono, fontSize: "0.65rem", color: "#64748b", marginTop: "0.15rem" }}>{item.fw}</p>
                  </div>
                  <span style={{ fontFamily: s.mono, fontSize: "0.62rem", color: item.color, background: `${item.color}14`, border: `1px solid ${item.color}28`, borderRadius: "999px", padding: "0.15rem 0.6rem", flexShrink: 0 }}>
                    {item.diff}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <button onClick={() => router.push("/school/webdev/onboarding")} style={{ fontSize: "1rem", padding: "0.875rem 2.5rem", background: "#3b82f6", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
              Start your assessment →
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
