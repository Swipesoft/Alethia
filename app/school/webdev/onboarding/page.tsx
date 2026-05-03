"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { getOrCreateStudentId } from "@/lib/student-identity"
import type { WebDevInterest, WebDevMCQ, WebDevChallenge } from "@/lib/types-webdev"

const SandpackEditor = dynamic(
  () => import("@/components/webdev/SandpackEditor"),
  { ssr: false, loading: () => <div style={{ height: "300px", background: "#07070e" }} /> }
)

type Step = "select" | "loading_mcq" | "mcq" | "loading_challenge" | "coding" | "processing" | "result"

const INTERESTS: { value: WebDevInterest; label: string; desc: string; icon: string }[] = [
  { value: "ui_design",     label: "UI Design",     desc: "Typography, layout, visual design",    icon: "🎨" },
  { value: "interactivity", label: "Interactivity", desc: "DOM events, animations, user input",   icon: "⚡" },
  { value: "components",    label: "Components",    desc: "Reusable UI, React, composition",      icon: "🧩" },
  { value: "data_driven",   label: "Data & APIs",   desc: "Fetching data, rendering lists",       icon: "📡" },
]

function Spinner({ size = 36 }: { size?: number }) {
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: size, height: size, border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
    </>
  )
}

function ProgressBar({ value, max, color = "#3b82f6" }: { value: number; max: number; color?: string }) {
  return (
    <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: color, borderRadius: "2px", transition: "width 0.4s ease" }} />
    </div>
  )
}

export default function WebDevOnboardingPage() {
  const router = useRouter()

  const [interest,     setInterest]     = useState<WebDevInterest>("ui_design")
  const [step,         setStep]         = useState<Step>("select")
  const [error,        setError]        = useState<string | null>(null)

  // MCQ
  const [questions,    setQuestions]    = useState<WebDevMCQ[]>([])
  const [currentQ,     setCurrentQ]     = useState(0)
  const [selectedOpt,  setSelectedOpt]  = useState<number | null>(null)
  const [showExplain,  setShowExplain]  = useState(false)
  const [mcqAnswers,   setMcqAnswers]   = useState<{ correct: boolean }[]>([])

  // Coding
  const [challenges,     setChallenges]     = useState<WebDevChallenge[]>([])
  const [currentC,       setCurrentC]       = useState(0)
  const [sandpackFiles,  setSandpackFiles]  = useState<Record<string, string>>({})
  const [reviewing,      setReviewing]      = useState(false)
  const [reviewResult,   setReviewResult]   = useState<{ passed: boolean; score: number; feedback: string } | null>(null)
  const [challengeScores, setChallengeScores] = useState<number[]>([])

  // Result
  const [resultData,   setResultData]   = useState<{ passed: boolean; proficiencyScore: number; proficiencyLevel: string } | null>(null)
  const [processMsg,   setProcessMsg]   = useState("Scoring your assessment…")

  async function startAssessment() {
    setStep("loading_mcq")
    setError(null)
    try {
      const res  = await fetch("/api/webdev/onboarding/mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuestions(data.questions)
      setCurrentQ(0)
      setMcqAnswers([])
      setStep("mcq")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load questions")
      setStep("select")
    }
  }

  function selectOption(idx: number) {
    if (selectedOpt !== null) return
    setSelectedOpt(idx)
    setShowExplain(true)
  }

  function nextQuestion() {
    const q = questions[currentQ]
    setMcqAnswers((prev) => [...prev, { correct: selectedOpt === q.correctIndex }])
    setSelectedOpt(null)
    setShowExplain(false)
    if (currentQ + 1 < questions.length) {
      setCurrentQ((n) => n + 1)
    } else {
      loadChallenges()
    }
  }

  async function loadChallenges() {
    setStep("loading_challenge")
    try {
      const res  = await fetch("/api/webdev/onboarding/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setChallenges(data.challenges)
      setCurrentC(0)
      setSandpackFiles(data.challenges[0]?.starterFiles ?? {})
      setReviewResult(null)
      setChallengeScores([])
      setStep("coding")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load challenges")
      setStep("mcq")
    }
  }

  async function reviewChallenge() {
    if (reviewing) return
    setReviewing(true)
    try {
      const challenge = challenges[currentC]
      const res = await fetch("/api/webdev/onboarding/challenge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentFiles: sandpackFiles, requirements: challenge.requirements }),
      })
      const data = await res.json()
      setReviewResult({ passed: data.passed, score: data.score, feedback: data.feedback })
    } catch {
      setReviewResult({ passed: false, score: 0, feedback: "Review failed. Try submitting again." })
    } finally {
      setReviewing(false)
    }
  }

  function nextChallenge() {
    const score = reviewResult?.score ?? 0
    const scores = [...challengeScores, score]
    setChallengeScores(scores)
    setReviewResult(null)
    if (currentC + 1 < challenges.length) {
      setCurrentC((n) => n + 1)
      setSandpackFiles(challenges[currentC + 1]?.starterFiles ?? {})
    } else {
      completeAssessment(scores)
    }
  }

  async function completeAssessment(practicalScores: number[]) {
    setStep("processing")
    const msgs = ["Scoring your assessment…", "Calculating proficiency…", "Designing your curriculum…", "Almost ready…"]
    let msgIdx = 0
    const interval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, msgs.length - 1)
      setProcessMsg(msgs[msgIdx])
    }, 5000)

    try {
      const correct        = mcqAnswers.filter((a) => a.correct).length
      const mcqScore       = Math.round((correct / questions.length) * 100)
      const practicalScore = Math.round(practicalScores.reduce((a, b) => a + b, 0) / (practicalScores.length * 100) * 100)
      const studentId      = getOrCreateStudentId()

      const res = await fetch("/api/webdev/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, interest, mcqScore, practicalScore }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResultData(data)
      setStep("result")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete assessment")
      setStep("coding")
    } finally {
      clearInterval(interval)
    }
  }

  // Shared styles
  const s = {
    mono: { fontFamily: "DM Mono, monospace" } as React.CSSProperties,
    serif: { fontFamily: "'Playfair Display', serif" } as React.CSSProperties,
    muted: { color: "#64748b" } as React.CSSProperties,
    text: { color: "#94a3b8" } as React.CSSProperties,
    primary: { color: "#f1f5f9" } as React.CSSProperties,
    accent: { color: "#3b82f6" } as React.CSSProperties,
    label: { fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "0.875rem" } as React.CSSProperties,
  }

  return (
    <>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        *{box-sizing:border-box}
        body{background:#07070e}
      `}</style>

      <main style={{ minHeight: "100vh", background: "#07070e", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header style={{ padding: "1rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0a0a14" }}>
          <button onClick={() => router.push("/school/webdev")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ ...s.serif, fontSize: "1.2rem", fontWeight: 900, color: "#3b82f6" }}>Athena</span>
            <span style={{ ...s.mono, fontSize: "0.58rem", ...s.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Web Dev Proficiency</span>
          </button>
          {(step === "mcq" || step === "coding") && (
            <span style={{ ...s.mono, fontSize: "0.7rem", ...s.muted }}>
              {step === "mcq" ? `Question ${currentQ + 1} of ${questions.length}` : `Challenge ${currentC + 1} of ${challenges.length}`}
            </span>
          )}
        </header>

        {error && (
          <div style={{ padding: "0.6rem 2rem", background: "rgba(244,63,94,0.07)", borderBottom: "1px solid rgba(244,63,94,0.2)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ ...s.mono, fontSize: "0.72rem", color: "#f43f5e" }}>⚠ {error}</span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>×</button>
          </div>
        )}

        <div style={{ flex: 1, display: "flex", alignItems: step === "select" ? "center" : "flex-start", justifyContent: "center", padding: "2rem" }}>

          {/* ── STEP 0: Interest selection ─────────────────────────────────── */}
          {step === "select" && (
            <div style={{ width: "100%", maxWidth: "600px", animation: "fadeUp 0.3s ease" }}>
              <p style={{ ...s.label }}>Step 1 of 3 — Setup</p>
              <h1 style={{ ...s.serif, fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "#f1f5f9", lineHeight: 1.15, marginBottom: "0.75rem" }}>
                Welcome to the<br />
                <em style={{ color: "#3b82f6" }}>School of Web Development</em>
              </h1>
              <p style={{ fontSize: "0.95rem", ...s.text, lineHeight: 1.75, marginBottom: "2.5rem", maxWidth: "520px" }}>
                Take a 10-minute assessment: 8 theory questions + 2 hands-on coding challenges in a live browser editor. We&apos;ll design a 4-project curriculum around your level and interests.
              </p>

              <div style={{ marginBottom: "2.5rem" }}>
                <p style={{ ...s.label }}>What excites you most about frontend?</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {INTERESTS.map((opt) => (
                    <button key={opt.value} onClick={() => setInterest(opt.value)} style={{ padding: "0.875rem 1rem", background: interest === opt.value ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.03)", border: `2px solid ${interest === opt.value ? "#3b82f6" : "rgba(255,255,255,0.08)"}`, borderRadius: "10px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                      <p style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>{opt.icon}</p>
                      <p style={{ ...s.mono, fontSize: "0.82rem", color: interest === opt.value ? "#3b82f6" : "#f1f5f9", fontWeight: 600 }}>{opt.label}</p>
                      <p style={{ fontSize: "0.73rem", ...s.muted, marginTop: "0.15rem" }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={startAssessment} style={{ width: "100%", fontSize: "1rem", padding: "0.875rem", background: "#3b82f6", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                Begin assessment →
              </button>
              <p style={{ ...s.mono, fontSize: "0.65rem", ...s.muted, textAlign: "center", marginTop: "1rem" }}>
                ~10 minutes · 8 theory questions + 2 live coding challenges
              </p>
            </div>
          )}

          {/* Loading states */}
          {(step === "loading_mcq" || step === "loading_challenge") && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", paddingTop: "6rem" }}>
              <Spinner size={44} />
              <div>
                <p style={{ ...s.serif, fontSize: "1.2rem", fontWeight: 600, color: "#f1f5f9", marginBottom: "0.5rem" }}>
                  {step === "loading_mcq" ? "Generating questions…" : "Preparing coding challenges…"}
                </p>
                <p style={{ ...s.mono, fontSize: "0.72rem", ...s.muted }}>Gemma is crafting questions tailored to your interests</p>
              </div>
            </div>
          )}

          {/* ── STEP 1: MCQ ───────────────────────────────────────────────── */}
          {step === "mcq" && questions.length > 0 && (
            <div style={{ width: "100%", maxWidth: "680px", animation: "fadeUp 0.25s ease" }}>
              <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <p style={{ ...s.label, margin: 0 }}>Theory — {currentQ + 1} of {questions.length}</p>
                  <span style={{ ...s.mono, fontSize: "0.63rem", color: questions[currentQ].difficulty === "easy" ? "#22c55e" : questions[currentQ].difficulty === "medium" ? "#f59e0b" : "#f43f5e" }}>
                    {questions[currentQ].difficulty} · {questions[currentQ].topic}
                  </span>
                </div>
                <ProgressBar value={currentQ + 1} max={questions.length} />
              </div>

              <div style={{ padding: "1.75rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", marginBottom: "1.25rem" }}>
                <p style={{ fontSize: "1rem", color: "#f1f5f9", lineHeight: 1.75, fontWeight: 500, whiteSpace: "pre-wrap" }}>
                  {questions[currentQ].question}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.5rem" }}>
                {questions[currentQ].options.map((opt, idx) => {
                  const isSelected = selectedOpt === idx
                  const isCorrect  = idx === questions[currentQ].correctIndex
                  const answered   = selectedOpt !== null
                  let bg = "rgba(255,255,255,0.03)", border = "rgba(255,255,255,0.08)", color = "#94a3b8"
                  if (answered && isCorrect)            { bg = "rgba(34,197,94,0.08)";  border = "#22c55e"; color = "#22c55e" }
                  if (answered && isSelected && !isCorrect) { bg = "rgba(244,63,94,0.06)"; border = "#f43f5e"; color = "#f43f5e" }
                  return (
                    <button key={idx} onClick={() => selectOption(idx)} disabled={answered} style={{ padding: "0.875rem 1.1rem", background: bg, border: `1px solid ${border}`, borderRadius: "8px", cursor: answered ? "default" : "pointer", textAlign: "left", display: "flex", gap: "0.75rem", alignItems: "flex-start", transition: "all 0.15s" }}>
                      <span style={{ ...s.mono, fontSize: "0.72rem", color, flexShrink: 0, marginTop: "1px" }}>{String.fromCharCode(65 + idx)}.</span>
                      <span style={{ fontSize: "0.9rem", color, lineHeight: 1.5 }}>{opt}</span>
                      {answered && isCorrect   && <span style={{ marginLeft: "auto", color: "#22c55e" }}>✓</span>}
                      {answered && isSelected && !isCorrect && <span style={{ marginLeft: "auto", color: "#f43f5e" }}>✗</span>}
                    </button>
                  )
                })}
              </div>

              {showExplain && (
                <div style={{ padding: "1rem 1.1rem", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "8px", marginBottom: "1.25rem" }}>
                  <p style={{ ...s.mono, fontSize: "0.65rem", ...s.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>Explanation</p>
                  <p style={{ fontSize: "0.875rem", ...s.text, lineHeight: 1.65 }}>{questions[currentQ].explanation}</p>
                </div>
              )}

              {selectedOpt !== null && (
                <button onClick={nextQuestion} style={{ width: "100%", fontSize: "0.9rem", padding: "0.75rem", background: "#3b82f6", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                  {currentQ + 1 < questions.length ? "Next question →" : "Continue to coding challenges →"}
                </button>
              )}
            </div>
          )}

          {/* ── STEP 2: Coding challenge (Sandpack) ─────────────────────── */}
          {step === "coding" && challenges.length > 0 && (
            <div style={{ width: "100%", maxWidth: "960px", animation: "fadeUp 0.25s ease" }}>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <p style={{ ...s.label, margin: 0 }}>Live coding — Challenge {currentC + 1} of {challenges.length}</p>
                  <span style={{ ...s.mono, fontSize: "0.63rem", color: challenges[currentC].difficulty === "easy" ? "#22c55e" : "#f59e0b" }}>
                    {challenges[currentC].difficulty}
                  </span>
                </div>
                <ProgressBar value={currentC + 1} max={challenges.length} color="#f59e0b" />
              </div>

              <div style={{ padding: "1.25rem 1.5rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", marginBottom: "1rem" }}>
                <h2 style={{ ...s.serif, fontSize: "1.05rem", fontWeight: 600, color: "#f1f5f9", marginBottom: "0.5rem" }}>{challenges[currentC].title}</h2>
                <p style={{ fontSize: "0.875rem", ...s.text, lineHeight: 1.7 }}>{challenges[currentC].description}</p>
                {challenges[currentC].requirements.length > 0 && (
                  <div style={{ marginTop: "0.875rem" }}>
                    <p style={{ ...s.mono, fontSize: "0.6rem", ...s.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Requirements</p>
                    <ul style={{ listStyle: "none" }}>
                      {challenges[currentC].requirements.map((r, i) => (
                        <li key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem", fontSize: "0.82rem", ...s.text }}>
                          <span style={{ color: "#3b82f6" }}>›</span>{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Live Sandpack editor */}
              <div style={{ height: "380px", marginBottom: "0.875rem", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
                <SandpackEditor
                  files={sandpackFiles}
                  framework="html_css_js"
                  onChange={setSandpackFiles}
                />
              </div>

              {/* Review result */}
              {reviewResult && (
                <div style={{ padding: "0.875rem 1rem", background: reviewResult.passed ? "rgba(34,197,94,0.06)" : "rgba(244,63,94,0.06)", border: `1px solid ${reviewResult.passed ? "rgba(34,197,94,0.2)" : "rgba(244,63,94,0.2)"}`, borderRadius: "8px", marginBottom: "0.875rem" }}>
                  <p style={{ ...s.mono, fontSize: "0.75rem", color: reviewResult.passed ? "#22c55e" : "#f43f5e" }}>
                    {reviewResult.passed ? `✓ Score: ${reviewResult.score}/100` : `✗ Score: ${reviewResult.score}/100`} — {reviewResult.feedback}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={reviewChallenge} disabled={reviewing} style={{ flex: 1, padding: "0.75rem", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "8px", color: "#3b82f6", ...s.mono, fontSize: "0.8rem", cursor: reviewing ? "wait" : "pointer", opacity: reviewing ? 0.6 : 1 }}>
                  {reviewing ? "Reviewing…" : "✦ Submit for AI review"}
                </button>
                {reviewResult !== null && (
                  <button onClick={nextChallenge} style={{ flex: 1, fontSize: "0.85rem", padding: "0.75rem", background: "#3b82f6", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                    {currentC + 1 < challenges.length ? "Next challenge →" : "Finish assessment →"}
                  </button>
                )}
                {reviewResult === null && (
                  <button onClick={() => { setChallengeScores((prev) => [...prev, 0]); if (currentC + 1 < challenges.length) { setCurrentC((n) => n + 1); setSandpackFiles(challenges[currentC + 1]?.starterFiles ?? {}) } else { completeAssessment([...challengeScores, 0]) } }} style={{ padding: "0.75rem 1rem", background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#64748b", cursor: "pointer", ...s.mono, fontSize: "0.75rem" }}>
                    Skip
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Processing */}
          {step === "processing" && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", paddingTop: "6rem" }}>
              <Spinner size={48} />
              <div>
                <p style={{ ...s.serif, fontSize: "1.3rem", fontWeight: 600, color: "#f1f5f9", marginBottom: "0.5rem" }}>{processMsg}</p>
                <p style={{ ...s.mono, fontSize: "0.72rem", ...s.muted, animation: "pulse 2s ease-in-out infinite" }}>Building your personalised curriculum…</p>
              </div>
            </div>
          )}

          {/* ── STEP 4: Result ─────────────────────────────────────────────── */}
          {step === "result" && resultData && (
            <div style={{ width: "100%", maxWidth: "560px", animation: "fadeUp 0.4s ease" }}>
              {resultData.passed ? (
                <>
                  <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🌐</div>
                    <p style={{ ...s.mono, fontSize: "0.65rem", ...s.accent, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Assessment complete</p>
                    <h1 style={{ ...s.serif, fontSize: "2rem", fontWeight: 900, color: "#f1f5f9", marginBottom: "0.5rem" }}>You&apos;re in.</h1>
                    <p style={{ fontSize: "0.95rem", ...s.text, lineHeight: 1.75 }}>
                      Score: <strong style={{ color: "#3b82f6" }}>{resultData.proficiencyScore}/100</strong>
                      {" · "}Level: <strong style={{ color: "#3b82f6", textTransform: "capitalize" }}>{resultData.proficiencyLevel}</strong>
                    </p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "2rem" }}>
                    {[
                      { label: "Theory",     value: `${Math.round((mcqAnswers.filter(a=>a.correct).length / Math.max(questions.length,1))*100)}%` },
                      { label: "Practical",  value: `${challengeScores.length ? Math.round(challengeScores.reduce((a,b)=>a+b,0)/challengeScores.length) : 0}%` },
                      { label: "Level",      value: resultData.proficiencyLevel.charAt(0).toUpperCase() + resultData.proficiencyLevel.slice(1) },
                      { label: "Focus",      value: INTERESTS.find(i=>i.value===interest)?.label ?? interest },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: "1rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", textAlign: "center" }}>
                        <p style={{ ...s.mono, fontSize: "0.58rem", ...s.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>{label}</p>
                        <p style={{ ...s.serif, fontSize: "1.25rem", fontWeight: 700, color: "#3b82f6" }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => router.push("/school/webdev/curriculum")} style={{ width: "100%", fontSize: "1rem", padding: "0.875rem", background: "#3b82f6", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                    View your curriculum →
                  </button>
                </>
              ) : (
                <>
                  <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📚</div>
                    <h1 style={{ ...s.serif, fontSize: "1.75rem", fontWeight: 900, color: "#f1f5f9", marginBottom: "0.75rem" }}>Not quite ready yet</h1>
                    <p style={{ fontSize: "0.95rem", ...s.text, lineHeight: 1.75 }}>
                      You scored <strong style={{ color: "#f59e0b" }}>{resultData.proficiencyScore}/100</strong>. We recommend building your programming foundations first.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button onClick={() => router.push("/school/programming")} style={{ flex: 1, fontSize: "0.9rem", padding: "0.75rem", background: "#3b82f6", border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                      Go to School of Programming →
                    </button>
                    <button onClick={() => setStep("select")} style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#64748b", cursor: "pointer" }}>
                      Retry
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
