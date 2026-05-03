# Meta-Harness & ArchAgent: A Research Distillation

> A comprehensive synthesis of theory, implementation, and the Athena build journal.
> Compiled from research on the Meta-Harness paper (arXiv:2603.28052) and the development of Athena, the world's first education ArchAgent.

---

## Part I: The Meta-Harness Paper

### What is a Harness?

A **harness** is the executable scaffolding that wraps a language model and determines:
- What information the model sees at each reasoning step
- What context is retrieved, stored, or presented
- How tool calls are sequenced and results are handled
- What memory is maintained across turns

The harness is not the model — it is the *architecture* around the model. It is the difference between a raw LLM responding to a prompt and a production system delivering reliable, contextually-aware outputs.

Critically, the performance of any LLM system depends *at least as much* on the harness as on the model weights themselves. Yet until Meta-Harness, harnesses were designed almost entirely by hand.

### The Meta-Harness Insight

Prior text optimisation methods were fundamentally limited by how much feedback they could process:
- Some were **memoryless** — conditioning only on the current candidate
- Some used only **scalar scores** — losing all diagnostic signal
- Some compressed feedback into **short summaries** — destroying causal relationships across long horizons

Harness engineering requires reasoning over long horizons: a single decision about what to store, when to retrieve it, or how to format it can affect behaviour many reasoning steps later. Compressed feedback cannot support this kind of credit assignment.

Meta-Harness takes a radically different approach: **give the proposer full, uncompressed access to everything.**

### The Meta-Harness Architecture

The system has three components:

**1. The Filesystem**
A growing repository that stores, for every prior candidate harness:
- Full source code
- Evaluation scores
- Raw execution traces (up to 10M tokens per iteration — orders of magnitude more than prior methods)

**2. The Proposer**
A coding agent (specifically Claude Code in the paper) that:
- Reads the filesystem via standard tools (`grep`, `cat`)
- Decides *which* prior artifacts to inspect (non-Markovian access pattern — reads a median of 82 files per iteration, referencing 20+ prior candidates per step)
- Performs counterfactual diagnosis across execution traces
- Proposes targeted harness edits or complete rewrites
- Validates changes through direct codebase interaction

**3. The Search Loop**
1. Proposer reads filesystem → proposes new harness
2. Harness is evaluated on held-out tasks
3. All logs (code, reasoning traces, scores) stored in filesystem
4. Loop repeats

### Key Results

| Task | Improvement |
|---|---|
| Online text classification | +7.7 points over ACE (state-of-the-art), using 4× fewer context tokens |
| IMO-level math reasoning | +4.7 points average across 5 held-out models |
| Agentic coding (TerminalBench-2) | Surpasses best hand-engineered baseline (+1.7 points) |

Most importantly: the discovered harnesses **generalise out-of-distribution** and **transfer across model variants** — the system learns genuinely robust strategies, not dataset-specific hacks.

### Why the Ablations Matter

Meta-Harness ran a critical ablation of information available to the proposer:

| Configuration | Median Accuracy | Best Accuracy |
|---|---|---|
| Scores only | 34.6 | 41.3 |
| Scores + summary | 34.9 | 38.7 |
| Full Meta-Harness (raw traces) | **significantly higher** | **significantly higher** |

This is the empirical proof that compressed feedback is not just suboptimal — it removes information that is structurally necessary for harness engineering.

### The Strategic Implication

Meta-Harness signals a **shift from prompt optimisation to automated system architecture design**. The next frontier of AI engineering is not better models — it is better harnesses around models. And the best harnesses will be discovered by agents, not designed by hand.

---

## Part II: The ArchAgent Concept

### Defining the ArchAgent

We introduce the **ArchAgent** as a natural extension of the agentic AI frontier — the formal concept that Meta-Harness implicitly demonstrates but never names.

**An agent** is a first-order autonomous system:
```
observe → reason → act → repeat
```
It solves tasks within an environment.

**An ArchAgent** is a second-order autonomous system:
```
observe agent behaviour → reason about agent architecture → modify agent ecosystem → evaluate outcomes → repeat
```
It *architects the structure of action itself.*

### Formal Definition

An ArchAgent is a meta-level autonomous system that:
1. **Coordinates** multiple specialised agents, tools, and workflows
2. **Composes** new agent configurations from available primitives
3. **Evolves** the agent ecosystem based on observed evidence
4. **Enforces** constraints and policies on the systems it modifies

Mathematically, if an agent is a first-order function:
```
Agent: (State × Goal) → Action
```

Then an ArchAgent is a second-order functional:
```
ArchAgent: (AgentSpace × EvidenceSpace × PolicySpace) → AgentSpace
```

It maps a space of possible agent configurations, plus evidence and policy, to a new (better) agent configuration.

### Agent vs ArchAgent: The Distinction

| Dimension | Agent | ArchAgent |
|---|---|---|
| Operates on | Environment | Agent ecosystems |
| Primary output | Actions | Agent configurations |
| Decision horizon | Single task | Multi-task, multi-agent, long-horizon |
| Self-modification | No | Yes (within policy) |
| Novel agent creation | No | Potentially yes |
| Evidence base | Current state | Full history of outcomes |

### The Conductor Analogy

Given a system comprising multiple specialised agents (error diagnostician, pacer, retriever, curriculum planner), the ArchAgent becomes the conductor who:
- Decides which agent to activate
- Sequences their outputs
- Sets constraints and adaptations per agent
- Verifies and evaluates proposed agent solutions from observed effects

Where an agent *solves tasks*, an ArchAgent *designs and evaluates the solvers.*

### The Compiler: Safe Autonomy

A key innovation in the ArchAgent paradigm is the **Compiler** — a mediating layer between ArchAgents and the systems they modify.

When an ArchAgent proposes a change, the Compiler:
1. Receives the proposed modification
2. Deterministically evaluates it against a set of rules, policies, and constraints
3. Either approves (passing execution downstream) or rejects (triggering fallback)

This is analogous to how a programming language compiler enforces type safety and syntax correctness before any code executes. The Compiler ensures ArchAgents are **powerful but bounded** — enabling safe autonomy.

Examples of Compiler rules in Athena:
- Score < 60 → cannot advance (override to remedial)
- Remedial ratio > 20% → cannot mark course complete
- Arts faculty student → cannot receive Judge0 environment
- Unlock gate: module N+1 cannot activate until module N reaches threshold

### The Analyzer: Evidence-Based Evolution

The **Analyzer** is the ArchAgent's evidence base — a structured log of all observed outcomes that the ArchAgent reads when making architectural decisions.

Every interaction is an evidence point:
- `lecture_completed` → did the student watch to the end? how long did they pause?
- `assessment_submitted` → score, error patterns, time taken
- `qa_asked` → what concepts did they not understand from the lecture?
- `module_advanced` → what was the ArchAgent's reasoning?
- `curriculum_restructured` → what triggered the restructure and what was the outcome?

This is the ArchAgent equivalent of Meta-Harness's filesystem. The richer and more uncompressed this evidence base, the better the ArchAgent's decisions.

### Connection to Meta-Harness

Meta-Harness is, in our framing, a **self-architecting harness ArchAgent**. Its proposer is an ArchAgent that:
- Observes prior harness performance (evidence base = filesystem)
- Decides which harness modifications to make (architectural decision)
- Applies changes through code editing tools (action)
- Evaluates outcomes on held-out tasks (assessment)
- Repeats with full non-Markovian access to all prior evidence

Athena extends this paradigm from harness engineering to education. The ArchAgent doesn't optimise prompts — it optimises the entire learning architecture for each individual student.

---

## Part III: Athena — Implementation Record

### Architecture Overview

```
Athena (ArchAgent)
├── Orchestrator         ← Core decision engine
│     ├── generateCurriculum()   — designs 12-module personalised curriculum
│     ├── archAgentDecide()      — progression decision after each assessment
│     └── Compiler               — policy enforcement layer
├── Analyzer             ← Evidence logger (Firestore analytics collection)
├── Tutor Subagent       ← Lecture generation + QA chat
├── Assessor Subagent    ← Assessment creation + grading
└── Memory System        ← Firebase Firestore (real-time, no backend)
```

### The LectureJSON Schema

Gemma generates structured lecture content using a typed schema:

```typescript
type LectureBeat =
  | { type: "title_card"; heading; subheading; durationMs }
  | { type: "concept_reveal"; text; emphasis[]; durationMs }
  | { type: "code_walkthrough"; language; code; highlights; explanation; durationMs }
  | { type: "animated_diagram"; variant: DiagramVariant; data; caption; durationMs }
  | { type: "equation"; latex; explanation; durationMs }
  | { type: "graph_plot"; x[]; y[]; xLabel; yLabel; chartType; durationMs }
  | { type: "comparison_table"; headers[]; rows[][]; durationMs }
  | { type: "summary_card"; points[]; durationMs }
  | { type: "clinical_case"; scenario; question; imageUrl?; durationMs }
```

This is the Athena equivalent of Meta-Harness's harness code — the structured specification that drives the entire lecture rendering pipeline.

---

## Part IV: Features Implemented

### Infrastructure
- [x] Next.js 15 App Router scaffold (TypeScript, Tailwind)
- [x] Firebase Firestore integration with real-time `onSnapshot` subscriptions
- [x] Firebase Storage integration for image uploads
- [x] Firestore security rules (studentId-gated read/write)
- [x] Firebase Storage security rules (image type + size validation)
- [x] Novita/Gemma 4-31B client (`gemmaComplete`, `gemmaJSON`, `gemmaStream`)
- [x] UUID-based student identity (no auth, localStorage persistence)
- [x] Session resumption detection on landing page
- [x] Full TypeScript type system (`types.ts` — all domain types defined)

### ArchAgent Core
- [x] `generateCurriculum()` — Gemma generates 12 personalised modules from diagnostic score + goals
- [x] `archAgentDecide()` — evidence-based progression decision (advance / remedial / restructure / complete)
- [x] **Compiler layer** — policy enforcement on every ArchAgent decision
- [x] `generateDiagnostic()` — Gemma generates 5 calibration MCQ questions per faculty
- [x] Faculty → assessment environment mapping (automatic per topic)
- [x] `applyArchAgentDecision()` — Firestore mutation + event log

### Analyzer (Evidence System)
- [x] `logEvent()` — structured event logging to Firestore analytics collection
- [x] Event types: `lecture_completed`, `assessment_submitted`, `qa_asked`, `module_advanced`, `curriculum_restructured`
- [x] ArchAgent decision notes stored per module in student profile

### Tutor Subagent
- [x] `generateLectureJSON()` — Gemma generates full LectureJSON per module + student level
- [x] Faculty-specific diagram and beat type hints in generation prompt
- [x] Lecture persistence — generated LectureJSON cached in Firestore
- [x] `/api/lecture/generate` — API route wiring generation + Firestore persist

### Lecture Player
- [x] Beat-by-beat auto-advance player (timer per beat's `durationMs`)
- [x] Manual beat navigation (dot scrubber)
- [x] Narration display per beat (voice-over text)
- [x] Progress bar (beats completed / total)
- [x] **TitleBeat** — ambient glow hero card with Playfair Display serif heading
- [x] **ConceptBeat** — animated text reveal with emphasis word highlighting
- [x] **CodeBeat** — line-by-line code reveal with lightweight syntax colouring and line highlights
- [x] **EquationBeat** — async KaTeX rendering with explanation panel
- [x] **GraphBeat** — animated Recharts line / bar / scatter with draw animation
- [x] **DiagramBeat** with 8 animated variants:
  - [x] `call_stack` — animated stack frames pushing/popping with TOP pointer
  - [x] `sorting_viz` — live bubble sort with colour-coded comparing/sorted bars
  - [x] `tree_traversal` — BST in-order traversal with node lighting
  - [x] `wave_function` — animated ψ(x) and |ψ|² sine waves
  - [x] `vector_field` — rotating animated arrow field
  - [x] `organ_highlight` — SVG body diagram with pulsing organ highlight
  - [x] `timeline` — animated case/event timeline (law/history)
  - [x] `quote_reveal` — character-by-character quote typewriter reveal
  - [x] `color_theory` — rotating colour wheel with primary/secondary swatches
- [x] **TableBeat** — row-by-row animated comparison table
- [x] **SummaryBeat** — staggered key takeaway reveal with completion signal

### QA Chat
- [x] Streaming SSE response from Gemma (`/api/chat`)
- [x] Full conversation history passed per turn
- [x] Context-aware system prompt (current module, topic, objectives)
- [x] Typing cursor animation during streaming
- [x] Sidebar toggle (lecture + chat side by side)

### Assessment System
- [x] `generateAssessmentQuestions()` — Gemma generates 3 questions per module
- [x] **MCQ assessment** — instant scoring with correct answer reveal
- [x] **Code execution assessment** — Judge0 CE integration with language routing
- [x] **Gemma code review** — qualitative feedback on top of Judge0 verdict
- [x] **Essay assessment** — Gemma rubric-based grading with `errorPatterns` extraction
- [x] **Image upload assessment** — Firebase Storage → Gemma 4 VLM grading
- [x] `/api/assess/judge0` — code execution + AI grading route
- [x] `/api/assess/image` — multimodal VLM grading route (base64 image + text)
- [x] `ImageUploadAssessor` component — drag-and-drop upload with progress bar + VLM grading
- [x] Pre-graded image answer parsing in submit handler
- [x] Results screen with per-question breakdown, ArchAgent decision display
- [x] Score → Firestore persist + progression decision trigger

### Pages & UI
- [x] **Landing page** — hero, faculty pills, how-it-works section, returning student detection
- [x] **Onboarding** — 4-step flow: name → faculty → goals + preferences → diagnostic → curriculum generation
- [x] **Dashboard** — sidebar (name, faculty, progress bar, competency scores), curriculum map (live Firestore), ArchAgent decision log
- [x] **Lecture page** — full beat player, QA sidebar toggle, assessment CTA on completion
- [x] **Assessment page** — adaptive question rendering per assessment type, submit + results
- [x] Design system — dark theme, amber accent, Playfair Display + DM Sans + DM Mono typography, grain overlay, ambient radial gradients, CSS animations
- [x] Responsive layout

---

## Part V: Outstanding Todolist

### High Priority (Before Demo)

- [ ] **GitHub Actions assessment environment** — for Programming faculty "project" topics: trigger a real GitHub Actions workflow via API with student code, return CI results as grading signal
- [ ] **Jupyter notebook environment** — for STEM faculty: embedded Python notebook (use Pyodide or an iframe to a hosted JupyterLite instance) so students can run cells interactively
- [ ] **TTS narration** — wire Google Cloud TTS to generate MP3 per beat narration string, play synchronously with beat display (currently narration is displayed as text only)
- [ ] **`/api/assess/essay`** — dedicated essay grading route with multi-dimensional rubric (argument quality, evidence, structure, clarity) rather than the inline gemmaJSON call
- [ ] **Competency model updates** — after each assessment, update `profile.competencyModel[topic]` with the new score and confidence (currently only `module.score` is written)
- [ ] **`/api/archagent` restructure action** — the `restructure` decision is computed but the actual curriculum reordering logic (splice / reorder modules) is not yet applied, only individual module field updates

### Medium Priority (Week 2-3)

- [ ] **Arts faculty image rubric system** — per-topic rubric generation for visual art (composition, colour, technique, originality) rather than the generic rubric passed from the assessment question
- [ ] **Medicine VLM structured output** — for radiology/imaging beats, generate structured differential diagnosis JSON from VLM response (not just free text feedback)
- [ ] **PDF study notes generator** — after each lecture, offer downloadable PDF summary using `@react-pdf/renderer` — Gemma generates markdown → render as styled PDF
- [ ] **Remedial loop UI** — when ArchAgent triggers remedial, show a dedicated remedial module view (shorter re-lecture on the failing concept + simpler assessment) rather than just changing the module status badge
- [ ] **Multi-model comparison** — ArchAgent spawns two assessment strategies in parallel (e.g. MCQ vs code), evaluates both, picks the one with higher diagnostic signal (the Meta-Harness parallel evaluation pattern)
- [ ] **Curriculum restructure visualisation** — animated diff on the dashboard showing exactly what the ArchAgent changed and why (makes the demo moment explicit for judges)
- [ ] **Competency radar chart** — recharts RadarChart on the dashboard showing per-topic scores across all assessed topics

### Architecture (Post-Hackathon)

- [ ] **ArchAgent filesystem** — implement a Firestore-backed "harness filesystem" analogous to Meta-Harness: store all prior curriculum configurations, assessment strategies, and outcomes so the ArchAgent can do non-Markovian review across all students
- [ ] **Cross-student learning** — ArchAgent reads anonymised outcomes across all students in the same faculty to improve its curriculum generation (e.g. "module 3 on Python decorators consistently causes remedial triggers — restructure it")
- [ ] **ArchAgent self-evaluation** — the ArchAgent periodically reviews its own past decisions against outcomes and refines its decision policy (genuine meta-harness behaviour)
- [ ] **GitHub Actions integration** — full CI pipeline as an assessment environment: student pushes code to a generated private repo, GitHub Actions runs test suite, results feed back to Athena
- [ ] **Collaborative learning mode** — two students working on the same curriculum can see each other's QA questions (anonymised) — the ArchAgent uses peer error patterns to adjust individual curricula
- [ ] **Multi-faculty curriculum** — student can take courses across faculties (e.g. Medicine + Programming = Medical Informatics path), ArchAgent composes cross-faculty curriculum
- [ ] **ArchAgent paper integration** — Athena's ArchAgent decision log is exportable as a research dataset demonstrating long-horizon adaptive curriculum decisions

---

## Part VI: Key Architectural Decisions and Rationale

| Decision | Rationale |
|---|---|
| Firebase over MongoDB | Zero infrastructure, Google ecosystem (competition), real-time listeners for live dashboard, Storage solves image upload automatically |
| Novita over direct Gemma API | OpenAI-compatible SDK, serverless, no GPU management, Gemma 4-31B available immediately |
| No authentication (UUID sessions) | Competition judges need zero-friction demo access; UUID in localStorage gives sufficient identity for progress tracking |
| LectureJSON schema over free-form | Structured output enables typed React rendering, beat-by-beat animation, and Compiler validation of lecture content |
| Compiler as separate layer | Keeps ArchAgent decision logic clean and testable; policy changes don't require touching core ArchAgent reasoning |
| In-browser beat player over Remotion server render | Zero render servers, sub-2-second load, no MP4 storage costs, fully interactive |
| Firestore onSnapshot for dashboard | ArchAgent curriculum restructure is immediately visible to student without polling — the demo moment is live |

---

*Research synthesised from: "Meta-Harness: End-to-End Optimization of Model Harnesses" (arXiv:2603.28052, Yoonho Lee et al., Stanford/MIT, 2026) and the Athena ArchAgent paper draft by Emmanuel Uramah.*
