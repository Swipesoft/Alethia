"use server"
/**
 * lib/firestore-webdev.ts — SoWD Firestore CRUD
 * Uses Firebase Admin SDK (server-side only, REST transport, no gRPC issues).
 */
import { adminDb } from "./firebase-admin"
import { v4 as uuidv4 } from "uuid"
import type {
  WebDevProfile, WebDevCurriculum, WebDevCurriculumItem,
  WebDevAssignment, WebDevWorkspace, WebDevSubmission,
} from "./types-webdev"

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function saveWebDevProfile(profile: WebDevProfile): Promise<void> {
  await adminDb.collection("webdev_profiles").doc(profile.studentId).set(profile)
}

export async function getWebDevProfile(studentId: string): Promise<WebDevProfile | null> {
  const snap = await adminDb.collection("webdev_profiles").doc(studentId).get()
  return snap.exists ? (snap.data() as WebDevProfile) : null
}

// ─── Curricula ────────────────────────────────────────────────────────────────

export async function saveWebDevCurriculum(c: WebDevCurriculum): Promise<void> {
  await adminDb.collection("webdev_curricula").doc(c.curriculumId).set(c)
}

export async function getWebDevCurriculum(curriculumId: string): Promise<WebDevCurriculum | null> {
  const snap = await adminDb.collection("webdev_curricula").doc(curriculumId).get()
  return snap.exists ? (snap.data() as WebDevCurriculum) : null
}

export async function getStudentWebDevCurriculum(studentId: string): Promise<WebDevCurriculum | null> {
  const snap = await adminDb.collection("webdev_curricula").where("studentId", "==", studentId).get()
  return snap.empty ? null : (snap.docs[0].data() as WebDevCurriculum)
}

export async function updateWebDevCurriculumItem(
  curriculumId: string, itemIndex: number, updates: Partial<WebDevCurriculumItem>
): Promise<void> {
  const curr = await getWebDevCurriculum(curriculumId)
  if (!curr) return
  const items = curr.items.map(item => item.index === itemIndex ? { ...item, ...updates } : item)
  await adminDb.collection("webdev_curricula").doc(curriculumId).update({ items })
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export async function saveWebDevAssignment(a: WebDevAssignment): Promise<void> {
  await adminDb.collection("webdev_assignments").doc(a.assignmentId).set(a)
}

export async function getWebDevAssignment(assignmentId: string): Promise<WebDevAssignment | null> {
  const snap = await adminDb.collection("webdev_assignments").doc(assignmentId).get()
  return snap.exists ? (snap.data() as WebDevAssignment) : null
}

// ─── Workspaces ───────────────────────────────────────────────────────────────

export async function createWebDevWorkspace(
  studentId: string, assignmentId: string, curriculumId: string,
  starterFiles: Record<string, string>
): Promise<WebDevWorkspace> {
  const workspaceId = uuidv4()
  const workspace: WebDevWorkspace = {
    workspaceId, studentId, assignmentId, curriculumId,
    files: starterFiles, status: "active",
    createdAt: Date.now(), updatedAt: Date.now(),
  }
  await adminDb.collection("webdev_workspaces").doc(workspaceId).set(workspace)
  return workspace
}

export async function getWebDevWorkspace(workspaceId: string): Promise<WebDevWorkspace | null> {
  const snap = await adminDb.collection("webdev_workspaces").doc(workspaceId).get()
  return snap.exists ? (snap.data() as WebDevWorkspace) : null
}

export async function getExistingWebDevWorkspace(studentId: string, assignmentId: string): Promise<WebDevWorkspace | null> {
  const snap = await adminDb.collection("webdev_workspaces").where("studentId", "==", studentId).get()
  if (snap.empty) return null
  const docs = snap.docs.map(d => d.data() as WebDevWorkspace).filter(w => w.assignmentId === assignmentId)
  if (!docs.length) return null
  return docs.sort((a, b) => b.updatedAt - a.updatedAt)[0]
}

export async function saveWebDevWorkspaceFiles(workspaceId: string, files: Record<string, string>): Promise<void> {
  await adminDb.collection("webdev_workspaces").doc(workspaceId).update({ files, updatedAt: Date.now() })
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export async function createWebDevSubmission(
  studentId: string, workspaceId: string, assignmentId: string, curriculumId: string
): Promise<WebDevSubmission> {
  const submissionId = uuidv4()
  const sub: WebDevSubmission = {
    submissionId, studentId, workspaceId, assignmentId, curriculumId,
    status: "grading", submittedAt: Date.now(),
  }
  await adminDb.collection("webdev_submissions").doc(submissionId).set(sub)
  await adminDb.collection("webdev_workspaces").doc(workspaceId).update({
    status: "submitted", submissionId, updatedAt: Date.now(),
  })
  return sub
}

export async function getWebDevSubmission(submissionId: string): Promise<WebDevSubmission | null> {
  const snap = await adminDb.collection("webdev_submissions").doc(submissionId).get()
  return snap.exists ? (snap.data() as WebDevSubmission) : null
}

export async function updateWebDevSubmission(submissionId: string, updates: Partial<WebDevSubmission>): Promise<void> {
  await adminDb.collection("webdev_submissions").doc(submissionId).update(updates as Record<string, unknown>)
}

export async function getStudentWebDevSubmissions(studentId: string): Promise<WebDevSubmission[]> {
  const snap = await adminDb.collection("webdev_submissions").where("studentId", "==", studentId).get()
  return snap.docs.map(d => d.data() as WebDevSubmission).sort((a, b) => b.submittedAt - a.submittedAt)
}
