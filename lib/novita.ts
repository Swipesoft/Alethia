import OpenAI from "openai"
import { z } from "zod"

console.log("NOVITA_API_KEY:", process.env.NOVITA_API_KEY ? "✓ loaded" : "✗ missing")

export const novita = new OpenAI({
  apiKey: process.env.NOVITA_API_KEY!,
  baseURL: "https://api.novita.ai/openai",
})

export const GEMMA_MODEL = "moonshotai/kimi-k2.5"

export type GemmaMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

// ─── Retry config ─────────────────────────────────────────────────────────────
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1500

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Strip markdown fences from LLM output ───────────────────────────────────
function cleanJSON(raw: string): string {
  return raw
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim()
}

// ─── Standard completion ──────────────────────────────────────────────────────
export async function gemmaComplete(
  messages: GemmaMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const response = await novita.chat.completions.create({
    model: GEMMA_MODEL,
    messages,
    max_tokens: options?.maxTokens ?? 4096,
    temperature: options?.temperature ?? 0.7,
  })
  return response.choices[0].message.content ?? ""
}

// ─── Zod-validated JSON completion with retry ─────────────────────────────────
// This is the core function. All LLM JSON calls go through here.
// On validation failure it feeds the Zod error back to the LLM and retries.
export async function gemmaJSON<T>(
  messages: GemmaMessage[],
  schema: z.ZodSchema<T>,
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  let lastError: unknown = null
  const conversationMessages = [...messages]

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await gemmaComplete(conversationMessages, {
        temperature: options?.temperature ?? 0.3,
        maxTokens: options?.maxTokens ?? 8192,
      })

      const cleaned = cleanJSON(raw)

      // Parse JSON first
      let parsed: unknown
      try {
        parsed = JSON.parse(cleaned)
      } catch (jsonErr) {
        throw new Error(`JSON parse failed: ${String(jsonErr)}\nRaw output was:\n${cleaned.slice(0, 300)}`)
      }

      // Validate with Zod schema
      const result = schema.safeParse(parsed)

      if (result.success) {
        if (attempt > 1) {
          console.log(`[gemmaJSON] Validation passed on attempt ${attempt}`)
        }
        return result.data
      }

      // Zod validation failed — format the error and retry with feedback
      const zodErrors = result.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message} (got ${issue.code})`)
        .join("\n")

      const errorMessage = `Your previous response failed validation. Fix these issues and return corrected JSON only:\n${zodErrors}\n\nYour previous response was:\n${cleaned.slice(0, 500)}`

      console.warn(`[gemmaJSON] Attempt ${attempt}/${MAX_RETRIES} failed validation:\n${zodErrors}`)

      // Append correction request to the conversation
      conversationMessages.push(
        { role: "assistant", content: raw },
        { role: "user", content: errorMessage }
      )

      lastError = result.error

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt) // exponential-ish backoff
      }
    } catch (err) {
      console.error(`[gemmaJSON] Attempt ${attempt}/${MAX_RETRIES} threw:`, err)
      lastError = err

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt)
      }
    }
  }

  throw new Error(
    `[gemmaJSON] All ${MAX_RETRIES} attempts failed. Last error: ${String(lastError)}`
  )
}

// ─── Unvalidated JSON (legacy fallback — avoid using this) ────────────────────
// Only use when you don't have a schema yet. Prefer gemmaJSON with a schema.
export async function gemmaJSONRaw<T>(
  messages: GemmaMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  const raw = await gemmaComplete(messages, {
    temperature: options?.temperature ?? 0.3,
    maxTokens: options?.maxTokens ?? 8192,
  })
  const cleaned = cleanJSON(raw)
  return JSON.parse(cleaned) as T
}

// ─── Streaming completion (for QA / Socratic / Collaborative chat) ────────────
export async function gemmaStream(
  messages: GemmaMessage[],
  onChunk: (chunk: string) => void,
  options?: { temperature?: number }
): Promise<void> {
  const stream = await novita.chat.completions.create({
    model: GEMMA_MODEL,
    messages,
    max_tokens: 2048,
    temperature: options?.temperature ?? 0.7,
    stream: true,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) onChunk(delta)
  }
}
