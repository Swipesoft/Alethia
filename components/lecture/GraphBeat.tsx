"use client"

import { useEffect, useState } from "react"
import {
  LineChart, Line, BarChart, Bar,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import type { LectureBeat } from "@/lib/types"

type Props = { beat: Extract<LectureBeat, { type: "graph_plot" }> }

export function GraphBeat({ beat }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const data = (beat.x ?? []).map((x, i) => ({ x, y: (beat.y ?? [])[i] ?? 0 }))

  const commonProps = {
    data,
    margin: { top: 10, right: 20, left: 0, bottom: 10 },
  }

  const axisStyle = {
    tick: { fill: "var(--text-muted)", fontSize: 11, fontFamily: "DM Mono, monospace" },
    axisLine: { stroke: "var(--border)" },
    tickLine: { stroke: "var(--border)" },
  }

  return (
    <div className="surface" style={{ padding: "1.5rem" }}>
      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--accent)", marginBottom: "1rem", letterSpacing: "0.1em" }}>
        {beat.title}
      </p>

      {mounted && (
        <ResponsiveContainer width="100%" height={280}>
          {beat.chartType === "bar" ? (
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="x" label={{ value: beat.xLabel, position: "insideBottom", offset: -5, fill: "var(--text-muted)", fontSize: 11 }} {...axisStyle} />
              <YAxis label={{ value: beat.yLabel, angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 11 }} {...axisStyle} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", fontFamily: "DM Mono, monospace", fontSize: 12 }} />
              <Bar dataKey="y" fill="var(--accent)" radius={[4, 4, 0, 0]} animationDuration={800} />
            </BarChart>
          ) : beat.chartType === "scatter" ? (
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="x" name={beat.xLabel} {...axisStyle} />
              <YAxis dataKey="y" name={beat.yLabel} {...axisStyle} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", fontFamily: "DM Mono, monospace", fontSize: 12 }} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={data} fill="var(--accent)" animationDuration={800} />
            </ScatterChart>
          ) : (
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="x" label={{ value: beat.xLabel, position: "insideBottom", offset: -5, fill: "var(--text-muted)", fontSize: 11 }} {...axisStyle} />
              <YAxis label={{ value: beat.yLabel, angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 11 }} {...axisStyle} />
              <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", fontFamily: "DM Mono, monospace", fontSize: 12 }} />
              <Line type="monotone" dataKey="y" stroke="var(--accent)" strokeWidth={2.5} dot={{ fill: "var(--accent)", r: 4 }} animationDuration={1200} />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  )
}
