export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createWorkspace, getExistingWorkspace, getWorkspace, saveWorkspaceFiles, getGeneratedAssignment } from "@/lib/firestore-sose"
import { getAssignment as getStaticAssignment } from "@/data/sose-assignments"

// POST /api/sose/workspace — create (or resume) a workspace for an assignment
export async function POST(req: NextRequest) {
  try {
    const { studentId, assignmentId } = await req.json()

    if (!studentId || !assignmentId) {
      return NextResponse.json({ error: "studentId and assignmentId required" }, { status: 400 })
    }

    // Check static assignments first, then Firestore generated assignments
    const staticAssignment = getStaticAssignment(assignmentId)
    let starterFilesToUse = staticAssignment?.starterFiles

    if (!staticAssignment) {
      // Try fetching a generated assignment from Firestore
      const generated = await getGeneratedAssignment(assignmentId)
      if (!generated) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
      }
      starterFilesToUse = generated.starterFiles
    }

    const assignment = staticAssignment

    // Check if a workspace already exists for this student + assignment
    const existing = await getExistingWorkspace(studentId, assignmentId)
    if (existing) {
      return NextResponse.json({ workspace: existing, resumed: true })
    }

    // Create a fresh workspace seeded with the assignment's starter files
    const workspace = await createWorkspace(studentId, assignmentId, starterFilesToUse ?? {})
    return NextResponse.json({ workspace, resumed: false }, { status: 201 })
  } catch (err) {
    console.error("[sose/workspace POST]", err)
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 })
  }
}

// PATCH /api/sose/workspace — save files
export async function PATCH(req: NextRequest) {
  try {
    const { workspaceId, files } = await req.json()
    if (!workspaceId || !files) {
      return NextResponse.json({ error: "workspaceId and files required" }, { status: 400 })
    }
    await saveWorkspaceFiles(workspaceId, files)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[sose/workspace PATCH]", err)
    return NextResponse.json({ error: "Failed to save files" }, { status: 500 })
  }
}

// GET /api/sose/workspace?id=xxx — fetch workspace by ID
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const workspace = await getWorkspace(id)
    if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Return assignment metadata alongside workspace so the page doesn't need a second fetch
    const assignment =
      getStaticAssignment(workspace.assignmentId) ??
      (await getGeneratedAssignment(workspace.assignmentId)) ??
      null

    return NextResponse.json({ workspace, assignment })
  } catch (err) {
    console.error("[sose/workspace GET]", err)
    return NextResponse.json({ error: "Failed to fetch workspace" }, { status: 500 })
  }
}

// ─── GET /api/sose/workspace/generated?assignmentId=xxx ──────────────────────
// Fetches a generated assignment from Firestore (used by workspace page).
// Note: this is a secondary export on the same route file — accessed via query param.
