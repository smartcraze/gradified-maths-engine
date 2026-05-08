# Maths Engine - AI Agent Context

> This file contains the complete architectural context for the Maths Engine grading system. Read this before making any changes.


# REMEBER DO NO TOUCH MODULES/OCR - it is not useful over here we have to use the olm-ocr




### Run this for the formating and all stuff 

bun run lint
bun run check
bun run fix


## Quick Overview

**Maths Engine** is an AI-powered exam evaluation system that grades student answer sheets using a hybrid approach:
- **MCQ Questions**: Graded deterministically (exact match)
- **Non-MCQ Questions**: Graded by LLM (GPT-4/GPT-5) with structured outputs

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EVALUATION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

Input: { questionPaper, modelAnswers, studentAnswerSheet }
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: STRUCTURE EXTRACTION                                            │
│ File: src/modules/structure/index.ts                                    │
│ Function: getStructuredExamData()                                       │
│                                                                         │
│ 1. preprocessExamText() - Clean whitespace/OCR artifacts               │
│ 2. requestStructuredExamData() - LLM call (gpt-4.1-mini)               │
│ 3. normalizeStructuredExamOutput() - Infer types, recalculate totals   │
│ 4. StructuredExamSchema.parse() - Validate                              │
│                                                                         │
│ Output: StructuredExam { sections, metadata }                           │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: PARALLEL GRADING                                                  │
├─────────────────────────────┬─────────────────────────────────────────────┤
│      MCQ PATH               │           NON-MCQ PATH                      │
│ (Deterministic)             │           (AI-Powered)                      │
├─────────────────────────────┼─────────────────────────────────────────────┤
│ File: tools/mcq-grader.ts   │ File: llm.ts                                │
│                             │                                             │
│ 1. extractAnswerLineByQId() │ 1. buildGradingPrompt()                     │
│    Parse "1. (iii) XIX"     │    Combine exam data + student answers      │
│                             │                                             │
│ 2. extractStudentOption()   │ 2. generateText() with structured output    │
│    Normalize to A/B/C/D     │    Model: GRADE_MODEL (gpt-5.4)             │
│    Handles: (a), (i), roman │    Temperature: 0 (deterministic)           │
│                             │                                             │
│ 3. extractCorrectOption()   │ 3. applyRubricPolicyToNonMcqEvaluation()    │
│    From model answer        │    File: rubric.ts (POST-PROCESSING)        │
│                             │                                             │
│ 4. Binary scoring           │ Output: QuestionEvaluation[]                │
│    Correct = full marks     │                                             │
│    Wrong = 0                │                                             │
└─────────────────────────────┴─────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: MERGE & FINALIZE                                                │
│ File: evaluation.ts                                                     │
│                                                                         │
│ 1. mergeQuestionEvaluations()                                          │
│    - Combine MCQ + non-MCQ arrays                                      │
│    - Sort by question_id numerically                                   │
│                                                                         │
│ 2. buildFinalEvaluation()                                              │
│    - Compute total_max_marks                                           │
│    - Compute total_awarded_marks                                       │
│    - Calculate percentage                                              │
│                                                                         │
│ 3. buildGradingLogPayload() + logLlmResponse()                         │
│    - Persist to logs/ directory                                        │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ OUTPUT: Evaluation {                                                    │
│   student: { name, roll_number, class, subject }                       │
│   summary: { total_questions, total_max_marks, total_awarded_marks, % }  │
│   evaluation: QuestionEvaluation[]                                     │
│   overall_feedback: string                                             │
│ }                                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Module Reference

### Structure Module (`src/modules/structure/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Entry point with retry logic | `getStructuredExamData()` |
| `llm.ts` | LLM integration | `requestStructuredExamData()` |
| `schema.ts` | Zod schemas | `StructuredExamSchema`, `StructuredQuestionSchema` |
| `prompt.ts` | Prompt builders | `STRUCTURE_SYSTEM_PROMPT`, `buildStructurePrompt()` |
| `normalization.ts` | Post-processing | `normalizeStructuredExamOutput()`, `preprocessExamText()` |
| `input.ts` | Sample data | `QUESTIONS`, `MODEL_ANSWER` |

**Key Schema - StructuredExam:**
```typescript
{
  sections: [
    {
      section_name: string,
      type: "mcq" | "very_short" | "short" | "long" | "case_study",
      questions: [
        {
          question_id: string,       // "1", "2", "3"
          question_text: string,
          question_format: "mcq" | "numerical" | "short" | "long",
          question_type: "numerical" | "algebraic" | "proof" | "theory" | "mixed",
          options: ["A", "B", "C", "D"],  // Empty for non-MCQ
          model_answer: string,
          max_marks: number,
          marks_inferred: boolean,
          final_answer: string | null,
          expected_steps: string[],    // Length MUST equal max_marks
          key_concepts: string[],
          sub_questions: [...]        // Recursive
        }
      ]
    }
  ],
  metadata: {
    total_questions: number,
    total_marks: number
  }
}
```

**Normalization Logic:**
- `preprocessExamText()`: Normalizes line endings, removes excessive whitespace
- `inferSectionType()`: Uses section name first, falls back to marks
  - "mcq" in name → mcq
  - "very short" → very_short
  - "short" → short
  - "long" → long
  - "case" → case_study
  - Fallback: 1 mark=mcq, 2=very_short, 3-4=short, 5+=long
- `inferQuestionFormatFromContent()`: Uses options array length and marks
- `normalizeExamMetadata()`: Recalculates totals after processing

---

### Grading Module (`src/modules/grading/`)

| File | Lines | Purpose | Key Functions |
|------|-------|---------|---------------|
| `index.ts` | 84 | Main orchestrator | `gradeStudentAnswerSheet()`, `runGradingDemo()` |
| `llm.ts` | 77 | Non-MCQ LLM grading | `requestNonMcqEvaluation()`, `createDefaultNonMcqEvaluation()` |
| `rubric.ts` | 277 | **Rubric enforcement** | `applyRubricPolicyToQuestion()`, `applyRubricPolicyToNonMcqEvaluation()` |
| `evaluation.ts` | 76 | Result merging | `mergeQuestionEvaluations()`, `buildFinalEvaluation()` |
| `schema.ts` | 149 | Output schemas | `EvaluationSchema`, `QuestionEvaluationSchema`, `NonMcqQuestionEvaluationSchema` |
| `prompt.ts` | 127 | Grading prompts | `GRADING_SYSTEM_PROMPT`, `buildGradingPrompt()` |
| `tools/mcq-grader.ts` | 239 | MCQ grading | `evaluateMcqQuestions()`, `gradeAllMcqWithTool()`, `splitExamByQuestionType()` |
| `student-sheet.ts` | 81 | Sample data | `STUDENT_ANSWER_SHEET` |

---

## The Rubric System (Critical)

**Location:** `src/modules/grading/rubric.ts`

The rubric system **post-processes** LLM output to enforce consistent scoring. This is the heart of the grading logic.

### Rubric Categories
- `[concept]` - Conceptual understanding
- `[method]` - Method/approach used
- `[setup]` - Problem setup
- `[steps]` - Working steps
- `[detail]` - Detailed working
- `[final]` - Final answer

### Fixed Mark Distributions (RUBRIC_POLICY)

```typescript
const RUBRIC_POLICY: Record<number, RubricSlot[]> = {
  2: [{ concept: 1 }, { final: 1 }],
  3: [{ setup: 1 }, { steps: 1 }, { final: 1 }],
  4: [{ concept: 1 }, { steps: 2 }, { final: 1 }],  // steps split into 2×1
  5: [{ setup: 1 }, { method: 2 }, { detail: 1 }, { final: 1 }],
  6: [{ concept: 2 }, { steps: 3 }, { final: 1 }],
  8: [{ concept: 2 }, { method: 2 }, { steps: 3 }, { final: 1 }],
}
```

**Key Functions:**
1. `parseCategory(stepText)` - Extracts tag from "[concept] Found x=7"
2. `normalizeSteps(steps, slots)` - Aligns LLM steps to rubric slots
3. `computeMarks(steps, maxMarks)` - Sums marks for correct steps only
4. `resolveCorrectness(awarded, max)` - Converts to "correct"/"partially_correct"/"incorrect"
5. `applyRubricPolicyToQuestion(question)` - Main entry point

**Mark Granularity:** 0.1 (rounds to nearest 0.1)

---

## MCQ Grading Details

**Location:** `src/modules/grading/tools/mcq-grader.ts`

### Option Normalization
```typescript
ROMAN_TO_OPTION = { i: "A", ii: "B", iii: "C", iv: "D" }

Input:  "(iii) XIX"  → Output: "C"
Input:  "(b)"        → Output: "B"
Input:  "a) 8"       → Output: "A"
Input:  "(I)"        → Output: "A" (roman)
```

### Answer Extraction Pattern
```regex
/^\s*(\d+)\.\s*(.+)$/   // Matches "1. (iii) XIX"
```

### Scoring
- Correct option match → Full marks
- Wrong/no answer → 0 marks
- `correct_option` and `student_option` stored in output

---

## LLM Prompts

### Structure Prompt (`src/modules/structure/prompt.ts`)

**System Prompt Key Requirements:**
- Extract only explicit data (no hallucination)
- Preserve mathematical notation (LaTeX, Unicode)
- MCQ: options array must have 4 items ["text A", "text B", "text C", "text D"]
- Non-MCQ: expected_steps length MUST equal max_marks
- Question IDs must be just numbers: "1", "2" (not "Q1", "2a")

**User Prompt Structure:**
```
TASK: Extract structured exam metadata

QUESTION PAPER
[raw text]

---

MODEL ANSWERS
[raw text]

---

CRITICAL: question_id MUST be just the question number as a string
- Do NOT use "Q1", "2a", or section prefixes
- Must match student answer sheet question numbers exactly

[MCQ and Non-MCQ specific instructions]
```

### Grading Prompt (`src/modules/grading/prompt.ts`)

**System Prompt (GRADING_SYSTEM_PROMPT) - 91 lines:**

Key sections:
1. **SCOPE** - Evaluate only non-MCQ (MCQ handled separately)
2. **MATH NOTATION** - Accept equivalent forms (0.5 = 1/2)
3. **EVIDENCE-BASED MARKING** - Award only for shown work
4. **RUBRIC STRUCTURE** - Fixed non-negotiable step counts
5. **MARK ALLOCATION** - Binary scoring per step (0 or full)
6. **STEP OUTPUT FORMAT** - Must prefix with [category]
7. **DETERMINISM RULE** - Same input → same output always
8. **FOLLOW-THROUGH** - Partial credit for consistent work after errors

**Step Output Format:**
```json
{
  "step": "[concept] Student identified the formula",
  "is_correct": true,
  "marks": 1
}
```

**User Prompt Structure:**
```
Evaluate the student answer sheet using the provided structured exam data.

-------------------------
STRUCTURED EXAM DATA
(questions, model answers, marks)
-------------------------
[JSON]

-------------------------
STUDENT ANSWER SHEET
-------------------------
[raw text]

-------------------------
TASK
-------------------------
Evaluate only the provided non-MCQ questions and return the result strictly following the schema.
```

---

## Output Schemas

### QuestionEvaluation (`src/modules/grading/schema.ts`)

```typescript
{
  question_id: string,           // "6"
  max_marks: number,            // 2
  marks_awarded: number,        // 1
  answer_type: "mcq" | "numerical" | "short" | "long",
  correctness: "correct" | "partially_correct" | "incorrect",
  correct_option: string | null,  // "C" for MCQ, null otherwise
  student_option: string | null,  // "C" for MCQ, null otherwise
  
  steps_analysis: [              // Only for non-MCQ
    {
      step: "[concept] Found x=7",
      is_correct: true,
      marks: 1
    }
  ] | null,
  
  key_points_covered: string[] | null,
  key_points_missing: string[] | null,
  
  feedback: {
    strengths: "Correctly identified...",
    improvements: "Made arithmetic error..."
  } | null
}
```

**Validation Rule:**
```typescript
.superRefine((data, ctx) => {
  if (data.marks_awarded > data.max_marks) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["marks_awarded"],
      message: "marks_awarded cannot exceed max_marks",
    });
  }
});
```

### Evaluation (Final Output)

```typescript
{
  student: {
    name: string | null,
    roll_number: string | null,
    registration_number: string | null,
    class: string | null,
    subject: string | null
  } | null,
  
  summary: {
    total_questions: number,
    total_max_marks: number,
    total_awarded_marks: number,
    percentage: number  // 0-100
  },
  
  evaluation: QuestionEvaluation[],
  
  overall_feedback: string  // Summary across all questions
}
```

---

## Model Configuration

**Location:** `src/config/constant.ts`

```typescript
export const STRUCTURE_MODEL = "gpt-4.1-mini";  // For exam structuring
export const GRADE_MODEL = "gpt-5.4";            // For grading non-MCQ
```

**LLM Configuration:**
- Temperature: 0 (deterministic)
- Reasoning effort: "medium" (for grading model)
- Output: Structured (Zod schema validation)

**Middleware:**
- Development: Uses `@ai-sdk/devtools` for debugging
- Production: Direct model calls

---

## Key Algorithms

### Merge & Sort Evaluations
```typescript
// evaluation.ts
function mergeQuestionEvaluations(mcq, nonMcq) {
  return [...mcq, ...nonMcq].sort((a, b) => {
    const aNum = Number(a.question_id);
    const bNum = Number(b.question_id);
    
    if (isNaN(aNum) || isNaN(bNum)) {
      return a.question_id.localeCompare(b.question_id);
    }
    return aNum - bNum;
  });
}
```

### Rubric Step Distribution
```typescript
// rubric.ts
function distributeMarks(slots, total) {
  const baseMarks = total / slots.length;
  const rounded = slots.map(s => ({
    ...s,
    marks: roundToGranularity(baseMarks, 0.1)
  }));
  
  // Fix rounding error on last slot
  const currentTotal = rounded.reduce((sum, s) => sum + s.marks, 0);
  const delta = roundToGranularity(total - currentTotal, 0.1);
  if (Math.abs(delta) >= 0.1) {
    rounded[rounded.length - 1].marks += delta;
  }
  
  return rounded;
}
```

### Step Normalization
```typescript
// rubric.ts
function normalizeSteps(steps, slots) {
  // Group steps by category
  const buckets = new Map();
  for (const step of steps) {
    const category = parseCategory(step.step) ?? "steps";
    buckets.get(category)?.push(step);
  }
  
  // Map slots to steps, preserving category preference
  return slots.map(slot => {
    const candidate = takeNext(slot.category) ?? takeAny();
    return {
      step: ensureTaggedStep(candidate?.step ?? "No evidence", slot.category),
      is_correct: Boolean(candidate?.is_correct),
      marks: slot.marks
    };
  });
}
```

---

## Current Implementation Status

### ✅ COMPLETE

1. **Structure Module**
   - [x] Exam structuring with LLM
   - [x] Retry logic (2 attempts)
   - [x] Section type inference
   - [x] Question format detection
   - [x] Metadata recalculation

2. **Grading Module**
   - [x] MCQ deterministic grading
   - [x] Non-MCQ LLM grading
   - [x] Rubric post-processing
   - [x] Step-level analysis
   - [x] Result merging
   - [x] Summary computation
   - [x] File logging

3. **Core Infrastructure**
   - [x] Express app setup
   - [x] Error handling middleware
   - [x] Logging middleware (pino)
   - [x] Validation utilities
   - [x] API response wrapper

4. **Database Schema** (Prisma)
   - [x] ExamCache model
   - [x] StudentSubmission model
   - [x] EvaluationResult model
   - [x] Migration files

### ❌ MISSING

1. **API Layer (CRITICAL)**
   - [ ] POST /evaluate endpoint
   - [ ] Request/response DTOs
   - [ ] Input validation schema
   - [ ] Route registration in src/index.ts

2. **Database Integration**
   - [ ] ExamCache lookup (check if exam already structured)
   - [ ] StudentSubmission creation
   - [ ] EvaluationResult persistence
   - [ ] Hash-based deduplication

3. **Testing**
   - [ ] Unit tests for rubric.ts
   - [ ] Unit tests for mcq-grader.ts
   - [ ] Integration test for full flow
   - [ ] API endpoint tests

4. **Error Handling**
   - [ ] Structured exam parsing failures
   - [ ] LLM timeout handling
   - [ ] Partial grading failure recovery
   - [ ] Invalid input handling

---

## What To Do Next

### Priority 1: API Endpoint (URGENT)

Create `POST /evaluate` endpoint in `src/index.ts`:

```typescript
// Request Schema
const EvaluateRequestSchema = z.object({
  questionPaper: z.string().min(1),
  modelAnswers: z.string().min(1),
  studentAnswerSheet: z.string().min(1),
});

// Response Schema
const EvaluateResponseSchema = EvaluationSchema;
```

### Priority 2: Database Wiring

Wire up Prisma models in grading flow:

```typescript
// Before structuring, check ExamCache
const cached = await prisma.examCache.findUnique({
  where: { questionPaperHash_modelAnswerHash: { ... } }
});

// After evaluation, save to EvaluationResult
await prisma.evaluationResult.create({
  data: {
    submissionId: submission.id,
    totalMarks: finalEvaluation.summary.total_awarded_marks,
    // ... etc
  }
});
```

### Priority 3: Validation & Error Handling

Add proper error handling:
- Empty inputs
- Malformed question papers
- Missing model answers
- LLM failures (with fallback)
- Schema validation failures

### Priority 4: Testing

Create test suite:
```
tests/
├── unit/
│   ├── rubric.test.ts
│   ├── mcq-grader.test.ts
│   └── normalization.test.ts
├── integration/
│   └── grading-flow.test.ts
└── api/
    └── evaluate.test.ts
```

---

## Sample Data Files

Test data available in:
- `data/m00.ts` - Class XI Mathematics exam
- `data/m001.ts` through `data/m005.ts` - Various test cases
- `src/modules/structure/input.ts` - Original test data
- `src/modules/grading/student-sheet.ts` - Sample student answers

---

## Key Design Decisions

### Why Deterministic MCQ?
- MCQs have objectively correct answers
- No ambiguity in option matching
- Faster execution (no LLM call)
- Reduces LLM token usage/cost

### Why Post-Process Rubric?
- LLM can be inconsistent with step counts
- Enforces institutional scoring policy
- Allows adjusting rubric without retraining
- Makes grading auditable

### Why Temperature=0?
- Ensures reproducible results
- Critical for academic fairness
- Same answer sheet = same marks

### Why Two Different Models?
- Structure extraction needs less reasoning (gpt-4.1-mini is cheaper/faster)
- Grading requires deep reasoning (gpt-5.4 for better evaluation quality)

---

## Common Pitfalls

1. **Question IDs**: Must be numeric strings ("1", "2") not "Q1" or "2a"
2. **Expected Steps**: Array length MUST equal max_marks exactly
3. **Step Tags**: Must prefix with [concept], [method], [setup], [steps], [detail], or [final]
4. **Option Normalization**: Roman numerals (i, ii, iii, iv) convert to (A, B, C, D)
5. **Marks Awarded**: Cannot exceed max_marks (enforced by Zod)
6. **Follow-Through**: Prompt instructs LLM to award partial credit for consistent work after early errors

---

## File Reference Quick Links

| Task | Files to Read |
|------|---------------|
| Understand grading flow | `grading/index.ts` → `grading/llm.ts` → `grading/rubric.ts` |
| Understand MCQ logic | `grading/tools/mcq-grader.ts` |
| Understand structure extraction | `structure/index.ts` → `structure/llm.ts` → `structure/normalization.ts` |
| Understand schemas | `grading/schema.ts`, `structure/schema.ts` |
| See sample prompts | `grading/prompt.ts`, `structure/prompt.ts` |
| Check constants | `config/constant.ts`, `config/env.ts` |
| Run demo | `bun run src/modules/grading/index.ts` |

---

## Environment Variables

Required in `.env`:
```
NODE_ENV=development
PORT=3000
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
```

---

## Running the System

```bash
# Development server
bun run dev

# Run grading demo (uses sample data)
bun run src/modules/grading/index.ts

## Self-Learning Feedback Loop

The Maths Engine includes a built-in self-learning system that collects teacher corrections and analyzes error patterns to improve grading accuracy over time.

### Learning Module (`src/modules/learning/`)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Module entry point | `learningAnalyzer`, LearningAnalyzer class |
| `analyzer.ts` | Core learning logic | Error pattern detection, correction submission |
| `schema.ts` | API validation | SubmitCorrectionSchema, GetLearningMetricsSchema |
| `route.ts` | API endpoints | POST corrections, GET patterns, GET metrics |

### Database Models for Learning

```prisma
// Teacher corrections on AI evaluations
model EvaluationCorrection {
  id                    String            @id @default(cuid())
  evaluationId          String
  questionId            String
  originalMarks         Decimal
  correctedMarks        Decimal
  originalCorrectness   String
  correctedCorrectness  String
  correctionReason      String?
  teacherId             String?
  aiAgreement           Boolean?          // Did AI already get it right?
  stepCorrections       Json?             // Per-step corrections
  status                CorrectionStatus // PENDING, APPROVED, REJECTED
}

// Track prompt versions for A/B testing
model PromptVersion {
  id            String   @id @default(cuid())
  version       String   @unique
  promptText    String   @db.Text
  isActive      Boolean  @default(false)
  successRate   Decimal? // % of evals without corrections
  correctionRate Decimal? // % of evals that were corrected
}

// Error pattern detection
model ErrorPattern {
  id            String   @id @default(cuid())
  patternType   String   @unique  // "under_awarded", "step_misclassification"
  category      String?  // "marks", "correctness", "steps"
  frequency     Int      // How often this pattern occurs
  severity      String   // "high", "medium", "low"
  description   String?
  suggestedFix  String?
  resolvedAt    DateTime?
}

// Daily learning metrics
model LearningMetric {
  id          String   @id @default(cuid())
  metricType  String   // "correction_delta", "total_corrections", etc.
  date        DateTime @db.Date
  value       Decimal
  metadata    Json?
}
```

### Learning API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/learning/corrections` | POST | Submit a teacher correction |
| `/learning/patterns` | GET | Get detected error patterns |
| `/learning/metrics` | GET | Get learning metrics over time |
| `/learning/correction-rate` | GET | Get correction rate (total/total_eval) |
| `/learning/model-comparison` | GET | Compare performance across models |
| `/learning/patterns/:id/resolve` | PATCH | Mark an error pattern as resolved |

### How the Feedback Loop Works

1. **Evaluation Completed**: Student answer sheet is graded, result stored with `modelUsed` and `promptVersion`

2. **Teacher Review**: Teacher reviews the evaluation and can submit corrections via `/learning/corrections`:
   ```json
   POST /learning/corrections
   {
     "evaluationId": "eval_123",
     "questionId": "6",
     "correctedMarks": 2,
     "correctedCorrectness": "correct",
     "correctionReason": "Student showed correct method",
     "teacherId": "teacher_456",
     "stepCorrections": [
       { "stepIndex": 0, "originalIsCorrect": false, "correctedIsCorrect": true }
     ]
   }
   ```

3. **AI Agreement Tracking**: System automatically determines if AI already got it right (`aiAgreement: true`) or made an error (`aiAgreement: false`)

4. **Error Pattern Detection**: On demand, `/learning/patterns` analyzes all corrections and detects:
   - **under_awarded**: AI gave fewer marks than deserved
   - **over_awarded**: AI gave more marks than deserved
   - **step_misclassification**: Step marked wrong when it was right
   - **correctness_misclassification**: Overall correctness was wrong

5. **Metrics Tracking**: Daily metrics track:
   - Correction delta (sum of mark differences)
   - Total corrections count
   - Per-model correction rates

6. **Model Comparison**: `/learning/model-comparison` shows which models have lowest correction rates

### How to Use for Self-Learning

1. **Start collecting corrections**: Have teachers review and correct evaluations
2. **Monitor patterns**: Regularly call `/learning/patterns` to see recurring issues
3. **Compare models**: Use `/learning/model-comparison` to pick best model
4. **Resolve patterns**: When you fix the issue (e.g., update prompt), mark pattern as resolved
5. **Track improvement**: Watch correction rate decrease over time

### Future Enhancements (Not Implemented)

- **Auto-apply corrections**: Automatically adjust future similar answers
- **Prompt auto-generation**: Generate improved prompts based on error patterns
- **Fine-tuning pipeline**: Create training data from corrections for fine-tuning
- **A/B testing**: Route traffic to different prompt versions and measure correction rates
- **Confidence scoring**: Flag borderline evaluations for manual review

---

Last Updated: Auto-generated from codebase analysis with Learning Module
