import { NextRequest, NextResponse } from "next/server"
import { Sandbox } from "e2b"
import { writeFilesToSandbox, runInSandbox } from "@/lib/e2b-client"

export const runtime = "nodejs"
export const maxDuration = 180

const ALLOWED_PREFIXES = [
  "python ", "python3 ",
  "node ", "npx ",
  "npm test", "npm run test", "npm install",
  "pytest", "python -m pytest",
  "python -m py_compile",
]

// POST /api/sose/run — execute a command against the student's workspace files
export async function POST(req: NextRequest) {
  const apiKey = process.env.E2B_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        stdout: "",
        stderr: "⚠ E2B_API_KEY is not configured.\n\nAdd it to your .env.local:\n  E2B_API_KEY=your_key_here\n\nGet a free key at https://e2b.dev",
        exitCode: 1,
        durationMs: 0,
      },
      { status: 200 }  // 200 so the terminal renders it, not a network error
    )
  }

  try {
    const { files, command } = await req.json()

    if (!files || !command) {
      return NextResponse.json({ error: "files and command required" }, { status: 400 })
    }

    // Safety: only allow known safe run commands
    const isAllowed = ALLOWED_PREFIXES.some((p) => command.trim().startsWith(p))
    if (!isAllowed) {
      return NextResponse.json({ error: "Command not permitted" }, { status: 403 })
    }

    const start = Date.now()
    // 3-minute sandbox lifetime — pip install + test run easily exceeds 60s
    const sandbox = await Sandbox.create({ apiKey, timeoutMs: 180_000 })

    try {
      await runInSandbox(sandbox, "mkdir -p /home/user/project")
      await writeFilesToSandbox(sandbox, files)

      const isPytest = command.includes("pytest")
      const isJest   = command.includes("jest") || command.includes("npx jest")
      const hasRequirements = "requirements.txt" in files && files["requirements.txt"].trim().length > 0
      const hasPackageJson  = "package.json" in files

      // Collect install output so students can see what was installed (or what failed)
      let installStdout = ""

      if (isPytest) {
        // Install pytest unconditionally (fast if already cached), then user deps separately
        const pytestResult = await runInSandbox(sandbox, "pip install pytest -q 2>&1", 90_000)
        if (pytestResult.exitCode !== 0) {
          installStdout += `[pip install pytest failed]\n${pytestResult.stdout}\n${pytestResult.stderr}\n\n`
        }
        if (hasRequirements) {
          const reqResult = await runInSandbox(sandbox, "pip install -r requirements.txt -q 2>&1", 90_000)
          if (reqResult.exitCode !== 0) {
            installStdout += `[requirements.txt install failed]\n${reqResult.stdout}\n${reqResult.stderr}\n\n`
          }
        }
      } else if (isJest) {
        if (!hasPackageJson) {
          await sandbox.files.write(
            "/home/user/project/package.json",
            JSON.stringify({ name: "workspace", version: "1.0.0", devDependencies: { jest: "^29.0.0" } })
          )
        }
        const npmResult = await runInSandbox(sandbox, "npm install --silent 2>&1", 90_000)
        if (npmResult.exitCode !== 0) {
          installStdout = `[npm install failed]\n${npmResult.stdout}\n${npmResult.stderr}\n\n`
        }
      } else if (hasRequirements) {
        const reqResult = await runInSandbox(sandbox, "pip install -r requirements.txt -q 2>&1", 60_000)
        if (reqResult.exitCode !== 0) {
          installStdout = `[pip install failed]\n${reqResult.stdout}\n${reqResult.stderr}\n\n`
        }
      }

      // Run the actual command — 90s should be enough for any test suite
      const result = await runInSandbox(sandbox, command, 90_000)
      return NextResponse.json({
        stdout: installStdout + (result.stdout || ""),
        stderr: result.stderr,
        exitCode: result.exitCode,
        durationMs: Date.now() - start,
      })
    } finally {
      await sandbox.kill().catch(() => {})
    }
  } catch (err) {
    console.error("[sose/run]", err)
    const message = err instanceof Error ? err.message : "Execution failed"
    return NextResponse.json(
      { stdout: "", stderr: message, exitCode: 1, durationMs: 0 },
      { status: 500 }
    )
  }
}
