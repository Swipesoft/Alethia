// ─── School of Software Engineering — Types ───────────────────────────────────

export type SoSELanguage = "python" | "javascript" | "typescript"

// ─── Assignment ───────────────────────────────────────────────────────────────

export type GradingCheck = {
  id: string
  label: string
  weight: number            // 0–100, all weights sum to 100
  required?: boolean        // if true and fails → skip downstream checks
}

export type AssignmentDifficulty = "beginner" | "intermediate" | "advanced"

export type SoSEAssignment = {
  assignmentId: string
  title: string
  subtitle: string
  description: string       // markdown supported
  difficulty: AssignmentDifficulty
  language: SoSELanguage
  estimatedMins: number
  objectives: string[]
  starterFiles: Record<string, string>   // { "main.py": "# starter..." }
  checks: GradingCheck[]
  // Grading config passed to the grading agent
  grading: {
    installCmd?: string      // e.g. "pip install -r requirements.txt"
    buildCmd?: string        // e.g. "python -m py_compile main.py"
    testCmd?: string         // e.g. "python -m pytest test_main.py -v --tb=short"
    entryFile: string        // main file to reference in feedback
    expectedBehaviourDesc: string   // describes what a correct solution does
    rubric: string          // detailed rubric for Gemma synthesis
  }
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export type WorkspaceStatus = "active" | "submitted"

export type SoSEWorkspace = {
  workspaceId: string
  studentId: string
  assignmentId: string
  files: Record<string, string>   // { filename: content }
  status: WorkspaceStatus
  createdAt: number
  updatedAt: number
  submissionId?: string
}

// ─── Grading ──────────────────────────────────────────────────────────────────

export type CheckResult = {
  id: string
  label: string
  weight: number
  score: number             // 0–weight (not 0–100)
  passed: boolean
  feedback: string
  raw?: string              // raw output (stdout/stderr)
}

export type SubmissionStatus = "queued" | "grading" | "complete" | "error"

export type SoSESubmission = {
  submissionId: string
  studentId: string
  workspaceId: string
  assignmentId: string
  status: SubmissionStatus
  score?: number            // 0–100 final score
  checkResults?: CheckResult[]
  summary?: string          // Gemma synthesis paragraph
  strengths?: string[]
  improvements?: string[]
  encouragement?: string
  submittedAt: number
  gradedAt?: number
  errorMessage?: string
}

// ─── Run result (code execution in workspace) ─────────────────────────────────

export type RunResult = {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  error?: string
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export type SoSEInterest = "backend" | "data_ml" | "algorithms" | "automation"

export type MCQQuestion = {
  id: string
  question: string
  options: [string, string, string, string]
  correctIndex: number
  explanation: string
  difficulty: "easy" | "medium" | "hard"
  topic: string
}

export type CodingChallenge = {
  id: string
  title: string
  description: string
  starterCode: string
  testCode: string        // appended to student answer — runs in Judge0
  difficulty: "easy" | "medium"
}

// ─── Student profile ──────────────────────────────────────────────────────────

export type ProficiencyLevel = "beginner" | "intermediate" | "advanced" | "expert"

export type SoSEProfile = {
  studentId: string
  language: SoSELanguage
  interest: SoSEInterest
  mcqScore: number          // 0–100
  practicalScore: number    // 0–100
  proficiencyScore: number  // weighted: mcq*0.4 + practical*0.6
  proficiencyLevel: ProficiencyLevel
  passed: boolean
  curriculumId: string | null
  createdAt: number
}

// ─── Curriculum ───────────────────────────────────────────────────────────────

export type CurriculumItemStatus = "available" | "in_progress" | "complete" | "locked"

export type CurriculumItem = {
  index: number
  assignmentId: string
  title: string
  subtitle: string
  description: string
  objectives: string[]
  difficulty: ProficiencyLevel
  estimatedMins: number
  keyTopics: string[]
  status: CurriculumItemStatus
  score?: number
  codeGenerated: boolean
}

export type SoSECurriculum = {
  curriculumId: string
  studentId: string
  language: SoSELanguage
  interest: SoSEInterest
  proficiencyLevel: ProficiencyLevel
  items: CurriculumItem[]
  createdAt: number
}

// ─── Generated assignment ─────────────────────────────────────────────────────

export type GeneratedAssignment = {
  assignmentId: string
  curriculumId: string
  itemIndex: number
  title: string
  subtitle: string
  description: string
  difficulty: ProficiencyLevel
  language: SoSELanguage
  interest: SoSEInterest
  estimatedMins: number
  objectives: string[]
  starterFiles: Record<string, string>
  checks: { id: string; label: string; weight: number; required?: boolean }[]
  grading: {
    installCmd?: string
    buildCmd?: string
    testCmd?: string
    entryFile: string
    expectedBehaviourDesc: string
    rubric: string
  }
  generatedAt: number
}
