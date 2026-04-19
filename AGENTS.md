# AGENTS.md — maths-engine

This file gives the AI agent full context about this codebase. Read it entirely before making any changes.

---

## What this project is

`maths-engine` is a **TypeScript LLM-as-Judge pipeline** that automatically evaluates student maths exam papers. It takes OCR-extracted LaTeX from scanned answer sheets, routes each question to a type-specific rubric, runs a dual-pass LLM judge with consensus gating, and returns a structured score with rationale.

The target accuracy is **MAE ≤ 1.5 marks** and **exact-match ≥ 70%** against human-marked golden datasets.

---

## Runtime and tooling

- **Runtime**: Bun (not Node.js). Use `bun` for all commands — never `npm run` or `node`.
- **Package manager**: Bun. Lockfile is `bun.lock`. Never generate a `package-lock.json`.
- **Linter/formatter**: Biome (`biome.json` at root). Run `bun biome check --apply .` before committing.
- **Git hooks**: Husky (`.husky/`). Pre-commit runs Biome. Do not bypass hooks with `--no-verify`.
- **TypeScript**: Strict mode. Config at `tsconfig.json`. Never use `any` — use `unknown` and narrow it.

### Key commands

```bash
bun run dev          # start dev server (server.ts with hot reload)
bun run eval         # run full eval suite against golden dataset
bun run eval:watch   # re-run eval on file changes
bun run build        # production build
bun run check        # lint check
bun run check:fix    # lint check
bun biome check --apply .  # lint + autofix
bun run prepare      
```

---

## Project structure

```
maths-engine/
├── src/
│   ├── config/          # environment variables, model config, thresholds
│   ├── core/            # shared utilities, LaTeX normaliser, types re-exports
│   ├── modules/
│   │   └── engine/
│   │       └── index.ts # main judge pipeline entry point
│   ├── types/
│   │   └── index.ts     # all shared TypeScript interfaces and Zod schemas
│   ├── index.ts         # application entry (exports public API)
│   └── server.ts        # HTTP server exposing /evaluate and /eval endpoints
├── .agents/             # Cursor agent skill definitions (do not edit manually)
├── .husky/              # git hooks
├── .vscode/             # editor settings
├── AGENTS.md            # this file
├── biome.json           # linter config
├── bun.lock             # lockfile (never manually edit)
├── package.json         # dependencies and scripts
├── skills-lock.json     # agent skill versions (do not edit manually)
└── tsconfig.json        # TypeScript config
```

---

## Core pipeline architecture

The judge pipeline lives in `src/modules/engine/index.ts`. Understand this flow before touching anything:

```
OCR output (raw LaTeX string)
        │
        ▼
LaTeX Normaliser          → strips boilerplate, segments Q/A boundaries,
(src/core/)                 normalises \frac vs /, extracts marks available
        │
        ▼
Question Type Router      → classifies into: algebra | calculus | proof | mcq
        │
        ▼
Type-Aware Rubric Loader  → loads rubric template from src/config/rubrics/
        │
        ▼
Judge Pass 1              → claude-sonnet-4-5 via Vercel AI SDK
(generateObject)            returns: criterionScores[], totalScore, confidence
        │
        ▼
Judge Pass 2              → gpt-4o (independent, no pass-1 context)
        │
        ▼
Consensus Gate            → if |score1 - score2| <= threshold → average
                            if diverged → tiebreaker via claude-opus-4-5
        │
        ▼
Final Output              → { finalScore, rationale, confidence, flags, runId }
```

---

## Types and schemas

All types live in `src/types/index.ts`. The canonical interfaces are:

```typescript
// Input to the judge pipeline
interface EvalInput {
  paperId: string;
  questionId: string;
  questionType: "algebra" | "calculus" | "proof" | "mcq";
  questionLatex: string;
  studentAnswerLatex: string;
  maxMarks: number;
}

// Output from a single judge pass (Zod schema, used with generateObject)
interface JudgmentResult {
  criterionScores: {
    criterion: string;
    awarded: number;
    maxMarks: number;
    rationale: string;
  }[];
  totalScore: number;
  confidence: "high" | "medium" | "low";
  flags?: string[];  // e.g. "ambiguous working", "answer only, no working shown"
}

// Final output after consensus gate
interface FinalScore {
  paperId: string;
  questionId: string;
  finalScore: number;
  consensus: boolean;
  pass1: JudgmentResult;
  pass2: JudgmentResult;
  tiebreaker?: JudgmentResult;
  processingMs: number;
}

// One entry in the golden dataset
interface GoldenEntry {
  id: string;                  // format: paper_{NNN}_q{N}
  questionType: EvalInput["questionType"];
  question: string;            // LaTeX
  studentAnswer: string;       // LaTeX
  humanScore: number;
  maxMarks: number;
  humanRationale: string;
  criterionScores: Record<string, number>;
}
```

When adding new types, always add them to `src/types/index.ts`. Never define types inline in implementation files.

---

## Golden dataset and eval

The golden dataset is the ground truth for measuring judge accuracy. It lives at:

```
src/config/golden/
├── golden.json        # all 100 hand-marked papers
├── algebra.json       # subset: algebra questions only
├── calculus.json      # subset: calculus questions only
├── proof.json         # subset: proof questions only
└── mcq.json           # subset: MCQ questions only
```

### Eval metrics (CI gate thresholds)

| Metric | Pass threshold | Fail threshold |
|--------|---------------|----------------|
| MAE (mean absolute error) | ≤ 1.5 marks | > 1.5 marks |
| Exact match % | ≥ 70% | < 70% |
| Within-1-mark % | ≥ 85% | < 85% |

The eval script computes these and exits with code 1 if any threshold is breached — this fails the CI pipeline. Never lower these thresholds without explicit discussion.

### Adding papers to the golden dataset

New entries must have a human expert score before being added. The format is strict — see `GoldenEntry` type above. IDs must follow the pattern `paper_{NNN}_q{N}` (zero-padded, e.g. `paper_047_q3`).

---

## Rubrics

Rubric templates live in `src/config/rubrics/`. Each question type has its own file:

- `algebra.ts` — step marks + final answer mark
- `calculus.ts` — derivative/integral working steps
- `proof.ts` — logical chain validity scoring
- `mcq.ts` — exact match + distractor penalty rules

Rubrics are TypeScript functions that take `maxMarks: number` and return a prompt string. When editing rubrics, always run `bun run eval` afterwards and verify MAE does not increase.

---

## LLM models and SDK

**SDK**: Vercel AI SDK (`ai` package) with `@ai-sdk/anthropic` and `@ai-sdk/openai`.

**Models in use**:

| Role | Model | Provider |
|------|-------|----------|
| Judge pass 1 | `claude-sonnet-4-5` | Anthropic |
| Judge pass 2 | `gpt-4o` | OpenAI |
| Tiebreaker | `claude-opus-4-5` | Anthropic |
| Question router | `claude-haiku-4-5-20251001` | Anthropic (fast, cheap) |

All model calls use `generateObject` with Zod schemas for structured output. Never use `generateText` for scoring — it bypasses schema validation.

**Never hardcode model strings** in implementation files. Import them from `src/config/models.ts`.

---

## Environment variables

Required in `.env`:

```
OPENROUTER_API_KEY             # using openRouter with different model inside that
EVAL_DATASET_PATH=src/config/golden/golden.json
LOG_LEVEL=info               # debug | info | warn | error
```

Access env vars only through `src/config/env.ts` — never via `process.env` directly in implementation files.

---

## HTTP API (server.ts)

The server exposes two endpoints:

```
POST /evaluate
  Body: EvalInput
  Returns: FinalScore

POST /eval/run
  Body: { subset?: "algebra" | "calculus" | "proof" | "mcq" }
  Returns: { mae, exactMatch, within1, byType, runs: EvalResult[] }
  Note: runs the full eval suite, may take 2–5 minutes for 100 papers
```

---

## Agent rules — read before every task

1. **Run `bun run eval` after every rubric or prompt change.** If MAE increases, revert.
2. **Never edit `bun.lock`, `skills-lock.json`, or `.agents/` directly.**
3. **TypeScript strict mode is non-negotiable.** Fix type errors, never suppress them with `// @ts-ignore`.
4. **All LaTeX handling goes through the normaliser in `src/core/`.** Never parse LaTeX inline in the engine.
5. **Keep judge prompts in `src/config/rubrics/`.** Never put prompt strings inside `src/modules/engine/index.ts`.
6. **Log structured JSON**, not plain strings. Use the logger from `src/core/logger.ts`.
7. **Model names come from `src/config/models.ts`** — nowhere else.
8. **The consensus threshold is configurable** via `CONSENSUS_THRESHOLD` env var. Do not hardcode it.
9. **When adding a new question type**, you must add: a rubric file, an entry in the router, a golden dataset subset, and update `EvalInput["questionType"]` union.
10. **Biome must pass** (`bun biome check .` returns 0 errors) before any commit.

---

## Common tasks and where to make changes

| Task | File(s) to edit |
|------|----------------|
| Improve a rubric prompt | `src/config/rubrics/{type}.ts` |
| Add a new question type | `src/types/index.ts`, `src/config/rubrics/`, `src/modules/engine/index.ts` (router) |
| Change judge models | `src/config/models.ts` |
| Add golden dataset entries | `src/config/golden/golden.json` + relevant subset file |
| Change eval thresholds | `src/config/eval.ts` |
| Add a new API endpoint | `src/server.ts` |
| Change consensus threshold | `.env` → `CONSENSUS_THRESHOLD` |
| Debug a specific paper | `POST /evaluate` with the paper's `EvalInput` and check `flags[]` in response |

---

## What good output looks like

A well-scored response from the judge looks like this:

```json
{
  "finalScore": 3,
  "consensus": true,
  "pass1": {
    "criterionScores": [
      { "criterion": "multiplied_both_sides", "awarded": 1, "maxMarks": 1, "rationale": "Student correctly multiplied both sides by 5" },
      { "criterion": "rearranged_correctly",  "awarded": 1, "maxMarks": 1, "rationale": "2x+3=35 is correct" },
      { "criterion": "isolated_x",            "awarded": 1, "maxMarks": 1, "rationale": "2x=32 correct" },
      { "criterion": "correct_final_answer",  "awarded": 0, "maxMarks": 1, "rationale": "Student wrote x=15, correct is x=16" }
    ],
    "totalScore": 3,
    "confidence": "high",
    "flags": ["arithmetic_error_final_step"]
  }
}
```

Flags are important — they surface patterns across papers (e.g. students systematically making arithmetic errors in the final step).

---

## Current status and known issues

- Proof question accuracy (within-1 %) is currently the weakest at ~62%. The proof rubric is the main area needing improvement.
- MCQ scoring is reliable (>88% exact match) and should not need changes.
- The question type router occasionally misclassifies combined algebra+calculus questions — these get routed to `algebra` by default.
- Tiebreaker invocation rate is tracked in eval output. Target is < 10% of papers triggering tiebreaker.

---

## Agent task tracker (maintain this)

Use this checklist for active implementation status so agents do not need to rescan the repository to infer what is done.

Update rules:
- Mark completed items with `[x]`.
- Mark pending items with `[ ]`.
- If work starts but is not complete, keep it as `[ ]` and append `(in progress)`.
- Add new tasks at the bottom with concise action phrases.

Current tracker:
- [x] Add shared routing types
- [x] Add model registry config
- [x] Implement OpenRouter provider helper
- [x] Build engine question router
- [x] Rewrite engine index orchestrator
- [x] Run lint and build checks
- [ ] Wire routing into `/evaluate` endpoint
- [ ] Add rubric registry and loader wiring
- [ ] Implement judge pass 1 and pass 2 modules
- [ ] Implement consensus gate and tiebreaker flow
- [ ] Add eval runner endpoint and dataset integration