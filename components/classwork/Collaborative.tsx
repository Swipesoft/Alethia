"use client"

import { useState, useRef, useEffect } from "react"
import type { Classwork, Faculty } from "@/lib/types"
import { Judge0Terminal } from "./Judge0Terminal"
import { ChatMessage } from "@/components/shared/ChatMessage"
import { detectLanguage } from "@/lib/detect-language"

type Props = {
  classwork: Classwork
  studentId: string
  moduleId: string
  faculty: Faculty
  onComplete: (score: number, feedback: string) => void
}

type Message = { role: "user" | "assistant"; content: string }

export function Collaborative({ classwork, studentId, moduleId, faculty, onComplete }: Props) {
  const [studentCode, setStudentCode] = useState(classwork.starterCode ?? "")
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Welcome to our collaborative session! 🤝

This is where we work through the task **together**. I'll guide you step by step, explain as we go, and we'll solve it jointly. 

**Our task:** ${classwork.prompt}

Let's start! Tell me what you understand about this problem, or just say "let's begin" and I'll kick us off.`,
    },
  ])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [executionResult, setExecutionResult] = useState<unknown>(null)
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isCode = classwork.assessmentType === "code_execution"

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || streaming) return
    const userMsg = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMsg }])
    setStreaming(true)
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    try {
      const res = await fetch("/api/chat/collaborative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          moduleId,
          classworkPrompt: classwork.prompt,
          currentCode: studentCode,
          executionResult,
          message: userMsg,
          history: messages,
          faculty,
        }),
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split("\n").filter((l) => l.startsWith("data: "))
        for (const line of lines) {
          const data = line.slice(6)
          if (data === "[DONE]") continue
          try {
            const { delta } = JSON.parse(data)
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + delta,
              }
              return updated
            })
          } catch { /* skip */ }
        }
      }
    } finally {
      setStreaming(false)
    }
  }

  async function handleFinish() {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/classwork/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          moduleId,
          classworkId: classwork.classworkId,
          studentAnswer: isCode ? studentCode : messages.map((m) => m.content).join("\n"),
          executionResult,
        }),
      })
      const data = await res.json()
      setScore(data.score)
      setFeedback(data.feedback)
    } finally {
      setSubmitting(false)
    }
  }

  if (score !== null) {
    return (
      <div className="surface glow-border animate-fade-up" style={{ padding: "2rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
        <div style={{ fontSize: "2.5rem", fontFamily: "Playfair Display, serif", fontWeight: 900, color: "#6ee7b7" }}>
          {score}<span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/100</span>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7, maxWidth: "480px" }}>
          {feedback}
        </p>
        <button className="btn-primary" onClick={() => onComplete(score, feedback ?? "")}>Continue to Module Assessment →</button>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", gap: "1.5rem", minHeight: "500px" }}>
      {/* Left: Tutor chat */}
      <div style={{ flex: "0 0 45%", display: "flex", flexDirection: "column", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1rem" }}>🏛️</span>
          <div>
            <p style={{ fontSize: "0.8rem", fontWeight: 500 }}>Athena — Collaborative Mode</p>
            <p style={{ fontSize: "0.65rem", color: "var(--accent)", fontFamily: "DM Mono, monospace" }}>
              {streaming ? "thinking..." : "working with you"}
            </p>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "90%",
                background: msg.role === "user" ? "var(--accent-dim)" : "var(--bg-elevated)",
                border: `1px solid ${msg.role === "user" ? "var(--border-glow)" : "var(--border)"}`,
                borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                padding: "0.6rem 0.875rem",
                fontSize: "0.85rem",
                color: msg.role === "user" ? "var(--accent)" : "var(--text-secondary)",
                lineHeight: 1.65,
              }}>
                {/* Stream in-progress: plain text to avoid re-parsing every character */}
                {streaming && i === messages.length - 1 && msg.role === "assistant" ? (
                  <span style={{ whiteSpace: "pre-wrap" }}>
                    {msg.content}
                    <span style={{ display: "inline-block", width: "2px", height: "13px", background: "var(--accent)", marginLeft: "2px", verticalAlign: "middle", animation: "fade-in 0.5s ease infinite alternate" }} />
                  </span>
                ) : msg.role === "assistant" ? (
                  <ChatMessage content={msg.content} />
                ) : (
                  <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.5rem" }}>
          <input
            className="input-field"
            placeholder="Talk to Athena..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={streaming}
            style={{ fontSize: "0.85rem", padding: "0.5rem 0.875rem" }}
          />
          <button
            className="btn-primary"
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            style={{ padding: "0.5rem 0.875rem", opacity: !input.trim() || streaming ? 0.4 : 1 }}
          >↑</button>
        </div>
      </div>

      {/* Right: Code / Answer area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ padding: "0.75rem 1rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderLeft: "3px solid #6ee7b7", borderRadius: "var(--radius-sm)" }}>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#6ee7b7" }}>YOUR WORKSPACE</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            Write code here as we work through it together
          </p>
        </div>

        {isCode ? (
          <Judge0Terminal
            code={studentCode}
            language={detectLanguage(studentCode || classwork.starterCode || "")}
            onCodeChange={setStudentCode}
            onResult={(r) => setExecutionResult(r)}
            taskContext={classwork.prompt}
          />
        ) : (
          <textarea
            style={{
              flex: 1, minHeight: "200px",
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
              fontFamily: "DM Sans, sans-serif", fontSize: "0.9rem",
              padding: "0.875rem", resize: "none", outline: "none", lineHeight: 1.7,
            }}
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
            placeholder="Work through the task here..."
          />
        )}

        <button
          className="btn-primary"
          onClick={handleFinish}
          disabled={submitting}
          style={{ alignSelf: "flex-end", opacity: submitting ? 0.5 : 1 }}
        >
          {submitting ? "Finishing..." : "Mark as Complete →"}
        </button>
      </div>
    </div>
  )
}
