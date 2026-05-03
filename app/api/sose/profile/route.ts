export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getProfile } from "@/lib/firestore-sose"

export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("studentId")
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 })
    const profile = await getProfile(studentId)
    return NextResponse.json({ profile })
  } catch (err) {
    console.error("[sose/profile]", err)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}
