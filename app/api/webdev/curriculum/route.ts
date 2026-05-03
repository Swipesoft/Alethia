export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getWebDevCurriculum } from "@/lib/firestore-webdev"

export async function GET(req: NextRequest) {
  try {
    const curriculumId = req.nextUrl.searchParams.get("curriculumId")
    if (!curriculumId) return NextResponse.json({ error: "curriculumId required" }, { status: 400 })
    const curriculum = await getWebDevCurriculum(curriculumId)
    if (!curriculum) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ curriculum })
  } catch (err) {
    console.error("[webdev/curriculum]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
