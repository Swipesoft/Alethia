"use client"

import { use, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getStudentId } from "@/lib/student-identity"
import { getStudent } from "@/lib/firestore"
import type { StudentProfile, Module, Classwork } from "@/lib/types"
import { DemonstrateReplicate } from "@/components/classwork/DemonstrateReplicate"
import { SocraticChat } from "@/components/classwork/SocraticChat"
import { Collaborative } from "@/components/classwork/Collaborative"
import { ChatMessage } from "@/components/shared/ChatMessage"

export default function ClassworkPage({
  params,
}: {
  params: Promise<{ classworkId: string }>
}) {
  const { classworkId } = use(params)
  const searchParams = useSearchParams()
  const moduleId = searchParams.get("moduleId") ?? ""
  const router = useRouter()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [module, setModule] = useState<Module | null>(null)
  const [classwork, setClasswork] = useState<Classwork | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const studentId = getStudentId()
      if (!studentId) { router.push("/onboarding"); return }
      const p = await getStudent(studentId)
      if (!p) { router.push("/onboarding"); return }

      const m = p.curriculum.find((c) => c.moduleId === moduleId)
      if (!m || (m.status !== "active" && m.status !== "remedial")) {
        router.push("/dashboard"); return
      }

      const cw = (m.classworks ?? []).find((c) => c.classworkId === classworkId)
      if (!cw) { router.push("/dashboard"); return }

      setProfile(p)
      setModule(m)
      setClasswork(cw)
      setLoading(false)
    }
    load()
  }, [classworkId, moduleId, router])

  function handleComplete(score: number, feedback: string) {
    if (!module) return
    const seqIdx = module.currentSequenceIndex ?? 0
    const nextItem = (module.sequence ?? [])[seqIdx + 1]

    if (!nextItem || nextItem.kind === "module_assessment") {
      router.push(`/assess/${module.moduleId}`)
    } else if (nextItem.kind === "classwork") {
      router.push(`/classwork/${nextItem.id}?moduleId=${module.moduleId}`)
    } else if (nextItem.kind === "subtopic") {
      router.push(`/subtopic/${nextItem.id}`)
    } else {
      router.push("/dashboard")
    }
  }

  if (loading || !profile || !module || !classwork) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--text-muted)", fontFamily: "DM Mono, monospace", fontSize: "0.875rem" }}>
          Loading classwork...
        </p>
      </div>
    )
  }

  const classworkTypeLabel: Record<string, string> = {
    demonstrate_then_replicate: "📺 Demonstrate & Replicate",
    socratic: "💬 Guided Practice",
    collaborative: "🤝 Collaborative Session",
  }

  const seqIdx = module.currentSequenceIndex ?? 0
  const seqTotal = (module.sequence ?? []).length

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2rem", borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={() => router.push("/dashboard")}
          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem", fontFamily: "DM Mono, monospace" }}
        >
          ← Dashboard
        </button>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "var(--text-muted)" }}>
            {module.title} · Step {seqIdx + 1} of {seqTotal}
          </p>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "var(--accent)" }}>
            {classworkTypeLabel[classwork.classworkType] ?? "Classwork"}
          </p>
        </div>
        <div style={{ width: "80px" }} />
      </header>

      {/* Classwork content */}
      <div style={{ flex: 1, padding: "1.5rem 2rem", overflow: "auto" }}>
        <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
          {/* Title + prompt */}
          <div className="animate-fade-up" style={{ marginBottom: "1.5rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontFamily: "Playfair Display, serif", marginBottom: "0.75rem" }}>
              {classwork.title}
            </h1>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7 }}>
              <ChatMessage content={classwork.prompt} />
            </div>
          </div>

          {/* Render the appropriate classwork component */}
          {classwork.classworkType === "demonstrate_then_replicate" && (
            <DemonstrateReplicate
              classwork={classwork}
              studentId={profile.studentId}
              moduleId={module.moduleId}
              faculty={module.faculty}
              onComplete={handleComplete}
            />
          )}

          {classwork.classworkType === "socratic" && (
            <SocraticChat
              classwork={classwork}
              studentId={profile.studentId}
              moduleId={module.moduleId}
              onComplete={handleComplete}
            />
          )}

          {classwork.classworkType === "collaborative" && (
            <Collaborative
              classwork={classwork}
              studentId={profile.studentId}
              moduleId={module.moduleId}
              faculty={module.faculty}
              onComplete={handleComplete}
            />
          )}
        </div>
      </div>
    </main>
  )
}
