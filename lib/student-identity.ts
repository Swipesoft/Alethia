import { v4 as uuidv4 } from "uuid"

const STORAGE_KEY = "athena_student_id"

export function getOrCreateStudentId(): string {
  if (typeof window === "undefined") return ""
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) return existing
  const newId = uuidv4()
  localStorage.setItem(STORAGE_KEY, newId)
  return newId
}

export function getStudentId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(STORAGE_KEY)
}

export function clearStudentId(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}

export function hasExistingSession(): boolean {
  if (typeof window === "undefined") return false
  return !!localStorage.getItem(STORAGE_KEY)
}
