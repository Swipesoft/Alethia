export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { generateDiagnostic } from "@/lib/archagent"

export async function POST(req: NextRequest) {
  try {
    const { faculty, goals } = await req.json()
    const result = await generateDiagnostic(faculty, goals)
    return NextResponse.json(result)
  } catch (err) {
    console.error("[diagnostic]", err)
    return NextResponse.json({ error: "Failed to generate diagnostic" }, { status: 500 })
  }
}