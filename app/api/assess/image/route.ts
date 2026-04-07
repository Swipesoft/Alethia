import { NextRequest, NextResponse } from "next/server"
import { novita, GEMMA_MODEL } from "@/lib/novita"

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType, systemPrompt, userPrompt } = await req.json()

    if (!base64 || !mimeType) {
      return NextResponse.json({ error: "base64 image and mimeType required" }, { status: 400 })
    }

    // Validate mime type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 })
    }

    // Gemma 4-31B multimodal call — image + text in same turn
    const response = await novita.chat.completions.create({
      model: GEMMA_MODEL,
      max_tokens: 1024,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    } as Parameters<typeof novita.chat.completions.create>[0])

    const raw = response.choices[0].message.content ?? ""
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()

    let result: { score: number; feedback: string; observations?: string[] }

    try {
      result = JSON.parse(cleaned)
    } catch {
      // If JSON parse fails, extract score heuristically and return raw as feedback
      const scoreMatch = raw.match(/score["\s:]+(\d+)/i)
      result = {
        score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
        feedback: raw.slice(0, 800),
      }
    }

    // Clamp score to 0-100
    result.score = Math.max(0, Math.min(100, result.score))

    return NextResponse.json(result)
  } catch (err) {
    console.error("[assess/image]", err)
    return NextResponse.json({ error: "VLM grading failed" }, { status: 500 })
  }
}
