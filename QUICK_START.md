# 🚀 MVP Implementation - Ready to Deploy

## ✅ What's Been Done

**Backend Implementation (COMPLETE):**
- ✅ Database schema extended with `exams`, `submissions`, `jobs` tables
- ✅ DB connection configured (`src/db/index.ts`)
- ✅ 5 API endpoints implemented:
  - `POST /api/ocr` — Store frontend OCR results
  - `POST /api/exams` — Register exam + trigger structuring
  - `GET /api/exams/:id/status` — Poll exam status
  - `POST /api/submissions` — Register submission + trigger grading
  - `GET /api/submissions/:id/status` — Poll submission status
- ✅ Async job worker — processes structuring & grading in background
- ✅ Automatic job polling (every 5 seconds)
- ✅ Retry logic (up to 3 attempts) with error tracking

**Next: Database Setup & Deployment**

---

## 🎯 Quick Start (5 Minutes)

### Step 1: Start PostgreSQL
```bash
# Option A: Docker (Recommended)
docker-compose up -d postgres

# Option B: Local PostgreSQL
# Windows: Ensure PostgreSQL service is running
# Mac: brew services start postgresql
```

### Step 2: Set DATABASE_URL
Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maths_engine"
```

### Step 3: Create Migrations
```bash
# Generate migration from schema
bun run drizzle-kit generate

# Apply to database
bun run drizzle-kit migrate
```

### Step 4: Start Server
```bash
bun run dev
```

You should see:
```
Server running on http://localhost:3000
Starting job worker (poll interval: 5000ms)
```

---

## 🧪 Quick Test (Copy-Paste These)

### Test 1: Upload Question Paper OCR
```bash
curl -X POST http://localhost:3000/api/ocr \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "q-paper.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 1000,
    "rawResponse": {
      "text": "Question 1: Find the value of x.\nQuestion 2: Solve the equation."
    }
  }' | jq .
```

**Save the returned `slug`** (e.g., `"ocr-1630000000-abc123"`)

### Test 2: Upload Model Answer OCR
```bash
curl -X POST http://localhost:3000/api/ocr \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "model-answer.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 800,
    "rawResponse": {
      "text": "Answer 1: x = 5\nAnswer 2: x = 3"
    }
  }' | jq .
```

**Save the returned `slug`**

### Test 3: Register Exam (Replace with your slugs!)
```bash
curl -X POST http://localhost:3000/api/exams \
  -H "Content-Type: application/json" \
  -d '{
    "questionOcrSlug": "ocr-1630000000-abc123",
    "modelOcrSlug": "ocr-1630000000-def456",
    "subject": "Mathematics",
    "class": "XI"
  }' | jq .
```

**Save the returned `examId`** (e.g., `1`)

### Test 4: Check Exam Status (Poll until "ready")
```bash
# Replace 1 with your examId
curl http://localhost:3000/api/exams/1/status | jq .

# Repeat until you see: "status": "ready"
# (This means structuring completed)
```

### Test 5: Upload Student Answer OCR
```bash
curl -X POST http://localhost:3000/api/ocr \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "student-answers.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 600,
    "rawResponse": {
      "text": "Q1: x = 5\nQ2: x = 3"
    }
  }' | jq .
```

**Save the returned `slug`**

### Test 6: Submit for Grading (Replace with your examId & slug!)
```bash
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "examId": 1,
    "studentOcrSlug": "ocr-1630000000-ghi789",
    "studentName": "John Doe",
    "studentRoll": "001"
  }' | jq .
```

**Save the returned `submissionId`** (e.g., `1`)

### Test 7: Check Submission Status (Poll until "graded")
```bash
# Replace 1 with your submissionId
curl http://localhost:3000/api/submissions/1/status | jq .

# Repeat until you see: "status": "graded"
# (This means grading completed)
```

---

## 📋 Flow Summary

```
1. Frontend calls olm-ocr for question paper
   ↓
2. POST /api/ocr → get slug_qp
   ↓
3. Frontend calls olm-ocr for model answer
   ↓
4. POST /api/ocr → get slug_model
   ↓
5. POST /api/exams { slug_qp, slug_model }
   ↓
   [Backend creates exam, queues structuring job]
   ↓
6. GET /api/exams/:id/status [Poll until status = "ready"]
   ↓
7. Frontend calls olm-ocr for student answers
   ↓
8. POST /api/ocr → get slug_student
   ↓
9. POST /api/submissions { examId, slug_student }
   ↓
   [Backend queues grading job]
   ↓
10. GET /api/submissions/:id/status [Poll until status = "graded"]
   ↓
   [evaluationResult contains the grading output]
```

---

## 🔍 Database Inspector

To inspect what's in the database in real-time:

```bash
bun run studio
# Opens http://localhost:3001
```

You can see:
- `ocr_requests` — all uploaded OCR data
- `exams` — all exam records with structure_output
- `submissions` — all student submissions
- `jobs` — all async jobs with their status & results

---

## ⚠️ Troubleshooting

| Error | Solution |
|-------|----------|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL not running. Run `docker-compose up -d postgres` |
| `database "maths_engine" does not exist` | Create DB: `createdb maths_engine` (or Docker will auto-create) |
| `Unique constraint violated on slug` | OCR slug already exists; use a different fileName or timestamp |
| `Exam not ready for submissions` | Exam is still structuring. Wait and poll status until "ready" |
| Migrations fail | Check DATABASE_URL is correct and PostgreSQL is accessible |

---

## 📁 Key Files Created

| File | Purpose |
|------|---------|
| `src/db/schema.ts` | Extended with `exams`, `submissions`, `jobs` tables |
| `src/db/index.ts` | Database connection setup |
| `src/modules/api/` | All API route handlers |
| `src/core/worker/job.worker.ts` | Async job processor |
| `src/server.ts` | Updated to start job worker |
| `API_IMPLEMENTATION.md` | Full API documentation |
| `DATABASE_SETUP.md` | Database setup guide |

---

## 🎯 What's Happening Behind the Scenes

**When you POST /api/exams:**
1. Backend fetches the two OCR results from DB
2. Creates an `exams` record with status="pending"
3. Creates a `jobs` record with type="structure"
4. Returns immediately (async)

**Worker loop (every 5s):**
1. Finds pending jobs
2. For structure jobs: calls `getStructuredExamData()` from grading module
3. Stores result in `exams.structure_output`
4. Updates job status to "completed"

**When you POST /api/submissions:**
1. Backend verifies exam is ready
2. Fetches student OCR from DB
3. Creates `submissions` record
4. Creates `jobs` record with type="grade"
5. Returns immediately (async)

**Worker processes grading:**
1. Extracts student answer text from OCR
2. Calls `gradeStudentAnswerSheet()` from grading module
3. Stores `Evaluation` result in `jobs.result`
4. Updates submission status to "graded"

**Frontend polls status endpoints:**
- Initially returns "pending"
- Once job completes, returns "ready"/"graded" with results

---

## 🚀 Next: Frontend Integration

The frontend needs to:

1. **Call olm-ocr** (you handle this)
2. **POST OCR JSON** to `/api/ocr` endpoints (returns slug)
3. **POST exam creation** to `/api/exams` (returns examId)
4. **Poll `/api/exams/:id/status`** until ready
5. **Call olm-ocr** again for student sheet
6. **POST submission** to `/api/submissions` (returns submissionId)
7. **Poll `/api/submissions/:id/status`** until graded
8. **Display evaluation result** to the teacher

Example React code (pseudo):
```typescript
// 1. Upload question paper
const qOcrResponse = await fetch('http://localhost:3000/api/ocr', { /* ... */ });
const { slug: qSlug } = await qOcrResponse.json();

// 2. Upload model answer
const mOcrResponse = await fetch('http://localhost:3000/api/ocr', { /* ... */ });
const { slug: mSlug } = await mOcrResponse.json();

// 3. Create exam
const examResponse = await fetch('http://localhost:3000/api/exams', {
  method: 'POST',
  body: JSON.stringify({ questionOcrSlug: qSlug, modelOcrSlug: mSlug })
});
const { examId } = await examResponse.json();

// 4. Poll for structuring
let exam;
while (!exam?.structureOutput) {
  await new Promise(r => setTimeout(r, 2000)); // Wait 2s
  const res = await fetch(`http://localhost:3000/api/exams/${examId}/status`);
  exam = (await res.json()).data;
}

// 5-7. Upload student answers & create submission (similar flow)
// 8. Poll for grading results & display
```

---

## 📞 Support

Check these files for more details:
- **API Docs**: [API_IMPLEMENTATION.md](API_IMPLEMENTATION.md)
- **DB Setup**: [DATABASE_SETUP.md](DATABASE_SETUP.md)
- **Grading Module**: [AGENTS.md](AGENTS.md) (original architecture)

---

## ⏰ Deadline: Tomorrow ✓

You now have:
- ✅ Backend API ready
- ✅ Async processing running
- ✅ Database schema in place
- ✅ Quick test commands

**Next 2 hours: Test and deploy**

```bash
# 1. Start DB & server
docker-compose up -d postgres
sleep 3
bun run drizzle-kit generate
bun run drizzle-kit migrate
bun run dev

# 2. Run quick test (copy-paste above)
# 3. Frontend integration
```

Good luck! 🎉
