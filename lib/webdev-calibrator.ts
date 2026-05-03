import type {
  WebDevProficiencyLevel, WebDevInterest, WebDevFramework, WebDevCurriculumItem,
} from "./types-webdev"
import { v4 as uuidv4 } from "uuid"

export const WEBDEV_PASS_THRESHOLD = 35

export function getWebDevProficiencyLevel(score: number): WebDevProficiencyLevel | "fail" {
  if (score < WEBDEV_PASS_THRESHOLD) return "fail"
  if (score < 55) return "beginner"
  if (score < 72) return "intermediate"
  if (score < 88) return "advanced"
  return "expert"
}

export function computeWebDevScore(mcq: number, practical: number): number {
  return Math.round(mcq * 0.4 + practical * 0.6)
}

// ─── Framework progression per level ──────────────────────────────────────────

const FRAMEWORK_BY_LEVEL: Record<WebDevProficiencyLevel, WebDevFramework[]> = {
  beginner:     ["html_css_js", "html_css_js",  "html_css_js",  "react"],
  intermediate: ["html_css_js", "react",         "react",        "react_api"],
  advanced:     ["react",       "react",         "react_api",    "react_api"],
  expert:       ["react",       "react_api",     "react_api",    "react_api"],
}

// ─── Complexity spec ───────────────────────────────────────────────────────────

export type WebDevComplexitySpec = {
  framework: WebDevFramework
  difficulty: WebDevProficiencyLevel
  numComponents: number        // React components to build
  numRequirements: number      // bullet point requirements in brief
  numPatternChecks: number     // machine-checkable patterns
  cssComplexity: "basic" | "layout" | "responsive" | "animated"
  stateManagement: "none" | "basic" | "multiple" | "complex"
  apiIntegration: boolean
  estimatedMins: number
}

const SPECS: Record<WebDevProficiencyLevel, WebDevComplexitySpec> = {
  beginner: {
    framework: "html_css_js",
    difficulty: "beginner",
    numComponents: 0,
    numRequirements: 4,
    numPatternChecks: 5,
    cssComplexity: "layout",
    stateManagement: "none",
    apiIntegration: false,
    estimatedMins: 30,
  },
  intermediate: {
    framework: "react",
    difficulty: "intermediate",
    numComponents: 2,
    numRequirements: 5,
    numPatternChecks: 6,
    cssComplexity: "layout",
    stateManagement: "basic",
    apiIntegration: false,
    estimatedMins: 45,
  },
  advanced: {
    framework: "react",
    difficulty: "advanced",
    numComponents: 3,
    numRequirements: 7,
    numPatternChecks: 7,
    cssComplexity: "responsive",
    stateManagement: "multiple",
    apiIntegration: false,
    estimatedMins: 60,
  },
  expert: {
    framework: "react_api",
    difficulty: "expert",
    numComponents: 4,
    numRequirements: 8,
    numPatternChecks: 8,
    cssComplexity: "responsive",
    stateManagement: "complex",
    apiIntegration: true,
    estimatedMins: 75,
  },
}

// ─── Interest context ──────────────────────────────────────────────────────────

const INTEREST_CONTEXT: Record<WebDevInterest, Record<WebDevProficiencyLevel, string>> = {
  ui_design: {
    beginner:     "Build a visually polished static page. Focus on typography, spacing, and color.",
    intermediate: "Build a React component with visual polish — hover states, transitions, consistent spacing.",
    advanced:     "Build a multi-section landing page component with responsive design and smooth CSS animations.",
    expert:       "Build a fully responsive design system component (theme tokens, variants, accessibility).",
  },
  interactivity: {
    beginner:     "Add interactivity to a static page — show/hide elements, toggle classes, simple events.",
    intermediate: "Build a React interactive widget — counter, toggle, accordion, or form with validation.",
    advanced:     "Build a React multi-step form or interactive dashboard with complex state and validation.",
    expert:       "Build a React app with real-time UI updates driven by API data and user interactions.",
  },
  components: {
    beginner:     "Build a reusable HTML/CSS component — card, button group, or navigation bar.",
    intermediate: "Build a composable React component with props — Button, Card, or Badge variants.",
    advanced:     "Build a compound React component system — Tabs, Accordion, or Modal with context.",
    expert:       "Build a full React component library with prop types, variants, and composition patterns.",
  },
  data_driven: {
    beginner:     "Render a list of items from a JavaScript array into styled HTML cards.",
    intermediate: "Build a React list with filtering and sorting driven by component state.",
    advanced:     "Build a React data table with search, sort, and pagination from a large dataset.",
    expert:       "Build a React dashboard that fetches from a public API and visualises the data.",
  },
}

// ─── Build 4-item curriculum specs ────────────────────────────────────────────

export function buildWebDevCurriculumSpecs(
  proficiencyLevel: WebDevProficiencyLevel,
  interest: WebDevInterest
): { itemIndex: number; spec: WebDevComplexitySpec; hint: string; framework: WebDevFramework; assignmentId: string }[] {
  const LEVELS: WebDevProficiencyLevel[] = ["beginner", "intermediate", "advanced", "expert"]
  const startIdx = LEVELS.indexOf(proficiencyLevel)

  const levels: WebDevProficiencyLevel[] = [
    LEVELS[Math.min(startIdx, 3)],
    LEVELS[Math.min(startIdx + 1, 3)],
    LEVELS[Math.min(startIdx + 1, 3)],
    LEVELS[Math.min(startIdx + 2, 3)],
  ]

  const frameworks = FRAMEWORK_BY_LEVEL[proficiencyLevel]

  return levels.map((level, i) => ({
    itemIndex:    i,
    spec:         { ...SPECS[level], framework: frameworks[i] },
    hint:         INTEREST_CONTEXT[interest][level],
    framework:    frameworks[i],
    assignmentId: uuidv4(),
  }))
}
