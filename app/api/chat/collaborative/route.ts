import { NextRequest } from "next/server"
import { novita, GEMMA_MODEL } from "@/lib/novita"

export async function POST(req: NextRequest) {
  const {
    studentId,
    moduleId,
    classworkPrompt,
    currentCode,
    executionResult,
    message,
    history,
    faculty,
  } = await req.json()

  const systemPrompt = `You are Athena in collaborative mode — you are working ALONGSIDE the student, 
not just guiding them from the sidelines.

Task you're both working on: "${classworkPrompt}"
Faculty: ${faculty}
Student's current code/answer: ${currentCode ? `\n\`\`\`\n${currentCode}\n\`\`\`` : "(nothing written yet)"}
${executionResult ? `Last execution result: ${JSON.stringify(executionResult)}` : ""}

In this mode you should:
- Be an active co-worker, not just a guide
- Say things like "Let's try this approach..." or "I'd write the next part like..."
- When the student shares code, review it line by line with them
- If there are errors in their execution, walk through the error message together
- Build toward the solution incrementally — don't dump the whole answer at once
- If they went wrong, explain WHY and show the corrected version
- This is a REMEDIAL session — be extra patient and thorough

Think of yourself as a senior engineer pair-programming with a junior.
Be specific, be practical, and always explain your reasoning.`

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...((history as Array<{ role: "user" | "assistant"; content: string }>) ?? []),
    { role: "user" as const, content: message },
  ]

  const stream = await novita.chat.completions.create({
    model: GEMMA_MODEL,
    messages,
    max_tokens: 768,
    temperature: 0.6,
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
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
