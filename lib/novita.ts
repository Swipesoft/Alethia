import OpenAI from "openai"

console.log("NOVITA_API_KEY:", process.env.NOVITA_API_KEY ? "✓ loaded" : "✗ missing")
export const novita = new OpenAI({
  apiKey: process.env.NOVITA_API_KEY!,
  baseURL: "https://api.novita.ai/openai",
})

export const GEMMA_MODEL = "moonshotai/kimi-k2.5" //"google/gemma-4-31b-it"

export type GemmaMessage = {
  role: "system" | "user" | "assistant"
  content: string
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

// ─── JSON completion (structured output) ─────────────────────────────────────
export async function gemmaJSON<T>(
  messages: GemmaMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<T> {
  const raw = await gemmaComplete(messages, {
    temperature: options?.temperature ?? 0.3,
    maxTokens: options?.maxTokens ?? 8192,
  })

  // Strip markdown fences if present
  const cleaned = raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim()

  return JSON.parse(cleaned) as T
}

// ─── Streaming completion (for QA chat) ──────────────────────────────────────
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
