# Maths Engine V1 Plan (Pre-Implementation)

## Goal
Build a V1 evaluation route that accepts structured text/LaTeX input for:
- question paper
- model answers
- student answers

Then evaluates all questions and returns:
- per-question marks
- criterion-wise rubric breakdown (non-MCQ)
- final total marks

## Key V1 Rules (Locked)
1. Input supports both plain text and LaTeX.
2. Evaluation is full-paper in one request.
3. Rubric is auto-generated from question + model answer for non-MCQ.
4. Section scoring policy:
	- Section A: strict objective/exact scoring (mostly MCQ)
	- Section B: key-point partial marking
	- Section C: weighted method + final answer marking
5. MCQ behavior:
	- direct deterministic checking
	- no improvement advice
	- no summary feedback
6. Feedback behavior for non-MCQ only:
	- explanation of awarded marks
	- improvement points only where needed

## Tool Strategy for AI Evaluation

We will expose 6 tools to the model in the evaluation flow.

1. `normalizePayloadTool`
	- Why: Normalize incoming paper/model/student payload to one consistent shape.
	- Needed for: mapping section + question number + ids safely.

2. `matchQuestionBundleTool`
	- Why: Build one bundle per question (`question`, `modelAnswer`, `studentAnswer`).
	- Needed for: avoiding mismatch and missing-link errors before scoring.

3. `gradeMcqDeterministicTool`
	- Why: Deterministic MCQ marking should not rely on generative reasoning.
	- Needed for: exact match marking, instant award/reject, lower cost/latency.
	- Output: marks, correctness, no advice fields.

4. `generateRubricTool`
	- Why: non-MCQ answers need criterion-level rubric auto-created from question + model answer.
	- Needed for: transparent and consistent partial marking.

5. `evaluateNonMcqTool`
	- Why: score non-MCQ against rubric with explanation and improvement points.
	- Needed for: short/long answer marking quality and actionable feedback.
	- Output: criterion marks + explanation + optional improvements.

6. `aggregateResultTool`
	- Why: unify per-question results to section totals + paper final result.
	- Needed for: one consistent response contract for clients.

## Why This Tool Count
- 6 tools are enough for V1 separation of concerns.
- MCQ is intentionally isolated into deterministic tool logic.
- Non-MCQ rubric + judging stay explicit for future upgrades.
- Aggregation stays independent so response shape remains stable.

## API Plan (V1)

### Endpoint
- `POST /api/evaluation/paper`

### Request (high level)
- paper metadata
- questions[]: `{ questionNo, section, maxMarks, type, topic?, text?, latex? }`
- modelAnswers[]: `{ questionNo, section, type, answerText?, answerLatex?, mcqCorrectOption? }`
- studentAnswers[]: `{ questionNo, section, answerText?, answerLatex? }`

### Response (high level)
- `questionResults[]`
  - common: `questionNo, section, type, marksAwarded, maxMarks`
  - MCQ: `isCorrect, selectedOption, correctOption`
  - non-MCQ: `rubricBreakdown[], explanation, improvements[]`
- `sectionTotals[]`
- `finalTotal`

## Execution Phases
1. Define/extend Zod schemas and TS types for full-paper evaluation.
2. Add OpenRouter + AI SDK provider helper and model config wiring.
3. Implement engine orchestrator with tool-enabled evaluation flow.
4. Implement deterministic MCQ path and non-MCQ rubric path.
5. Add evaluation route + validation + standardized API response.
6. Add logging and domain errors for mismatch/fallback conditions.
7. Validate with sample payloads and run project checks/build.

## Constraints and Guardrails
- Never return improvement advice for MCQ.
- Non-MCQ improvements should be returned only when there is a real gap.
- No OCR/image parsing in V1 (input is already text/LaTeX).
- Keep model ids/env-driven for provider portability.

## TODO Table (Maintain During Implementation)

| Task | Owner/Module | Status | Notes | Done Date |
|---|---|---|---|---|
| Write pre-implementation architecture + tool plan in AGENTS.md | docs | Done | Includes tool count, purpose, MCQ/non-MCQ behavior | 2026-04-20 |
| Define PaperEvaluation request/response schemas | src/types | Done | Added strict Zod validation and question linking contracts | 2026-04-20 |
| Add AI provider helper (AI SDK + OpenRouter) | src/config | Done | Added shared provider helper using env MODEL_NAME | 2026-04-20 |
| Implement normalize + matching tools | src/modules/engine | Done | Added normalizePayloadTool + matchQuestionBundleTool | 2026-04-20 |
| Implement deterministic MCQ grading tool | src/modules/engine | Done | Added exact-match MCQ scorer with no advice fields | 2026-04-20 |
| Implement rubric generation tool for non-MCQ | src/modules/engine | Done | Added schema-driven rubric generation via AI output object | 2026-04-20 |
| Implement non-MCQ evaluation tool | src/modules/engine | Done | Added schema-driven non-MCQ scoring with explanation/improvements | 2026-04-20 |
| Implement result aggregation tool | src/modules/engine | Done | Added section and final total aggregation tool | 2026-04-20 |
| Add POST /api/evaluation/paper route | src/modules + src/index.ts | Done | Added route with validation middleware + async handler | 2026-04-20 |
| Add error handling/logging for failures and fallbacks | src/core + src/modules | Not Started | Deterministic + AI fallback observability | |
| Run checks/build and verify with sample payloads | project | In Progress | `bun run check` `bun run check:fix` and `bun run build` pass after route integration; sample payload verification pending | |

## Immediate Next Step After Plan Approval
Start Phase 1 code work by adding/expanding shared schemas in `src/types/index.ts`, then wire the evaluation route and engine tool flow.
