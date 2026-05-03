import type { ProficiencyLevel, SoSELanguage, SoSEInterest, CurriculumItem } from "./types-sose"
import { v4 as uuidv4 } from "uuid"

// ─── Score thresholds ─────────────────────────────────────────────────────────

export const PASS_THRESHOLD = 35  // below this → redirect to SoP

export function getProficiencyLevel(score: number): ProficiencyLevel | "fail" {
  if (score < PASS_THRESHOLD) return "fail"
  if (score < 55)             return "beginner"
  if (score < 72)             return "intermediate"
  if (score < 88)             return "advanced"
  return "expert"
}

export function computeProficiencyScore(mcqScore: number, practicalScore: number): number {
  return Math.round(mcqScore * 0.4 + practicalScore * 0.6)
}

// ─── Complexity spec ──────────────────────────────────────────────────────────

export type ComplexitySpec = {
  difficulty: ProficiencyLevel
  taskType: "function_set" | "class_module" | "cli_tool" | "api_endpoint" | "full_api"
  numFunctions: number
  numTestCases: number
  edgeCaseDepth: "basic" | "thorough" | "adversarial"
  allowedLibraries: { python: string[]; javascript: string[] }
  estimatedMins: number
  progressionFocus: string
}

const SPECS: Record<ProficiencyLevel, ComplexitySpec> = {
  beginner: {
    difficulty: "beginner",
    taskType: "function_set",
    numFunctions: 3,
    numTestCases: 6,
    edgeCaseDepth: "basic",
    allowedLibraries: { python: [], javascript: [] },
    estimatedMins: 30,
    progressionFocus: "correct logic, basic data types, simple loops and conditionals",
  },
  intermediate: {
    difficulty: "intermediate",
    taskType: "class_module",
    numFunctions: 5,
    numTestCases: 10,
    edgeCaseDepth: "thorough",
    allowedLibraries: {
      python: ["dataclasses", "typing", "collections"],
      javascript: [],
    },
    estimatedMins: 50,
    progressionFocus: "OOP design, error handling, edge cases, file I/O or data structures",
  },
  advanced: {
    difficulty: "advanced",
    taskType: "cli_tool",
    numFunctions: 7,
    numTestCases: 14,
    edgeCaseDepth: "thorough",
    allowedLibraries: {
      python: ["dataclasses", "typing", "json", "pathlib", "argparse"],
      javascript: ["fs", "path"],
    },
    estimatedMins: 70,
    progressionFocus: "modular architecture, persistence, validation, clean APIs",
  },
  expert: {
    difficulty: "expert",
    taskType: "full_api",
    numFunctions: 10,
    numTestCases: 18,
    edgeCaseDepth: "adversarial",
    allowedLibraries: {
      python: ["fastapi", "pydantic", "httpx"],
      javascript: ["express", "supertest"],
    },
    estimatedMins: 90,
    progressionFocus: "production-grade API design, auth patterns, error propagation, schema validation",
  },
}

// ─── Interest-aware progression hint ─────────────────────────────────────────

const INTEREST_CONTEXT: Record<SoSEInterest, Record<ProficiencyLevel, string>> = {
  backend: {
    beginner:     "Focus on pure functions and data transformation. No web frameworks yet.",
    intermediate: "Introduce a data model with persistence (JSON file). Simple CRUD operations.",
    advanced:     "Build a REST API using FastAPI (Python) or Express (Node). CRUD + validation.",
    expert:       "Full REST API with auth middleware, error handling, and integration tests.",
  },
  data_ml: {
    beginner:     "Basic data processing: reading files, computing statistics, filtering lists.",
    intermediate: "Data pipeline: load → clean → transform → aggregate. Use Counter, defaultdict.",
    advanced:     "Multi-step data analysis: parse CSV, statistical summaries, anomaly detection.",
    expert:       "ML pipeline: feature engineering, cross-validation, evaluation metrics.",
  },
  algorithms: {
    beginner:     "Implement a classic algorithm from scratch: sorting, search, or recursion.",
    intermediate: "Implement a data structure: linked list, stack, queue, or hash map.",
    advanced:     "Graph algorithms: BFS, DFS, shortest path. Focus on correctness and efficiency.",
    expert:       "Dynamic programming or advanced graph problem. Optimise for time complexity.",
  },
  automation: {
    beginner:     "File system operations: read, write, rename, filter files by extension.",
    intermediate: "Build a CLI tool with argument parsing. Process multiple files.",
    advanced:     "Automation pipeline: watch folder, process files, generate reports.",
    expert:       "Full automation system with config files, logging, error recovery.",
  },
}

// ─── Build curriculum item specs for 4 assignments ────────────────────────────

export function buildCurriculumSpecs(
  proficiencyLevel: ProficiencyLevel,
  interest: SoSEInterest,
  language: SoSELanguage
): { itemIndex: number; spec: ComplexitySpec; hint: string; assignmentId: string }[] {
  const LEVELS: ProficiencyLevel[] = ["beginner", "intermediate", "advanced", "expert"]
  const startIdx = LEVELS.indexOf(proficiencyLevel)

  // 4-assignment progression: start at proficiency level, step up
  const levels: ProficiencyLevel[] = [
    LEVELS[Math.min(startIdx, 3)],
    LEVELS[Math.min(startIdx + 1, 3)],
    LEVELS[Math.min(startIdx + 1, 3)],
    LEVELS[Math.min(startIdx + 2, 3)],
  ]

  return levels.map((level, i) => ({
    itemIndex: i,
    spec: { ...SPECS[level] },
    hint: INTEREST_CONTEXT[interest][level],
    assignmentId: uuidv4(),
  }))
}
