# 🏛️ Athena — World's First Education ArchAgent

> **Gemma 4 Good Hackathon 2026 · Google DeepMind × Kaggle · Education Track**

Athena is not a chatbot. It is not a prompt pipeline. It is an **ArchAgent** — a second-order autonomous system that *architects* your entire learning ecosystem, then evolves it as you grow.

---

## Table of Contents

1. [What is an ArchAgent?](#what-is-an-archagent)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Environment Variables](#environment-variables)
7. [Firebase Setup](#firebase-setup)
8. [Running the App](#running-the-app)
9. [Deploying to Vercel](#deploying-to-vercel)
10. [Project Structure](#project-structure)
11. [How the ArchAgent Loop Works](#how-the-archagent-loop-works)
12. [Faculties and Assessment Environments](#faculties-and-assessment-environments)

---

## What is an ArchAgent?

An **Agent** is a single-loop problem solver: *observe → reason → act → repeat.*

An **ArchAgent** is a second-order system — one that operates *on* agents rather than *as* an agent. It:

- **Designs** the agent ecosystem for each learner (which subagents, which environments, which constraints)
- **Coordinates** multiple specialised subagents (tutor, assessor, curriculum planner, environment agent)
- **Evolves** the architecture based on evidence from observed outcomes
- **Enforces** pedagogical policies via a built-in Compiler layer

Where an agent *solves* tasks, an ArchAgent *designs and evaluates the solvers.*

---

## Features

### Core ArchAgent Loop
- **Diagnostic Assessment** — Gemma 4 generates 5 calibration questions on enrolment
- **Curriculum Architecture** — ArchAgent designs a 12-module personalised curriculum based on diagnostic score, goals, and learning preferences
- **Live Adaptation** — After each assessment, the ArchAgent reviews evidence and restructures the curriculum (advance, remedial, or full restructure)
- **Compiler Layer** — Every ArchAgent decision passes through a policy enforcer before execution
- **Analyzer** — All events are logged to Firestore for evidence-based ArchAgent review

### Lecture Engine
- 8 animated beat types per lecture (title card, concept reveal, code walkthrough, equation, graph plot, animated diagram, comparison table, summary card)
- 8 animated diagram variants (call stack, bubble sort, BST traversal, wave function, vector field, organ highlight, case timeline, colour wheel)
- Live QA Chat — streaming Gemma 4 tutor, Socratic and contextually aware of the current lecture

### Assessment Environments
| Faculty | Environments |
|---|---|
| Programming | Judge0 sandbox (code execution), GitHub Actions (complex builds) |
| Medicine | MCQ + clinical cases + Gemma 4 VLM image grading (X-rays, MRI, anatomy) |
| STEM | Computational notebooks, equation assessment |
| Law | Essay grading with case analysis rubric |
| Humanities | Take-home essays, LLM graded |
| Arts | Image upload → Gemma 4 VLM aesthetic scoring |

### Student Experience
- No login required — UUID session via localStorage, judges can test instantly
- Session resumption — returning students land on their exact position
- Real-time dashboard — Firestore onSnapshot means curriculum map updates live as ArchAgent restructures
- Responsive — works on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| LLM | Gemma 4-31B via Novita AI (OpenAI-compatible) |
| Database | Firebase Firestore (NoSQL, real-time) |
| File Storage | Firebase Storage |
| Code Execution | Judge0 CE (RapidAPI) |
| Styling | Tailwind CSS + custom CSS design system |
| Animations | CSS animations + SVG + Recharts |
| Deployment | Vercel |

---

## Prerequisites

- Node.js >= 18.17.0
- npm >= 9.0.0
- A Novita AI account → novita.ai
- A Firebase project (free Spark plan is sufficient)
- A RapidAPI account with Judge0 CE subscribed → rapidapi.com

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/athena.git
cd athena
```

### 2. Install dependencies

```bash
npm install
```

---

## Environment Variables

Copy the example file and fill in your keys:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in every value:

```env
# Novita — Gemma 4-31B inference
NOVITA_API_KEY=your_novita_api_key

# Firebase project credentials (all required)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Judge0 via RapidAPI
JUDGE0_API_KEY=your_rapidapi_key
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
```

Where to find each key:

| Key | Source |
|---|---|
| NOVITA_API_KEY | novita.ai → Dashboard → API Keys |
| NEXT_PUBLIC_FIREBASE_* | Firebase Console → Project Settings → Your Apps → Web App |
| JUDGE0_API_KEY | RapidAPI → Judge0 CE → Subscribe → App Keys |

> NOVITA_API_KEY and JUDGE0_API_KEY must never have the NEXT_PUBLIC_ prefix. They are server-only.

---

## Firebase Setup

### Step 1: Create a Firebase project

1. Go to console.firebase.google.com
2. Click Add project, name it `athena`
3. Disable Google Analytics (not needed)

### Step 2: Add a Web App

1. In your project, click the Web icon (`</>`)
2. Register the app as `athena-web`
3. Copy the firebaseConfig values into your `.env.local`

### Step 3: Enable Firestore

1. Firebase Console → Firestore Database
2. Click Create database
3. Choose Start in test mode for local development
4. Select a region (e.g. `europe-west2` for UK)

### Step 4: Enable Storage

1. Firebase Console → Storage
2. Click Get started
3. Start in test mode
4. Use the same region as Firestore

### Step 5: Deploy security rules (required before sharing a public link)

Install the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```

Select your athena project, then deploy:

```bash
firebase deploy --only firestore:rules,storage
```

This applies `firestore.rules` and `storage.rules` from the project root.

---

## Running the App

### Development

```bash
npm run dev
```

Open http://localhost:3000

### Production build

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

---

## Deploying to Vercel

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. Add all environment variable values when asked.

### Option B: Vercel Dashboard

1. Push your project to GitHub
2. Go to vercel.com → New Project
3. Import your GitHub repo
4. Under Environment Variables, add all keys from `.env.local`
5. Click Deploy

Vercel detects Next.js automatically. No additional configuration needed.

---

## Project Structure

```
athena/
├── app/
│   ├── page.tsx                      # Landing page
│   ├── layout.tsx                    # Root layout
│   ├── globals.css                   # Design system + CSS variables
│   ├── onboarding/page.tsx           # 4-step enrolment flow
│   ├── dashboard/page.tsx            # Curriculum map + ArchAgent log
│   ├── lecture/[moduleId]/page.tsx   # Animated lecture player
│   ├── assess/[moduleId]/page.tsx    # Adaptive assessment environment
│   └── api/
│       ├── archagent/route.ts        # ArchAgent decisions + curriculum gen
│       ├── lecture/generate/         # Lecture JSON generation
│       ├── assess/
│       │   ├── judge0/route.ts       # Code execution + Gemma grading
│       │   └── image/route.ts        # VLM image grading
│       └── chat/route.ts             # Streaming QA tutor (SSE)
│
├── components/
│   ├── lecture/
│   │   ├── TitleBeat.tsx
│   │   ├── ConceptBeat.tsx
│   │   ├── CodeBeat.tsx
│   │   ├── EquationBeat.tsx
│   │   ├── GraphBeat.tsx
│   │   ├── DiagramBeat.tsx           # 8 animated SVG diagram variants
│   │   ├── TableBeat.tsx
│   │   ├── SummaryBeat.tsx
│   │   └── QAChat.tsx                # Streaming chat sidebar
│   └── assessment/
│       └── ImageUploadAssessor.tsx   # Firebase Storage + VLM grading
│
├── lib/
│   ├── types.ts                      # All TypeScript types
│   ├── firebase.ts                   # Firestore + Storage init
│   ├── firestore.ts                  # CRUD + real-time subscriptions
│   ├── novita.ts                     # Gemma 4 client
│   ├── student-identity.ts           # UUID session management
│   ├── archagent.ts                  # ArchAgent core + Compiler
│   └── lecture-generator.ts         # Gemma → LectureJSON
│
├── firestore.rules                   # Firestore security rules
├── storage.rules                     # Firebase Storage security rules
├── firebase.json                     # Firebase deployment config
├── firestore.indexes.json
├── .env.local.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## How the ArchAgent Loop Works

```
Student enrolls (name + faculty + goals)
        │
        ▼
Diagnostic Assessment (5 Gemma-generated questions)
        │
        ▼
ArchAgent.generateCurriculum()
  Inputs: faculty, diagnosticScore, preferences, goals
  Output: 12-module curriculum → Firestore
        │
        ▼
Module 1 unlocked
        │
        ▼
Tutor generates LectureJSON → Lecture player renders beats
        │
        ▼
QA Chat (student asks questions, Gemma responds with Socratic method)
        │
        ▼
Assessment (environment selected by ArchAgent per faculty and topic)
  ├── Code    → Judge0 sandbox + Gemma code review
  ├── MCQ     → Instant scoring
  ├── Essay   → Gemma rubric grading
  └── Image   → Firebase Storage → Gemma 4 VLM scoring
        │
        ▼
ArchAgent.archAgentDecide()
  Reads: moduleScore, errorPatterns, full curriculum history
  Compiler validates against policy rules
  Output: advance | remedial | restructure | complete
        │
        ▼
Firestore updated → Dashboard re-renders (onSnapshot)
        │
        ▼
Next module unlocked → Repeat
```

---

## Faculties and Assessment Environments

| Faculty | Lecture Diagrams | Assessment |
|---|---|---|
| Programming | Call stack, sorting viz, BST traversal, code walkthrough | Judge0 code execution |
| Medicine | Organ highlight, drug pathway, clinical case | MCQ + VLM image grading |
| STEM | Wave function, vector field, graph plots, equations | Computational notebooks |
| Law | Case timeline, comparison tables, quote reveal | Essay + rubric grading |
| Humanities | Quote reveal, concept reveal, comparison tables | Essay grading |
| Arts | Colour wheel, visual concepts | Image upload + VLM scoring |

---

*Powered by Gemma 4-31B · Built with Next.js 15 · Firebase · Vercel*
*Gemma 4 Good Hackathon 2026 — Education Track*
