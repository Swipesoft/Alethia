"use client"

import dynamic from "next/dynamic"

const ProgrammingEditor = dynamic(
  () => import("@/components/shared/ProgrammingEditor").then((m) => m.ProgrammingEditor),
  { ssr: false, loading: () => <div style={{ height: "200px", background: "#07070e" }} /> }
)

type Props = {
  value: string
  onChange: (v: string) => void
  language: "python" | "javascript"
  height?: string
}

export function MiniEditor({ value, onChange, language, height = "220px" }: Props) {
  return (
    <div
      style={{
        height,
        overflow: "hidden",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        background: "#07070e",
      }}
    >
      <ProgrammingEditor
        value={value}
        onChange={onChange}
        language={language}
        minHeight={height}
      />
    </div>
  )
}
