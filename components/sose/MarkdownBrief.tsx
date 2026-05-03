"use client"

/**
 * MarkdownBrief — renders assignment description markdown with Athena's design system.
 * Handles: headings, bold, inline code, code blocks, bullet lists, numbered lists.
 * No external library — lightweight, theme-aware.
 */

type Props = {
  content: string
}

export function MarkdownBrief({ content }: Props) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // ── Fenced code block ──────────────────────────────────────────────────
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre
          key={i}
          style={{
            background: "#07070e",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.875rem 1rem",
            margin: "0.875rem 0",
            overflowX: "auto",
            fontFamily: "DM Mono, monospace",
            fontSize: "0.78rem",
            color: "#a0aec0",
            lineHeight: 1.7,
          }}
        >
          {lang && (
            <span style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.6rem", color: "#4a4a5a", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {lang}
            </span>
          )}
          {codeLines.join("\n")}
        </pre>
      )
      i++ // skip closing ```
      continue
    }

    // ── Heading 2 ──────────────────────────────────────────────────────────
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: "0.65rem",
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginTop: "1.5rem",
            marginBottom: "0.625rem",
          }}
        >
          {line.slice(3)}
        </h2>
      )
      i++
      continue
    }

    // ── Heading 3 ──────────────────────────────────────────────────────────
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          style={{
            fontFamily: "Playfair Display, serif",
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginTop: "1rem",
            marginBottom: "0.4rem",
          }}
        >
          {line.slice(4)}
        </h3>
      )
      i++
      continue
    }

    // ── Bullet list block ──────────────────────────────────────────────────
    if (line.match(/^[-*] /)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={i} style={{ listStyle: "none", margin: "0.5rem 0 0.875rem", padding: 0 }}>
          {items.map((item, j) => (
            <li
              key={j}
              style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.35rem" }}
            >
              <span style={{ color: "#6ee7b7", flexShrink: 0, marginTop: "2px", fontSize: "0.75rem" }}>›</span>
              <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                {renderInline(item)}
              </span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // ── Numbered list block ────────────────────────────────────────────────
    if (line.match(/^\d+\. /)) {
      const items: string[] = []
      let num = 1
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ""))
        i++
      }
      elements.push(
        <ol key={i} style={{ listStyle: "none", margin: "0.5rem 0 0.875rem", padding: 0 }}>
          {items.map((item, j) => (
            <li
              key={j}
              style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.35rem" }}
            >
              <span
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: "0.65rem",
                  color: "#6ee7b7",
                  flexShrink: 0,
                  marginTop: "3px",
                  minWidth: "16px",
                }}
              >
                {j + 1}.
              </span>
              <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                {renderInline(item)}
              </span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // ── Empty line ─────────────────────────────────────────────────────────
    if (line.trim() === "") {
      i++
      continue
    }

    // ── Regular paragraph ──────────────────────────────────────────────────
    elements.push(
      <p
        key={i}
        style={{
          fontSize: "0.875rem",
          color: "var(--text-secondary)",
          lineHeight: 1.75,
          marginBottom: "0.5rem",
        }}
      >
        {renderInline(line)}
      </p>
    )
    i++
  }

  return <div style={{ paddingBottom: "0.5rem" }}>{elements}</div>
}

// ── Inline renderer: **bold**, `code`, plain text ──────────────────────────────
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const token = match[0]
    if (token.startsWith("**")) {
      parts.push(
        <strong key={match.index} style={{ fontWeight: 500, color: "var(--text-primary)" }}>
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={match.index}
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: "0.82em",
            color: "#6ee7b7",
            background: "rgba(110,231,183,0.08)",
            padding: "0.1em 0.35em",
            borderRadius: "3px",
            border: "1px solid rgba(110,231,183,0.15)",
          }}
        >
          {token.slice(1, -1)}
        </code>
      )
    }

    lastIndex = match.index + token.length
  }

  // Remaining text
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>
}
