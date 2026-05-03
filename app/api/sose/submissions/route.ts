export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getStudentSubmissions } from "@/lib/firestore-sose"

// GET /api/sose/submissions?studentId=xxx
export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("studentId")
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 })
    const submissions = await getStudentSubmissions(studentId)
    return NextResponse.json({ submissions })
  } catch (err) {
    console.error("[sose/submissions]", err)
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 })
  }
}
