import { z } from "zod"
import { gemmaJSON } from "./novita"
import type {
  WebDevFramework, WebDevInterest, WebDevProficiencyLevel,
  WebDevCurriculumItem, WebDevAssignment, PatternCheck,
} from "./types-webdev"
import type { WebDevComplexitySpec } from "./webdev-calibrator"

// ─── Zod schemas ───────────────────────────────────────────────────────────────

const CurriculumSpecSchema = z.object({
  assignments: z.array(z.object({
    index:         z.number().int().min(0).max(3),
    title:         z.string().min(5).max(80),
    subtitle:      z.string().min(10).max(120),
    description:   z.string().min(40),
    objectives:    z.array(z.string().min(5)).min(3).max(5),
    difficulty:    z.enum(["beginner", "intermediate", "advanced", "expert"]),
    estimatedMins: z.number().int().min(20).max(90),
    keyTopics:     z.array(z.string()).min(2).max(5),
  })).length(4),
})

const PATTERN_CHECK_TYPES = [
  "contains_tag", "contains_attr", "contains_css_prop",
  "contains_jsx", "contains_hook", "contains_fetch",
  "contains_import", "contains_text",
] as const

const AssignmentCodeSchema = z.object({
  starterFiles: z.record(z.string()),
  patternChecks: z.array(z.object({
    id:         z.string(),
    label:      z.string(),
    weight:     z.number().int().min(1).max(20),
    type:       z.enum(PATTERN_CHECK_TYPES),
    pattern:    z.string(),
    targetFile: z.string().optional(),
  })).min(4).max(10),
  gradingRubric:          z.string().min(100),
  expectedBehaviourDesc:  z.string().min(30),
})

// ─── Framework starter defaults ────────────────────────────────────────────────

function getFrameworkHint(framework: WebDevFramework): string {
  switch (framework) {
    case "html_css_js":
      return `Files: index.html (semantic HTML5), style.css (custom CSS), script.js (vanilla JS).
Use CSS custom properties for theming. No frameworks. No imports between files (use <link>/<script> tags).`
    case "react":
      return `Files: App.jsx (main), index.jsx (entry — DO NOT modify), style.css.
Use functional components with hooks. No external libraries beyond React itself.
Import style.css in App.jsx. Components can be defined in the same file or as separate files.`
    case "react_api":
      return `Files: App.jsx (main), index.jsx (entry — DO NOT modify), style.css.
Use functional components with hooks. fetch() for API calls — no axios.
Handle loading and error states. No external libraries beyond React.`
  }
}

function getFrameworkDefaultStarters(framework: WebDevFramework): Record<string, string> {
  switch (framework) {
    case "html_css_js":
      return {
        "/index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Project</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <!-- TODO: Build your UI here -->

  <script src="script.js"></script>
</body>
</html>`,
        "/style.css": `:root {
  --color-primary: #3b82f6;
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f1f5f9;
  --color-muted: #94a3b8;
  --radius: 8px;
  --font: 'Segoe UI', system-ui, sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font);
  background: var(--color-bg);
  color: var(--color-text);
  min-height: 100vh;
  padding: 2rem;
}

/* TODO: Add your styles */`,
        "/script.js": `// TODO: Add your JavaScript
console.log("Ready");`,
      }

    case "react":
    case "react_api":
      return {
        "/index.jsx": `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";

const root = createRoot(document.getElementById("root"));
root.render(<StrictMode><App /></StrictMode>);`,
        "/App.jsx": `import { useState } from "react";

// TODO: Build your component here
export default function App() {
  return (
    <div className="app">
      <h1>My Project</h1>
    </div>
  );
}`,
        "/style.css": `:root {
  --color-primary: #3b82f6;
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f1f5f9;
  --color-muted: #94a3b8;
  --radius: 8px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  min-height: 100vh;
}

.app {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

/* TODO: Add your styles */`,
      }
  }
}

// ─── Step 1: Generate curriculum specs (fast, titles+descriptions only) ────────

export async function generateWebDevCurriculumSpecs(
  interest: WebDevInterest,
  proficiencyLevel: WebDevProficiencyLevel,
  itemSpecs: { itemIndex: number; spec: WebDevComplexitySpec; hint: string; framework: WebDevFramework; assignmentId: string }[]
): Promise<Omit<WebDevCurriculumItem, "status" | "score" | "codeGenerated">[]> {
  const interestLabel = {
    ui_design:     "visual UI design",
    interactivity: "interactivity and user events",
    components:    "reusable component design",
    data_driven:   "data-driven interfaces",
  }[interest]

  const specList = itemSpecs.map((s) =>
    `Assignment ${s.itemIndex + 1}: framework=${s.framework}, difficulty=${s.spec.difficulty}, focus="${s.hint}"`
  ).join("\n")

  const result = await gemmaJSON(
    [
      {
        role: "system",
        content: "You are Athena's web development curriculum designer. Design a progressive 4-assignment frontend curriculum. Return valid JSON only.",
      },
      {
        role: "user",
        content: `Design a 4-assignment web development curriculum for a student interested in ${interestLabel}.

Starting proficiency: ${proficiencyLevel}
Assignment specs:
${specList}

Each assignment should feel like a real-world frontend project.
The curriculum must progress naturally — each project builds on the previous.

Return ONLY:
{
  "assignments": [
    {
      "index": 0,
      "title": "<project name>",
      "subtitle": "<one-line what they build>",
      "description": "<2-3 sentences describing the project and what they will learn>",
      "objectives": ["<verb + skill>"],
      "difficulty": "beginner|intermediate|advanced|expert",
      "estimatedMins": <number>,
      "keyTopics": ["<topic>"]
    }
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
    framework:     itemSpecs[i].framework,
    difficulty:    a.difficulty,
    estimatedMins: a.estimatedMins,
    keyTopics:     a.keyTopics,
    objectives:    a.objectives,
  }))
}

// ─── Step 2: Generate full assignment code ─────────────────────────────────────

export async function generateWebDevAssignmentCode(
  item: WebDevCurriculumItem,
  interest: WebDevInterest,
  spec: WebDevComplexitySpec,
  hint: string
): Promise<Omit<WebDevAssignment, "assignmentId" | "curriculumId" | "itemIndex" | "generatedAt">> {
  const frameworkHint = getFrameworkHint(spec.framework)
  const defaultStarters = getFrameworkDefaultStarters(spec.framework)

  const generated = await gemmaJSON(
    [
      {
        role: "system",
        content: "You are a senior frontend engineer designing web development assignments. Return valid JSON only. No markdown fences.",
      },
      {
        role: "user",
        content: `Create a complete frontend assignment:

Title: "${item.title}"
Description: "${item.description}"
Framework: ${spec.framework}
Difficulty: ${spec.difficulty}
Interest focus: ${hint}

FRAMEWORK RULES:
${frameworkHint}

YOUR JOB:
1. Write complete starterFiles — the scaffolding students will start with (with TODO comments)
2. Write 5-8 patternChecks — machine-readable checks for specific code patterns
3. Write a detailed gradingRubric for Gemma to assess code quality (60 points)
4. Write expectedBehaviourDesc — what a correct solution looks like

PATTERN CHECK RULES:
- Types: contains_tag (HTML element), contains_attr (attribute), contains_css_prop (CSS property),
  contains_jsx (JSX element/component), contains_hook (React hook), contains_fetch (API call),
  contains_import (import statement), contains_text (any string)
- Weights must sum to exactly 40
- The pattern field is a substring to search for in the student's code
- Be specific: "display: flex" not "flex"
- For JSX: "<Header" not "Header" (include the < bracket)

RUBRIC should cover:
- Code organisation and structure (20pts)
- CSS quality and design decisions (15pts)  
- JavaScript/React patterns and best practices (15pts)
- Responsiveness and accessibility basics (10pts)

The starterFiles should use these as defaults if no better structure fits:
${JSON.stringify(defaultStarters, null, 2)}

Return ONLY this JSON:
{
  "starterFiles": {
    "<filename>": "<starter content with TODO comments>"
  },
  "patternChecks": [
    {
      "id": "pc1",
      "label": "<human-readable check>",
      "weight": <number 1-20>,
      "type": "<type>",
      "pattern": "<substring to find>",
      "targetFile": "<optional — filename to restrict search to>"
    }
  ],
  "gradingRubric": "<detailed rubric text for Gemma>",
  "expectedBehaviourDesc": "<what a correct solution does>"
}`,
      },
    ],
    AssignmentCodeSchema,
    { temperature: 0.4, maxTokens: 32768 }
  )

  // Validate pattern weights sum to ~40 (allow ±5 tolerance)
  const totalWeight = generated.patternChecks.reduce((s, c) => s + c.weight, 0)
  if (Math.abs(totalWeight - 40) > 10) {
    // Normalise weights to sum to 40
    const scale = 40 / totalWeight
    generated.patternChecks = generated.patternChecks.map((c) => ({
      ...c,
      weight: Math.round(c.weight * scale),
    }))
  }

  return {
    title:                 item.title,
    subtitle:              item.subtitle,
    description:           item.description,
    framework:             spec.framework,
    difficulty:            item.difficulty,
    interest,
    estimatedMins:         item.estimatedMins,
    objectives:            item.objectives,
    starterFiles:          generated.starterFiles,
    patternChecks:         generated.patternChecks,
    gradingRubric:         generated.gradingRubric,
    expectedBehaviourDesc: generated.expectedBehaviourDesc,
  }
}

// ─── Pattern matching (client or server — pure string search) ─────────────────

export function runPatternChecks(
  files: Record<string, string>,
  checks: PatternCheck[]
): import("./types-webdev").WebDevCheckResult[] {
  return checks.map((check) => {
    const searchIn = check.targetFile
      ? files[check.targetFile] ?? ""
      : Object.values(files).join("\n")

    const passed = searchIn.toLowerCase().includes(check.pattern.toLowerCase())

    return {
      id:       check.id,
      label:    check.label,
      weight:   check.weight,
      score:    passed ? check.weight : 0,
      passed,
      feedback: passed
        ? `✓ ${check.label}`
        : `✗ ${check.label} — not found in your code`,
    }
  })
}
