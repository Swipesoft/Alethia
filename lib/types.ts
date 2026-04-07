// ─── Faculty ──────────────────────────────────────────────────────────────────
export type Faculty =
  | "programming"
  | "medicine"
  | "stem"
  | "law"
  | "humanities"
  | "arts"

export const FACULTY_META: Record<Faculty, { label: string; icon: string; color: string; description: string }> = {
  programming: {
    label: "Programming",
    icon: "⌨️",
    color: "#6ee7b7",
    description: "Python, algorithms, software engineering",
  },
  medicine: {
    label: "Medicine",
    icon: "🩺",
    color: "#f9a8d4",
    description: "Clinical reasoning, anatomy, pharmacology",
  },
  stem: {
    label: "STEM",
    icon: "∑",
    color: "#93c5fd",
    description: "Mathematics, physics, engineering",
  },
  law: {
    label: "Law",
    icon: "⚖️",
    color: "#fcd34d",
    description: "Case law, constitutional theory, jurisprudence",
  },
  humanities: {
    label: "Humanities",
    icon: "📜",
    color: "#d8b4fe",
    description: "History, philosophy, literature, culture",
  },
  arts: {
    label: "Arts",
    icon: "🎨",
    color: "#fdba74",
    description: "Visual art, design, creative critique",
  },
}

// ─── Competency Model ─────────────────────────────────────────────────────────
export type TopicScore = {
  score: number         // 0–100
  confidence: number    // 0–1
  attempts: number
  lastAttemptAt: number
}

// ─── Curriculum & Modules ─────────────────────────────────────────────────────
export type ModuleStatus = "locked" | "active" | "completed" | "remedial"

export type AssessmentType =
  | "code_execution"    // Judge0
  | "mcq"               // Multiple choice
  | "essay"             // Written response, LLM graded
  | "image_upload"      // VLM graded (arts/medicine)
  | "github_actions"    // Complex builds

export type AssessmentEnvironment =
  | "judge0"
  | "jupyter"
  | "essay_box"
  | "image_canvas"
  | "github_ci"

export type Module = {
  moduleId: string
  index: number
  title: string
  topic: string
  faculty: Faculty
  objectives: string[]
  status: ModuleStatus
  assessmentType: AssessmentType
  assessmentEnvironment: AssessmentEnvironment
  estimatedDurationMins: number
  lectureGenerated: boolean
  lectureJSON?: LectureJSON
  score?: number
  completedAt?: number
  archagetNotes?: string
}

// ─── Lecture JSON (Gemma Output Schema) ───────────────────────────────────────
export type DiagramVariant =
  | "call_stack"
  | "sorting_viz"
  | "tree_traversal"
  | "organ_highlight"
  | "drug_pathway"
  | "vector_field"
  | "wave_function"
  | "timeline"
  | "quote_reveal"
  | "color_theory"
  | "bar_chart"
  | "line_chart"

export type LectureBeat =
  | { type: "title_card"; heading: string; subheading: string; durationMs: number }
  | { type: "concept_reveal"; text: string; emphasis: string[]; durationMs: number }
  | { type: "code_walkthrough"; language: string; code: string; highlights: number[][]; explanation: string; durationMs: number }
  | { type: "animated_diagram"; variant: DiagramVariant; data: unknown; caption: string; durationMs: number }
  | { type: "equation"; latex: string; explanation: string; durationMs: number }
  | { type: "clinical_case"; scenario: string; question: string; imageUrl?: string; durationMs: number }
  | { type: "graph_plot"; x: number[]; y: number[]; xLabel: string; yLabel: string; title: string; chartType: "line" | "bar" | "scatter"; durationMs: number }
  | { type: "comparison_table"; headers: string[]; rows: string[][]; durationMs: number }
  | { type: "summary_card"; points: string[]; durationMs: number }

export type LectureJSON = {
  title: string
  faculty: Faculty
  topic: string
  totalDurationMs: number
  narration: string[]           // one string per beat
  beats: LectureBeat[]
}

// ─── Student Profile ──────────────────────────────────────────────────────────
export type LearnerPreferences = {
  pace: "slow" | "normal" | "fast"
  learningStyle: "visual" | "textual" | "hands-on"
  goals: string
}

export type StudentProfile = {
  studentId: string
  name: string
  faculty: Faculty
  enrolledAt: number
  lastActiveAt: number
  currentModuleIndex: number
  competencyModel: Record<string, TopicScore>
  curriculum: Module[]
  preferences: LearnerPreferences
  diagnosticScore?: number
}

// ─── Analytics Events ─────────────────────────────────────────────────────────
export type AnalyticsEventType =
  | "lecture_completed"
  | "assessment_submitted"
  | "qa_asked"
  | "module_advanced"
  | "remedial_triggered"
  | "curriculum_restructured"

export type AnalyticsEvent = {
  eventId: string
  studentId: string
  type: AnalyticsEventType
  moduleId?: string
  timestamp: number
  payload: Record<string, unknown>
  archagentDecision?: string
}

// ─── Assessment ───────────────────────────────────────────────────────────────
export type AssessmentQuestion = {
  questionId: string
  prompt: string
  type: AssessmentType
  rubric?: string
  expectedOutput?: string
  starterCode?: string
  options?: string[]              // for MCQ
  correctIndex?: number           // for MCQ
}

export type AssessmentResult = {
  questionId: string
  studentAnswer: string
  score: number                   // 0–100
  feedback: string
  passedAt: number
}

// ─── ArchAgent Decision ───────────────────────────────────────────────────────
export type ArchAgentDecision = {
  action: "advance" | "remedial" | "restructure" | "complete"
  reason: string
  nextModuleIndex?: number
  modifications?: Partial<Module>[]
}
