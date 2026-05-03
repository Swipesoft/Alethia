"use server"
import { z } from "zod"
import { gemmaJSON } from "./novita"
import { runInSandbox, writeFilesToSandbox } from "./e2b-client"
import { Sandbox } from "e2b"
import type {
  SoSELanguage, SoSEInterest, ProficiencyLevel,
  CurriculumItem, GeneratedAssignment,
} from "./types-sose"
import type { ComplexitySpec } from "./sose-calibrator"

// ─── Zod schemas ───────────────────────────────────────────────────────────────

const CurriculumSpecSchema = z.object({
  assignments: z.array(z.object({
    index:         z.number().int().min(0).max(3),
    title:         z.string().min(5).max(80),
    subtitle:      z.string().min(10).max(120),
    description:   z.string().min(50),
    objectives:    z.array(z.string().min(5)).min(3).max(5),
    difficulty:    z.enum(["beginner", "intermediate", "advanced", "expert"]),
    estimatedMins: z.number().int().min(20).max(120),
    keyTopics:     z.array(z.string()).min(2).max(5),
  })).length(4),
})

// Step A — just the file name + commands (tiny, extremely reliable)
const SkeletonSchema = z.object({
  entryFile:  z.string().min(3),
  installCmd: z.string().nullable().optional(),
  buildCmd:   z.string().min(3),
  testCmd:    z.string().min(3),
})

// Step B — reference solution only
const ReferenceSolutionSchema = z.object({
  referenceSolution: z.record(z.string()).refine(v => Object.keys(v).length >= 1),
})

// Step C — test files only
const TestFilesSchema = z.object({
  testFiles: z.record(z.string()).refine(v => Object.keys(v).length >= 1),
})

// Step D — metadata only
const MetadataSchema = z.object({
  brief:                 z.string().min(50),
  expectedBehaviourDesc: z.string().min(20),
  rubric:                z.string().min(50),
})

// Step E — starter stubs only
const StarterFilesSchema = z.object({
  starterFiles: z.record(z.string()).refine(v => Object.keys(v).length >= 1),
})

// Fix loop — regenerate code core only
const CodeCoreSchema = z.object({
  referenceSolution: z.record(z.string()).refine(v => Object.keys(v).length >= 1),
  testFiles:         z.record(z.string()).refine(v => Object.keys(v).length >= 1),
})

type Skeleton = z.infer<typeof SkeletonSchema>

// ─── Step 1: Curriculum specs ─────────────────────────────────────────────────

export async function generateCurriculumSpecs(
  language: SoSELanguage,
  interest: SoSEInterest,
  proficiencyLevel: ProficiencyLevel,
  itemSpecs: { itemIndex: number; spec: ComplexitySpec; hint: string; assignmentId: string }[]
): Promise<Omit<CurriculumItem, "status" | "score" | "codeGenerated">[]> {
  const langLabel = language === "python" ? "Python 3" : "Node.js (JavaScript)"
  const interestLabel = {
    backend:    "Backend development",
    data_ml:    "Data processing & ML",
    algorithms: "Algorithms & data structures",
    automation: "Automation & scripting",
  }[interest]

  const specDescriptions = itemSpecs.map((item) =>
    `Assignment ${item.itemIndex + 1}: difficulty=${item.spec.difficulty}, ` +
    `type=${item.spec.taskType}, focus="${item.hint}", ` +
    `estimatedMins=${item.spec.estimatedMins}`
  ).join("\n")

  const result = await gemmaJSON(
    [
      {
        role: "system",
        content: "You are Athena's curriculum designer. Design a progressive 4-assignment software engineering curriculum. Return valid JSON only.",
      },
      {
        role: "user",
        content: `Design a 4-assignment curriculum for a student with:
- Language: ${langLabel}
- Interest area: ${interestLabel}
- Starting proficiency: ${proficiencyLevel}

Assignment specifications to follow:
${specDescriptions}

The curriculum must be progressive — each assignment builds on the previous one.
Each assignment should feel like a real-world project relevant to ${interestLabel}.
Do NOT include web frameworks for assignments 0 and 1 unless the spec says "api".

Return ONLY this JSON (keyTopics must have AT MOST 5 items):
{
  "assignments": [
    {
      "index": 0,
      "title": "<concise project name>",
      "subtitle": "<one-line what they build>",
      "description": "<2-3 sentences describing the project and what they will learn>",
      "objectives": ["<verb + skill>", "..."],
      "difficulty": "<matches spec>",
      "estimatedMins": <number>,
      "keyTopics": ["<topic>", "<topic>", "<topic>"]
    },
    ... (4 total)
  ]
}`,
      },
    ],
    CurriculumSpecSchema,
    { temperature: 0.7 }
  )

  return result.assignments.map((a, i) => ({
    index:         i,
    assignmentId:  itemSpecs[i].assignmentId,
    title:         a.title,
    subtitle:      a.subtitle,
    description:   a.description,
    objectives:    a.objectives,
    difficulty:    a.difficulty,
    estimatedMins: a.estimatedMins,
    keyTopics:     a.keyTopics,
  }))
}

// ─── Step 2: Divide-and-conquer pipeline ──────────────────────────────────────

export type PipelineProgress = {
  step:  number
  total: number
  label: string
}

export async function generateAssignmentCodePipeline(
  item: CurriculumItem,
  language: SoSELanguage,
  interest: SoSEInterest,
  spec: ComplexitySpec,
  hint: string,
  onProgress: (p: PipelineProgress) => void
): Promise<Omit<GeneratedAssignment, "assignmentId" | "curriculumId" | "itemIndex" | "generatedAt">> {
  const TOTAL = 6
  const langLabel = language === "python" ? "Python 3" : "Node.js (JavaScript)"
  const libList   = language === "python" ? spec.allowedLibraries.python : spec.allowedLibraries.javascript
  const libNote   = libList.length > 0
    ? `Allowed external libraries: ${libList.join(", ")} (stdlib always allowed)`
    : "Use stdlib only — no external packages"

  // A: plan the file structure (tiny — very reliable)
  onProgress({ step: 1, total: TOTAL, label: "Planning assignment structure…" })
  const skeleton = await stepSkeleton(item, language, spec, hint, libNote)

  // B: write the reference solution
  onProgress({ step: 2, total: TOTAL, label: "Writing reference solution…" })
  const { referenceSolution } = await stepReferenceSolution(skeleton, item, language, spec, hint, libNote)

  // C: write the test suite
  onProgress({ step: 3, total: TOTAL, label: "Authoring test suite…" })
  const { testFiles } = await stepTestFiles(skeleton, referenceSolution, language, spec)

  // D: write metadata (brief / rubric)
  onProgress({ step: 4, total: TOTAL, label: "Writing assignment brief…" })
  const metadata = await stepMetadata(skeleton, referenceSolution, item)

  // E: create starter stubs
  onProgress({ step: 5, total: TOTAL, label: "Creating starter files…" })
  const rawStarters = await stepStarterFiles(referenceSolution, language)

  // F: E2B validation loop
  onProgress({ step: 6, total: TOTAL, label: "Validating in sandbox…" })
  const { validatedStarters, validatedTests } = await validateLoop(
    skeleton, referenceSolution, testFiles, rawStarters, language
  )

  // Assemble
  const readmeMd = buildReadme(item.title, item.subtitle, skeleton, metadata, language)
  const fullStarterFiles: Record<string, string> = {
    ...validatedStarters,
    ...validatedTests,
    "README.md": readmeMd,
  }

  if (language === "javascript" && !fullStarterFiles["package.json"]) {
    fullStarterFiles["package.json"] = JSON.stringify(
      {
        name:        item.title.toLowerCase().replace(/\s+/g, "-"),
        version:     "1.0.0",
        description: item.subtitle,
        main:        skeleton.entryFile,
        scripts:     { test: "jest --no-coverage --forceExit" },
        devDependencies: { jest: "^29.0.0" },
      },
      null, 2
    )
  }

  const checks = [
    { id: "syntax",  label: language === "python" ? "Python syntax valid" : "Node.js syntax valid", weight: 10, required: true },
    { id: "tests",   label: language === "python" ? "Pytest test suite" : "Jest test suite",        weight: 50 },
    { id: "quality", label: "Code structure & quality",                                             weight: 25 },
    { id: "design",  label: "Algorithm & data structures",                                          weight: 15 },
  ]

  return {
    title:         item.title,
    subtitle:      item.subtitle,
    description:   metadata.brief,
    difficulty:    item.difficulty,
    language,
    interest,
    estimatedMins: item.estimatedMins,
    objectives:    item.objectives,
    starterFiles:  fullStarterFiles,
    checks,
    grading: {
      installCmd:            skeleton.installCmd ?? undefined,
      buildCmd:              skeleton.buildCmd,
      testCmd:               skeleton.testCmd,
      entryFile:             skeleton.entryFile,
      expectedBehaviourDesc: metadata.expectedBehaviourDesc,
      rubric:                metadata.rubric,
    },
  }
}

// ─── Step A: Skeleton ─────────────────────────────────────────────────────────

async function stepSkeleton(
  item: CurriculumItem,
  language: SoSELanguage,
  spec: ComplexitySpec,
  hint: string,
  libNote: string
): Promise<Skeleton> {
  const langLabel = language === "python" ? "Python 3" : "Node.js (JavaScript)"

  return gemmaJSON(
    [
      {
        role: "system",
        content: "You are planning a programming assignment. Return valid JSON only. No markdown fences.",
      },
      {
        role: "user",
        content: `Plan the file names and commands for a programming assignment:
- Title: "${item.title}"
- Language: ${langLabel}
- Difficulty: ${spec.difficulty}
- Task type: ${spec.taskType}
- Focus: "${hint}"
- ${libNote}

RULES:
- Use a descriptive entryFile name based on the task (e.g. "calculator.py", "task_scheduler.py")
- Do NOT use "main.py" or "solution.js" unless the task is genuinely generic
- For Python: testCmd uses "test_" + entryFile (e.g. entryFile="calculator.py" → test file="test_calculator.py")
- For JS: testCmd uses entryFile.replace(".js", ".test.js")
- buildCmd must reference the exact entryFile

Return ONLY this JSON:
{
  "entryFile": "<descriptive name, e.g. calculator.py>",
  "installCmd": <"pip install X Y" | null>,
  "buildCmd": "<python -m py_compile calculator.py OR node -e \\"require('./solution')\\">",
  "testCmd": "<python -m pytest test_calculator.py -v -s --tb=short 2>&1 OR npx jest solution.test.js --no-coverage --forceExit 2>&1>"
}`,
      },
    ],
    SkeletonSchema,
    { temperature: 0.2, maxTokens: 512 }
  )
}

// ─── Step B: Reference solution ───────────────────────────────────────────────

async function stepReferenceSolution(
  skeleton: Skeleton,
  item: CurriculumItem,
  language: SoSELanguage,
  spec: ComplexitySpec,
  hint: string,
  libNote: string
): Promise<z.infer<typeof ReferenceSolutionSchema>> {
  const langLabel = language === "python" ? "Python 3" : "Node.js (JavaScript)"

  return gemmaJSON(
    [
      {
        role: "system",
        content: "You are a senior software engineer writing a complete, correct reference solution. Return valid JSON only. No markdown fences.",
      },
      {
        role: "user",
        content: `Write a complete reference solution for this programming assignment:
- Title: "${item.title}"
- Description: "${item.description}"
- Language: ${langLabel}
- Entry file name: "${skeleton.entryFile}"
- Difficulty: ${spec.difficulty}
- Required functions/methods: ${spec.numFunctions}
- Focus: "${hint}"
- ${libNote}

Write complete, correct, production-quality code. All logic must be fully implemented.

Return ONLY this JSON:
{
  "referenceSolution": {
    "${skeleton.entryFile}": "<complete correct implementation>"
  }
}`,
      },
    ],
    ReferenceSolutionSchema,
    { temperature: 0.2, maxTokens: 32768 }
  )
}

// ─── Extract top-level exported names from source code ───────────────────────
// Used to constrain test imports to only what actually exists.

function extractTopLevelNames(code: string, language: SoSELanguage): string[] {
  const names: string[] = []
  for (const line of code.split("\n")) {
    if (language === "python") {
      const fn  = line.match(/^def ([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/)
      const cls = line.match(/^class ([a-zA-Z_][a-zA-Z0-9_]*)[\s:(]/)
      const asg = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*[=:(]/)
      if (fn)  names.push(fn[1])
      else if (cls) names.push(cls[1])
      else if (asg && !asg[1].startsWith("__") && asg[1] !== "if") names.push(asg[1])
    } else {
      const fn  = line.match(/^(?:export\s+)?(?:async\s+)?function ([a-zA-Z_][a-zA-Z0-9_]*)/)
      const cls = line.match(/^(?:export\s+)?class ([a-zA-Z_][a-zA-Z0-9_]*)/)
      const cst = line.match(/^(?:export\s+)?const ([a-zA-Z_][a-zA-Z0-9_]*)\s*=/)
      if (fn)  names.push(fn[1])
      else if (cls) names.push(cls[1])
      else if (cst) names.push(cst[1])
    }
  }
  return [...new Set(names)]
}

// ─── Step C: Test files ───────────────────────────────────────────────────────

async function stepTestFiles(
  skeleton: Skeleton,
  referenceSolution: Record<string, string>,
  language: SoSELanguage,
  spec: ComplexitySpec
): Promise<z.infer<typeof TestFilesSchema>> {
  const moduleName   = skeleton.entryFile.replace(/\.[^.]+$/, "")
  const testFileName = language === "python"
    ? `test_${skeleton.entryFile}`
    : skeleton.entryFile.replace(/\.js$/, ".test.js")

  const refCode      = referenceSolution[skeleton.entryFile] ?? Object.values(referenceSolution)[0] ?? ""
  const exported     = extractTopLevelNames(refCode, language)
  const importNote   = exported.length > 0
    ? `You MUST import ONLY from this exact list of names that exist in the module:\n  ${exported.join(", ")}\n  Do NOT import anything not in this list — it will cause ImportError and zero tests will run.`
    : `Import only what you need from "${moduleName}".`

  const importExample = language === "python"
    ? `from ${moduleName} import ${exported.slice(0, 5).join(", ")}${exported.length > 5 ? ", ..." : ""}`
    : `const { ${exported.slice(0, 4).join(", ")} } = require('./${moduleName}')`

  return gemmaJSON(
    [
      {
        role: "system",
        content: "You are writing a comprehensive test suite. Return valid JSON only. No markdown fences.",
      },
      {
        role: "user",
        content: `Write a complete test suite for this reference solution.

REFERENCE SOLUTION (${skeleton.entryFile}):
${refCode}

REQUIREMENTS:
- Test file name: "${testFileName}"
- ${importNote}
- Example import line: ${importExample}
- CRITICAL: import from "${moduleName}" — NEVER from "main" or any other name
- Number of test cases: ${spec.numTestCases} (edge case depth: ${spec.edgeCaseDepth})
- Framework: ${language === "python" ? "pytest (use def test_*() functions — do NOT add if __name__ == '__main__' or explicit test calls)" : "Jest (use describe/it or test())"}
- All expected values must be mathematically/logically correct
- Every test MUST PASS when run against the reference solution above

Return ONLY this JSON:
{
  "testFiles": {
    "${testFileName}": "<complete test suite>"
  }
}`,
      },
    ],
    TestFilesSchema,
    { temperature: 0, maxTokens: 16384 }
  )
}

// ─── Step D: Metadata ─────────────────────────────────────────────────────────

async function stepMetadata(
  skeleton: Skeleton,
  referenceSolution: Record<string, string>,
  item: CurriculumItem
): Promise<z.infer<typeof MetadataSchema>> {
  const refCode = referenceSolution[skeleton.entryFile] ?? Object.values(referenceSolution)[0] ?? ""

  return gemmaJSON(
    [
      {
        role: "system",
        content: "You are writing assignment documentation for students. Return valid JSON only. No markdown fences.",
      },
      {
        role: "user",
        content: `Write documentation for this assignment:
- Title: "${item.title}"
- Subtitle: "${item.subtitle}"
- Entry file: "${skeleton.entryFile}"

Reference solution (for context):
${refCode.slice(0, 1200)}

Return ONLY this JSON:
{
  "brief": "## Overview\\n\\n<2-3 sentence intro>\\n\\n**Requirements:**\\n\\n- <req 1>\\n- <req 2>\\n- <req 3>\\n\\n**Example:**\\n\\n\`\`\`\\n<short example>\\n\`\`\`",
  "expectedBehaviourDesc": "<one paragraph describing what a correct solution does>",
  "rubric": "<grading rubric covering correctness, design, edge cases, code quality>"
}`,
      },
    ],
    MetadataSchema,
    { temperature: 0.3, maxTokens: 8192 }
  )
}

// ─── Step E: Starter files ────────────────────────────────────────────────────

async function stepStarterFiles(
  referenceSolution: Record<string, string>,
  language: SoSELanguage
): Promise<Record<string, string>> {
  const stubInstruction = language === "python"
    ? 'Replace every function body with `raise NotImplementedError("TODO: implement")`'
    : 'Replace every function body with `throw new Error("TODO: implement")`'

  const { starterFiles } = await gemmaJSON(
    [
      {
        role: "system",
        content: "Create starter skeleton files for a student assignment. Return valid JSON only. No markdown fences.",
      },
      {
        role: "user",
        content: `Given this reference solution, create skeleton starter files:
- Keep all imports exactly as-is
- Keep all function/class/method signatures exactly as-is
- ${stubInstruction}
- Do NOT include any working logic

Reference solution:
${JSON.stringify(referenceSolution)}

Return ONLY: { "starterFiles": { "<filename>": "<skeleton code>" } }`,
      },
    ],
    StarterFilesSchema,
    { temperature: 0, maxTokens: 32768 }
  )
  return starterFiles
}

// ─── E2B validation loop ──────────────────────────────────────────────────────

async function validateLoop(
  skeleton: Skeleton,
  referenceSolution: Record<string, string>,
  testFiles: Record<string, string>,
  starterFiles: Record<string, string>,
  language: SoSELanguage,
  attempt = 0
): Promise<{ validatedStarters: Record<string, string>; validatedTests: Record<string, string> }> {
  const E2B_KEY = process.env.E2B_API_KEY
  if (!E2B_KEY) {
    console.warn("[sose-generator] No E2B key — skipping validation")
    return { validatedStarters: starterFiles, validatedTests: testFiles }
  }

  const validationFiles = { ...referenceSolution, ...testFiles }

  try {
    const sandbox = await Sandbox.create({ apiKey: E2B_KEY, timeoutMs: 90_000 })
    try {
      await runInSandbox(sandbox, "mkdir -p /home/user/project")
      await writeFilesToSandbox(sandbox, validationFiles)

      if (skeleton.installCmd) {
        await runInSandbox(sandbox, skeleton.installCmd, 60_000)
      } else if (language === "python") {
        await runInSandbox(sandbox, "pip install pytest --quiet 2>&1", 45_000)
      } else {
        if (!validationFiles["package.json"]) {
          await sandbox.files.write(
            "/home/user/project/package.json",
            JSON.stringify({ name: "assignment", version: "1.0.0", devDependencies: { jest: "^29.0.0" } })
          )
        }
        await runInSandbox(sandbox, "npm install 2>&1", 60_000)
      }

      const result  = await runInSandbox(sandbox, skeleton.testCmd, 60_000)
      const output  = result.stdout + "\n" + result.stderr

      const allPass = (
        output.includes("passed") && !output.includes("failed") && !output.includes("error")
      ) || (
        output.includes("Tests:") && !output.includes("failed")
      )

      if (allPass) {
        console.log(`[sose-generator] ✓ Validation passed (attempt ${attempt + 1})`)
        return { validatedStarters: starterFiles, validatedTests: testFiles }
      }

      if (attempt < 3) {
        console.warn(`[sose-generator] Attempt ${attempt + 1} failed — regenerating code`)
        const { newRef, newTests, newStarters } = await regenerateCode(
          skeleton, referenceSolution, testFiles, output, language
        )
        return validateLoop(skeleton, newRef, newTests, newStarters, language, attempt + 1)
      }

      console.error("[sose-generator] All validation attempts failed — returning unvalidated starters")
      return { validatedStarters: starterFiles, validatedTests: testFiles }
    } finally {
      await sandbox.kill().catch(() => {})
    }
  } catch (err) {
    console.error("[sose-generator] E2B error:", err)
    return { validatedStarters: starterFiles, validatedTests: testFiles }
  }
}

// ─── Regenerate reference + tests together (tightly coupled) ──────────────────

async function regenerateCode(
  skeleton: Skeleton,
  previousRef: Record<string, string>,
  previousTests: Record<string, string>,
  failureOutput: string,
  language: SoSELanguage
): Promise<{ newRef: Record<string, string>; newTests: Record<string, string>; newStarters: Record<string, string> }> {
  const { referenceSolution: newRef, testFiles: newTests } = await gemmaJSON(
    [
      {
        role: "system",
        content: "Fix a failing test suite. Return valid JSON only. No markdown fences.",
      },
      {
        role: "user",
        content: `The test suite FAILED against the reference solution. Fix both so all tests pass.

ENTRY FILE: "${skeleton.entryFile}"
MODULE NAME: "${skeleton.entryFile.replace(/\.[^.]+$/, "")}"

PREVIOUS REFERENCE SOLUTION:
${JSON.stringify(previousRef)}

PREVIOUS TEST SUITE:
${JSON.stringify(previousTests)}

FAILURE OUTPUT:
${failureOutput.slice(0, 1500)}

Fix the reference solution and/or test assertions so ALL tests pass.
CRITICAL:
- Tests must import from "${skeleton.entryFile.replace(/\.[^.]+$/, "")}" — NEVER from "main"
- Tests may ONLY import names that are defined in the referenceSolution you return
- Do NOT import names that do not exist — ImportError kills all tests silently

Return ONLY: { "referenceSolution": { "<file>": "<code>" }, "testFiles": { "<testFile>": "<code>" } }`,
      },
    ],
    CodeCoreSchema,
    { temperature: 0, maxTokens: 65536 }
  )

  const newStarters = await stepStarterFiles(newRef, language)
  return { newRef, newTests, newStarters }
}

// ─── README builder ───────────────────────────────────────────────────────────

function buildReadme(
  title: string,
  subtitle: string,
  skeleton: Skeleton,
  metadata: z.infer<typeof MetadataSchema>,
  language: SoSELanguage
): string {
  const installSection = skeleton.installCmd
    ? `\n## Setup\n\n\`\`\`bash\n${skeleton.installCmd}\n\`\`\`\n`
    : ""

  // Strip trailing 2>&1, ensure -s flag for pytest so print() is visible
  const rawTestCmd = skeleton.testCmd.replace(/\s*2>&1\s*$/, "").trim()
  const pytestCmd  = rawTestCmd.includes(" -s") ? rawTestCmd : rawTestCmd + " -s"

  const testSection = language === "python"
    ? `\`\`\`bash\n${pytestCmd}\n\`\`\``
    : `\`\`\`bash\nnpm install\n${rawTestCmd}\n\`\`\``

  return `# ${title}

${subtitle}
${installSection}
## Running Tests

${testSection}

## Grading

| Criterion | Weight |
|-----------|--------|
| Syntax    | 10 pts |
| Tests     | 50 pts |
| Quality   | 25 pts |
| Design    | 15 pts |

> Submit your solution in \`${skeleton.entryFile}\`. Do **not** modify the test file.
`
}
