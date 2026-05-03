# 🏛️ Athena — Autonomous Education ArchAgent

> **Gemma 4 Good Hackathon 2026 · Google DeepMind × Kaggle · Education Track**
> Built by **Swipesoft**

Athena is not a chatbot. It is not a prompt pipeline. It is an **ArchAgent** — a second-order
autonomous system that *architects* your entire learning ecosystem, then evolves it as you grow.

Three schools. Three execution environments. One unified adaptive engine powered by Gemma 4.

---

## Quick start

```bash
git clone https://github.com/Swipesoft/Alethia.git
cd Alethia
git checkout master
npm install
cp .env.local.example .env.local
# Fill in your keys (see §7 below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Table of Contents

1. [What is Athena?](#1-what-is-athena)
2. [Three Schools — Overview](#2-three-schools--overview)
3. [School of Programming (SoP)](#3-school-of-programming-sop)
4. [School of Software Engineering (SoSE)](#4-school-of-software-engineering-sose)
5. [School of Web Development (SoWD)](#5-school-of-web-development-sowd)
6. [The Adaptive Assignment Generator](#6-the-adaptive-assignment-generator)
7. [Environment Variables — Complete Reference](#7-environment-variables--complete-reference)
8. [Firebase Setup](#8-firebase-setup)
9. [Firestore Collections & Indexes](#9-firestore-collections--indexes)
10. [Full Tech Stack](#10-full-tech-stack)
11. [Project File Structure](#11-project-file-structure)
12. [API Route Reference](#12-api-route-reference)
13. [Deployment (Vercel)](#13-deployment-vercel)
14. [Known Gotchas & Bugs Fixed](#14-known-gotchas--bugs-fixed)
15. [Cost & Budget Analysis](#15-cost--budget-analysis)
16. [Architecture Decisions & Rationale](#16-architecture-decisions--rationale)
17. [Roadmap — Designed but Not Yet Built](#17-roadmap--designed-but-not-yet-built)

---

## 1. What is Athena?

### The ArchAgent concept

An **Agent** is a single-loop problem solver: *observe → reason → act → repeat.*

An **ArchAgent** is a second-order system — one that operates *on* agents rather than *as* an agent.
It designs the agent ecosystem for each learner, coordinates multiple specialised subagents, evolves
the architecture based on observed outcomes, and enforces pedagogical policies via a built-in Compiler.

### Gemma as the autonomous tutor

Every LLM call goes through `gemmaJSON()` in `lib/novita.ts` — a wrapper with:
- Automatic JSON extraction (strips markdown fences)
- Zod schema validation on every response
- 3-retry loop with Zod error feedback injected back into the conversation
- Exponential backoff between retries

If Gemma returns malformed JSON, it never surfaces — it gets a correction prompt and retries silently.

---

## 2. Three Schools — Overview

| School | Route | Execution | Grading | Cost/submission |
|---|---|---|---|---|
| **School of Programming** | `/` → `/dashboard` | Judge0 CE | Judge0 + Gemma review | ~$0.001 |
| **School of Software Engineering** | `/sose` | E2B Firecracker microVM | pytest/Jest + Gemma synthesis | ~$0.002 |
| **School of Web Development** | `/school/webdev` | Sandpack (browser-native) | Pattern matching + Gemma review | $0.00 |

All three schools share Firebase Firestore, anonymous UUID sessions (`getOrCreateStudentId()`),
Gemma 4 via Novita AI, and the same CSS design system.

---

## 3. School of Programming (SoP)

The original Athena environment. Six faculties with animated lectures and multi-environment assessments.

### Routes

| Route | Description |
|---|---|
| `/` | Landing page with school selection |
| `/onboarding` | 4-step enrolment: name → faculty → goals → diagnostic quiz |
| `/dashboard` | Live curriculum map with ArchAgent decision log |
| `/lecture/[moduleId]` | Animated 8-beat lecture player |
| `/assess/[moduleId]` | Adaptive assessment (code, MCQ, essay, image upload) |

### Supported faculties

| Faculty | Assessment | Execution |
|---|---|---|
| Programming | Code execution + Gemma review | Judge0 CE (12 languages) |
| Medicine | MCQ + VLM image grading | Judge0 + Firebase Storage |
| STEM | Equations + Gemma reasoning | Gemma |
| Law | Essay + rubric grading | Gemma |
| Humanities | Essay grading | Gemma |
| Arts | Image upload → VLM aesthetic scoring | Firebase Storage + Gemma |

### Languages (Judge0)
Python · Rust · C · C++ · Java · SQL · JavaScript · TypeScript · Scala · C#

### ArchAgent decision loop

```
Student enrols → Diagnostic (5 Gemma questions)
      ↓
ArchAgent.generateCurriculum() → 12-module plan → Firestore
      ↓
Module N: LectureJSON → 8 animated beats + streaming QA chat
      ↓
Assessment → Judge0 / MCQ / Essay / VLM image
      ↓
ArchAgent.archAgentDecide() → advance | remedial | restructure | complete
Compiler validates against pedagogical policy
      ↓
Firestore updated → Dashboard re-renders (onSnapshot)
      ↓
Repeat
```

---

## 4. School of Software Engineering (SoSE)

Students write real multi-file software projects. Code runs in isolated E2B microVMs.
A multi-agent grading pipeline builds the project, runs tests, and synthesises feedback.

### Routes

| Route | Description |
|---|---|
| `/sose` | Practice library + submission history. Auto-redirects to `/sose/curriculum` if profile exists |
| `/sose/onboarding` | Proficiency gate: 8 MCQ + 2 coding challenges → pass/fail → adaptive curriculum |
| `/sose/curriculum` | 4-project adaptive roadmap with lock/unlock progression |
| `/sose/curriculum/[assignmentId]` | Assignment generation (Gemma + E2B validation) → workspace |
| `/sose/workspace/[workspaceId]` | Full IDE: file tree, CodeMirror, terminal panel, package installer |
| `/sose/report/[submissionId]` | Grading report. Polls Firestore every 4s while grading is in progress |
| `/sose/history` | All submissions with score progression bar charts |
| `/sose/instructor` | Tabbed assignment viewer for judges (Overview / Files / Rubric / Grading config) |

### Static practice assignments (always available, no proficiency test required)

| Assignment | Language | Test runner |
|---|---|---|
| CLI Todo Manager | Python | pytest |
| Word Frequency Analyzer | Python | pytest |
| Student Grade Tracker | Python | pytest |
| Number Base Converter | Python | pytest |
| Linked List | JavaScript | Jest |

### Workspace IDE features

- Multi-file CodeMirror editor with syntax highlighting, one tab per file
- File tree with `+` create button, hover-to-reveal `×` delete button
- File creation modal (validates filename, auto-populates starter content per extension)
- Package installer (appends to `requirements.txt`, pip-installs on next run)
- Terminal panel (collapsible, stdout/stderr colour-coded, exit code + duration)
- Run button (executes active file in E2B, auto-installs `requirements.txt` first)
- Run Tests button (appears for `test_*.py` and `*.test.js` files, language-aware)
- `Cmd+S` / `Ctrl+S` keyboard shortcut for immediate save
- Auto-save on 1.2s debounce after last keystroke
- Save indicator (green/amber/red dot)
- Submit changes to "Resubmit →" after first submission; "Last Report ↗" link appears
- 6-stage grading overlay (cycles every 12s: Provisioning → Installing → Running tests → etc.)
- Brief panel (slide-in, renders markdown with headings, bold, code blocks, lists)
- E2B warning bar (amber, dismissible) when `E2B_API_KEY` is missing

### Grading pipeline

```
Student clicks Submit
      ↓
Force-save all files to Firestore
      ↓
E2B sandbox boots (~150ms, 2 vCPU / 1 GiB RAM)
  pip install pytest --quiet  (or npm install)
  Build check: py_compile / node require  ← required gate (0pt if fails)
  Test suite: pytest -v --tb=short  /  npx jest --no-coverage --forceExit
    Output parsed by parseTestOutput():
      Jest  → matches "Tests: X passed, Y total"
      pytest → matches "X passed, Y failed"
    Score = floor(passRate × 50)
  Sandbox killed
      ↓
Stub detection:
  ≥3 "# TODO: implement" (Python) or "// TODO: implement" (JS) → short-circuit
  Returns 0pt with targeted message, skips Gemma entirely
      ↓
Gemma synthesis (temperature=0):
  qualityScore (0–25pt): naming, structure, error handling
  designScore  (0–15pt): OOP, algorithms, data structures
  summary, strengths (2–3), improvements (1–3), encouragement
      ↓
Total = min(100, syntax + tests + quality + design)
Submission → Firestore → redirect to /sose/report/[id]
```

---

## 5. School of Web Development (SoWD)

A completely separate school. Live browser-native Sandpack editor — no servers, no E2B for frontend.

### Routes

| Route | Description |
|---|---|
| `/school/webdev` | Landing page. Auto-redirects to `/school/webdev/curriculum` if profile exists |
| `/school/webdev/onboarding` | MCQ + live Sandpack challenge (Gemma-reviewed) → curriculum |
| `/school/webdev/curriculum` | 4-project adaptive roadmap |
| `/school/webdev/curriculum/[assignmentId]` | Generation loader → workspace |
| `/school/webdev/workspace/[workspaceId]` | Full Sandpack IDE (explorer + editor + live preview) |
| `/school/webdev/report/[submissionId]` | Pattern checks + AI review breakdown |

### Frameworks

| Framework | Sandpack template | Level |
|---|---|---|
| HTML · CSS · JS | `static` | Beginner |
| React (JSX + hooks) | `react` | Intermediate / Advanced |
| React + fetch API | `react` | Expert |

### Grading system (zero E2B cost)

**40 points — Pattern matching (instant, no LLM)**

`runPatternChecks()` in `lib/webdev-generator.ts` does substring search on the student's code.
Patterns are defined by Gemma during assignment generation:

| Type | What it checks |
|---|---|
| `contains_tag` | HTML element (e.g. `"nav"`) |
| `contains_css_prop` | CSS property (e.g. `"display: flex"`) |
| `contains_jsx` | JSX element (e.g. `"<Header"`) |
| `contains_hook` | React hook (e.g. `"useState"`) |
| `contains_fetch` | API call present |
| `contains_import` | Specific import |
| `contains_text` | Any string in codebase |

**60 points — Gemma code review**
- 35pt: code quality, CSS decisions, structure, naming, maintainability
- 25pt: design decisions, responsiveness, best practices, UX choices

### SoWD onboarding challenge difference

SoWD practical challenges use an embedded Sandpack editor (live preview). Gemma reviews
the submitted code via `PUT /api/webdev/onboarding/challenge`. No Judge0. No server execution.

---

## 6. The Adaptive Assignment Generator

Both SoSE and SoWD use the same adaptive pipeline. Gemma autonomously creates, validates,
and calibrates assignments without human authoring.

### Proficiency assessment flow

```
Interest area + language selection
      ↓
8 Gemma-generated MCQ questions (Zod-validated, 3-retry on failure)
  Distribution: 3 easy · 3 medium · 2 hard
  Tailored to language + interest area
      ↓
2 coding challenges
  SoSE: Judge0 executes code, checks stdout == "PASS"
  SoWD: Sandpack live editor, Gemma reviews the code
      ↓
proficiencyScore = mcqScore × 0.4 + practicalScore × 0.6
  < 35  → FAIL → redirect to School of Programming
  35–54 → beginner
  55–71 → intermediate
  72–87 → advanced
  88+   → expert
      ↓
Curriculum spec generation (Gemma, fast — titles and descriptions only)
  buildCurriculumSpecs() → 4 complexity specs
  generateCurriculumSpecs() → 4 assignment cards with title/subtitle/objectives
  Saved to Firestore. Student sees full roadmap immediately.
  Item 0 → available. Items 1–3 → locked.
      ↓
Per-assignment code generation (on demand when student opens the assignment)
  generateAssignmentCode() / generateWebDevAssignmentCode()
    → Gemma writes reference solution + test suite (SoSE)
    → or starter files + pattern checks + rubric (SoWD)
  ↓
  SoSE: E2B validator loop
    Run reference + tests in fresh sandbox
    If any test FAILS → feed exact failure output to Gemma → retry (max 3x, temperature=0)
    If all pass → strip reference solution → save starter files to Firestore
  ↓
  SoWD: No E2B — Gemma validates its own pattern checks
  ↓
  Workspace opens with generated starter files
```

### Calibrator specs — SoSE

| Level | Task type | Functions | Tests | Libraries |
|---|---|---|---|---|
| Beginner | `function_set` | 3 | 6 | stdlib only |
| Intermediate | `class_module` | 5 | 10 | dataclasses, typing, collections |
| Advanced | `cli_tool` | 7 | 14 | json, pathlib, argparse |
| Expert | `full_api` | 10 | 18 | fastapi/pydantic or express/supertest |

### Calibrator specs — SoWD framework progression

| Starting level | Assignment 1 | Assignment 2 | Assignment 3 | Assignment 4 |
|---|---|---|---|---|
| Beginner | HTML/CSS | HTML/CSS | HTML/CSS | React |
| Intermediate | HTML/CSS | React | React | React+API |
| Advanced | React | React | React+API | React+API |
| Expert | React | React+API | React+API | React+API |

### Interest areas

**SoSE:** Backend · Data/ML · Algorithms & DS · Automation
**SoWD:** UI Design · Interactivity · Components · Data & APIs

---

## 7. Environment Variables — Complete Reference

```bash
cp .env.local.example .env.local
```

```env
# ── Novita AI (Gemma 4-31B) ───────────────────────────────────────────────────
# Required for ALL LLM calls across all three schools.
NOVITA_API_KEY=
# Get at: novita.ai → API Keys

# ── Firebase ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
# Get at: console.firebase.google.com → Project Settings → Your Apps → Web App

# ── Judge0 CE (RapidAPI) ──────────────────────────────────────────────────────
# Required for: SoP code execution, SoSE onboarding coding challenges.
# NOT required for SoWD.
JUDGE0_API_KEY=
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
# Get at: rapidapi.com → Judge0 CE → Subscribe → App Keys

# ── E2B sandboxes ─────────────────────────────────────────────────────────────
# Required for: SoSE workspace execution, grading, adaptive generation.
# NOT required for SoWD or SoP.
# Without this: grading returns HTTP 503 with a helpful message (no crash).
E2B_API_KEY=
# Get FREE at: e2b.dev → Dashboard → API Keys
# Hobby plan: $100 free credit. ~$0.002 per grading run.
```

**Security rules:**
- `NOVITA_API_KEY`, `JUDGE0_API_KEY`, `E2B_API_KEY` — server-only. Never prefix with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_FIREBASE_*` — intentionally public. Firebase security = Firestore rules, not key secrecy.
- Firebase Project ID appearing in error logs/URLs is normal and not a security issue.

---

## 8. Firebase Setup

### Step 1: Create project
1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. **Build** → **Firestore Database** → **Create database** → Production mode
3. **Build** → **Storage** → **Get started** (same region as Firestore)
4. **Project Settings** → **Web app** → copy `firebaseConfig` into `.env.local`

### Step 2: Deploy rules and indexes
```bash
npm install -g firebase-tools
firebase login
firebase use your-project-id
firebase deploy --only firestore:rules,firestore:indexes,storage
```

**⚠ Critical:** Deploy indexes before any student uses SoSE. Without them the submissions
history endpoint returns HTTP 500. See §14 for the full explanation.

---

## 9. Firestore Collections & Indexes

### Collections

| Collection | School | Contains |
|---|---|---|
| `students` | SoP | Profile, curriculum, ArchAgent decisions |
| `modules` | SoP | Lecture content (8 beats), assessment config |
| `sose_workspaces` | SoSE | workspaceId, studentId, files, status |
| `sose_submissions` | SoSE | score, checkResults, summary, feedback |
| `sose_profiles` | SoSE | mcqScore, practicalScore, level, curriculumId |
| `sose_curricula` | SoSE | items (CurriculumItem[]), language, interest |
| `sose_generated_assignments` | SoSE | starterFiles, checks, grading config, rubric |
| `webdev_profiles` | SoWD | Same shape as sose_profiles |
| `webdev_curricula` | SoWD | items (WebDevCurriculumItem[]), interest |
| `webdev_assignments` | SoWD | starterFiles (Sandpack), patternChecks, rubric |
| `webdev_workspaces` | SoWD | files (Sandpack file map), curriculumId |
| `webdev_submissions` | SoWD | score, patternResults, qualityScore, designScore |

### Composite indexes (`firestore.indexes.json`)

```json
{
  "indexes": [
    {
      "collectionGroup": "sose_workspaces",
      "fields": [
        { "fieldPath": "studentId",    "order": "ASCENDING" },
        { "fieldPath": "assignmentId", "order": "ASCENDING" },
        { "fieldPath": "updatedAt",    "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "sose_submissions",
      "fields": [
        { "fieldPath": "studentId",   "order": "ASCENDING" },
        { "fieldPath": "submittedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**Note:** `lib/firestore-sose.ts` queries avoid `orderBy` — sorting is done client-side to
prevent index requirements. These indexes are defined for future production optimisation.

---

## 10. Full Tech Stack

| Concern | Technology | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server + client components |
| Language | TypeScript 5 (strict) | All files typed |
| LLM | Gemma 4-31B via Novita (Kimi K2.5) | `gemmaJSON` with Zod + 3-retry |
| Database | Firebase Firestore | Real-time onSnapshot, serverless |
| File storage | Firebase Storage | SoP image uploads |
| Auth | None (anonymous UUID) | `getOrCreateStudentId()` → localStorage |
| Code execution (SoP) | Judge0 CE via RapidAPI | 12 languages, stateless |
| Code execution (SoSE) | E2B Firecracker microVMs | ~150ms boot, $0.0000325/s |
| Frontend sandbox (SoWD) | Sandpack (`@codesandbox/sandpack-react`) | Browser-native, Apache 2.0, $0 |
| Editor (SoP + SoSE) | CodeMirror (`@uiw/react-codemirror`) | Multi-language, multi-file tabs |
| Schema validation | Zod | Every Gemma JSON output validated |
| Styling | Tailwind CSS + CSS variables | Dark theme design system |
| Deployment | Vercel | Next.js detection, preview per PR |

---

## 11. Project File Structure

```
alethia/
├── app/
│   ├── page.tsx                         # Landing: links to all 3 schools
│   ├── layout.tsx                       # Root layout (no nav chrome)
│   ├── globals.css                      # Design system CSS variables
│   ├── onboarding/page.tsx              # SoP enrolment
│   ├── dashboard/page.tsx               # SoP curriculum map
│   ├── lecture/[moduleId]/page.tsx      # SoP animated lecture
│   ├── assess/[moduleId]/page.tsx       # SoP assessment
│   ├── sose/
│   │   ├── page.tsx                     # Practice library + adaptive CTA
│   │   ├── onboarding/page.tsx          # MCQ + coding challenge gate
│   │   ├── curriculum/page.tsx          # 4-project roadmap
│   │   ├── curriculum/[id]/page.tsx     # Generation loader → workspace
│   │   ├── workspace/[id]/page.tsx      # Full IDE
│   │   ├── report/[id]/page.tsx         # Grading report (polls Firestore)
│   │   ├── history/page.tsx             # All submissions + charts
│   │   └── instructor/page.tsx          # Assignment viewer for judges
│   ├── school/webdev/
│   │   ├── page.tsx                     # SoWD landing
│   │   ├── onboarding/page.tsx          # MCQ + Sandpack challenge
│   │   ├── curriculum/page.tsx          # 4-project roadmap
│   │   ├── curriculum/[id]/page.tsx     # Generation loader → workspace
│   │   ├── workspace/[id]/page.tsx      # Sandpack IDE
│   │   └── report/[id]/page.tsx         # Pattern checks + AI review
│   └── api/
│       ├── archagent/route.ts           # SoP: ArchAgent decisions
│       ├── lecture/generate/            # SoP: lecture generation
│       ├── assess/judge0/route.ts       # SoP + SoSE: Judge0 + Gemma
│       ├── assess/image/route.ts        # SoP: VLM image grading
│       ├── chat/route.ts                # SoP: streaming QA tutor
│       ├── sose/                        # All SoSE API routes
│       └── webdev/                      # All SoWD API routes
├── components/
│   ├── shared/ProgrammingEditor.tsx     # CodeMirror wrapper
│   ├── sose/
│   │   ├── MarkdownBrief.tsx            # Markdown renderer
│   │   └── MiniEditor.tsx              # Compact CodeMirror for onboarding
│   ├── webdev/SandpackEditor.tsx        # Sandpack live IDE
│   └── lecture/                         # 8 lecture beat components
├── lib/
│   ├── novita.ts                        # Gemma: gemmaJSON / gemmaStream / gemmaComplete
│   ├── firebase.ts                      # Firebase init
│   ├── firestore.ts                     # SoP Firestore CRUD
│   ├── firestore-sose.ts                # SoSE Firestore CRUD
│   ├── firestore-webdev.ts              # SoWD Firestore CRUD
│   ├── student-identity.ts              # UUID session management
│   ├── types.ts / types-sose.ts / types-webdev.ts
│   ├── schemas.ts                       # Shared Zod schemas
│   ├── e2b-client.ts                    # E2B sandbox wrapper
│   ├── sose-calibrator.ts               # Proficiency → complexity spec
│   ├── sose-generator.ts                # SoSE generation + E2B validator loop
│   ├── webdev-calibrator.ts             # WebDev proficiency → framework progression
│   └── webdev-generator.ts             # SoWD generation + runPatternChecks()
├── data/sose-assignments.ts             # 5 static assignments (starter + rubrics + tests)
├── firestore.rules                       # Security rules for all 12 collections
├── firestore.indexes.json                # Composite indexes
├── next.config.ts                        # serverExternalPackages: ["e2b"]
├── .env.local.example                    # All required keys
└── SOSE_ARCHITECTURE.md                  # Full SoSE architectural decision record
```

---

## 12. API Route Reference

### SoSE

| Endpoint | Method | Timeout | Purpose |
|---|---|---|---|
| `/api/sose/workspace` | GET / POST / PATCH | 15s | Workspace CRUD |
| `/api/sose/run` | POST | 60s | Execute code in E2B |
| `/api/sose/submit` | POST | 120s | Full grading pipeline |
| `/api/sose/submissions` | GET | 10s | History by studentId |
| `/api/sose/workspaces` | GET | 10s | Workspace list by studentId |
| `/api/sose/profile` | GET | 10s | Proficiency profile |
| `/api/sose/curriculum` | GET | 10s | Curriculum by ID |
| `/api/sose/generate` | POST | 120s | Generate + validate assignment |
| `/api/sose/onboarding/mcq` | POST | 60s | 8 Gemma MCQ questions |
| `/api/sose/onboarding/challenge` | POST | 60s | 2 coding challenges |
| `/api/sose/onboarding/run` | POST | 30s | Judge0 challenge execution |
| `/api/sose/onboarding/complete` | POST | 120s | Score + curriculum generation |

### SoWD

| Endpoint | Method | Timeout | Purpose |
|---|---|---|---|
| `/api/webdev/profile` | GET | 10s | Profile by studentId |
| `/api/webdev/curriculum` | GET | 10s | Curriculum by ID |
| `/api/webdev/assignment` | GET | 10s | Assignment by ID |
| `/api/webdev/workspace` | GET / POST / PATCH | 15s | Workspace CRUD |
| `/api/webdev/generate` | POST | 120s | Generate assignment (Gemma, no E2B) |
| `/api/webdev/submit` | POST | 60s | Pattern matching + Gemma review |
| `/api/webdev/submission` | GET | 10s | Submission by ID |
| `/api/webdev/onboarding/mcq` | POST | 60s | 8 frontend MCQ questions |
| `/api/webdev/onboarding/challenge` | POST / PUT | 60s | Generate / Gemma-review challenge |
| `/api/webdev/onboarding/complete` | POST | 120s | Score + curriculum generation |

---

## 13. Deployment (Vercel)

Add all keys from `.env.local` in **Vercel Dashboard → Project → Environment Variables**.

### Route timeout by plan

| Vercel plan | Max timeout | Impact |
|---|---|---|
| Hobby | 60s | SoSE grading (~90s) and generation (~120s) will time out |
| Pro | 300s | All routes work fine |

### Critical `next.config.ts` setting

```typescript
serverExternalPackages: ["e2b"]
```

Without this, E2B's native Node.js modules fail at runtime in the Vercel bundled environment.

---

## 14. Known Gotchas & Bugs Fixed

---

### 🐛 Firestore composite index error — HTTP 500 on submissions

**Symptom:**
```
FirebaseError: The query requires an index. You can create it here:
https://console.firebase.google.com/v1/r/project/athena-d7ef7/firestore/indexes?...
```
Note: your project ID appears in this URL. This is normal — it is a public identifier,
not a secret. See the security note in §7.

**Cause:** Firestore queries combining `where()` on one field with `orderBy()` on a different
field require a manually deployed composite index.

**Fix applied:** Removed `orderBy()` from both queries in `lib/firestore-sose.ts`.
JavaScript sorts the results after fetch. Works immediately without any index deployment.

**To fix properly for production:**
```bash
firebase use your-project-id
firebase deploy --only firestore:indexes
```

---

### 🐛 pytest not installed in E2B base image — 0/50 on all Python tests

**Symptom:** Python submissions always score 0/50. Report says "Test runner crashed."

**Cause:** Base E2B sandbox is bare Ubuntu 22.04. `pytest` is not pre-installed.
All 4 Python assignments originally had `installCmd: undefined`.

**Fix applied (two layers):**
1. All Python assignments in `data/sose-assignments.ts`: `installCmd: "pip install pytest --quiet 2>&1"`
2. `lib/e2b-client.ts` safety net: if `installCmd` is unset and test command looks like Python,
   auto-runs `pip install pytest` before the test suite.

---

### 🐛 Wrong test assertions — correct code scored 0/50 (Word Frequency Analyzer)

**Cause:** Two wrong assertions in the hand-authored test suite:
- `assert a.total_words() == 9` — correct answer is `10`
- `assert a.unique_count() == 6` — correct answer is `7`

**How:** `re.compile(r"[a-zA-Z]+")` on `"the cat sat on the mat. The cat is fat."`
extracts 10 tokens (including "The" as a separate match, lowercased to "the").

**Why the adaptive system prevents this:** The E2B validator runs the reference solution
against the tests. This exact assertion would fail → Gemma gets the correction → student
never sees a test their correct code can't pass.

**Fix:** Corrected assertions in `data/sose-assignments.ts`.

---

### 🐛 Linked List (JavaScript) — 0/50 on tests, "▶ Tests" button never appeared

**4 separate root causes:**
1. `runTests()` always sent `python -m pytest` regardless of assignment language
2. `hasTestFile` only detected `test_*.py` — `.test.js` was invisible
3. `buildRunCmd()` sent `.test.js` files to `node` instead of `npx jest`
4. `npm install` was not in `ALLOWED_PREFIXES` in the run route

**All four fixed:**
```typescript
// hasTestFile
f.endsWith(".test.js") || f.endsWith(".spec.js")

// runTests — language aware
const isJS = assignment?.language === "javascript"
execute(isJS ? "npx jest *.test.js --no-coverage --forceExit" : "python -m pytest ...")

// buildRunCmd
if (filename.endsWith(".test.js")) return `npx jest ${filename} --no-coverage --forceExit`

// ALLOWED_PREFIXES
"npm install", "npm test", "npm run test"
```

---

### 🐛 Reopening submitted assignment created blank workspace

**Cause:** `getExistingWorkspace()` filtered `where("status", "==", "active")`.
After submission, `workspace.status = "submitted"` — query returned nothing, new blank workspace created.

**Fix:** Removed status filter entirely. Query by `studentId` only, filter by `assignmentId`
and sort by `updatedAt` in JavaScript. Student always resumes their previous code.

---

### 🐛 `mainContent` used before declaration — TypeScript build error

**Cause:** When adding stub detection (which needs `mainContent`) before the Gemma synthesis
block (which previously declared `mainContent`), the variable ordering got inverted.

**Fix:** Moved `mainContent` declaration to before the stub detection block.

---

### 🐛 Stub detection only worked for Python

**Cause:** Initial stub check only looked for `# TODO: implement` (Python comment syntax).
JavaScript stubs use `// TODO: implement` — they were never detected.

**Fix:**
```typescript
const pythonStubs = (mainContent.match(/# TODO: implement/g) || []).length
const jsStubs     = (mainContent.match(/\/\/ TODO: implement/g) || []).length
const isStubOnly  = (pythonStubs >= 3) || (jsStubs >= 3)
```

---

### 🐛 Sandpack SSR crash

**Cause:** Sandpack uses browser-only APIs at import time. Next.js App Router renders server-side.

**Fix:** All Sandpack imports use `dynamic()` with `ssr: false`:
```typescript
const SandpackEditor = dynamic(
  () => import("@/components/webdev/SandpackEditor"),
  { ssr: false }
)
```
Never import from `@codesandbox/sandpack-react` without `ssr: false`.

---

### 🐛 `SoSELanguage` type mismatch with MiniEditor

**Cause:** `SoSELanguage = "python" | "javascript" | "typescript"` but
`MiniEditor` only accepts `"python" | "javascript"`.

**Fix:** Narrow at call site:
```tsx
language={language === "javascript" ? "javascript" : "python"}
```

---

### 🐛 E2B missing key caused opaque crash on submit

**Fix:** Submit route checks at line 1:
```typescript
if (!process.env.E2B_API_KEY) {
  return NextResponse.json({ error: "E2B_API_KEY not configured. Free key at e2b.dev" }, { status: 503 })
}
```
Workspace shows a dismissible amber warning bar when this message is returned.

---

### ⚠ Build fails without NOVITA_API_KEY

`lib/novita.ts` logs the key presence at module load time. During `next build`, all route
modules are imported — this triggers if key is absent.

**Workaround:** Always set `NOVITA_API_KEY` in the build environment. On Vercel, add it as
an environment variable before the first deploy.

---

### ⚠ Vercel Hobby plan timeout on SoSE routes

`maxDuration = 120` is set on grading and generation routes. Hobby plan max is 60s.
E2B boot + pip install + tests + Gemma = ~90s. Will time out on Hobby.

**Workaround:** Use Vercel Pro (300s limit), or run locally for full testing.

---

### ⚠ Sandpack commercial licensing

`static` and `react` templates are Apache 2.0 — free for all use including commercial.
`Nodebox`-backed templates (Next.js, Vite, Astro) may require a commercial license for
for-profit products at scale. We do not use Nodebox templates.

---

## 15. Cost & Budget Analysis

### E2B pricing (verified April 2026)

| Resource | Rate |
|---|---|
| 2 vCPU (default) | $0.000028/s |
| 1 GiB RAM | $0.0000045/s |
| **Default sandbox** | **$0.0000325/s** |

### Per-operation cost

| Operation | Duration | Cost |
|---|---|---|
| Workspace: run Python file | ~15s | $0.00049 |
| Workspace: run tests (Python) | ~30s | $0.00098 |
| Grading: Python submission | ~45s | $0.00146 |
| Grading: JS submission (npm install) | ~90s | $0.00293 |
| Adaptive generation (SoSE) | ~90s | $0.00293 |
| E2B validation retry | +45s each | +$0.00146 |
| SoWD: all operations | $0 | Sandpack = browser |

### $100 Hobby credit

At 60s average per operation: **~50,000 operations** before exhausting credit.
Hackathon demo with 100 students × 10 submissions = 1,000 ops = **$0.033**.

### Cost reduction

1. SoWD uses zero E2B — all frontend grading is free
2. Adaptive generation is cached — E2B validation runs once per generated assignment
3. Stub detection skips Gemma synthesis when starter code is unchanged
4. Set a budget cap at [e2b.dev/dashboard](https://e2b.dev/dashboard) → Settings → Budget

---

## 16. Architecture Decisions & Rationale

**No authentication** — Hackathon requirement for accessibility. UUID in localStorage.
For production, replace UUID with Clerk or Firebase Auth — it's used in one place.

**Firestore over PostgreSQL** — Real-time `onSnapshot` for SoP curriculum map; schema-free
for adaptive assignments; serverless-compatible; Firebase Storage integration for VLM.

**Novita (Kimi K2.5)** — Gemma 4 Good Hackathon requires Gemma 4. Novita provides it
via OpenAI-compatible API. Switching providers requires changing 2 lines in `lib/novita.ts`.

**E2B over Docker/VMs** — 150ms cold start; genuine kernel-level isolation; $0.003/run;
managed sandbox lifecycle via SDK.

**Sandpack over WebContainers** — No `Cross-Origin-Isolation` header configuration needed
on Vercel; 150ms render vs 5–10s boot; Apache 2.0 vs proprietary; `static`/`react` templates
cover all needed frameworks.

**Pattern matching for SoWD grading** — Running Puppeteer against Sandpack would require
server-side browser + wait for render. Pattern matching is instant, costs nothing, and mirrors
how senior engineers actually review frontend PRs — they read the code.

**`temperature: 0` for grading** — Reproducibility. Same code submitted twice must get the
same score. Essential for fair grading.

---

## 17. Roadmap — Designed but Not Yet Built

### Near-term

- [ ] **Curriculum progression unlock** — after score ≥60, auto-set next item `status: "available"`.
      Currently requires manual navigation. The data model is in place; just needs the unlock trigger.
- [ ] **GitHub OAuth** — commit SoSE workspace to a personal repo (Octokit, Git Data API).
      Full implementation design in `SOSE_ARCHITECTURE.md`.
- [ ] **SoWD TypeScript support** — add `ts` Sandpack template, route `.test.ts` to `ts-jest`.
- [ ] **Report PDF export** — generate a grading certificate for completed assignments.

### Medium-term

- [ ] **SoSE custom E2B templates** — pre-built Dockerfiles for Go, Java, TypeScript.
      Avoids `apt-get install` overhead on first run. Architecture designed; needs Dockerfiles.
- [ ] **Adaptive difficulty recalibration** — after scoring, adjust difficulty of next assignment
      based on actual score (not just starting proficiency). Currently difficulty is fixed at
      curriculum generation time.
- [ ] **Plagiarism detection** — embedding cosine similarity > 0.85 → flag for review.
- [ ] **Real-time SoSE terminal** — WebSocket PTY via Railway + xterm.js.

### Long-term

- [ ] **School of Data Science** — Jupyter notebooks with pandas/matplotlib. E2B for Python kernel.
- [ ] **CubeSandbox migration** — Tencent's open-source E2B-compatible sandbox (Apache 2.0).
      60ms cold start, self-hosted. E2B-compatible API = one env var to switch.
      Monitoring maturity (launched April 2025).
- [ ] **Multi-student collaborative workspaces** — real-time multiplayer for pair programming.

---

*Athena · School of Programming · School of Software Engineering · School of Web Development*
*Gemma 4-31B (Novita AI) · E2B · Sandpack · Firebase · Judge0 · Next.js 15 · Vercel*
*Gemma 4 Good Hackathon 2026 · Education Track · Swipesoft*
