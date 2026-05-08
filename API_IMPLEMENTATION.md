# API & Worker Implementation Summary

## What Was Implemented

### 1. Database Schema Extensions (`src/db/schema.ts`)
New tables and enums added to support the OCR → Exam → Submission → Grading flow:

**New Enums:**
- `job_status`: pending, processing, completed, failed
- `job_type`: structure, grade

**New Tables:**

#### `exams`
```typescript
{
  id: serial PK,
  slug: unique, readable identifier (e.g., "exam-1630000000-abc123")
  question_ocr_id: FK → ocrRequests (question paper OCR)
  model_ocr_id: FK → ocrRequests (model answer OCR)
  status: 'pending' | 'structuring' | 'ready' | 'failed'
  structure_output: JSON (stores StructuredExam from structuring module)
  metadata: JSON (subject, class, etc.)
  created_at, updated_at
}
```

#### `submissions`
```typescript
{
  id: serial PK,
  slug: unique, readable identifier (e.g., "submission-1630000000-xyz789")
  exam_id: FK → exams
  student_ocr_id: FK → ocrRequests (student answer sheet OCR)
  student_name, student_roll: student metadata
  status: 'pending' | 'grading' | 'graded' | 'failed'
  metadata: JSON
  created_at, updated_at
}
```

#### `jobs`
```typescript
{
  id: serial PK,
  job_type: 'structure' | 'grade'
  status: job_status enum
  exam_id: FK → exams (nullable, for structure jobs)
  submission_id: FK → submissions (nullable, for grading jobs)
  payload: JSON (input data for the job)
  result: JSON (output data after completion)
  attempts: int (for retry tracking)
  last_error: text (error message from last attempt)
  created_at, updated_at
}
```

**Updated Tables:**
- `ocrRequests`: added `slug` (unique), `raw_response` (JSON for storing frontend-provided OCR)
- `GradedSolutions`: added `submission_id` FK (to group grades per student submission)

### 2. Database Connection (`src/db/index.ts`)
- Drizzle ORM setup with PostgreSQL driver
- Exports `db` instance for use across the application

### 3. API Routes (`src/modules/api/`)

#### POST `/api/ocr` - Store Frontend-Provided OCR
**Request:**
```json
{
  "fileName": "question-paper.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 245678,
  "rawResponse": { /* OCR JSON from olm-ocr */ }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "slug": "ocr-1630000000-abc123",
    "request_id": "req-1630000000-xyz789",
    "id": 1
  }
}
```

#### POST `/api/exams` - Register Exam & Trigger Structuring
**Request:**
```json
{
  "questionOcrSlug": "ocr-1630000000-abc123",
  "modelOcrSlug": "ocr-1630000001-def456",
  "subject": "Mathematics",
  "class": "XI"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "examId": 1,
    "slug": "exam-1630000000-xyz789",
    "jobId": 1,
    "status": "pending"
  }
}
```

Creates an `exams` record and queues a `jobs` record with type="structure".

#### GET `/api/exams/:id/status` - Check Structuring Status
**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "exam-1630000000-xyz789",
    "status": "ready",
    "jobStatus": "completed",
    "structureOutput": { /* StructuredExam JSON */ }
  }
}
```

#### POST `/api/submissions` - Register Student Submission & Trigger Grading
**Request:**
```json
{
  "examId": 1,
  "studentOcrSlug": "ocr-1630000002-ghi789",
  "studentName": "John Doe",
  "studentRoll": "001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submissionId": 1,
    "slug": "submission-1630000000-abc123",
    "jobId": 2,
    "status": "pending"
  }
}
```

Creates a `submissions` record and queues a `jobs` record with type="grade".

#### GET `/api/submissions/:id/status` - Check Grading Status
**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "submission-1630000000-abc123",
    "status": "graded",
    "jobStatus": "completed",
    "evaluationResult": { /* Evaluation JSON */ }
  }
}
```

### 4. Async Job Worker (`src/core/worker/job.worker.ts`)

**Features:**
- Polls DB for pending jobs every 5 seconds (configurable)
- Processes two job types:
  - **structure**: calls `getStructuredExamData()` from the structuring module, stores result in `exams.structure_output`
  - **grade**: calls `gradeStudentAnswerSheet()` from the grading module, stores result in `jobs.result`
- Automatic retry logic (max 3 attempts) with exponential backoff
- Extracts text from various OCR response formats (common variations supported)
- Marks jobs as failed if max retries exceeded
- Updates exam/submission status based on job completion/failure

**Job Processing Flow:**
```
1. Poll DB for pending jobs
2. Mark job as "processing"
3. Execute structuring OR grading based on job_type
4. Extract OCR text from raw_response
5. Call appropriate module function
6. Store result in jobs.result
7. Update exam/submission status to "ready" or "graded"
8. Mark job as "completed"
OR
   On error:
   - Increment attempts
   - If attempts < 3: mark job as "pending" for retry
   - If attempts >= 3: mark job as "failed"
```

**Started automatically when server starts** (in `src/server.ts`)

### 5. Utility Functions (`src/core/utils/slug.util.ts`)
- `generateSlug(prefix)`: creates readable, unique slugs with timestamp + random suffix
- `generateRequestId()`: creates unique request IDs for OCR submissions
- `hashString()`: SHA256 hashing for content deduplication
- `validateOcrResponse()`: validates OCR JSON structure

### 6. Integration (`src/index.ts`, `src/server.ts`)
- Registered `/api` routes in Express app
- Started job worker on server startup

---

## Setup Instructions

### Prerequisites
- PostgreSQL running (locally or via Docker)
- `.env` file with `DATABASE_URL` (e.g., `postgresql://user:password@localhost:5432/maths_engine`)
- Bun package manager

### Step 1: Generate & Apply Migration
```bash
# Generate migration from schema changes
bun run drizzle-kit generate

# Push migration to DB
bun run drizzle-kit migrate
```

### Step 2: Start the Server
```bash
# Development mode (watch + auto-reload)
bun run dev

# Production mode
bun run start
```

### Step 3: Test the Flow

**1. Upload Question Paper OCR**
```bash
curl -X POST http://localhost:3000/api/ocr \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "question-paper.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 245678,
    "rawResponse": {
      "text": "Question 1: ...\nQuestion 2: ..."
    }
  }'

# Response: { "slug": "ocr-...", "request_id": "req-...", "id": 1 }
```

**2. Upload Model Answer OCR**
```bash
curl -X POST http://localhost:3000/api/ocr \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "model-answer.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 123456,
    "rawResponse": {
      "text": "Answer 1: ...\nAnswer 2: ..."
    }
  }'

# Response: { "slug": "ocr-...", "request_id": "req-...", "id": 2 }
```

**3. Register Exam (triggers structuring)**
```bash
curl -X POST http://localhost:3000/api/exams \
  -H "Content-Type: application/json" \
  -d '{
    "questionOcrSlug": "ocr-...",
    "modelOcrSlug": "ocr-...",
    "subject": "Mathematics",
    "class": "XI"
  }'

# Response: { "examId": 1, "slug": "exam-...", "jobId": 1, "status": "pending" }
```

**4. Check Exam Status (polling)**
```bash
# Poll until status = "ready"
curl http://localhost:3000/api/exams/1/status

# Once ready, structure_output will be populated
```

**5. Upload Student Answer Sheet OCR**
```bash
curl -X POST http://localhost:3000/api/ocr \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "student-answers.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 98765,
    "rawResponse": {
      "text": "Q1: (a)\nQ2: 42\nQ3: ..."
    }
  }'

# Response: { "slug": "ocr-...", "request_id": "req-...", "id": 3 }
```

**6. Submit Student Answer & Trigger Grading**
```bash
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "examId": 1,
    "studentOcrSlug": "ocr-...",
    "studentName": "John Doe",
    "studentRoll": "001"
  }'

# Response: { "submissionId": 1, "slug": "submission-...", "jobId": 2, "status": "pending" }
```

**7. Check Submission Status (polling)**
```bash
# Poll until status = "graded"
curl http://localhost:3000/api/submissions/1/status

# Once graded, evaluationResult will contain the Evaluation JSON
```

---

## Database with Docker

If using Docker Compose (check `docker-compose.yml`):

```bash
# Start PostgreSQL
docker-compose up -d postgres

# (Wait a few seconds for DB to initialize)

# Generate & apply migrations
bun run drizzle-kit generate
bun run drizzle-kit migrate

# Start server
bun run dev
```

---

## Flow Diagram

```
FRONTEND                      BACKEND                         DATABASE
   │                            │                               │
   ├─ Call olm-ocr             │                               │
   │  (Q-paper)                │                               │
   │                            │                               │
   ├─ POST /api/ocr ──────────>│                               │
   │  (raw OCR JSON)           ├─ Store in ocr_requests ────> │ ocr_requests [1]
   │                            │  slug = "ocr-..."            │
   │  slug_qp = "ocr-..."       │                               │
   │<──────────────────────────┤                               │
   │                            │                               │
   ├─ Call olm-ocr             │                               │
   │  (Model Answer)            │                               │
   │                            │                               │
   ├─ POST /api/ocr ──────────>│                               │
   │  (raw OCR JSON)           ├─ Store in ocr_requests ────> │ ocr_requests [2]
   │                            │  slug = "ocr-..."            │
   │  slug_model = "ocr-..."    │                               │
   │<──────────────────────────┤                               │
   │                            │                               │
   │ [Teacher reviews & submits exam]                          │
   │                            │                               │
   ├─ POST /api/exams ────────>│                               │
   │  { slug_qp, slug_model }  ├─ Create exams record ──────> │ exams [1]
   │                            ├─ Create jobs (structure) ──> │ jobs [1]
   │  exam_id = 1              │                               │
   │  job_id = 1               │<──────────────────────────┤
   │<──────────────────────────┤                               │
   │                            │                               │
   │ [Worker loop polls...]     │                               │
   │                            ├─ processStructuringJob() ──> │ exams [1].structure_output
   │                            │  - Extract text from OCR     │ jobs [1].status = completed
   │                            │  - Call getStructuredExamData() │
   │                            │  - Store structure_output    │
   │                            │<────────────────────────────┤
   │                            │                               │
   ├─ GET /api/exams/1/status ─┤                               │
   │  status = "ready"         │                               │
   │<──────────────────────────┤                               │
   │                            │                               │
   ├─ Call olm-ocr             │                               │
   │  (Student Answers)         │                               │
   │                            │                               │
   ├─ POST /api/ocr ──────────>│                               │
   │  (raw OCR JSON)           ├─ Store in ocr_requests ────> │ ocr_requests [3]
   │                            │  slug = "ocr-..."            │
   │  slug_student = "ocr-..."  │                               │
   │<──────────────────────────┤                               │
   │                            │                               │
   ├─ POST /api/submissions ──>│                               │
   │  { exam_id, slug_student }├─ Create submissions ────────> │ submissions [1]
   │                            ├─ Create jobs (grade) ──────> │ jobs [2]
   │  submission_id = 1        │                               │
   │  job_id = 2               │                               │
   │<──────────────────────────┤                               │
   │                            │                               │
   │ [Worker loop polls...]     │                               │
   │                            ├─ processGradingJob() ────────> │
   │                            │  - Extract student text      │
   │                            │  - Call gradeStudentAnswerSheet() │
   │                            │  - Store result in jobs[2]   │ jobs [2].result = Evaluation
   │                            │  - Update submissions status  │ submissions [1].status = graded
   │                            │<────────────────────────────┤
   │                            │                               │
   ├─ GET /api/submissions/1/status ┤                          │
   │  status = "graded"        │                               │
   │  evaluation_result = {...}│                               │
   │<──────────────────────────┤                               │
   │                            │                               │
   ✓ Display grading to teacher                                │
```

---

## Key Design Notes

1. **Frontend drives OCR**: Frontend calls `olm-ocr` directly, then POSTs raw JSON to backend. This:
   - Keeps sensitive OCR keys on frontend or centralized
   - Allows frontend to preview OCR immediately
   - Backend focuses on persistence and logic

2. **Slugs for readability**: Each exam/submission has a readable slug instead of just IDs. Easier for logs, links, and debugging.

3. **Async job processing**: Structuring and grading happen in background via worker. Frontend polls status endpoints. This:
   - Keeps API responsive
   - Allows long-running LLM calls without timeout
   - Enables retry logic and error recovery

4. **Simple DB-backed queue**: Uses `jobs` table to track pending/processing/completed/failed. Suitable for MVP. For production, consider Redis-backed queue (BullMQ) for better performance.

5. **Automatic OCR text extraction**: Worker extracts text from various OCR response formats, so it's flexible to different `olm-ocr` versions or formats.

6. **Idempotency via slug/hash**: If a frontend retries a submission, same OCR slug will reuse the stored data.

---

## Next Steps

1. **Run migrations** (see "Setup Instructions")
2. **Test the flow** (see "Test the Flow" section above)
3. **Frontend integration**: Call `/api/ocr`, `/api/exams`, `/api/submissions` endpoints from the frontend
4. **Error handling & logging**: Add more detailed logging and error messages
5. **Production queue** (optional): Replace simple DB-backed worker with Redis + BullMQ for better scalability
6. **Webhooks/WebSockets** (optional): Replace polling with push notifications for real-time status updates

---

## File References

- Schema: [src/db/schema.ts](../../src/db/schema.ts)
- DB Connection: [src/db/index.ts](../../src/db/index.ts)
- API Routes:
  - [src/modules/api/index.ts](../../src/modules/api/index.ts)
  - [src/modules/api/routes/ocr.route.ts](../../src/modules/api/routes/ocr.route.ts)
  - [src/modules/api/routes/exams.route.ts](../../src/modules/api/routes/exams.route.ts)
  - [src/modules/api/routes/submissions.route.ts](../../src/modules/api/routes/submissions.route.ts)
- Worker: [src/core/worker/job.worker.ts](../../src/core/worker/job.worker.ts)
- Utilities: [src/core/utils/slug.util.ts](../../src/core/utils/slug.util.ts)
- Server: [src/server.ts](../../src/server.ts)
- Main App: [src/index.ts](../../src/index.ts)

