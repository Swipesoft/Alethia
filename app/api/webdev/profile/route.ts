export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getWebDevProfile } from "@/lib/firestore-webdev"

export async function GET(req: NextRequest) {
  try {
    const studentId = req.nextUrl.searchParams.get("studentId")
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 })
    const profile = await getWebDevProfile(studentId)
    return NextResponse.json({ profile })
  } catch (err) {
    console.error("[webdev/profile]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
