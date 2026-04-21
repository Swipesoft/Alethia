import { NextRequest } from "next/server"
import { novita, GEMMA_MODEL } from "@/lib/novita"

export async function POST(req: NextRequest) {
  const { studentId, moduleId, classworkPrompt, message, history } = await req.json()

  const systemPrompt = `You are Athena, a Socratic tutor guiding a student through a practice task.

The task the student is working on: "${classworkPrompt}"

Your role is STRICTLY Socratic — you must:
- NEVER give the answer directly
- Ask probing questions that guide the student toward the solution
- Point out what they're doing right and gently redirect mistakes
- Break the problem into smaller questions if they're stuck
- Celebrate genuine progress with brief encouragement

If the student asks "just tell me the answer", refuse kindly and ask a question that gets them one step closer. The learning comes from the struggle.

Be warm, patient, and specific. Reference what the student actually wrote.

FORMATTING RULES (strictly follow these):
- Format ALL responses in markdown: use **bold** for key terms, \`inline code\` when referencing specific variable names or syntax, \`\`\`python code blocks when showing a short example, and - bullet lists for multi-part hints.
- Never instruct the student to put markdown headings or section labels inside their code editor — their code must remain clean and executable.
- Keep responses concise — one or two focused questions or hints per message.`

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...((history as Array<{ role: "user" | "assistant"; content: string }>) ?? []),
    { role: "user" as const, content: message },
  ]

  const stream = await novita.chat.completions.create({
    model: GEMMA_MODEL,
    messages,
    max_tokens: 512,
    temperature: 0.7,
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
