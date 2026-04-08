"use client"

import { useState, useRef, useEffect } from "react"
import type { Classwork } from "@/lib/types"
import { Judge0Terminal } from "./Judge0Terminal"

type Props = {
  classwork: Classwork
  studentId: string
  moduleId: string
  onComplete: (score: number, feedback: string) => void
}

type Message = { role: "user" | "assistant"; content: string }

export function SocraticChat({ classwork, studentId, moduleId, onComplete }: Props) {
  const [answer, setAnswer] = useState(classwork.starterCode ?? "")
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Let's work through this together. Have a go at the task — I won't give you the answer directly, but I'll guide you with questions if you get stuck. 

**Task:** ${classwork.prompt}

When you're ready, submit your attempt below and I'll give you Socratic feedback.`,
    },
  ])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
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
      const res = await fetch("/api/chat/socratic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          moduleId,
          classworkPrompt: classwork.prompt,
          message: userMsg,
          history: messages,
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

  async function handleSubmit() {
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
          studentAnswer: answer,
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
        <div style={{ fontSize: "2.5rem", fontFamily: "Playfair Display, serif", fontWeight: 900, color: score >= 60 ? "#6ee7b7" : "var(--accent)" }}>
          {score}<span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/100</span>
        </div>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: "480px" }}>
          {feedback}
        </p>
        <button className="btn-primary" onClick={() => onComplete(score, feedback ?? "")}>Continue →</button>
      </div>
    )
  }

  function detectLanguage(code: string): string {
    if (code.includes("fn main") || code.includes("use std::") || code.includes("let mut ")) return "rust"
    if (code.includes("def ") || code.includes("import ") || code.includes("print(")) return "python"
    if (code.includes("function ") || code.includes("const ") || code.includes("console.log")) return "javascript"
    if (code.includes("public class") || code.includes("System.out")) return "java"
    return "python"
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Answer area */}
      <div className="surface" style={{ padding: "1.5rem" }}>
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--accent)", marginBottom: "0.75rem" }}>YOUR ATTEMPT</p>
        {isCode ? (
          <Judge0Terminal
            code={answer}
            language={detectLanguage(answer ||  "")}
            onCodeChange={setAnswer}
          />
        ) : (
          <textarea
            style={{
              width: "100%", minHeight: "160px",
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
              fontFamily: "DM Sans, sans-serif", fontSize: "0.9rem",
              padding: "0.875rem", resize: "vertical", outline: "none", lineHeight: 1.7,
            }}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write your response here..."
          />
        )}
      </div>

      {/* Socratic hint chat */}
      <div>
        <button
          onClick={() => setShowChat((v) => !v)}
          className="btn-ghost"
          style={{ fontSize: "0.875rem", marginBottom: "0.75rem" }}
        >
          {showChat ? "Hide" : "💬 Ask for a hint (Socratic guide)"}
        </button>

        {showChat && (
          <div className="surface animate-fade-up" style={{ overflow: "hidden" }}>
            <div style={{ maxHeight: "240px", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%",
                    background: msg.role === "user" ? "var(--accent-dim)" : "var(--bg-elevated)",
                    border: `1px solid ${msg.role === "user" ? "var(--border-glow)" : "var(--border)"}`,
                    borderRadius: "12px",
                    padding: "0.6rem 0.875rem",
                    fontSize: "0.85rem",
                    color: msg.role === "user" ? "var(--accent)" : "var(--text-secondary)",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.5rem" }}>
              <input
                className="input-field"
                placeholder="Ask for a hint..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={streaming}
                style={{ fontSize: "0.85rem", padding: "0.5rem 0.875rem" }}
              />
              <button className="btn-primary" onClick={sendMessage} disabled={!input.trim() || streaming} style={{ padding: "0.5rem 0.875rem", opacity: !input.trim() || streaming ? 0.4 : 1 }}>↑</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={submitting || !answer.trim()}
          style={{ opacity: submitting || !answer.trim() ? 0.4 : 1 }}
        >
          {submitting ? "Grading..." : "Submit Answer →"}
        </button>
      </div>
    </div>
  )
}
