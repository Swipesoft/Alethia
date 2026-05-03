export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getWebDevAssignment } from "@/lib/firestore-webdev"

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const assignment = await getWebDevAssignment(id)
    if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ assignment })
  } catch (err) {
    console.error("[webdev/assignment]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
