import { eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { ApiResponse } from "@/core/utils/api.response";
import { generateSlug } from "@/core/utils/slug.util";
import { db } from "@/db";
import { exams, jobs, ocrRequests, submissions } from "@/db/schema";

const router = Router();

// Schema for creating a submission
const CreateSubmissionSchema = z.object({
	examId: z.number().int().min(1),
	studentOcrSlug: z.string().min(1),
	studentName: z.string().optional(),
	studentRoll: z.string().optional(),
});

/**
 * POST /api/submissions
 * Create a student submission and trigger grading job
 */
router.post("/", async (req: Request, res: Response) => {
	try {
		const payload = CreateSubmissionSchema.parse(req.body);

		// Look up exam
		const [examRecord] = await db.select().from(exams).where(eq(exams.id, payload.examId)).limit(1);

		if (!examRecord) {
			return res.status(404).json(ApiResponse.error("Exam not found"));
		}

		if (examRecord.status !== "ready") {
			return res.status(400).json(ApiResponse.error("Exam not ready for submissions (structuring still in progress)"));
		}

		// Look up student OCR
		const [studentOcr] = await db
			.select()
			.from(ocrRequests)
			.where(eq(ocrRequests.slug, payload.studentOcrSlug))
			.limit(1);

		if (!studentOcr) {
			return res.status(404).json(ApiResponse.error("Student OCR slug not found"));
		}

		// Create submission
		const submissionSlug = generateSlug("submission");
		const submissionResult = await db
			.insert(submissions)
			.values({
				slug: submissionSlug,
				exam_id: payload.examId,
				student_ocr_id: studentOcr.id,
				student_name: payload.studentName,
				student_roll: payload.studentRoll,
				status: "pending",
			})
			.returning({ id: submissions.id, slug: submissions.slug });

		const submissionRow = submissionResult[0];
		if (!submissionRow) {
			return res.status(500).json(ApiResponse.error("Failed to create submission"));
		}

		const submissionId = submissionRow.id;

		// Create grading job
		const jobResult = await db
			.insert(jobs)
			.values({
				job_type: "grade",
				status: "pending",
				submission_id: submissionId,
				exam_id: payload.examId,
				payload: {
					submission_id: submissionId,
					exam_id: payload.examId,
					structured_exam: examRecord.structure_output,
					student_ocr_data: studentOcr.raw_response,
				},
			})
			.returning({ id: jobs.id });

		const jobRow = jobResult[0];
		if (!jobRow) {
			return res.status(500).json(ApiResponse.error("Failed to create job"));
		}

		console.log(`Submission created: slug=${submissionSlug}, job_id=${jobRow.id}`);

		return res.status(201).json(
			ApiResponse.success("Submission created, grading job queued", {
				submissionId,
				slug: submissionSlug,
				jobId: jobRow.id,
				status: "pending",
			}),
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json(ApiResponse.error("Validation error", error.issues));
		}
		console.error("Submission creation error:", error);
		return res.status(500).json(ApiResponse.error("Internal server error"));
	}
});

/**
 * GET /api/submissions/:id/status
 * Check submission grading status
 */
router.get("/:id/status", async (req: Request, res: Response) => {
	try {
		const submissionIdRaw = req.params.id;
		if (!submissionIdRaw || Array.isArray(submissionIdRaw)) {
			return res.status(400).json(ApiResponse.error("Invalid submission ID"));
		}

		const submissionId = Number(submissionIdRaw);
		if (Number.isNaN(submissionId)) {
			return res.status(400).json(ApiResponse.error("Invalid submission ID"));
		}

		const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);

		if (!submission) {
			return res.status(404).json(ApiResponse.error("Submission not found"));
		}

		const job = await db.select().from(jobs).where(eq(jobs.submission_id, submissionId)).orderBy(jobs.id).limit(1);
		const jobRow = job[0];

		return res.status(200).json(
			ApiResponse.success("Submission status retrieved", {
				id: submission.id,
				slug: submission.slug,
				status: submission.status,
				jobStatus: jobRow ? jobRow.status : "none",
				evaluationResult: jobRow ? jobRow.result : null,
			}),
		);
	} catch (error) {
		console.error("Submission status error:", error);
		return res.status(500).json(ApiResponse.error("Internal server error"));
	}
});

export default router;
