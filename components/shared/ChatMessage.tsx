"use client"

import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

type Props = { content: string }

export function ChatMessage({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => (
          <p style={{ margin: "0 0 0.45rem 0", lineHeight: 1.65 }}>{children}</p>
        ),
        h1: ({ children }) => (
          <h1 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: "0.75rem 0 0.3rem", fontFamily: "DM Sans, sans-serif" }}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", margin: "0.75rem 0 0.3rem", fontFamily: "DM Sans, sans-serif" }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--accent)", margin: "0.65rem 0 0.25rem", fontFamily: "DM Mono, monospace", letterSpacing: "0.02em" }}>{children}</h3>
        ),
        ul: ({ children }) => (
          <ul style={{ paddingLeft: "1.25rem", margin: "0.2rem 0 0.45rem", listStyleType: "disc" }}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol style={{ paddingLeft: "1.25rem", margin: "0.2rem 0 0.45rem" }}>{children}</ol>
        ),
        li: ({ children }) => (
          <li style={{ marginBottom: "0.2rem", lineHeight: 1.6 }}>{children}</li>
        ),
        strong: ({ children }) => (
          <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>{children}</em>
        ),
        blockquote: ({ children }) => (
          <blockquote style={{ borderLeft: "2px solid var(--accent)", paddingLeft: "0.75rem", margin: "0.5rem 0", color: "var(--text-muted)", fontStyle: "italic" }}>{children}</blockquote>
        ),
        code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
          const langMatch = /language-(\w+)/.exec(className ?? "")
          if (!langMatch) {
            return (
              <code style={{
                fontFamily: "DM Mono, monospace",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "0.1em 0.35em",
                borderRadius: "3px",
                fontSize: "0.82em",
                color: "var(--accent)",
              }}>
                {children}
              </code>
            )
          }
          return (
            <SyntaxHighlighter
              language={langMatch[1]}
              style={oneDark}
              customStyle={{
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8rem",
                margin: "0.5rem 0",
                padding: "0.75rem 1rem",
                background: "#0d0d16",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          )
        },
        pre: ({ children }) => <>{children}</>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
