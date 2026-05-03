export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import {
  createWebDevWorkspace, getWebDevWorkspace,
  getExistingWebDevWorkspace, saveWebDevWorkspaceFiles,
  getWebDevAssignment,
} from "@/lib/firestore-webdev"

export async function POST(req: NextRequest) {
  try {
    const { studentId, assignmentId, curriculumId } = await req.json()
    if (!studentId || !assignmentId || !curriculumId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const existing = await getExistingWebDevWorkspace(studentId, assignmentId)
    if (existing) return NextResponse.json({ workspace: existing, resumed: true })

    const assignment = await getWebDevAssignment(assignmentId)
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 })

    const workspace = await createWebDevWorkspace(
      studentId, assignmentId, curriculumId, assignment.starterFiles
    )
    return NextResponse.json({ workspace, resumed: false }, { status: 201 })
  } catch (err) {
    console.error("[webdev/workspace POST]", err)
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const workspace = await getWebDevWorkspace(id)
    if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ workspace })
  } catch (err) {
    console.error("[webdev/workspace GET]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { workspaceId, files } = await req.json()
    if (!workspaceId || !files) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    await saveWebDevWorkspaceFiles(workspaceId, files)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[webdev/workspace PATCH]", err)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
