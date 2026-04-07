"use client"

import { useEffect, useRef, useState } from "react"

type Message = { role: "user" | "assistant"; content: string }

export function QAChat({ studentId, moduleId }: { studentId: string; moduleId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "I'm your Athena tutor. Ask me anything about this lecture — I'm here to help you understand, not just give answers. 🏛️" }
  ])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send() {
    if (!input.trim() || streaming) return
    const userMsg = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMsg }])
    setStreaming(true)

    // Append empty assistant message we'll fill via stream
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          moduleId,
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
          } catch { /* skip malformed chunks */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: "assistant", content: "Something went wrong. Please try again." }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0.875rem 1.25rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
        }}
      >
        <span style={{ fontSize: "1rem" }}>🏛️</span>
        <div>
          <p style={{ fontSize: "0.8rem", fontWeight: 500 }}>Athena Tutor</p>
          <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace" }}>
            {streaming ? "typing..." : "online"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                background: msg.role === "user" ? "var(--accent-dim)" : "var(--bg-elevated)",
                border: `1px solid ${msg.role === "user" ? "var(--border-glow)" : "var(--border)"}`,
                borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                padding: "0.65rem 0.9rem",
                fontSize: "0.85rem",
                color: msg.role === "user" ? "var(--accent)" : "var(--text-secondary)",
                lineHeight: 1.65,
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content}
              {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                <span style={{ display: "inline-block", width: "2px", height: "14px", background: "var(--accent)", marginLeft: "2px", verticalAlign: "middle", animation: "fade-in 0.5s ease infinite alternate" }} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "0.75rem",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: "0.5rem",
        }}
      >
        <input
          className="input-field"
          placeholder="Ask your tutor..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          disabled={streaming}
          style={{ fontSize: "0.85rem", padding: "0.6rem 0.9rem" }}
        />
        <button
          className="btn-primary"
          onClick={send}
          disabled={!input.trim() || streaming}
          style={{ padding: "0.6rem 1rem", fontSize: "0.85rem", opacity: !input.trim() || streaming ? 0.4 : 1, flexShrink: 0 }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
