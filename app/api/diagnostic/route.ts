import { NextRequest, NextResponse } from "next/server"
import { generateDiagnostic } from "@/lib/archagent"

export async function POST(req: NextRequest) {
  const { faculty, goals } = await req.json()
  const result = await generateDiagnostic(faculty, goals)
  return NextResponse.json(result)
}