// Firestore doesn't support nested arrays — flatten them before saving
export function sanitizeForFirestore(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (Array.isArray(item)) {
        return JSON.stringify(item)
      }
      return sanitizeForFirestore(item)
    })
  }
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k,
        sanitizeForFirestore(v),
      ])
    )
  }
  return obj
}
