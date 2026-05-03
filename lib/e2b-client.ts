import { Sandbox } from "e2b"

const E2B_API_KEY = process.env.E2B_API_KEY

// ─── Sandbox helpers ──────────────────────────────────────────────────────────

/** Write all workspace files into the sandbox /home/user/project/ directory. */
export async function writeFilesToSandbox(
  sandbox: Sandbox,
  files: Record<string, string>
): Promise<void> {
  for (const [filename, content] of Object.entries(files)) {
    await sandbox.files.write(`/home/user/project/${filename}`, content)
  }
}

/** Run a shell command inside the sandbox. Returns stdout, stderr, exitCode. */
export async function runInSandbox(
  sandbox: Sandbox,
  cmd: string,
  timeoutMs = 30_000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await sandbox.commands.run(cmd, {
      cwd: "/home/user/project",
      timeoutMs,
    })
    return {
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: result.exitCode ?? 0,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      stdout: "",
      stderr: message,
      exitCode: 1,
    }
  }
}

// ─── Grading pipeline ─────────────────────────────────────────────────────────

export type SandboxGradingInput = {
  files: Record<string, string>
  installCmd?: string
  buildCmd?: string
  testCmd?: string
}

export type SandboxGradingOutput = {
  installResult?: { stdout: string; stderr: string; exitCode: number }
  buildResult?: { stdout: string; stderr: string; exitCode: number }
  testResult?: { stdout: string; stderr: string; exitCode: number }
  durationMs: number
}

/**
 * Provision a fresh E2B sandbox, write files, run install/build/test,
 * collect all outputs, then kill the sandbox. Returns raw results for the
 * grading agents to interpret.
 */
export async function runGradingPipeline(
  input: SandboxGradingInput
): Promise<SandboxGradingOutput> {
  if (!E2B_API_KEY) {
    throw new Error("E2B_API_KEY is not set. Add it to your .env.local file.")
  }

  const start = Date.now()
  const sandbox = await Sandbox.create({
    apiKey: E2B_API_KEY,
    timeoutMs: 300_000,   // 5-minute hard limit for grading
  })

  try {
    // 1. Write all workspace files
    await runInSandbox(sandbox, "mkdir -p /home/user/project")
    await writeFilesToSandbox(sandbox, input.files)

    // 2. Install dependencies
    let installResult: SandboxGradingOutput["installResult"]
    // Always ensure pytest is available for Python projects
    const isPython = !input.testCmd?.startsWith("npx") && !input.testCmd?.startsWith("npm")
    const baseInstall = isPython ? "pip install pytest --quiet 2>&1" : null

    if (input.installCmd) {
      // Run the assignment-specific install (e.g. pip install pytest, npm install)
      installResult = await runInSandbox(sandbox, input.installCmd, 60_000)
    } else if (baseInstall) {
      // Fallback: ensure pytest exists even if no installCmd was specified
      installResult = await runInSandbox(sandbox, baseInstall, 60_000)
    }

    // 3. Build / compile check
    let buildResult: SandboxGradingOutput["buildResult"]
    if (input.buildCmd) {
      buildResult = await runInSandbox(sandbox, input.buildCmd, 30_000)
    }

    // 4. Run tests
    let testResult: SandboxGradingOutput["testResult"]
    if (input.testCmd) {
      testResult = await runInSandbox(sandbox, input.testCmd, 60_000)
    }

    return {
      installResult,
      buildResult,
      testResult,
      durationMs: Date.now() - start,
    }
  } finally {
    await sandbox.kill().catch(() => {/* best-effort kill */})
  }
}

// ─── Workspace run (interactive, short-lived) ─────────────────────────────────

/**
 * Run a single command against the student's current workspace files.
 * Used by the "Run" button in the workspace IDE.
 */
export async function runWorkspaceCommand(
  files: Record<string, string>,
  command: string
): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number }> {
  if (!E2B_API_KEY) {
    throw new Error("E2B_API_KEY is not set.")
  }

  const start = Date.now()
  const sandbox = await Sandbox.create({
    apiKey: E2B_API_KEY,
    timeoutMs: 60_000,
  })

  try {
    await runInSandbox(sandbox, "mkdir -p /home/user/project")
    await writeFilesToSandbox(sandbox, files)
    const result = await runInSandbox(sandbox, command, 30_000)
    return { ...result, durationMs: Date.now() - start }
  } finally {
    await sandbox.kill().catch(() => {})
  }
}
