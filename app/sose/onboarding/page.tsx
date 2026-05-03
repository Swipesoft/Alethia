"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { getOrCreateStudentId } from "@/lib/student-identity"
import type { SoSELanguage, SoSEInterest, MCQQuestion, CodingChallenge } from "@/lib/types-sose"

const MiniEditor = dynamic(
  () => import("@/components/sose/MiniEditor").then((m) => m.MiniEditor),
  { ssr: false }
)

// ─── Steps ────────────────────────────────────────────────────────────────────
type Step = "select" | "loading_mcq" | "mcq" | "loading_challenge" | "coding" | "processing" | "result"

// ─── Interest options ─────────────────────────────────────────────────────────
const INTERESTS: { value: SoSEInterest; label: string; desc: string; icon: string }[] = [
  { value: "backend",    label: "Backend",     desc: "APIs, servers, databases",          icon: "⚙" },
  { value: "data_ml",   label: "Data & ML",   desc: "Data processing, analytics, ML",    icon: "📊" },
  { value: "algorithms", label: "Algorithms",  desc: "Data structures, problem solving",  icon: "🧮" },
  { value: "automation", label: "Automation",  desc: "Scripting, CLI tools, pipelines",   icon: "🤖" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = "#6ee7b7" }: { value: number; max: number; color?: string }) {
  return (
    <div style={{ height: "4px", background: "var(--bg-elevated)", borderRadius: "2px", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: color, borderRadius: "2px", transition: "width 0.4s ease" }} />
    </div>
  )
}

function Spinner({ size = 32 }: { size?: number }) {
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: size, height: size, border: "2px solid var(--border)", borderTopColor: "#6ee7b7", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()

  // Selection
  const [language,  setLanguage]  = useState<SoSELanguage>("python")
  const [interest,  setInterest]  = useState<SoSEInterest>("backend")

  // Flow
  const [step,      setStep]      = useState<Step>("select")
  const [error,     setError]     = useState<string | null>(null)

  // MCQ
  const [questions,     setQuestions]     = useState<MCQQuestion[]>([])
  const [currentQ,      setCurrentQ]      = useState(0)
  const [selectedOpt,   setSelectedOpt]   = useState<number | null>(null)
  const [showExplain,   setShowExplain]   = useState(false)
  const [mcqAnswers,    setMcqAnswers]    = useState<{ correct: boolean }[]>([])

  // Coding
  const [challenges,    setChallenges]    = useState<CodingChallenge[]>([])
  const [currentC,      setCurrentC]      = useState(0)
  const [studentCode,   setStudentCode]   = useState("")
  const [runResult,     setRunResult]     = useState<{ passed: boolean; stdout: string; stderr: string } | null>(null)
  const [running,       setRunning]       = useState(false)
  const [challengeResults, setChallengeResults] = useState<boolean[]>([])

  // Result
  const [resultData,    setResultData]    = useState<{
    passed: boolean; proficiencyScore: number; proficiencyLevel: string; curriculumId?: string
  } | null>(null)
  const [processMsg,    setProcessMsg]    = useState("Scoring your assessment…")

  // ── Step 0 → Step 1: load MCQ ──────────────────────────────────────────────
  async function startAssessment() {
    setStep("loading_mcq")
    setError(null)
    try {
      const res  = await fetch("/api/sose/onboarding/mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, interest }),
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

  // ── MCQ answer ─────────────────────────────────────────────────────────────
  function selectOption(idx: number) {
    if (selectedOpt !== null) return  // already answered
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

  // ── Step 2 → Step 3: load coding challenges ────────────────────────────────
  async function loadChallenges() {
    setStep("loading_challenge")
    try {
      const res  = await fetch("/api/sose/onboarding/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, interest }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setChallenges(data.challenges)
      setCurrentC(0)
      setStudentCode(data.challenges[0]?.starterCode ?? "")
      setRunResult(null)
      setChallengeResults([])
      setStep("coding")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load challenges")
      setStep("mcq")
    }
  }

  // ── Run challenge ──────────────────────────────────────────────────────────
  async function runChallenge() {
    if (running) return
    setRunning(true)
    setRunResult(null)
    try {
      const challenge = challenges[currentC]
      const res = await fetch("/api/sose/onboarding/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentCode,
          testCode: challenge.testCode,
          language,
        }),
      })
      const data = await res.json()
      setRunResult({ passed: data.passed, stdout: data.stdout, stderr: data.stderr })
    } catch {
      setRunResult({ passed: false, stdout: "", stderr: "Execution failed. Check your connection." })
    } finally {
      setRunning(false)
    }
  }

  function nextChallenge() {
    const passed = runResult?.passed ?? false
    const results = [...challengeResults, passed]
    setChallengeResults(results)
    setRunResult(null)

    if (currentC + 1 < challenges.length) {
      setCurrentC((n) => n + 1)
      setStudentCode(challenges[currentC + 1]?.starterCode ?? "")
    } else {
      completeAssessment(results)
    }
  }

  function skipChallenge() {
    nextChallenge()
  }

  // ── Complete assessment ────────────────────────────────────────────────────
  async function completeAssessment(practicalResults: boolean[]) {
    setStep("processing")
    const msgs = [
      "Scoring your assessment…",
      "Calculating proficiency level…",
      "Designing your curriculum…",
      "Almost ready…",
    ]
    let msgIdx = 0
    const interval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, msgs.length - 1)
      setProcessMsg(msgs[msgIdx])
    }, 5000)

    try {
      const correct        = mcqAnswers.filter((a) => a.correct).length
      const mcqScore       = Math.round((correct / questions.length) * 100)
      const passedCount    = practicalResults.filter(Boolean).length
      const practicalScore = Math.round((passedCount / challenges.length) * 100)
      const studentId      = getOrCreateStudentId()

      const res = await fetch("/api/sose/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, language, interest, mcqScore, practicalScore }),
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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        *{box-sizing:border-box}
      `}</style>

      <main style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header style={{ padding: "1rem 2rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => router.push("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontFamily: "Playfair Display, serif", fontSize: "1.2rem", fontWeight: 900, color: "var(--accent)" }}>Athena</span>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>SoSE Proficiency Test</span>
          </button>
          {(step === "mcq" || step === "coding") && (
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {step === "mcq" ? `Question ${currentQ + 1} of ${questions.length}` : `Challenge ${currentC + 1} of ${challenges.length}`}
            </span>
          )}
        </header>

        {/* Error bar */}
        {error && (
          <div style={{ padding: "0.6rem 2rem", background: "rgba(249,168,212,0.07)", borderBottom: "1px solid rgba(249,168,212,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#f9a8d4" }}>⚠ {error}</span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>×</button>
          </div>
        )}

        <div style={{ flex: 1, display: "flex", alignItems: step === "select" ? "center" : "flex-start", justifyContent: "center", padding: "2rem" }}>

          {/* ── STEP 0: Language + Interest selection ─────────────────────── */}
          {step === "select" && (
            <div style={{ width: "100%", maxWidth: "640px", animation: "fadeUp 0.3s ease" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "var(--text-muted)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                Step 1 of 3 — Setup
              </p>
              <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.15, marginBottom: "0.75rem" }}>
                Welcome to the<br />
                <em style={{ color: "#6ee7b7" }}>School of Software Engineering</em>
              </h1>
              <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "2.5rem", maxWidth: "540px" }}>
                Before we build your personalised curriculum, we need to understand where you are.
                You&apos;ll answer 8 theory questions, then complete 2 short coding challenges.
                The whole thing takes about 10 minutes.
              </p>

              {/* Language */}
              <div style={{ marginBottom: "2rem" }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.875rem" }}>
                  Primary language
                </p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  {(["python", "javascript"] as SoSELanguage[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      style={{
                        flex: 1,
                        padding: "1rem",
                        background: language === lang ? "rgba(110,231,183,0.08)" : "var(--bg-elevated)",
                        border: `2px solid ${language === lang ? "#6ee7b7" : "var(--border)"}`,
                        borderRadius: "10px",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.9rem", color: language === lang ? "#6ee7b7" : "var(--text-primary)", fontWeight: 600 }}>
                        {lang === "python" ? "🐍 Python" : "⚡ Node.js"}
                      </p>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        {lang === "python" ? "Python 3 · pytest" : "JavaScript · Jest"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interest */}
              <div style={{ marginBottom: "2.5rem" }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.875rem" }}>
                  Area of interest
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {INTERESTS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setInterest(opt.value)}
                      style={{
                        padding: "0.875rem 1rem",
                        background: interest === opt.value ? "rgba(110,231,183,0.08)" : "var(--bg-elevated)",
                        border: `2px solid ${interest === opt.value ? "#6ee7b7" : "var(--border)"}`,
                        borderRadius: "10px",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <p style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>{opt.icon}</p>
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: interest === opt.value ? "#6ee7b7" : "var(--text-primary)", fontWeight: 600 }}>{opt.label}</p>
                      <p style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={startAssessment} className="btn-primary" style={{ width: "100%", fontSize: "1rem", padding: "0.875rem", background: "#6ee7b7" }}>
                Begin proficiency assessment →
              </button>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)", textAlign: "center", marginTop: "1rem" }}>
                ~10 minutes · 8 theory questions + 2 coding challenges
              </p>
            </div>
          )}

          {/* ── Loading MCQ ──────────────────────────────────────────────── */}
          {(step === "loading_mcq" || step === "loading_challenge") && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", paddingTop: "6rem" }}>
              <Spinner size={44} />
              <div>
                <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  {step === "loading_mcq" ? "Generating your questions…" : "Preparing coding challenges…"}
                </p>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Gemma is crafting questions tailored to your profile
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 1: MCQ ───────────────────────────────────────────────── */}
          {step === "mcq" && questions.length > 0 && (
            <div style={{ width: "100%", maxWidth: "680px", animation: "fadeUp 0.25s ease" }}>
              {/* Progress */}
              <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Theory — Question {currentQ + 1} of {questions.length}
                  </p>
                  <span style={{
                    fontFamily: "DM Mono, monospace", fontSize: "0.63rem",
                    color: questions[currentQ].difficulty === "easy" ? "#6ee7b7" : questions[currentQ].difficulty === "medium" ? "#fbbf24" : "#f9a8d4",
                  }}>
                    {questions[currentQ].difficulty} · {questions[currentQ].topic}
                  </span>
                </div>
                <ProgressBar value={currentQ + 1} max={questions.length} />
              </div>

              {/* Question */}
              <div className="surface" style={{ padding: "1.75rem", marginBottom: "1.25rem" }}>
                <p style={{ fontSize: "1rem", color: "var(--text-primary)", lineHeight: 1.75, fontWeight: 500, whiteSpace: "pre-wrap" }}>
                  {questions[currentQ].question}
                </p>
              </div>

              {/* Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.5rem" }}>
                {questions[currentQ].options.map((opt, idx) => {
                  const isSelected = selectedOpt === idx
                  const isCorrect  = idx === questions[currentQ].correctIndex
                  const answered   = selectedOpt !== null

                  let bg      = "var(--bg-elevated)"
                  let border  = "var(--border)"
                  let color   = "var(--text-secondary)"
                  if (answered && isCorrect)  { bg = "rgba(110,231,183,0.1)"; border = "#6ee7b7"; color = "#6ee7b7" }
                  if (answered && isSelected && !isCorrect) { bg = "rgba(249,168,212,0.08)"; border = "#f9a8d4"; color = "#f9a8d4" }

                  return (
                    <button
                      key={idx}
                      onClick={() => selectOption(idx)}
                      disabled={answered}
                      style={{
                        padding: "0.875rem 1.1rem",
                        background: bg,
                        border: `1px solid ${border}`,
                        borderRadius: "8px",
                        cursor: answered ? "default" : "pointer",
                        textAlign: "left",
                        display: "flex",
                        gap: "0.75rem",
                        alignItems: "flex-start",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color, flexShrink: 0, marginTop: "1px" }}>
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <span style={{ fontSize: "0.9rem", color, lineHeight: 1.5 }}>{opt}</span>
                      {answered && isCorrect && <span style={{ marginLeft: "auto", color: "#6ee7b7" }}>✓</span>}
                      {answered && isSelected && !isCorrect && <span style={{ marginLeft: "auto", color: "#f9a8d4" }}>✗</span>}
                    </button>
                  )
                })}
              </div>

              {/* Explanation */}
              {showExplain && (
                <div style={{ padding: "1rem 1.1rem", background: "var(--accent-dim)", border: "1px solid var(--border-glow)", borderRadius: "8px", marginBottom: "1.25rem", animation: "fadeUp 0.2s ease" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.4rem" }}>Explanation</p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>{questions[currentQ].explanation}</p>
                </div>
              )}

              {selectedOpt !== null && (
                <button onClick={nextQuestion} className="btn-primary" style={{ width: "100%", fontSize: "0.9rem", padding: "0.75rem", background: "#6ee7b7" }}>
                  {currentQ + 1 < questions.length ? "Next question →" : "Continue to coding challenges →"}
                </button>
              )}
            </div>
          )}

          {/* ── STEP 2: Coding challenges ─────────────────────────────────── */}
          {step === "coding" && challenges.length > 0 && (
            <div style={{ width: "100%", maxWidth: "760px", animation: "fadeUp 0.25s ease" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Coding — Challenge {currentC + 1} of {challenges.length}
                  </p>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.63rem", color: challenges[currentC].difficulty === "easy" ? "#6ee7b7" : "#fbbf24" }}>
                    {challenges[currentC].difficulty}
                  </span>
                </div>
                <ProgressBar value={currentC + 1} max={challenges.length} color="#fbbf24" />
              </div>

              {/* Challenge card */}
              <div className="surface" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
                <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.625rem" }}>
                  {challenges[currentC].title}
                </h2>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.75 }}>
                  {challenges[currentC].description}
                </p>
              </div>

              {/* Mini editor */}
              <div style={{ marginBottom: "0.875rem" }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Your solution
                </p>
                <MiniEditor
                  value={studentCode}
                  onChange={setStudentCode}
                  language={language === "javascript" ? "javascript" : "python"}
                  height="240px"
                />
              </div>

              {/* Output */}
              {runResult && (
                <div style={{
                  padding: "0.875rem 1rem",
                  background: runResult.passed ? "rgba(110,231,183,0.06)" : "rgba(249,168,212,0.06)",
                  border: `1px solid ${runResult.passed ? "rgba(110,231,183,0.25)" : "rgba(249,168,212,0.25)"}`,
                  borderRadius: "8px",
                  marginBottom: "0.875rem",
                  animation: "fadeUp 0.2s ease",
                }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: runResult.passed ? "#6ee7b7" : "#f9a8d4", marginBottom: runResult.stderr ? "0.5rem" : 0 }}>
                    {runResult.passed ? "✓ Tests passed" : "✗ Tests failed"}
                  </p>
                  {runResult.stderr && (
                    <pre style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#f9a8d4", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {runResult.stderr.slice(0, 300)}
                    </pre>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button onClick={runChallenge} disabled={running} style={{ flex: 1, padding: "0.75rem", background: "rgba(110,231,183,0.08)", border: "1px solid rgba(110,231,183,0.25)", borderRadius: "8px", color: "#6ee7b7", fontFamily: "DM Mono, monospace", fontSize: "0.8rem", cursor: running ? "wait" : "pointer", opacity: running ? 0.6 : 1 }}>
                  {running ? "Running…" : "▶ Run & check"}
                </button>
                {runResult !== null && (
                  <button onClick={nextChallenge} className="btn-primary" style={{ flex: 1, fontSize: "0.85rem", background: "#6ee7b7" }}>
                    {currentC + 1 < challenges.length ? "Next challenge →" : "Finish assessment →"}
                  </button>
                )}
                {runResult === null && (
                  <button onClick={skipChallenge} className="btn-ghost" style={{ padding: "0.75rem 1rem", fontSize: "0.78rem" }}>
                    Skip
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Processing ────────────────────────────────────────── */}
          {step === "processing" && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", paddingTop: "6rem" }}>
              <Spinner size={48} />
              <div>
                <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1.3rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                  {processMsg}
                </p>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "var(--text-muted)", animation: "pulse 2s ease-in-out infinite" }}>
                  Building your personalised curriculum…
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 4: Result ────────────────────────────────────────────── */}
          {step === "result" && resultData && (
            <div style={{ width: "100%", maxWidth: "560px", animation: "fadeUp 0.4s ease" }}>
              {resultData.passed ? (
                <>
                  {/* Pass */}
                  <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎓</div>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#6ee7b7", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                      Assessment complete
                    </p>
                    <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "2rem", fontWeight: 900, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                      You&apos;re in.
                    </h1>
                    <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.75 }}>
                      Proficiency score: <strong style={{ color: "#6ee7b7" }}>{resultData.proficiencyScore}/100</strong>
                      {" · "}Level: <strong style={{ color: "#6ee7b7", textTransform: "capitalize" }}>{resultData.proficiencyLevel}</strong>
                    </p>
                  </div>

                  {/* Score cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "2rem" }}>
                    {[
                      { label: "Theory score",   value: `${Math.round((mcqAnswers.filter(a=>a.correct).length / Math.max(questions.length, 1)) * 100)}%` },
                      { label: "Coding score",   value: `${Math.round((challengeResults.filter(Boolean).length / Math.max(challenges.length, 1)) * 100)}%` },
                      { label: "Proficiency",    value: resultData.proficiencyLevel.charAt(0).toUpperCase() + resultData.proficiencyLevel.slice(1) },
                      { label: "Language",       value: language === "python" ? "Python 3" : "Node.js" },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: "1rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "10px", textAlign: "center" }}>
                        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}>{label}</p>
                        <p style={{ fontFamily: "Playfair Display, serif", fontSize: "1.25rem", fontWeight: 700, color: "#6ee7b7" }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn-primary"
                    style={{ width: "100%", fontSize: "1rem", padding: "0.875rem", background: "#6ee7b7" }}
                    onClick={() => router.push("/sose/curriculum")}
                  >
                    View your curriculum →
                  </button>
                </>
              ) : (
                <>
                  {/* Fail — redirect to SoP */}
                  <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📚</div>
                    <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "1.75rem", fontWeight: 900, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                      Not quite ready yet
                    </h1>
                    <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.75 }}>
                      You scored <strong style={{ color: "#fbbf24" }}>{resultData.proficiencyScore}/100</strong>.
                      SoSE requires a minimum of 35 points to ensure you can tackle real projects.
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.75, marginTop: "0.75rem" }}>
                      We&apos;ve enrolled you in the <strong style={{ color: "var(--accent)" }}>School of Programming</strong> where you&apos;ll build the foundations — syntax, functions, logic — then you can return here.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      className="btn-primary"
                      style={{ flex: 1, fontSize: "0.9rem", padding: "0.75rem" }}
                      onClick={() => router.push("/school/programming")}
                    >
                      Go to School of Programming →
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: "0.75rem 1rem", fontSize: "0.85rem" }}
                      onClick={() => setStep("select")}
                    >
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
