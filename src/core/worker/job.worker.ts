import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exams, jobs, ocrRequests, submissions } from "@/db/schema";
import { gradeStudentAnswerSheet } from "@/modules/grading";
import { getStructuredExamData } from "@/modules/structure";

const MAX_RETRIES = 3;

type JobRow = typeof jobs.$inferSelect;
type OcrPayload = Record<string, unknown>;

type StructureJobPayload = {
	question_ocr_data: OcrPayload;
	model_ocr_data: OcrPayload;
};

type GradeJobPayload = {
	student_ocr_data: OcrPayload;
};

function isStructureJobPayload(payload: unknown): payload is StructureJobPayload {
	if (!payload || typeof payload !== "object") return false;
	const obj = payload as Record<string, unknown>;
	return typeof obj.question_ocr_data === "object" && typeof obj.model_ocr_data === "object";
}

function isGradeJobPayload(payload: unknown): payload is GradeJobPayload {
	if (!payload || typeof payload !== "object") return false;
	const obj = payload as Record<string, unknown>;
	return typeof obj.student_ocr_data === "object";
}

/**
 * Process a single job (structure or grade)
 */
export async function processJob(jobId: number): Promise<void> {
	try {
		// Fetch job
		const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);

		if (!job) {
			console.warn(`Job ${jobId} not found`);
			return;
		}

		if (job.job_type === "structure") {
			await processStructuringJob(job);
		} else if (job.job_type === "grade") {
			await processGradingJob(job);
		}
	} catch (error) {
		console.error(`Error processing job ${jobId}:`, error);
	}
}

/**
 * Process a structuring job
 */
async function processStructuringJob(job: JobRow): Promise<void> {
	try {
		if (!job.exam_id) {
			throw new Error("Job missing exam_id");
		}

		// Mark job as processing
		await db.update(jobs).set({ status: "processing" }).where(eq(jobs.id, job.id));

		const payload = job.payload as unknown;
		if (!isStructureJobPayload(payload)) {
			throw new Error("Invalid payload for structuring job");
		}

		// Extract OCR text from raw responses
		const questionText = extractTextFromOcr(payload.question_ocr_data);
		const modelAnswerText = extractTextFromOcr(payload.model_ocr_data);

		if (!questionText || !modelAnswerText) {
			throw new Error("Failed to extract text from OCR data");
		}

		console.log(`Processing structure job ${job.id} for exam ${job.exam_id}`);

		// Call structuring module
		const structuredData = await getStructuredExamData(questionText, modelAnswerText, {
			ocrRequestId: job.exam_id,
		});

		// Store structure output
		await db
			.update(exams)
			.set({
				structure_output: structuredData as Record<string, unknown>,
				status: "ready",
				updated_at: new Date(),
			})
			.where(eq(exams.id, job.exam_id));

		// Mark job as completed
		await db
			.update(jobs)
			.set({
				status: "completed",
				result: structuredData as Record<string, unknown>,
				updated_at: new Date(),
			})
			.where(eq(jobs.id, job.id));

		console.log(`Structure job ${job.id} completed successfully`);
	} catch (error) {
		console.error(`Structure job ${job.id} failed:`, error);
		await handleJobError(job, error);
	}
}

/**
 * Process a grading job
 */
async function processGradingJob(job: JobRow): Promise<void> {
	try {
		if (!job.submission_id) {
			throw new Error("Job missing submission_id");
		}

		// Mark job as processing
		await db.update(jobs).set({ status: "processing" }).where(eq(jobs.id, job.id));

		const payload = job.payload as unknown;
		if (!isGradeJobPayload(payload)) {
			throw new Error("Invalid payload for grading job");
		}

		// Extract student answer text from OCR
		const studentAnswerText = extractTextFromOcr(payload.student_ocr_data);

		if (!studentAnswerText) {
			throw new Error("Failed to extract text from student OCR");
		}

		console.log(`Processing grading job ${job.id} for submission ${job.submission_id}`);

		// Call grading module
		if (!job.exam_id) {
			throw new Error("Job missing exam_id for grading");
		}

		const [examRecord] = await db.select().from(exams).where(eq(exams.id, job.exam_id)).limit(1);
		if (!examRecord) {
			throw new Error(`Exam ${job.exam_id} not found`);
		}

		const [questionOcr] = await db
			.select()
			.from(ocrRequests)
			.where(eq(ocrRequests.id, examRecord.question_ocr_id))
			.limit(1);
		const [modelOcr] = await db.select().from(ocrRequests).where(eq(ocrRequests.id, examRecord.model_ocr_id)).limit(1);

		const questionPaper = extractTextFromOcr(questionOcr?.raw_response ?? null);
		const modelAnswers = extractTextFromOcr(modelOcr?.raw_response ?? null);

		if (!questionPaper || !modelAnswers) {
			throw new Error("Failed to extract question/model answers from OCR");
		}

		const evaluation = await gradeStudentAnswerSheet({
			questionPaper,
			modelAnswers,
			studentAnswerSheet: studentAnswerText,
		});

		// Store evaluation result
		await db
			.update(submissions)
			.set({
				status: "graded",
				updated_at: new Date(),
			})
			.where(eq(submissions.id, job.submission_id));

		// Mark job as completed with result
		await db
			.update(jobs)
			.set({
				status: "completed",
				result: evaluation as Record<string, unknown>,
				updated_at: new Date(),
			})
			.where(eq(jobs.id, job.id));

		console.log(`Grading job ${job.id} completed successfully`);
	} catch (error) {
		console.error(`Grading job ${job.id} failed:`, error);
		await handleJobError(job, error);
	}
}

/**
 * Handle job error with retry logic
 */
async function handleJobError(job: JobRow, error: unknown): Promise<void> {
	const nextAttempts = (job.attempts || 0) + 1;
	const errorMessage = error instanceof Error ? error.message : String(error);

	if (nextAttempts < MAX_RETRIES) {
		console.warn(`Job ${job.id} failed (attempt ${nextAttempts}/${MAX_RETRIES}), will retry...`);
		await db
			.update(jobs)
			.set({
				status: "pending",
				attempts: nextAttempts,
				last_error: errorMessage,
				updated_at: new Date(),
			})
			.where(eq(jobs.id, job.id));
	} else {
		console.error(`Job ${job.id} failed after ${MAX_RETRIES} attempts`);
		await db
			.update(jobs)
			.set({
				status: "failed",
				attempts: nextAttempts,
				last_error: errorMessage,
				updated_at: new Date(),
			})
			.where(eq(jobs.id, job.id));

		// Mark exam/submission as failed
		if (job.exam_id) {
			await db.update(exams).set({ status: "failed", updated_at: new Date() }).where(eq(exams.id, job.exam_id));
		}
		if (job.submission_id) {
			await db
				.update(submissions)
				.set({ status: "failed", updated_at: new Date() })
				.where(eq(submissions.id, job.submission_id));
		}
	}
}

/**
 * Extract text from OCR response (supports multiple OCR formats)
 */
function extractTextFromOcr(ocrData: unknown): string | null {
	if (!ocrData || typeof ocrData !== "object") return null;

	const data = ocrData as Record<string, unknown>;

	// Try common OCR response formats
	if (typeof data.text === "string") return data.text;
	if (typeof data.full_text === "string") return data.full_text;
	if (typeof data.extracted_text === "string") return data.extracted_text;

	// Try page-based format
	if (Array.isArray(data.pages)) {
		return data.pages
			.map((page: unknown) => {
				if (typeof page === "string") return page;
				if (page && typeof page === "object") {
					const pageObj = page as Record<string, unknown>;
					const text = pageObj.text ?? pageObj.content;
					return typeof text === "string" ? text : "";
				}
				return "";
			})
			.filter((p) => p.length > 0)
			.join("\n");
	}

	// Try data field
	if (typeof data.data === "string") return data.data;

	// Fallback: try to stringify entire object
	try {
		return JSON.stringify(data);
	} catch {
		return null;
	}
}

/**
 * Worker loop: poll for pending jobs and process them
 */
export async function startJobWorker(pollIntervalMs: number = 5000): Promise<void> {
	console.log(`Starting job worker (poll interval: ${pollIntervalMs}ms)`);

	setInterval(async () => {
		try {
			const pendingJobs = await db.select().from(jobs).where(eq(jobs.status, "pending")).limit(1);

			if (pendingJobs.length > 0) {
				const job = pendingJobs[0];
				if (!job) return;
				console.debug(`Found pending job ${job.id}, processing...`);
				await processJob(job.id);
			}
		} catch (error) {
			console.error("Worker loop error:", error);
		}
	}, pollIntervalMs);
}
