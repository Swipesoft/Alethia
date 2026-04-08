"use client"

import { useEffect, useState } from "react"
import type { LectureBeat, DiagramVariant } from "@/lib/types"

type Props = { beat: Extract<LectureBeat, { type: "animated_diagram" }> }

export function DiagramBeat({ beat }: Props) {
  return (
    <div className="surface" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "0.1em" }}>
        DIAGRAM · {beat.variant.replace(/_/g, " ").toUpperCase()}
      </p>
      <DiagramSelector variant={beat.variant} data={beat.data} />
      {beat.caption && (
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", fontStyle: "italic" }}>
          {beat.caption}
        </p>
      )}
    </div>
  )
}

function DiagramSelector({ variant, data }: { variant: DiagramVariant; data: unknown }) {
  switch (variant) {
    case "call_stack":       return <CallStackViz />
    case "sorting_viz":      return <SortingViz />
    case "tree_traversal":   return <TreeTraversalViz />
    case "wave_function":    return <WaveFunctionViz />
    case "vector_field":     return <VectorFieldViz />
    case "organ_highlight":  return <OrganHighlightViz data={data ?? {}} />
    case "timeline":         return <TimelineViz data={data ?? []} />
    case "quote_reveal":     return <QuoteRevealViz data={data ?? {}} />
    case "color_theory":     return <ColorTheoryViz />
    case "bar_chart":
    case "line_chart":       return <PlaceholderViz label={variant} />
    default:                 return <PlaceholderViz label={variant} />
  }
}

// ── Call Stack ────────────────────────────────────────────────────────────────
function CallStackViz() {
  const frames = ["main()", "fibonacci(5)", "fibonacci(4)", "fibonacci(3)"]
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i++
      setVisible(i)
      if (i >= frames.length) clearInterval(interval)
    }, 600)
    return () => clearInterval(interval)
  }, [frames.length])

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0", minHeight: "220px", justifyContent: "flex-end", padding: "1rem" }}>
      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace", marginBottom: "0.75rem", alignSelf: "flex-start" }}>
        Stack (grows up ↑)
      </p>
      {frames.slice(0, visible).map((frame, i) => (
        <div
          key={frame}
          style={{
            width: "100%",
            maxWidth: "320px",
            background: i === visible - 1 ? "var(--accent-dim)" : "var(--bg-elevated)",
            border: `1px solid ${i === visible - 1 ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "6px",
            padding: "0.6rem 1rem",
            marginBottom: "4px",
            fontFamily: "DM Mono, monospace",
            fontSize: "0.85rem",
            color: i === visible - 1 ? "var(--accent)" : "var(--text-secondary)",
            opacity: 0,
            animation: "fade-up 0.3s ease forwards",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{frame}</span>
          {i === visible - 1 && (
            <span style={{ fontSize: "0.65rem", color: "var(--accent)", letterSpacing: "0.05em" }}>← TOP</span>
          )}
        </div>
      ))}
      <div style={{ width: "100%", maxWidth: "320px", height: "3px", background: "var(--border)", borderRadius: "2px", marginTop: "4px" }} />
      <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace", marginTop: "0.3rem" }}>Stack bottom</p>
    </div>
  )
}

// ── Sorting Viz ───────────────────────────────────────────────────────────────
function SortingViz() {
  const initial = [64, 34, 25, 12, 22, 11, 90]
  const [bars, setBars] = useState(initial)
  const [comparing, setComparing] = useState<number[]>([])
  const [sorted, setSorted] = useState<number[]>([])
  const maxVal = Math.max(...initial)

  useEffect(() => {
    const arr = [...initial]
    const steps: Array<{ arr: number[]; comparing: number[]; sorted: number[] }> = []
    const sortedSet: number[] = []

    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length - i - 1; j++) {
        steps.push({ arr: [...arr], comparing: [j, j + 1], sorted: [...sortedSet] })
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
          steps.push({ arr: [...arr], comparing: [j, j + 1], sorted: [...sortedSet] })
        }
      }
      sortedSet.push(arr.length - 1 - i)
    }

    let step = 0
    const interval = setInterval(() => {
      if (step >= steps.length) { clearInterval(interval); setSorted(arr.map((_, i) => i)); return }
      setBars(steps[step].arr)
      setComparing(steps[step].comparing)
      setSorted(steps[step].sorted)
      step++
    }, 180)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "180px", padding: "1rem 2rem 0.5rem", justifyContent: "center" }}>
      {bars.map((val, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "0.6rem", fontFamily: "DM Mono, monospace", color: "var(--text-muted)" }}>{val}</span>
          <div
            style={{
              width: "32px",
              height: `${(val / maxVal) * 140}px`,
              borderRadius: "4px 4px 0 0",
              background: sorted.includes(i)
                ? "#6ee7b7"
                : comparing.includes(i)
                  ? "var(--accent)"
                  : "var(--bg-elevated)",
              border: `1px solid ${comparing.includes(i) ? "var(--accent)" : "var(--border)"}`,
              transition: "height 0.15s ease, background 0.2s ease",
            }}
          />
        </div>
      ))}
    </div>
  )
}

// ── Tree Traversal ────────────────────────────────────────────────────────────
function TreeTraversalViz() {
  const nodes = [
    { id: 1, x: 200, y: 30, parent: null, label: "8" },
    { id: 2, x: 100, y: 100, parent: 1, label: "3" },
    { id: 3, x: 300, y: 100, parent: 1, label: "10" },
    { id: 4, x: 50,  y: 170, parent: 2, label: "1" },
    { id: 5, x: 150, y: 170, parent: 2, label: "6" },
    { id: 6, x: 350, y: 170, parent: 3, label: "14" },
  ]
  const traversal = [4, 2, 5, 1, 3, 6]
  const [visited, setVisited] = useState<number[]>([])
  const [current, setCurrent] = useState<number | null>(null)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i >= traversal.length) { clearInterval(interval); setCurrent(null); return }
      setCurrent(traversal[i])
      setVisited((prev) => [...prev, traversal[i]])
      i++
    }, 700)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <svg width="100%" viewBox="0 0 400 220" style={{ maxHeight: "220px" }}>
      {/* Edges */}
      {nodes.filter((n) => n.parent).map((n) => {
        const parent = nodes.find((p) => p.id === n.parent)!
        return (
          <line key={`e${n.id}`} x1={parent.x} y1={parent.y} x2={n.x} y2={n.y}
            stroke="var(--border)" strokeWidth={1.5} />
        )
      })}
      {/* Nodes */}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x} cy={n.y} r={22}
            fill={current === n.id ? "var(--accent)" : visited.includes(n.id) ? "rgba(251,191,36,0.2)" : "var(--bg-elevated)"}
            stroke={current === n.id ? "var(--accent)" : visited.includes(n.id) ? "rgba(251,191,36,0.5)" : "var(--border)"}
            strokeWidth={1.5}
            style={{ transition: "fill 0.3s ease, stroke 0.3s ease" }}
          />
          <text x={n.x} y={n.y + 5} textAnchor="middle"
            style={{ fontFamily: "DM Mono, monospace", fontSize: "13px", fill: current === n.id ? "#08080f" : "var(--text-primary)", fontWeight: current === n.id ? 700 : 400 }}>
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ── Wave Function ─────────────────────────────────────────────────────────────
function WaveFunctionViz() {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    let frame: number
    const animate = () => {
      setPhase((p) => p + 0.05)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  const points = Array.from({ length: 100 }, (_, i) => {
    const x = (i / 99) * 360
    const y = 75 + Math.sin((i / 99) * 4 * Math.PI + phase) * 50
    return `${x},${y}`
  }).join(" ")

  const points2 = Array.from({ length: 100 }, (_, i) => {
    const x = (i / 99) * 360
    const y = 75 + Math.cos((i / 99) * 4 * Math.PI + phase) * 35
    return `${x},${y}`
  }).join(" ")

  return (
    <svg width="100%" viewBox="0 0 380 150" style={{ maxHeight: "180px" }}>
      <line x1="0" y1="75" x2="380" y2="75" stroke="var(--border)" strokeWidth={1} strokeDasharray="4,4" />
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
      <polyline points={points2} fill="none" stroke="var(--faculty-stem)" strokeWidth={1.5} opacity={0.6} />
      <text x="8" y="20" style={{ fontFamily: "DM Mono, monospace", fontSize: "10px", fill: "var(--accent)" }}>ψ(x)</text>
      <text x="8" y="35" style={{ fontFamily: "DM Mono, monospace", fontSize: "10px", fill: "var(--faculty-stem)", opacity: 0.7 }}>|ψ|²</text>
    </svg>
  )
}

// ── Vector Field ──────────────────────────────────────────────────────────────
function VectorFieldViz() {
  const [t, setT] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setT((v) => v + 0.05), 50)
    return () => clearInterval(interval)
  }, [])

  const arrows = []
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const x = 30 + col * 45
      const y = 20 + row * 40
      const angle = Math.atan2(y - 100, x - 180) + t * 0.3
      const len = 14
      const dx = Math.cos(angle) * len
      const dy = Math.sin(angle) * len
      arrows.push({ x, y, dx, dy })
    }
  }

  return (
    <svg width="100%" viewBox="0 0 390 220" style={{ maxHeight: "220px" }}>
      {arrows.map((a, i) => (
        <g key={i}>
          <line x1={a.x} y1={a.y} x2={a.x + a.dx} y2={a.y + a.dy}
            stroke="var(--faculty-stem)" strokeWidth={1.5} opacity={0.7} />
          <polygon
            points={`${a.x + a.dx},${a.y + a.dy} ${a.x + a.dx - 5 * Math.cos(Math.atan2(a.dy, a.dx) - 0.5)},${a.y + a.dy - 5 * Math.sin(Math.atan2(a.dy, a.dx) - 0.5)} ${a.x + a.dx - 5 * Math.cos(Math.atan2(a.dy, a.dx) + 0.5)},${a.y + a.dy - 5 * Math.sin(Math.atan2(a.dy, a.dx) + 0.5)}`}
            fill="var(--faculty-stem)" opacity={0.7}
          />
        </g>
      ))}
    </svg>
  )
}

// ── Organ Highlight ───────────────────────────────────────────────────────────
function OrganHighlightViz({ data }: { data: unknown }) {
  function parseOrganData(raw: unknown): string {
    if (typeof raw === "string") {
      try { return (JSON.parse(raw) as Record<string, string>)?.organ ?? "heart" } catch { return "heart" }
    }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return (raw as Record<string, string>)?.organ ?? "heart"
    }
    return "heart"
  }

  const organ = parseOrganData(data)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setPulse((v) => !v), 800)
    return () => clearInterval(interval)
  }, [])

  const organMap: Record<string, { path: string; color: string; label: string }> = {
    heart: { color: "#f9a8d4", label: "Heart", path: "M100,60 C100,40 120,30 140,50 C160,30 180,40 180,60 C180,90 140,120 140,120 C140,120 100,90 100,60Z" },
    lungs: { color: "#93c5fd", label: "Lungs", path: "M70,40 C60,40 50,60 55,100 C60,120 80,130 100,120 L100,40 Z M130,40 C140,40 150,60 145,100 C140,120 120,130 100,120 L100,40 Z" },
    brain: { color: "#d8b4fe", label: "Brain", path: "M60,80 C60,50 80,30 115,30 C150,30 175,50 175,80 C175,110 155,130 115,130 C75,130 60,110 60,80Z" },
  }
  const o = organMap[organ] ?? organMap.heart

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <svg width="240" height="180" viewBox="0 0 240 180">
        <ellipse cx="120" cy="90" rx="80" ry="75" fill="var(--bg-elevated)" stroke="var(--border)" strokeWidth={1.5} />
        <path
          d={o.path}
          fill={o.color}
          opacity={pulse ? 0.9 : 0.6}
          style={{
            transform: `translate(0px, 0px)`,
            transition: "opacity 0.4s ease",
            filter: `drop-shadow(0 0 ${pulse ? "12px" : "4px"} ${o.color})`,
          }}
        />
        <text x="120" y="165" textAnchor="middle" style={{ fontFamily: "DM Mono, monospace", fontSize: "11px", fill: o.color }}>
          {o.label}
        </text>
      </svg>
    </div>
  )
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function TimelineViz({ data }: { data: unknown }) {
  const DEFAULT_EVENTS = [
    { year: "1803", event: "Marbury v. Madison" },
    { year: "1857", event: "Dred Scott v. Sandford" },
    { year: "1954", event: "Brown v. Board" },
    { year: "1973", event: "Roe v. Wade" },
  ]

  function parseEvents(raw: unknown): Array<{ year: string; event: string }> {
    if (typeof raw === "string") {
      try { return JSON.parse(raw) } catch { return DEFAULT_EVENTS }
    }
    if (Array.isArray(raw) && raw.length > 0) return raw
    return DEFAULT_EVENTS
  }

  const events = parseEvents(data)
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i++
      setVisible(i)
      if (i >= events.length) clearInterval(interval)
    }, 500)
    return () => clearInterval(interval)
  }, [events.length])

  return (
    <div style={{ padding: "1rem 2rem" }}>
      <div style={{ position: "relative", paddingLeft: "2rem" }}>
        <div style={{ position: "absolute", left: "0.4rem", top: 0, bottom: 0, width: "2px", background: "var(--border)" }} />
        {events.slice(0, visible).map((e, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              marginBottom: "1.25rem",
              opacity: 0,
              animation: "fade-up 0.4s ease forwards",
            }}
          >
            <div style={{ position: "absolute", left: "-1.65rem", top: "4px", width: "10px", height: "10px", borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--bg)" }} />
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--accent)", marginBottom: "0.2rem" }}>{e.year}</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{e.event}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Quote Reveal ──────────────────────────────────────────────────────────────
function QuoteRevealViz({ data }: { data: unknown }) {
  function parseQuoteData(raw: unknown): Record<string, string> {
    if (typeof raw === "string") {
      try { return JSON.parse(raw) } catch { return {} }
    }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, string>
    }
    return {}
  }

  const d = parseQuoteData(data)
  const quote = d.quote ?? "An unexamined life is not worth living."
  const author = d.author ?? "Socrates"
  const [chars, setChars] = useState(0)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i += 2
      setChars(i)
      if (i >= quote.length) clearInterval(interval)
    }, 40)
    return () => clearInterval(interval)
  }, [quote])

  return (
    <div style={{ padding: "2rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "1.5rem", alignItems: "center" }}>
      <div style={{ fontSize: "4rem", color: "var(--accent)", opacity: 0.3, lineHeight: 0.5, fontFamily: "Georgia, serif" }}>"</div>
      <p style={{ fontSize: "1.15rem", lineHeight: 1.8, fontFamily: "Playfair Display, serif", fontStyle: "italic", maxWidth: "480px", color: "var(--text-primary)" }}>
        {quote.slice(0, chars)}
        <span style={{ opacity: 0.4 }}>{quote.slice(chars)}</span>
      </p>
      <p style={{ fontSize: "0.8rem", color: "var(--accent)", fontFamily: "DM Mono, monospace", letterSpacing: "0.1em" }}>
        — {author}
      </p>
    </div>
  )
}

// ── Color Theory ──────────────────────────────────────────────────────────────
function ColorTheoryViz() {
  const [rotation, setRotation] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setRotation((r) => r + 0.5), 30)
    return () => clearInterval(interval)
  }, [])

  const colors = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#8B00FF", "#FF00FF", "#FF0080"]

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3rem", padding: "1.5rem" }}>
      {/* Color wheel */}
      <svg width="160" height="160" viewBox="-1 -1 2 2" style={{ transform: `rotate(${rotation}deg)` }}>
        {colors.map((color, i) => {
          const angle = (i / colors.length) * Math.PI * 2
          const nextAngle = ((i + 1) / colors.length) * Math.PI * 2
          const x1 = Math.cos(angle), y1 = Math.sin(angle)
          const x2 = Math.cos(nextAngle), y2 = Math.sin(nextAngle)
          return (
            <path key={i}
              d={`M 0 0 L ${x1} ${y1} A 1 1 0 0 1 ${x2} ${y2} Z`}
              fill={color} opacity={0.85}
            />
          )
        })}
        <circle cx="0" cy="0" r="0.35" fill="var(--bg)" />
      </svg>

      {/* Primary colours */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {[
          { label: "Primary", colors: ["#FF0000", "#FFFF00", "#0000FF"] },
          { label: "Secondary", colors: ["#FF7F00", "#00FF00", "#8B00FF"] },
        ].map((group) => (
          <div key={group.label}>
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace", marginBottom: "0.3rem" }}>{group.label}</p>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {group.colors.map((c) => (
                <div key={c} style={{ width: "28px", height: "28px", borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}60` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Placeholder ───────────────────────────────────────────────────────────────
function PlaceholderViz({ label }: { label: string }) {
  return (
    <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius-sm)" }}>
      <p style={{ color: "var(--text-muted)", fontFamily: "DM Mono, monospace", fontSize: "0.75rem" }}>{label}</p>
    </div>
  )
}

