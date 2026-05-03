"use client"
import { useEffect, useState } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { getOrCreateStudentId } from "@/lib/student-identity"

const STAGES = ["Designing your assignment…","Writing starter code…","Defining grading checks…","Finalising details…","Almost ready…"]

export default function WebDevGeneratePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const assignmentId = params.assignmentId as string
  const curriculumId = searchParams.get("curriculumId") ?? ""
  const itemIndex    = parseInt(searchParams.get("itemIndex") ?? "0")
  const [stage,  setStage]  = useState(0)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null
    async function generate() {
      t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 14_000)
      try {
        const studentId = getOrCreateStudentId()
        const genRes = await fetch("/api/webdev/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ curriculumId, itemIndex }) })
        const genData = await genRes.json()
        if (!genRes.ok) throw new Error(genData.error ?? "Generation failed")
        const wsRes = await fetch("/api/webdev/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId, assignmentId, curriculumId }) })
        const wsData = await wsRes.json()
        if (!wsRes.ok) throw new Error(wsData.error ?? "Failed to open workspace")
        router.replace(`/school/webdev/workspace/${wsData.workspace.workspaceId}`)
      } catch (err) { setError(err instanceof Error ? err.message : "Failed"); if (t) clearInterval(t) }
    }
    generate()
    return () => { if (t) clearInterval(t) }
  }, [assignmentId, curriculumId, itemIndex, router])

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{ minHeight: "100vh", background: "#07070e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2rem" }}>
        {error ? (
          <div style={{ textAlign: "center", maxWidth: "480px", padding: "2rem" }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 600, color: "#f43f5e", marginBottom: "0.75rem" }}>Generation failed</p>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1.5rem", lineHeight: 1.65 }}>{error}</p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button onClick={() => { setError(null); setStage(0); window.location.reload() }} style={{ background: "#3b82f6", border: "none", borderRadius: "8px", color: "#fff", padding: "0.75rem 1.5rem", cursor: "pointer" }}>Retry</button>
              <button onClick={() => router.push("/school/webdev/curriculum")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#64748b", padding: "0.75rem 1rem", cursor: "pointer" }}>Back</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ width: "52px", height: "52px", border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", fontWeight: 600, color: "#f1f5f9", marginBottom: "0.6rem" }}>{STAGES[stage]}</p>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#64748b", animation: "pulse 2s ease-in-out infinite" }}>Gemma is designing your bespoke frontend project</p>
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {STAGES.map((_, i) => <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: i <= stage ? "#3b82f6" : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />)}
            </div>
          </>
        )}
      </div>
    </>
  )
}
