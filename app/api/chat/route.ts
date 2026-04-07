import { NextRequest } from "next/server"
import { novita, GEMMA_MODEL } from "@/lib/novita"
import { getStudent } from "@/lib/firestore"

export async function POST(req: NextRequest) {
  const { studentId, moduleId, message, history } = await req.json()

  const profile = await getStudent(studentId)
  const module = profile?.curriculum.find((m) => m.moduleId === moduleId)

  const systemPrompt = `You are Athena, an expert tutor for the ${module?.faculty ?? "general"} faculty.
You are currently teaching: "${module?.title ?? "a lesson"}".
Topic: ${module?.topic ?? "general knowledge"}.
Learning objectives: ${module?.objectives.join(", ") ?? "general understanding"}.

The student is asking questions about this topic. Be:
- Genuinely helpful and pedagogically sound
- Socratic when appropriate — guide them to answers rather than just giving them
- Concise but thorough
- Encouraging and warm
- Adaptive to their apparent level of understanding

Never break character. You are their personal tutor.`

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...((history as Array<{ role: "user" | "assistant"; content: string }>) ?? []),
    { role: "user" as const, content: message },
  ]

  const stream = await novita.chat.completions.create({
    model: GEMMA_MODEL,
    messages,
    max_tokens: 1024,
    temperature: 0.7,
    stream: true,
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
