export const runtime = "nodejs"

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

  const systemPrompt = `You are Athena in collaborative mode — you are working ALONGSIDE the student, not just guiding them from the sidelines.

Task you're both working on: "${classworkPrompt}"
Faculty: ${faculty}
Student's current code/answer: ${currentCode ? `\n\`\`\`python\n${currentCode}\n\`\`\`` : "(nothing written yet)"}
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
Be specific, be practical, and always explain your reasoning.

FORMATTING RULES (strictly follow these):
- Format ALL your chat responses in markdown: use **bold** for emphasis, ### for section headings, - for bullet lists, and \`\`\`python code fences for any code snippets you show.
- The student has a SEPARATE code editor (right panel) that runs Python directly. Do NOT instruct the student to type markdown headings, section labels, or instructional text into their code editor — code must be clean and executable.
- When you want to show a code example or suggest a change, put the snippet in a \`\`\`python code fence in the CHAT. Never tell the student to copy markdown structure into their editor.
- Reference the student's code with \`inline backticks\` when discussing specific lines or variable names.`

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...((history as Array<{ role: "user" | "assistant"; content: string }>) ?? []),
    { role: "user" as const, content: message },
  ]

  const stream = await novita.chat.completions.create({
    model: GEMMA_MODEL,
    messages,
    max_tokens: 1536,
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
