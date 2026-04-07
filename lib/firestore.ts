import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"
import type { StudentProfile, Module, AnalyticsEvent, ArchAgentDecision } from "./types"

// ─── Students ─────────────────────────────────────────────────────────────────
export async function createStudent(profile: StudentProfile): Promise<void> {
  await setDoc(doc(db, "students", profile.studentId), {
    ...profile,
    enrolledAt: Date.now(),
    lastActiveAt: Date.now(),
  })
}

export async function getStudent(studentId: string): Promise<StudentProfile | null> {
  const snap = await getDoc(doc(db, "students", studentId))
  return snap.exists() ? (snap.data() as StudentProfile) : null
}

export async function updateStudent(
  studentId: string,
  updates: Partial<StudentProfile>
): Promise<void> {
  await updateDoc(doc(db, "students", studentId), {
    ...updates,
    lastActiveAt: Date.now(),
  })
}

export function subscribeToStudent(
  studentId: string,
  callback: (profile: StudentProfile | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "students", studentId), (snap) => {
    callback(snap.exists() ? (snap.data() as StudentProfile) : null)
  })
}

// ─── Curriculum / Modules ─────────────────────────────────────────────────────
export async function saveCurriculum(
  studentId: string,
  modules: Module[]
): Promise<void> {
  await updateDoc(doc(db, "students", studentId), {
    curriculum: modules,
    lastActiveAt: Date.now(),
  })
}

export async function updateModule(
  studentId: string,
  moduleId: string,
  updates: Partial<Module>
): Promise<void> {
  const snap = await getDoc(doc(db, "students", studentId))
  if (!snap.exists()) return
  const profile = snap.data() as StudentProfile
  const updatedCurriculum = profile.curriculum.map((m) =>
    m.moduleId === moduleId ? { ...m, ...updates } : m
  )
  await updateDoc(doc(db, "students", studentId), {
    curriculum: updatedCurriculum,
    lastActiveAt: Date.now(),
  })
}

export async function advanceModule(
  studentId: string,
  currentIndex: number
): Promise<void> {
  const snap = await getDoc(doc(db, "students", studentId))
  if (!snap.exists()) return
  const profile = snap.data() as StudentProfile
  const updatedCurriculum = profile.curriculum.map((m, i) => {
    if (i === currentIndex) return { ...m, status: "completed" as const }
    if (i === currentIndex + 1) return { ...m, status: "active" as const }
    return m
  })
  await updateDoc(doc(db, "students", studentId), {
    curriculum: updatedCurriculum,
    currentModuleIndex: currentIndex + 1,
    lastActiveAt: Date.now(),
  })
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function logEvent(event: Omit<AnalyticsEvent, "eventId">): Promise<void> {
  await addDoc(collection(db, "analytics"), {
    ...event,
    timestamp: Date.now(),
  })
}

// ─── ArchAgent Decisions ──────────────────────────────────────────────────────
export async function applyArchAgentDecision(
  studentId: string,
  decision: ArchAgentDecision,
  currentModuleIndex: number
): Promise<void> {
  const snap = await getDoc(doc(db, "students", studentId))
  if (!snap.exists()) return
  const profile = snap.data() as StudentProfile

  let updatedCurriculum = [...profile.curriculum]
  let nextIndex = currentModuleIndex

  switch (decision.action) {
    case "advance":
      updatedCurriculum = updatedCurriculum.map((m, i) => {
        if (i === currentModuleIndex) return { ...m, status: "completed" as const }
        if (i === currentModuleIndex + 1) return { ...m, status: "active" as const }
        return m
      })
      nextIndex = currentModuleIndex + 1
      break

    case "remedial":
      updatedCurriculum = updatedCurriculum.map((m, i) =>
        i === currentModuleIndex ? { ...m, status: "remedial" as const } : m
      )
      break

    case "restructure":
      if (decision.modifications) {
        decision.modifications.forEach((mod) => {
          updatedCurriculum = updatedCurriculum.map((m) =>
            m.moduleId === (mod as Module).moduleId ? { ...m, ...mod } : m
          )
        })
      }
      nextIndex = decision.nextModuleIndex ?? currentModuleIndex
      break

    case "complete":
      updatedCurriculum = updatedCurriculum.map((m, i) =>
        i === currentModuleIndex ? { ...m, status: "completed" as const } : m
      )
      break
  }

  await updateDoc(doc(db, "students", studentId), {
    curriculum: updatedCurriculum,
    currentModuleIndex: nextIndex,
    lastActiveAt: Date.now(),
  })

  await logEvent({
    studentId,
    type: "curriculum_restructured",
    timestamp: Date.now(),
    payload: { decision, previousIndex: currentModuleIndex, nextIndex },
    archagentDecision: decision.reason,
  })
}
