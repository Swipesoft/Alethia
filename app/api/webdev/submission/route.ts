export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { getWebDevSubmission } from "@/lib/firestore-webdev"

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const submission = await getWebDevSubmission(id)
    if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ submission })
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
