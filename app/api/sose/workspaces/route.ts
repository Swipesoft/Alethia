export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import type { SoSEWorkspace } from "@/lib/types-sose"

export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("studentId")
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 })

    const snap = await adminDb.collection("sose_workspaces")
      .where("studentId", "==", studentId)
      .get()
    const workspaces = snap.docs.map((d) => d.data() as SoSEWorkspace)
    return NextResponse.json({ workspaces })
  } catch (err) {
    console.error("[sose/workspaces]", err)
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 })
  }
}
