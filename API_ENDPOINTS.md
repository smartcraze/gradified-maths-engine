# Maths Engine API Endpoints (No DB)

This document lists the currently active HTTP endpoints and payloads. The server returns a consistent `ApiResponse` wrapper.

## Base
- Local: http://localhost:3000
- All JSON endpoints accept and return `application/json` unless noted.

## Response Wrapper
```json
{
  "success": true,
  "message": "...",
  "data": {},
  "errors": null
}
```
- `success` boolean, `message` string.
- `data` holds payload on success.
- `errors` holds validation or error details on failure.

---

## GET /health
Health check.

**Response**
```json
{
  "success": true,
  "message": "OK",
  "data": { "status": "healthy" }
}
```

---

## POST /api/evaluate
Runs the full grading flow without persistence.

**Request Body**
```json
{
  "questionPaper": "string",
  "modelAnswers": "string",
  "studentAnswerSheet": "string"
}
```

**Response Data (`Evaluation`)**
```json
{
  "student": {
    "name": "string | null",
    "roll_number": "string | null",
    "registration_number": "string | null",
    "class": "string | null",
    "subject": "string | null"
  },
  "summary": {
    "total_questions": 0,
    "total_max_marks": 0,
    "total_awarded_marks": 0,
    "percentage": 0
  },
  "evaluation": [
    {
      "question_id": "1",
      "max_marks": 2,
      "marks_awarded": 1,
      "answer_type": "mcq | numerical | short | long",
      "correctness": "correct | partially_correct | incorrect",
      "correct_option": "A | B | C | D | null",
      "student_option": "A | B | C | D | null",
      "steps_analysis": [
        { "step": "[concept] ...", "is_correct": true, "marks": 1 }
      ],
      "key_points_covered": ["..."],
      "key_points_missing": ["..."],
      "feedback": {
        "strengths": "...",
        "improvements": "..."
      }
    }
  ],
  "overall_feedback": "string"
}
```

**Example**
```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "questionPaper": "...",
    "modelAnswers": "...",
    "studentAnswerSheet": "..."
  }'
```

---

## POST /api/olm-ocr
Uploads a PDF and returns OCR results. This endpoint uses multipart/form-data.

**Form Data**
- `file` (required): PDF file
- `pdfPath` (optional): string label for the PDF
- `slug` (optional): custom slug (lowercase, a-z, 0-9, _ or -)

**Response Data**
```json
{
  "slug": "ocr_...",
  "request_id": "req_...",
  "id": null,
  "rawmarkdown": "string | null",
  "equations": []
}
```

**Example**
```bash
curl -X POST http://localhost:3000/api/olm-ocr \
  -F "file=@/path/to/file.pdf" \
  -F "pdfPath=algebra_exam.pdf" \
  -F "slug=algebra_exam"
```

---

## Notes
- The following route modules exist in the codebase but are not currently mounted in the app: grading, structure, learning, ocr. If you want them exposed, we can wire them into `src/index.ts`.
