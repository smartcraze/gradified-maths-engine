import { eq } from "drizzle-orm";
import { type Request, type Response, Router } from "express";
import { z } from "zod";
import { ApiResponse } from "@/core/utils/api.response";
import { generateSlug } from "@/core/utils/slug.util";
import { db } from "@/db";
import { exams, jobs, ocrRequests } from "@/db/schema";

const router = Router();

// Schema for creating an exam
const CreateExamSchema = z.object({
	questionOcrSlug: z.string().min(1),
	modelOcrSlug: z.string().min(1),
	subject: z.string().optional(),
	class: z.string().optional(),
});

/**
 * POST /api/exams
 * Create an exam by linking question paper + model answer OCR results
 * Triggers structuring job in background
 */
router.post("/", async (req: Request, res: Response) => {
	try {
		const payload = CreateExamSchema.parse(req.body);

		// Look up OCR results by slug
		const [questionOcr, modelOcr] = await Promise.all([
			db.select().from(ocrRequests).where(eq(ocrRequests.slug, payload.questionOcrSlug)).limit(1),
			db.select().from(ocrRequests).where(eq(ocrRequests.slug, payload.modelOcrSlug)).limit(1),
		]);

		const questionRow = questionOcr[0];
		const modelRow = modelOcr[0];

		if (!questionRow || !modelRow) {
			return res.status(404).json(ApiResponse.error("OCR slug not found"));
		}

		// Create exam
		const examSlug = generateSlug("exam");
		const examResult = await db
			.insert(exams)
			.values({
				slug: examSlug,
				question_ocr_id: questionRow.id,
				model_ocr_id: modelRow.id,
				status: "pending",
				metadata: {
					subject: payload.subject,
					class: payload.class,
				},
			})
			.returning({ id: exams.id, slug: exams.slug });

		const examRow = examResult[0];
		if (!examRow) {
			return res.status(500).json(ApiResponse.error("Failed to create exam"));
		}

		const examId = examRow.id;

		// Create structuring job
		const jobResult = await db
			.insert(jobs)
			.values({
				job_type: "structure",
				status: "pending",
				exam_id: examId,
				payload: {
					exam_id: examId,
					question_ocr_id: questionRow.id,
					model_ocr_id: modelRow.id,
					question_ocr_data: questionRow.raw_response,
					model_ocr_data: modelRow.raw_response,
				},
			})
			.returning({ id: jobs.id });

		const jobRow = jobResult[0];
		if (!jobRow) {
			return res.status(500).json(ApiResponse.error("Failed to create job"));
		}

		console.log(`Exam created: slug=${examSlug}, job_id=${jobRow.id}`);

		return res.status(201).json(
			ApiResponse.success("Exam created, structuring job queued", {
				examId,
				slug: examSlug,
				jobId: jobRow.id,
				status: "pending",
			}),
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json(ApiResponse.error("Validation error", error.issues));
		}
		console.error("Exam creation error:", error);
		return res.status(500).json(ApiResponse.error("Internal server error"));
	}
});

/**
 * GET /api/exams/:id/status
 * Check exam structuring status
 */
router.get("/:id/status", async (req: Request, res: Response) => {
	try {
		const examIdRaw = req.params.id;
		if (!examIdRaw || Array.isArray(examIdRaw)) {
			return res.status(400).json(ApiResponse.error("Invalid exam ID"));
		}

		const examId = Number(examIdRaw);
		if (Number.isNaN(examId)) {
			return res.status(400).json(ApiResponse.error("Invalid exam ID"));
		}

		const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);

		if (!exam) {
			return res.status(404).json(ApiResponse.error("Exam not found"));
		}

		const job = await db.select().from(jobs).where(eq(jobs.exam_id, examId)).orderBy(jobs.id).limit(1);
		const jobRow = job[0];

		return res.status(200).json(
			ApiResponse.success("Exam status retrieved", {
				id: exam.id,
				slug: exam.slug,
				status: exam.status,
				jobStatus: jobRow ? jobRow.status : "none",
				structureOutput: exam.structure_output,
			}),
		);
	} catch (error) {
		console.error("Exam status error:", error);
		return res.status(500).json(ApiResponse.error("Internal server error"));
	}
});

export default router;
