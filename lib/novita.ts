import OpenAI from "openai"
import { z } from "zod"

console.log("NOVITA_API_KEY:", process.env.NOVITA_API_KEY ? "✓ loaded" : "✗ missing")

// Thrown when the model exhausts its token budget before emitting output.
// Retrying with the same budget will always fail — callers should escalate maxTokens.
export class TokenBudgetError extends Error {
  constructor(public readonly maxTokensUsed: number) {
    super(`Model hit token budget (finish_reason=length, max_tokens=${maxTokensUsed})`)
    this.name = "TokenBudgetError"
  }
}

export const novita = new OpenAI({
  apiKey: process.env.NOVITA_API_KEY!,
  baseURL: "https://api.novita.ai/openai/v1",
})

export const GEMMA_MODEL = "moonshotai/kimi-k2.6"

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
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const response = await novita.chat.completions.create({
    model: GEMMA_MODEL,
    messages,
    max_tokens: options?.maxTokens ?? 16384,
    temperature: options?.temperature ?? 0.7,
  })

  const choice = response.choices[0]

  // Detect refusals
  if ((choice.message as { refusal?: string | null }).refusal) {
    throw new Error(`Model refused: ${(choice.message as { refusal?: string }).refusal}`)
  }

  const content = choice.message.content

  if (!content || content.trim() === "") {
    // Empty content + length = reasoning model burned all tokens thinking before emitting output.
    // Throw a typed error so the retry loop can escalate the budget instead of repeating.
    if (choice.finish_reason === "length") {
      throw new TokenBudgetError(options?.maxTokens ?? 16384)
    }
    throw new Error(
      `Model returned empty content (finish_reason=${choice.finish_reason ?? "unknown"}). ` +
      `This may be a content filter, rate limit, or context overflow.`
    )
  }

  // Content present but truncated — warn and return what we have (caller may still parse it)
  if (choice.finish_reason === "length") {
    console.warn(
      `[gemmaComplete] Output truncated (finish_reason=length, max_tokens=${options?.maxTokens ?? 16384})`
    )
  }

  return content
}

// ─── Zod-validated JSON completion with retry ─────────────────────────────────
export async function gemmaJSON<T>(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  schema: z.ZodSchema<T>,
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  let lastError: unknown = null
  const conversationMessages = [...messages]
  let currentMaxTokens = options?.maxTokens ?? 16384

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await gemmaComplete(conversationMessages, {
        temperature: options?.temperature ?? 0.3,
        maxTokens: currentMaxTokens,
      })

      const cleaned = cleanJSON(raw)

      let parsed: unknown
      try {
        parsed = JSON.parse(cleaned)
      } catch (jsonErr) {
        throw new Error(`JSON parse failed: ${String(jsonErr)}\nRaw output was:\n${cleaned.slice(0, 300)}`)
      }

      const result = schema.safeParse(parsed)

      if (result.success) {
        if (attempt > 1) {
          console.log(`[gemmaJSON] Validation passed on attempt ${attempt}`)
        }
        return result.data
      }

      const zodErrors = result.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message} (got ${issue.code})`)
        .join("\n")

      const errorMessage =
        `Your previous response failed validation. Fix these issues and return corrected JSON only:\n${zodErrors}\n\nYour previous response was:\n${cleaned.slice(0, 500)}`

      console.warn(`[gemmaJSON] Attempt ${attempt}/${MAX_RETRIES} failed validation:\n${zodErrors}`)

      conversationMessages.push(
        { role: "assistant", content: raw },
        { role: "user", content: errorMessage }
      )

      lastError = result.error

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt)
      }
    } catch (err) {
      lastError = err

      // Token budget exhausted — double the limit and retry immediately (no delay).
      // Retrying with the same budget would fail deterministically.
      if (err instanceof TokenBudgetError && attempt < MAX_RETRIES) {
        currentMaxTokens = Math.min(currentMaxTokens * 2, 131072)
        console.warn(`[gemmaJSON] Token budget hit — escalating to ${currentMaxTokens} tokens and retrying (attempt ${attempt + 1}/${MAX_RETRIES})`)
        continue
      }

      console.error(`[gemmaJSON] Attempt ${attempt}/${MAX_RETRIES} threw:`, err)

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
export async function gemmaJSONRaw<T>(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  const raw = await gemmaComplete(messages, {
    temperature: options?.temperature ?? 0.3,
    maxTokens: options?.maxTokens ?? 16384,
  })
  const cleaned = cleanJSON(raw)
  return JSON.parse(cleaned) as T
}

// ─── Streaming completion (for QA / Socratic / Collaborative chat) ────────────
export async function gemmaStream(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  onChunk: (chunk: string) => void,
  options?: { temperature?: number }
): Promise<void> {
  const stream = await novita.chat.completions.create({
    model: GEMMA_MODEL,
    messages,
    max_tokens: 4096,
    temperature: options?.temperature ?? 0.7,
    stream: true,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) onChunk(delta)
  }
}

export type GemmaMessage = {
  role: "system" | "user" | "assistant"
  content: string
}
