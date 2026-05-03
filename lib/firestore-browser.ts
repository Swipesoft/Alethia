"use client"
/**
 * lib/firestore-browser.ts
 * Browser-only Firestore functions (real-time listeners).
 * Import ONLY in client components — never in API routes.
 */
import { doc, onSnapshot, Unsubscribe } from "firebase/firestore"
import { db } from "./firebase"
import type { StudentProfile } from "./types"

export function subscribeToStudent(
  studentId: string,
  callback: (profile: StudentProfile | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "students", studentId), (snap) => {
    callback(snap.exists() ? (snap.data() as StudentProfile) : null)
  })
}