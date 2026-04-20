# AGENTS.md — maths-engine

This document defines how the maths evaluation engine works. Read fully before making changes.

---

# 1. What this project is

`maths-engine` is a **hybrid deterministic + LLM evaluation system** for grading student mathematics exam papers.

The system prioritizes:

* **Deterministic evaluation (primary)**
* **LLM-based judgment (fallback only)**

Goal:

* MAE ≤ 1.5 marks
* Exact match ≥ 70%

---

# 2. Core Philosophy (IMPORTANT)

Do NOT use LLMs where logic can solve the problem.

### Order of evaluation:

1. Deterministic engine (default)
2. LLM judge (only if required)

---

# 3. Runtime and tooling

* Runtime: Bun (NOT Node.js)
* Package manager: Bun
* Linter: Biome
* TypeScript: Strict mode (no `any`)

### Commands

```bash
bun run dev
bun run eval
bun run build
bun run check
bun biome check --apply .
```

---

# 4. Project structure

```
maths-engine/
├── src/
│   ├── config/
│   │   ├── models.ts
│   │   ├── rubrics/
│   │   └── golden/
│   ├── core/
│   │   ├── normaliser.ts
│   │   ├── parser.ts        # NEW: structured extraction
│   │   └── logger.ts
│   ├── modules/
│   │   ├── engine/
│   │   │   └── index.ts
│   │   └── evaluator/       # NEW: deterministic evaluators
│   │       ├── mcq.ts
│   │       ├── numeric.ts
│   │       ├── sets.ts
│   │       └── proof.ts
│   ├── types/
│   └── server.ts
```

---

# 5. Updated Pipeline Architecture

```
OCR (raw text / LaTeX)
        │
        ▼
Normaliser (cleanup)
        │
        ▼
Structured Parser (extract answer + steps)
        │
        ▼
Rule-based Router (NO LLM)
        │
        ▼
Deterministic Engine (primary path)
        │
        ├── if confident → RETURN
        │
        ▼
LLM Judge (fallback only)
        │
        ▼
Final Score
```

---

# 6. Routing (NO LLM)

Routing must be rule-based.

```ts
function route(question): QuestionType {
  // based on keywords / metadata
}
```

Allowed types:

* mcq
* numeric
* set
* permutation
* proof

---

# 7. Deterministic Evaluation Layer (CRITICAL)

This is the most important part of the system.

## 7.1 MCQ

```ts
score = student === correct ? fullMarks : 0;
```

---

## 7.2 Numeric / Expression

Use math engine:

```ts
simplify(student) === simplify(model);
```

Libraries:

* mathjs (preferred)
* sympy (optional backend)

---

## 7.3 Sets

```ts
{1,2,3} === {3,2,1}
```

Normalize before comparison.

---

## 7.4 Permutations / Combinatorics

Evaluate expression:

```ts
5P2 = 5 * 4
```

---

## 7.5 Confidence

Each evaluator must return:

```ts
{
  score: number;
  confidence: number; // 0–1
}
```

---

# 8. LLM Judge (Fallback Only)

Use ONLY when:

* Proof questions
* Step-based evaluation
* Low deterministic confidence (< 0.8)

---

## Model

```ts
llmJudge: "gpt-4o"
```

---

## Prompt Structure

```txt
You are a strict CBSE math evaluator.

Given:
- Question
- Model Answer
- Student Answer

Evaluate using rubric.

Return JSON:
{
  totalScore,
  criterionScores[],
  mistakes[],
  confidence
}
```

---

# 9. REMOVE (Important)

The following are NOT allowed:

❌ LLM-based routing
❌ Mandatory dual-pass judging
❌ Tiebreaker model (unless explicitly enabled later)
❌ Blind LLM scoring without deterministic check

---

# 10. Optional: Second Pass (Advanced Only)

Enable ONLY if needed:

```ts
if (confidence < 0.6) {
  runSecondModel();
}
```

---

# 11. Types

All types must be defined in:

```
src/types/index.ts
```

Never define inline types.

---

# 12. Rubrics

Located in:

```
src/config/rubrics/
```

Rubrics define:

* marks distribution
* scoring logic
* criteria

---

## Example

### 3-mark question:

* formula → 1
* steps → 1
* final answer → 1

---

# 13. Golden Dataset

Location:

```
src/config/golden/
```

Rules:

* Must have human score
* Strict format
* Used for evaluation only

---

# 14. Evaluation Metrics

| Metric        | Target |
| ------------- | ------ |
| MAE           | ≤ 1.5  |
| Exact Match   | ≥ 70%  |
| Within 1 mark | ≥ 85%  |

Run:

```bash
bun run eval
```

---

# 15. LaTeX Handling

## Rule:

LaTeX is OPTIONAL, not mandatory.

### Use LaTeX when:

* complex expressions
* calculus
* multi-line proofs

### Do NOT rely on LaTeX for:

* MCQs
* simple arithmetic

---

# 16. Parser (NEW COMPONENT)

Convert raw answer into structured form:

```ts
{
  finalAnswer: string;
  steps: string[];
}
```

This improves:

* scoring accuracy
* LLM consistency

---

# 17. API

## POST /evaluate

Input:

```ts
EvalInput
```

Output:

```ts
FinalScore
```

---

## POST /eval/run

Runs full evaluation suite.

---

# 18. Rules for Contributors

1. Always run `bun run eval` after changes
2. Never bypass deterministic engine
3. Never hardcode models
4. Never use `any`
5. Keep logic modular
6. Use structured logging

---

# 19. Known Focus Areas

* Improve proof evaluation
* Improve step extraction
* Reduce LLM dependency
* Increase deterministic coverage

---

# 20. Development Priority

Build in this order:

1. MCQ evaluator
2. Numeric evaluator
3. Set evaluator
4. Parser
5. LLM judge

---

# 21. Guiding Principle

This system is NOT:

> “LLM grading engine”

This system IS:

> “Math engine with LLM assistance”



# 22. Task Tracker


