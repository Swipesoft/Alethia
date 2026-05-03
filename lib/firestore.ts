"use server"
/**
 * lib/firestore.ts — SoP Firestore CRUD
 * Uses Firebase Admin SDK (server-side only, REST transport, no gRPC issues).
 * subscribeToStudent uses the Web SDK (browser-only, real-time listener).
 */
import { adminDb } from "./firebase-admin"
import type {
  StudentProfile, Module, Subtopic, Classwork,
  ModuleSequenceItem, AnalyticsEvent, ArchAgentDecision, TopicScore,
} from "./types"

// ─── Students ─────────────────────────────────────────────────────────────────

export async function createStudent(profile: StudentProfile): Promise<void> {
  await adminDb.collection("students").doc(profile.studentId).set({
    ...profile, enrolledAt: Date.now(), lastActiveAt: Date.now(),
  })
}

export async function getStudent(studentId: string): Promise<StudentProfile | null> {
  const snap = await adminDb.collection("students").doc(studentId).get()
  return snap.exists ? (snap.data() as StudentProfile) : null
}

export async function updateStudent(studentId: string, updates: Partial<StudentProfile>): Promise<void> {
  await adminDb.collection("students").doc(studentId).update({ ...updates, lastActiveAt: Date.now() })
}

// ─── Module CRUD ──────────────────────────────────────────────────────────────

export async function saveCurriculum(studentId: string, modules: Module[]): Promise<void> {
  await adminDb.collection("students").doc(studentId).update({ curriculum: modules, lastActiveAt: Date.now() })
}

export async function updateModule(studentId: string, moduleId: string, updates: Partial<Module>): Promise<void> {
  const snap = await adminDb.collection("students").doc(studentId).get()
  if (!snap.exists) return
  const profile = snap.data() as StudentProfile
  const updatedCurriculum = profile.curriculum.map((m) => m.moduleId === moduleId ? { ...m, ...updates } : m)
  await adminDb.collection("students").doc(studentId).update({ curriculum: updatedCurriculum, lastActiveAt: Date.now() })
}

// ─── Subtopic operations ──────────────────────────────────────────────────────

export async function updateSubtopic(studentId: string, moduleId: string, subtopicId: string, updates: Partial<Subtopic>): Promise<void> {
  const snap = await adminDb.collection("students").doc(studentId).get()
  if (!snap.exists) return
  const profile = snap.data() as StudentProfile
  const updatedCurriculum = profile.curriculum.map((m) => {
    if (m.moduleId !== moduleId) return m
    return { ...m, subtopics: (m.subtopics ?? []).map((s) => s.subtopicId === subtopicId ? { ...s, ...updates } : s) }
  })
  await adminDb.collection("students").doc(studentId).update({ curriculum: updatedCurriculum, lastActiveAt: Date.now() })
}

export async function completeSubtopicAndAdvanceSequence(studentId: string, moduleId: string, subtopicId: string): Promise<void> {
  const snap = await adminDb.collection("students").doc(studentId).get()
  if (!snap.exists) return
  const profile = snap.data() as StudentProfile
  const updatedCurriculum = profile.curriculum.map((m) => {
    if (m.moduleId !== moduleId) return m
    const currentSeqIdx = m.currentSequenceIndex ?? 0
    const nextSeqIdx = currentSeqIdx + 1
    const updatedSubtopics = (m.subtopics ?? []).map((s) =>
      s.subtopicId === subtopicId ? { ...s, status: "completed" as const, completedAt: Date.now() } : s)
    const updatedSequence = (m.sequence ?? []).map((item, i) => {
      if (i === currentSeqIdx) return { ...item, status: "completed" as const }
      if (i === nextSeqIdx)    return { ...item, status: "active" as const }
      return item
    })
    return { ...m, subtopics: updatedSubtopics, sequence: updatedSequence, currentSequenceIndex: nextSeqIdx }
  })
  await adminDb.collection("students").doc(studentId).update({ curriculum: updatedCurriculum, lastActiveAt: Date.now() })
}

// ─── Classwork operations ─────────────────────────────────────────────────────

export async function updateClasswork(studentId: string, moduleId: string, classworkId: string, updates: Partial<Classwork>): Promise<void> {
  const snap = await adminDb.collection("students").doc(studentId).get()
  if (!snap.exists) return
  const profile = snap.data() as StudentProfile
  const updatedCurriculum = profile.curriculum.map((m) => {
    if (m.moduleId !== moduleId) return m
    return { ...m, classworks: (m.classworks ?? []).map((cw) => cw.classworkId === classworkId ? { ...cw, ...updates } : cw) }
  })
  await adminDb.collection("students").doc(studentId).update({ curriculum: updatedCurriculum, lastActiveAt: Date.now() })
}

export async function completeClassworkAndAdvanceSequence(
  studentId: string, moduleId: string, classworkId: string,
  score: number, feedback: string, studentAnswer: string
): Promise<void> {
  const snap = await adminDb.collection("students").doc(studentId).get()
  if (!snap.exists) return
  const profile = snap.data() as StudentProfile
  const updatedCurriculum = profile.curriculum.map((m) => {
    if (m.moduleId !== moduleId) return m
    const currentSeqIdx = m.currentSequenceIndex ?? 0
    const nextSeqIdx = currentSeqIdx + 1
    const updatedClassworks = (m.classworks ?? []).map((cw) =>
      cw.classworkId === classworkId
        ? { ...cw, status: "completed" as const, score, feedback, studentAnswer, completedAt: Date.now() }
        : cw)
    const updatedSequence = (m.sequence ?? []).map((item, i) => {
      if (i === currentSeqIdx) return { ...item, status: "completed" as const }
      if (i === nextSeqIdx)    return { ...item, status: "active" as const }
      return item
    })
    return { ...m, classworks: updatedClassworks, sequence: updatedSequence, currentSequenceIndex: nextSeqIdx }
  })
  await adminDb.collection("students").doc(studentId).update({ curriculum: updatedCurriculum, lastActiveAt: Date.now() })
}

export async function unlockModuleAssessment(studentId: string, moduleId: string): Promise<void> {
  const snap = await adminDb.collection("students").doc(studentId).get()
  if (!snap.exists) return
  const profile = snap.data() as StudentProfile
  const updatedCurriculum = profile.curriculum.map((m) => {
    if (m.moduleId !== moduleId) return m
    const currentSeqIdx = m.currentSequenceIndex ?? 0
    const nextSeqIdx = currentSeqIdx + 1
    const updatedSequence = (m.sequence ?? []).map((item, i) => {
      if (i === currentSeqIdx) return { ...item, status: "completed" as const }
      if (i === nextSeqIdx)    return { ...item, status: "active" as const }
      return item
    })
    return { ...m, sequence: updatedSequence, currentSequenceIndex: nextSeqIdx }
  })
  await adminDb.collection("students").doc(studentId).update({ curriculum: updatedCurriculum, lastActiveAt: Date.now() })
}

// ─── Competency model ─────────────────────────────────────────────────────────

export async function updateCompetencyModel(studentId: string, topic: string, score: number): Promise<void> {
  const snap = await adminDb.collection("students").doc(studentId).get()
  if (!snap.exists) return
  const profile = snap.data() as StudentProfile
  const existing = profile.competencyModel?.[topic]
  const updated: TopicScore = {
    score, confidence: score / 100,
    attempts: (existing?.attempts ?? 0) + 1,
    lastAttemptAt: Date.now(),
  }
  await adminDb.collection("students").doc(studentId).update({
    [`competencyModel.${topic}`]: updated, lastActiveAt: Date.now(),
  })
}

export async function advanceModule(studentId: string, currentIndex: number): Promise<void> {
  const snap = await adminDb.collection("students").doc(studentId).get()
  if (!snap.exists) return
  const profile = snap.data() as StudentProfile
  const updatedCurriculum = profile.curriculum.map((m, i) => {
    if (i === currentIndex)     return { ...m, status: "completed" as const, completedAt: Date.now() }
    if (i === currentIndex + 1) return { ...m, status: "active" as const }
    return m
  })
  await adminDb.collection("students").doc(studentId).update({
    curriculum: updatedCurriculum, currentModuleIndex: currentIndex + 1, lastActiveAt: Date.now(),
  })
}

// ─── Remedial ─────────────────────────────────────────────────────────────────

export async function applyRemedialSequence(
  studentId: string, moduleId: string,
  remedialSubtopics: Subtopic[], collaborativeClasswork: Classwork, remedialSequence: ModuleSequenceItem[]
): Promise<void> {
  const snap = await adminDb.collection("students").doc(studentId).get()
  if (!snap.exists) return
  const profile = snap.data() as StudentProfile
  const updatedCurriculum = profile.curriculum.map((m) => {
    if (m.moduleId !== moduleId) return m
    return {
      ...m, status: "remedial" as const,
      subtopics:  [...(m.subtopics  ?? []), ...remedialSubtopics],
      classworks: [...(m.classworks ?? []), collaborativeClasswork],
      sequence:   [...(m.sequence   ?? []), ...remedialSequence],
      remedialAttempts: (m.remedialAttempts ?? 0) + 1,
      weakSubtopicIndices: remedialSubtopics.map((s) => s.index),
    }
  })
  await adminDb.collection("students").doc(studentId).update({ curriculum: updatedCurriculum, lastActiveAt: Date.now() })
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function logEvent(event: Omit<AnalyticsEvent, "eventId">): Promise<void> {
  await adminDb.collection("analytics").add({ ...event, timestamp: Date.now() })
}

// ─── ArchAgent Decisions ──────────────────────────────────────────────────────

export async function applyArchAgentDecision(
  studentId: string, decision: ArchAgentDecision, currentModuleIndex: number
): Promise<void> {
  const snap = await adminDb.collection("students").doc(studentId).get()
  if (!snap.exists) return
  const profile = snap.data() as StudentProfile
  let updatedCurriculum = [...profile.curriculum]
  let nextIndex = currentModuleIndex

  switch (decision.action) {
    case "advance":
      updatedCurriculum = updatedCurriculum.map((m, i) => {
        if (i === currentModuleIndex)     return { ...m, status: "completed" as const, completedAt: Date.now() }
        if (i === currentModuleIndex + 1) return { ...m, status: "active" as const }
        return m
      })
      nextIndex = currentModuleIndex + 1
      break
    case "remedial":
      updatedCurriculum = updatedCurriculum.map((m, i) =>
        i === currentModuleIndex ? { ...m, status: "remedial" as const, archagetNotes: decision.reason } : m)
      break
    case "restructure":
      if (decision.modifications) {
        decision.modifications.forEach((mod) => {
          updatedCurriculum = updatedCurriculum.map((m) =>
            m.moduleId === (mod as Module).moduleId ? { ...m, ...mod } : m)
        })
      }
      nextIndex = decision.nextModuleIndex ?? currentModuleIndex
      break
    case "complete":
      updatedCurriculum = updatedCurriculum.map((m, i) =>
        i === currentModuleIndex ? { ...m, status: "completed" as const, completedAt: Date.now() } : m)
      break
  }

  await adminDb.collection("students").doc(studentId).update({
    curriculum: updatedCurriculum, currentModuleIndex: nextIndex, lastActiveAt: Date.now(),
  })
  await logEvent({
    studentId, type: "curriculum_restructured", timestamp: Date.now(),
    payload: { decision, previousIndex: currentModuleIndex, nextIndex },
    archagentDecision: decision.reason,
  })
}
