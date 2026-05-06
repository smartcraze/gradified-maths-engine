# Maths Engine — API Reference

This document lists the backend HTTP endpoints, their inputs, responses, and side-effects (DB tables touched). Use these when integrating the frontend, or calling the backend directly.

## Authentication & Env

- `OPENAI_API_KEY` — required for LLM grading/structuring.
- `DATALAB_API_KEY` — required for OCR provider requests.

All endpoints use JSON responses by default. Errors return standard HTTP error codes and a JSON body `{ success: false, error: string }`.

---

## OCR

- **POST /ocr**
  - Description: Upload a document (PDF / image). Server proxies file to Datalab `/api/v1/convert` and creates an internal OCR request record.
  - Content-Type: `multipart/form-data`
  - Form fields:
    - `file` (required): file binary (PDF, PNG, JPG, etc.)
  - Response (201):
    ```json
    {
      "success": true,
      "data": {
        "ocrRequestId": "<uuid>",
        "requestId": "<datalab_request_id>",
        "requestCheckUrl": "https://.../convert/<id>/status"
      }
    }
    ```
  - DB side-effects: inserts a row into `ocr_requests` with metadata (`file_name`, `mime_type`, `size_bytes`, `request_id`, `status`, `created_at`).

- **GET /ocr/:ocrRequestId**
  - Description: Fetch current status and (if available) converted content. Server polls Datalab for final payload when requested.
  - Path params:
    - `ocrRequestId` (required): internal `ocr_requests.id` (UUID)
  - Response (200):
    ```json
    {
      "success": true,
      "data": {
        "ocrRequest": { /* local DB record */ },
        "datalabRequest": { /* raw provider payload if fetched */ },
        "content": {
          "markdown": "...",
          "html": "...",
          "json": { /* parsed result if available */ }
        }
      }
    }
    ```
  - DB side-effects: may update `ocr_requests.status` and `ocr_requests.parsed` and store provider IDs.

Notes:
- The returned `requestCheckUrl` is the provider's check/poll URL — server uses provider API to fetch results and normalize them before returning.

---

## Structure Extraction (Exam Structuring)

- **POST /structure**
  - Description: Accepts raw question paper and model answers and returns a structured exam JSON (the raw LLM JSON is persisted).
  - Content-Type: `application/json`
  - Body schema:
    ```json
    {
      "questionPaper": "<string>",
      "modelAnswers": "<string>",
      "ocrRequestId": "<uuid>" // optional - associate with an OCR request
    }
    ```
  - Response (200):
    ```json
    {
      "success": true,
      "data": {
        "structuredExam": { /* raw StructuredExam JSON from LLM */ },
        "savedRecordId": "<questions_paper.id>"
      }
    }
    ```
  - DB side-effects: creates or updates a `questions_paper` record and stores the raw LLM JSON into `questions_paper.structure_question` (the exact raw JSON is saved for reuse).

- **GET /structure/:ocrRequestId**
  - Description: Retrieve stored structured exam associated with an `ocrRequestId` (or other identifying key).
  - Path params:
    - `ocrRequestId` (required): UUID
  - Response (200): `{ success: true, data: { structuredExam: { ... } } }`
  - DB reads: `questions_paper.structure_question` by `ocr_request_id`.

Notes:
- The persisted structured JSON is intended to be the exact LLM-produced JSON (no normalization loss) so grading and frontend can reuse identical inputs.

---

## Grading

- **POST /grading/evaluate**
  - Description: Grade a student answer sheet. You can either reference a stored structured exam (via `ocrRequestId`) or provide `questionPaper` + `modelAnswers` inline.
  - Content-Type: `application/json`
  - Body schema (either/or):
    ```json
    {
      "ocrRequestId": "<uuid>",
      "studentAnswerSheet": "<string>"
    }
    // OR
    {
      "questionPaper": "<string>",
      "modelAnswers": "<string>",
      "studentAnswerSheet": "<string>"
    }
    ```
  - Response (200):
    ```json
    {
      "success": true,
      "data": {
        "evaluation": [ /* QuestionEvaluation[] */ ],
        "summary": {
          "total_questions": 10,
          "total_max_marks": 100,
          "total_awarded_marks": 87,
          "percentage": 87
        }
      }
    }
    ```
  - DB side-effects: writes evaluation artifacts (per-question rows) to `question_solutions` and/or `graded_solutions` depending on implementation; may also log evaluation metadata.

Notes:
- If `ocrRequestId` is provided the server will load the persisted structured exam JSON and use it as the source of truth for question ids, expected steps and rubrics.
- Grading of non-MCQ questions uses the LLM grading model and then passes results through the rubric post-processing before persistence.

---

## Learning / Corrections (summary)

The learning module exposes endpoints to submit teacher corrections and fetch learning metrics. Example endpoints (if present in your deployment):

- `POST /learning/corrections` — submit a teacher correction payload (evaluationId, questionId, correctedMarks, correctedCorrectness, reason, stepCorrections).
- `GET /learning/patterns` — fetch detected error patterns.

See the `src/modules/learning` module for exact request/response shapes if you plan to integrate with teacher corrections.

---

## Validation & Common Errors

- All JSON POSTs are validated using Zod schemas — expect `400` for invalid payloads.
- If provider calls fail (OpenAI, Datalab), the endpoints will return `503` or `502` with provider error details.

## Quick Examples

- Upload OCR (curl):
  ```bash
  curl -F "file=@exam.pdf" http://localhost:3000/ocr
  ```

- Submit structure (JSON):
  ```bash
  curl -X POST http://localhost:3000/structure \
    -H "Content-Type: application/json" \
    -d '{"questionPaper":"...","modelAnswers":"..."}'
  ```

- Grade using stored structure:
  ```bash
  curl -X POST http://localhost:3000/grading/evaluate \
    -H "Content-Type: application/json" \
    -d '{"ocrRequestId":"<uuid>","studentAnswerSheet":"..."}'
  ```

---

If you want, I can:
- Add example full responses for each endpoint.
- Include exact Zod schemas and links to the implementation files.
- Expand the Learning endpoints docs into full request examples.

---
Generated on: 2026-05-06
