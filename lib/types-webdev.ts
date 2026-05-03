// ─── School of Web Development — Types ────────────────────────────────────────

export type WebDevFramework = "html_css_js" | "react" | "react_api"

export type WebDevInterest =
  | "ui_design"      // Beautiful layouts, animations, visual design
  | "interactivity"  // Forms, DOM manipulation, user events
  | "components"     // Reusable component systems
  | "data_driven"    // Fetching and displaying data from APIs

// ─── Onboarding ────────────────────────────────────────────────────────────────

export type WebDevMCQ = {
  id: string
  question: string
  options: [string, string, string, string]
  correctIndex: number
  explanation: string
  difficulty: "easy" | "medium" | "hard"
  topic: string
}

export type WebDevChallenge = {
  id: string
  title: string
  description: string
  framework: WebDevFramework
  starterFiles: Record<string, string>   // Sandpack file map
  requirements: string[]                 // Gemma checks these on review
  difficulty: "easy" | "medium"
}

// ─── Profile ───────────────────────────────────────────────────────────────────

export type WebDevProficiencyLevel = "beginner" | "intermediate" | "advanced" | "expert"

export type WebDevProfile = {
  studentId: string
  interest: WebDevInterest
  mcqScore: number
  practicalScore: number
  proficiencyScore: number
  proficiencyLevel: WebDevProficiencyLevel
  passed: boolean
  curriculumId: string | null
  createdAt: number
}

// ─── Curriculum ────────────────────────────────────────────────────────────────

export type WebDevItemStatus = "available" | "in_progress" | "complete" | "locked"

export type WebDevCurriculumItem = {
  index: number
  assignmentId: string
  title: string
  subtitle: string
  description: string
  framework: WebDevFramework
  difficulty: WebDevProficiencyLevel
  estimatedMins: number
  keyTopics: string[]
  objectives: string[]
  status: WebDevItemStatus
  score?: number
  codeGenerated: boolean
}

export type WebDevCurriculum = {
  curriculumId: string
  studentId: string
  interest: WebDevInterest
  proficiencyLevel: WebDevProficiencyLevel
  items: WebDevCurriculumItem[]
  createdAt: number
}

// ─── Pattern requirement (machine-checkable grading) ──────────────────────────

export type PatternCheck = {
  id: string
  label: string
  weight: number                                 // sum of all pattern weights = 40
  type:
    | "contains_tag"        // HTML element present e.g. "nav", "button"
    | "contains_attr"       // attribute present e.g. "class="active""
    | "contains_css_prop"   // CSS property e.g. "display: flex"
    | "contains_jsx"        // JSX pattern e.g. "<Header"
    | "contains_hook"       // React hook e.g. "useState"
    | "contains_fetch"      // fetch() or axios call
    | "contains_import"     // import statement for a module
    | "contains_text"       // literal string anywhere in files
  pattern: string           // substring or regex pattern
  targetFile?: string       // if set, only check this file
}

// ─── Generated assignment ──────────────────────────────────────────────────────

export type WebDevAssignment = {
  assignmentId: string
  curriculumId: string
  itemIndex: number
  title: string
  subtitle: string
  description: string        // full markdown brief
  framework: WebDevFramework
  difficulty: WebDevProficiencyLevel
  interest: WebDevInterest
  estimatedMins: number
  objectives: string[]
  starterFiles: Record<string, string>   // Sandpack file map
  patternChecks: PatternCheck[]          // machine-graded checks (40pts)
  gradingRubric: string                  // passed to Gemma for the 60pt review
  expectedBehaviourDesc: string
  generatedAt: number
}

// ─── Workspace ─────────────────────────────────────────────────────────────────

export type WebDevWorkspace = {
  workspaceId: string
  studentId: string
  assignmentId: string
  curriculumId: string
  files: Record<string, string>   // Sandpack file map, mutable by student
  status: "active" | "submitted"
  submissionId?: string
  createdAt: number
  updatedAt: number
}

// ─── Grading ───────────────────────────────────────────────────────────────────

export type WebDevCheckResult = {
  id: string
  label: string
  weight: number
  score: number
  passed: boolean
  feedback: string
}

export type WebDevSubmission = {
  submissionId: string
  studentId: string
  workspaceId: string
  assignmentId: string
  curriculumId: string
  status: "grading" | "complete" | "error"
  score?: number
  patternResults?: WebDevCheckResult[]
  qualityScore?: number
  designScore?: number
  summary?: string
  strengths?: string[]
  improvements?: string[]
  encouragement?: string
  submittedAt: number
  gradedAt?: number
  errorMessage?: string
}
