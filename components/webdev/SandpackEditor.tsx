"use client"

import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackFileExplorer,
  useSandpack,
} from "@codesandbox/sandpack-react"
import { useEffect } from "react"
import type { WebDevFramework } from "@/lib/types-webdev"

// ─── File change listener (bridges Sandpack state → parent handler) ────────────
function FileChangeListener({
  onChange,
}: {
  onChange: (files: Record<string, string>) => void
}) {
  const { sandpack } = useSandpack()

  useEffect(() => {
    const updated: Record<string, string> = {}
    for (const [path, fileObj] of Object.entries(sandpack.files)) {
      updated[path] = fileObj.code
    }
    onChange(updated)
  }, [sandpack.files, onChange])

  return null
}

// ─── Sandpack template ─────────────────────────────────────────────────────────
function getTemplate(framework: WebDevFramework) {
  if (framework === "html_css_js") return "static" as const
  return "react" as const
}

type Props = {
  files: Record<string, string>
  framework: WebDevFramework
  onChange: (files: Record<string, string>) => void
}

export default function SandpackEditor({ files, framework, onChange }: Props) {
  const template = getTemplate(framework)

  // Sandpack needs files WITHOUT leading slash in some cases — normalise
  const normalised: Record<string, { code: string }> = {}
  for (const [path, code] of Object.entries(files)) {
    const key = path.startsWith("/") ? path : `/${path}`
    normalised[key] = { code }
  }

  return (
    <SandpackProvider
      template={template}
      files={normalised}
      theme={{
        colors: {
          surface1:           "#07070e",
          surface2:           "#0d0d1a",
          surface3:           "#111120",
          clickable:          "#64748b",
          base:               "#94a3b8",
          disabled:           "#334155",
          hover:              "#f1f5f9",
          accent:             "#3b82f6",
          error:              "#f43f5e",
          errorSurface:       "rgba(244,63,94,0.1)",
          warning:            "#f59e0b",
          warningSurface:     "rgba(245,158,11,0.1)",
        },
        font: {
          body:   "'DM Mono', monospace",
          mono:   "'DM Mono', monospace",
          size:   "13px",
          lineHeight: "1.6",
        },
      }}
      options={{
        recompileMode:  "delayed",
        recompileDelay: 600,
        externalResources: [],
      }}
      style={{ height: "100%", width: "100%" }}
    >
      <FileChangeListener onChange={onChange} />
      <SandpackLayout style={{ height: "100%", border: "none", borderRadius: 0, gap: 0 }}>
        <SandpackFileExplorer style={{ height: "100%", width: "160px", borderRight: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }} />
        <SandpackCodeEditor
          showTabs
          showLineNumbers
          showInlineErrors
          wrapContent={false}
          style={{ height: "100%", flex: 1 }}
        />
        <SandpackPreview
          showNavigator
          showOpenInCodeSandbox={false}
          style={{ height: "100%", flex: 1, borderLeft: "1px solid rgba(255,255,255,0.06)" }}
        />
      </SandpackLayout>
    </SandpackProvider>
  )
}
