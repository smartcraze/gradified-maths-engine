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

## Current Context
The repository already has a partial grading pipeline in place, but the HTTP evaluation route is not wired yet.

Already in place:
- Express app with `/health` only in `src/index.ts`
- Hybrid grading flow in `src/modules/grading/index.ts`
- Structured exam extraction in `src/modules/structure`
- Deterministic MCQ grading tools in `src/modules/grading/tools`
- LLM-backed non-MCQ grading with structured output in `src/modules/grading/llm.ts`
- Final evaluation merge and summary computation in `src/modules/grading/evaluation.ts`
- Evaluation schema types in `src/modules/grading/schema.ts`

Not yet exposed through the API:
- A dedicated `POST` evaluation endpoint
- Request/response DTOs for the public route
- Validation and error handling around the grading input payload
- Persistence or caching for evaluation runs

## What We Have Made It Through
1. Confirmed the repo scope and runtime setup from the workspace docs and repo notes.
2. Identified the grading entry point as `gradeStudentAnswerSheet(...)` in `src/modules/grading/index.ts`.
3. Verified the grading flow is already split into MCQ and non-MCQ paths.
4. Verified the current server surface only exposes a health check.
5. Confirmed the final output already includes per-question marks, summary totals, and overall feedback; the missing piece is the API route wrapper.

## Implementation Plan
1. Add a request schema for the V1 evaluation route that accepts question paper, model answers, and student answers.
2. Add a `POST` endpoint that calls `gradeStudentAnswerSheet(...)` and returns the final evaluation payload.
3. Preserve rubric breakdown details in the response for non-MCQ questions, including step-level and key-point analysis where available.
4. Add guardrails for empty input, malformed payloads, and grading failures.
5. Add at least one focused test or demo path that exercises the full request-to-response grading flow.

## Rubric Rules To Preserve
The evaluation logic should reflect the image-based rubric:
- MCQ: exact or equivalent final answer only, full mark or zero.
- Short answers: concept and final answer both matter.
- Long answers: score concept, method, steps, and final answer separately.
- Follow-through logic: consistent downstream work after an early mistake should still earn partial credit.
- Tolerance logic: allow small numeric/rounding variation where appropriate.
- Multi-method recognition: accept valid alternate solution methods.
- Presentation issues should cause only small deductions unless they change correctness.

## Notes
- Keep model IDs in config/env, not hardcoded inside route code.
- Keep the API response deterministic and schema-backed so the route can be consumed reliably by the frontend or tests.

