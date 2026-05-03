
export function sanitizeForFirestore(obj: unknown): unknown {
  if (obj === null) return null
  if (obj === undefined) return null

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => {
        if (Array.isArray(item)) return JSON.stringify(item)
        return sanitizeForFirestore(item)
      })
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value === undefined) continue
      result[key] = sanitizeForFirestore(value)
    }
    return result
  }

  return obj
}