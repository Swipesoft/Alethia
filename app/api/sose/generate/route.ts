import { NextRequest } from "next/server"
import {
  getCurriculum,
  getGeneratedAssignment,
  saveGeneratedAssignment,
  updateCurriculumItem,
} from "@/lib/firestore-sose"
import { buildCurriculumSpecs } from "@/lib/sose-calibrator"
import { generateAssignmentCodePipeline } from "@/lib/sose-generator"
import type { GeneratedAssignment } from "@/lib/types-sose"

export const runtime    = "nodejs"
export const maxDuration = 600

// POST /api/sose/generate — streams SSE progress events while building an assignment
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  function makeStream(curriculumId: string, itemIndex: number) {
    return new ReadableStream({
      async start(controller) {
        const send = (event: string, data: object) => {
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            )
          } catch { /* controller already closed */ }
        }

        try {
          // Load curriculum
          const curriculum = await getCurriculum(curriculumId)
          if (!curriculum) { send("error", { message: "Curriculum not found" }); controller.close(); return }

          const item = curriculum.items[itemIndex]
          if (!item) { send("error", { message: "Item not found" }); controller.close(); return }

          // Already generated? Return immediately.
          if (item.codeGenerated) {
            const existing = await getGeneratedAssignment(item.assignmentId)
            if (existing) {
              send("done", { assignment: existing })
              controller.close()
              return
            }
          }

          const allSpecs = buildCurriculumSpecs(
            curriculum.proficiencyLevel,
            curriculum.interest,
            curriculum.language
          )
          const { spec, hint } = allSpecs[itemIndex] ?? allSpecs[0]

          // Run the pipeline — each step fires a progress event
          const generated = await generateAssignmentCodePipeline(
            item,
            curriculum.language,
            curriculum.interest,
            spec,
            hint,
            (p) => send("progress", p)
          )

          const assignment: GeneratedAssignment = {
            assignmentId: item.assignmentId,
            curriculumId,
            itemIndex,
            generatedAt:  Date.now(),
            ...generated,
          }

          await Promise.all([
            saveGeneratedAssignment(assignment),
            updateCurriculumItem(curriculumId, itemIndex, { codeGenerated: true }),
          ])

          send("done", { assignment })
        } catch (err) {
          console.error("[sose/generate]", err)
          const message = err instanceof Error ? err.message : "Generation failed"
          send("error", { message })
        } finally {
          controller.close()
        }
      },
    })
  }

  try {
    const { curriculumId, itemIndex } = await req.json() as {
      curriculumId: string
      itemIndex:    number
    }

    if (!curriculumId || itemIndex === undefined) {
      return new Response(
        JSON.stringify({ error: "curriculumId and itemIndex required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(makeStream(curriculumId, itemIndex), {
      headers: {
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (err) {
    console.error("[sose/generate] parse error", err)
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
}
