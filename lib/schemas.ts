import { z } from "zod"

// ─── Shared primitives ────────────────────────────────────────────────────────

export const FacultySchema = z.enum([
  "programming",
  "medicine",
  "stem",
  "law",
  "humanities",
  "arts",
])

export const AssessmentTypeSchema = z.enum([
  "code_execution",
  "mcq",
  "essay",
  "image_upload",
  "github_actions",
])

export const AssessmentEnvironmentSchema = z.enum([
  "judge0",
  "jupyter",
  "essay_box",
  "image_canvas",
  "github_ci",
])

export const ModuleStatusSchema = z.enum([
  "locked",
  "active",
  "completed",
  "remedial",
])

export const ClassworkTypeSchema = z.enum([
  "demonstrate_then_replicate",
  "socratic",
  "collaborative",
])

export const DiagramVariantSchema = z.enum([
  "call_stack",
  "sorting_viz",
  "tree_traversal",
  "organ_highlight",
  "drug_pathway",
  "vector_field",
  "wave_function",
  "timeline",
  "quote_reveal",
  "color_theory",
  "bar_chart",
  "line_chart",
])

// ─── Lecture Beat Schemas ─────────────────────────────────────────────────────

export const TitleCardBeatSchema = z.object({
  type: z.literal("title_card"),
  heading: z.string().min(1).default("Untitled"),
  subheading: z.string().default(""),
  durationMs: z.number().positive().default(4000),
})

export const ConceptRevealBeatSchema = z.object({
  type: z.literal("concept_reveal"),
  text: z.string().min(1).default(""),
  emphasis: z.array(z.string()).default([]),
  durationMs: z.number().positive().default(7000),
})

export const CodeWalkthroughBeatSchema = z.object({
  type: z.literal("code_walkthrough"),
  language: z.string().default("python"),
  code: z.string().default(""),
  // Handles both nested arrays and stringified arrays from Firestore
  highlights: z.array(z.union([
    z.array(z.number()),
    z.string().transform((s) => {
      try { return JSON.parse(s) as number[] } catch { return [] }
    }),
  ])).default([]),
  explanation: z.string().default(""),
  durationMs: z.number().positive().default(10000),
})

export const AnimatedDiagramBeatSchema = z.object({
  type: z.literal("animated_diagram"),
  variant: DiagramVariantSchema.default("call_stack"),
  data: z.unknown().default({}),
  caption: z.string().default(""),
  durationMs: z.number().positive().default(8000),
})

export const EquationBeatSchema = z.object({
  type: z.literal("equation"),
  latex: z.string().default(""),
  explanation: z.string().default(""),
  durationMs: z.number().positive().default(6000),
})

export const ClinicalCaseBeatSchema = z.object({
  type: z.literal("clinical_case"),
  scenario: z.string().default(""),
  question: z.string().default(""),
  imageUrl: z.string().optional(),
  durationMs: z.number().positive().default(8000),
})

export const GraphPlotBeatSchema = z.object({
  type: z.literal("graph_plot"),
  x: z.array(z.number()).default([]),
  y: z.array(z.number()).default([]),
  xLabel: z.string().default("x"),
  yLabel: z.string().default("y"),
  title: z.string().default(""),
  chartType: z.enum(["line", "bar", "scatter"]).default("line"),
  durationMs: z.number().positive().default(7000),
})

export const ComparisonTableBeatSchema = z.object({
  type: z.literal("comparison_table"),
  headers: z.array(z.string()).default([]),
  // Handles both array of arrays and array of stringified arrays
  rows: z.array(z.union([
    z.array(z.string()),
    z.string().transform((s) => {
      try { return JSON.parse(s) as string[] } catch { return [s] }
    }),
  ])).default([]),
  durationMs: z.number().positive().default(6000),
})

export const SummaryCardBeatSchema = z.object({
  type: z.literal("summary_card"),
  points: z.array(z.string()).default([]),
  durationMs: z.number().positive().default(6000),
})

export const LectureBeatSchema = z.discriminatedUnion("type", [
  TitleCardBeatSchema,
  ConceptRevealBeatSchema,
  CodeWalkthroughBeatSchema,
  AnimatedDiagramBeatSchema,
  EquationBeatSchema,
  ClinicalCaseBeatSchema,
  GraphPlotBeatSchema,
  ComparisonTableBeatSchema,
  SummaryCardBeatSchema,
])

export const LectureJSONSchema = z.object({
  title: z.string().min(1).default("Lecture"),
  faculty: FacultySchema.default("programming"),
  topic: z.string().min(1).default(""),
  totalDurationMs: z.number().positive().default(60000),
  narration: z.array(z.string()).default([]),
  beats: z.array(LectureBeatSchema).min(1),
})

// ─── Diagnostic ───────────────────────────────────────────────────────────────

export const DiagnosticQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  type: z.literal("mcq").default("mcq"),
  options: z.array(z.string()).min(2).max(6),
  correctIndex: z.number().int().min(0),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
})

export const DiagnosticSchema = z.object({
  questions: z.array(DiagnosticQuestionSchema).min(1).max(10),
})

// ─── Curriculum ───────────────────────────────────────────────────────────────

export const RawCurriculumModuleSchema = z.object({
  title: z.string().min(1),
  topic: z.string().min(1),
  objectives: z.array(z.string()).min(1).default(["Understand the topic"]),
  estimatedDurationMins: z.number().positive().default(60),
})

export const RawCurriculumSchema = z.array(RawCurriculumModuleSchema).min(1).max(20)

// ─── Subtopic plan ────────────────────────────────────────────────────────────

export const SubtopicPlanItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).default(""),
})

export const SubtopicPlanSchema = z.array(SubtopicPlanItemSchema).min(2).max(10)

// ─── Classwork plan ───────────────────────────────────────────────────────────

export const ClassworkPlanItemSchema = z.object({
  insertAfterSubtopicIndex: z.number().int().min(0),
  classworkType: ClassworkTypeSchema,
  assessmentType: AssessmentTypeSchema,
  title: z.string().min(1),
  prompt: z.string().min(1),
  starterCode: z.string().optional(),
  demonstrationCode: z.string().optional(),
  demonstrationExplanation: z.string().optional(),
  options: z.array(z.string()).optional(),
  correctIndex: z.number().int().min(0).optional(),
  rubric: z.string().optional(),
})

export const ClassworkPlanSchema = z.array(ClassworkPlanItemSchema).min(0).max(10)

// ─── Assessment questions ─────────────────────────────────────────────────────

export const AssessmentQuestionSchema = z.object({
  questionId: z.string().min(1),
  prompt: z.string().min(1),
  type: AssessmentTypeSchema,
  rubric: z.string().optional(),
  expectedOutput: z.string().optional(),
  starterCode: z.string().optional(),
  options: z.array(z.string()).optional(),
  correctIndex: z.number().int().min(0).optional(),
})

export const AssessmentQuestionsSchema = z.object({
  questions: z.array(AssessmentQuestionSchema).min(1).max(10),
})

// ─── Grading results ──────────────────────────────────────────────────────────

export const GradingResultSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().min(1).default("Assessment complete."),
  errorPatterns: z.array(z.string()).default([]),
  passed: z.boolean().optional(),
})

export const ClassworkGradingSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().min(1).default("Classwork complete."),
})

// ─── ArchAgent decision ───────────────────────────────────────────────────────

export const ArchAgentDecisionSchema = z.object({
  action: z.enum(["advance", "remedial", "restructure", "complete"]),
  reason: z.string().min(1).default("Decision made."),
  nextModuleIndex: z.number().int().min(0).optional(),
})

// ─── Reviewer decision ────────────────────────────────────────────────────────

export const RemedialSubtopicSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  targetSubtopicIndex: z.number().int().min(0),
})

export const ReviewerDecisionSchema = z.object({
  weakSubtopicIndices: z.array(z.number().int().min(0)).default([]),
  weaknessNotes: z.string().min(1).default("Areas for improvement identified."),
  remedialSubtopics: z.array(RemedialSubtopicSchema).min(1).max(5),
  collaborativeTaskPrompt: z.string().min(1),
  collaborativeStarterCode: z.string().optional(),
})

// ─── Onboarding form ──────────────────────────────────────────────────────────

export const OnboardingNameSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(80, "Name must be under 80 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
})

export const OnboardingGoalsSchema = z.object({
  goals: z
    .string()
    .min(10, "Please describe your goals in at least 10 characters")
    .max(500, "Goals must be under 500 characters"),
  pace: z.enum(["slow", "normal", "fast"]),
  learningStyle: z.enum(["visual", "textual", "hands-on"]),
})

// ─── Inferred TypeScript types ────────────────────────────────────────────────
// These replace the manual TypeScript types for anything that flows through Zod

export type ValidatedLectureJSON = z.infer<typeof LectureJSONSchema>
export type ValidatedLectureBeat = z.infer<typeof LectureBeatSchema>
export type ValidatedDiagnostic = z.infer<typeof DiagnosticSchema>
export type ValidatedAssessmentQuestions = z.infer<typeof AssessmentQuestionsSchema>
export type ValidatedGradingResult = z.infer<typeof GradingResultSchema>
export type ValidatedArchAgentDecision = z.infer<typeof ArchAgentDecisionSchema>
export type ValidatedReviewerDecision = z.infer<typeof ReviewerDecisionSchema>
export type ValidatedSubtopicPlan = z.infer<typeof SubtopicPlanSchema>
export type ValidatedClassworkPlan = z.infer<typeof ClassworkPlanSchema>
export type ValidatedOnboardingName = z.infer<typeof OnboardingNameSchema>
export type ValidatedOnboardingGoals = z.infer<typeof OnboardingGoalsSchema>
