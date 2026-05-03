"use server"
/**
 * lib/firestore-sose.ts — SoSE Firestore CRUD
 * Uses Firebase Admin SDK (server-side only, REST transport, no gRPC issues).
 */
import { adminDb } from "./firebase-admin"
import { v4 as uuidv4 } from "uuid"
import type {
  SoSEWorkspace, SoSESubmission, SubmissionStatus,
  SoSEProfile, SoSECurriculum, CurriculumItem, GeneratedAssignment,
} from "./types-sose"

// ─── Workspaces ───────────────────────────────────────────────────────────────

export async function createWorkspace(
  studentId: string,
  assignmentId: string,
  starterFiles: Record<string, string>
): Promise<SoSEWorkspace> {
  const workspaceId = uuidv4()
  const workspace: SoSEWorkspace = {
    workspaceId, studentId, assignmentId,
    files: starterFiles, status: "active",
    createdAt: Date.now(), updatedAt: Date.now(),
  }
  await adminDb.collection("sose_workspaces").doc(workspaceId).set(workspace)
  return workspace
}

export async function getWorkspace(workspaceId: string): Promise<SoSEWorkspace | null> {
  const snap = await adminDb.collection("sose_workspaces").doc(workspaceId).get()
  return snap.exists ? (snap.data() as SoSEWorkspace) : null
}

export async function saveWorkspaceFiles(workspaceId: string, files: Record<string, string>): Promise<void> {
  await adminDb.collection("sose_workspaces").doc(workspaceId).update({ files, updatedAt: Date.now() })
}

export async function getExistingWorkspace(studentId: string, assignmentId: string): Promise<SoSEWorkspace | null> {
  const snap = await adminDb.collection("sose_workspaces")
    .where("studentId", "==", studentId)
    .get()
  if (snap.empty) return null
  const docs = snap.docs
    .map(d => d.data() as SoSEWorkspace)
    .filter(w => w.assignmentId === assignmentId)
  if (!docs.length) return null
  return docs.sort((a, b) => b.updatedAt - a.updatedAt)[0]
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export async function createSubmission(
  studentId: string, workspaceId: string, assignmentId: string
): Promise<SoSESubmission> {
  const submissionId = uuidv4()
  const submission: SoSESubmission = {
    submissionId, studentId, workspaceId, assignmentId,
    status: "queued", submittedAt: Date.now(),
  }
  await adminDb.collection("sose_submissions").doc(submissionId).set(submission)
  await adminDb.collection("sose_workspaces").doc(workspaceId).update({
    status: "submitted", submissionId, updatedAt: Date.now(),
  })
  return submission
}

export async function getSubmission(submissionId: string): Promise<SoSESubmission | null> {
  const snap = await adminDb.collection("sose_submissions").doc(submissionId).get()
  return snap.exists ? (snap.data() as SoSESubmission) : null
}

export async function updateSubmission(submissionId: string, updates: Partial<SoSESubmission>): Promise<void> {
  await adminDb.collection("sose_submissions").doc(submissionId).update(updates as Record<string, unknown>)
}

export async function getStudentSubmissions(studentId: string): Promise<SoSESubmission[]> {
  const snap = await adminDb.collection("sose_submissions")
    .where("studentId", "==", studentId)
    .get()
  return snap.docs.map(d => d.data() as SoSESubmission).sort((a, b) => b.submittedAt - a.submittedAt)
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function saveProfile(profile: SoSEProfile): Promise<void> {
  await adminDb.collection("sose_profiles").doc(profile.studentId).set(profile)
}

export async function getProfile(studentId: string): Promise<SoSEProfile | null> {
  const snap = await adminDb.collection("sose_profiles").doc(studentId).get()
  return snap.exists ? (snap.data() as SoSEProfile) : null
}

// ─── Curricula ────────────────────────────────────────────────────────────────

export async function saveCurriculum(curriculum: SoSECurriculum): Promise<void> {
  await adminDb.collection("sose_curricula").doc(curriculum.curriculumId).set(curriculum)
}

export async function getCurriculum(curriculumId: string): Promise<SoSECurriculum | null> {
  const snap = await adminDb.collection("sose_curricula").doc(curriculumId).get()
  return snap.exists ? (snap.data() as SoSECurriculum) : null
}

export async function getStudentCurriculum(studentId: string): Promise<SoSECurriculum | null> {
  const snap = await adminDb.collection("sose_curricula")
    .where("studentId", "==", studentId)
    .get()
  return snap.empty ? null : (snap.docs[0].data() as SoSECurriculum)
}

export async function updateCurriculumItem(
  curriculumId: string, itemIndex: number, updates: Partial<CurriculumItem>
): Promise<void> {
  const curr = await getCurriculum(curriculumId)
  if (!curr) return
  const items = curr.items.map(item => item.index === itemIndex ? { ...item, ...updates } : item)
  await adminDb.collection("sose_curricula").doc(curriculumId).update({ items })
}

// ─── Generated assignments ────────────────────────────────────────────────────

export async function saveGeneratedAssignment(a: GeneratedAssignment): Promise<void> {
  await adminDb.collection("sose_generated_assignments").doc(a.assignmentId).set(a)
}

export async function getGeneratedAssignment(assignmentId: string): Promise<GeneratedAssignment | null> {
  const snap = await adminDb.collection("sose_generated_assignments").doc(assignmentId).get()
  return snap.exists ? (snap.data() as GeneratedAssignment) : null
}
