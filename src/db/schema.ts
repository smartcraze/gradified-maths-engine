import { boolean, integer, json, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const ocrStatusEnum = pgEnum("ocr_status", ["pending", "processing", "complete", "failed"]);
export const jobStatusEnum = pgEnum("job_status", ["pending", "processing", "completed", "failed"]);
export const jobTypeEnum = pgEnum("job_type", ["structure", "grade"]);

export const ocrRequests = pgTable("ocr_requests", {
	id: serial("id").primaryKey(),
	file_name: text("file_name").notNull(),
	mime_type: varchar("mime_type", { length: 128 }).notNull(),
	size_bytes: integer("size_bytes").notNull().default(0),
	request_id: varchar("request_id", { length: 256 }).notNull().unique(),
	slug: varchar("slug", { length: 128 }).notNull().unique(),
	status: ocrStatusEnum("status").notNull().default("pending"),
	parsed: boolean("parsed").notNull().default(false),
	raw_response: json("raw_response"), // Store frontend-provided OCR JSON
	created_at: timestamp("created_at").notNull().defaultNow(),
});

export const questionsPaper = pgTable("questions_paper", {
	id: serial("id").primaryKey(),
	ocr_request_id: integer("ocr_request_id")
		.notNull()
		.references(() => ocrRequests.id, { onDelete: "cascade" }),
	question_number: integer("question_number").notNull(),
	content: text("content").notNull(),
	structure_question: json("structure_question").notNull(),
	metadata: json("metadata"),
});

export const questionSolutions = pgTable("question_solutions", {
	id: serial("id").primaryKey(),
	question_paper_id: integer("question_paper_id")
		.notNull()
		.references(() => questionsPaper.id, { onDelete: "cascade" }),
	solution: text("solution").notNull(),
	metadata: json("metadata"),
});

export const exams = pgTable("exams", {
	id: serial("id").primaryKey(),
	slug: varchar("slug", { length: 128 }).notNull().unique(),
	question_ocr_id: integer("question_ocr_id")
		.notNull()
		.references(() => ocrRequests.id, { onDelete: "cascade" }),
	model_ocr_id: integer("model_ocr_id")
		.notNull()
		.references(() => ocrRequests.id, { onDelete: "cascade" }),
	status: varchar("status", { length: 32 }).notNull().default("pending"), // pending, structuring, ready, failed
	structure_output: json("structure_output"), // Stores structured exam data
	metadata: json("metadata"),
	created_at: timestamp("created_at").notNull().defaultNow(),
	updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const submissions = pgTable("submissions", {
	id: serial("id").primaryKey(),
	slug: varchar("slug", { length: 128 }).notNull().unique(),
	exam_id: integer("exam_id")
		.notNull()
		.references(() => exams.id, { onDelete: "cascade" }),
	student_ocr_id: integer("student_ocr_id")
		.notNull()
		.references(() => ocrRequests.id, { onDelete: "cascade" }),
	student_name: varchar("student_name", { length: 256 }),
	student_roll: varchar("student_roll", { length: 128 }),
	status: varchar("status", { length: 32 }).notNull().default("pending"), // pending, grading, graded, failed
	metadata: json("metadata"),
	created_at: timestamp("created_at").notNull().defaultNow(),
	updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
	id: serial("id").primaryKey(),
	job_type: jobTypeEnum("job_type").notNull(), // 'structure' or 'grade'
	status: jobStatusEnum("status").notNull().default("pending"),
	exam_id: integer("exam_id").references(() => exams.id, { onDelete: "cascade" }),
	submission_id: integer("submission_id").references(() => submissions.id, { onDelete: "cascade" }),
	payload: json("payload").notNull(), // Stores input data for the job
	result: json("result"), // Stores output data after completion
	attempts: integer("attempts").notNull().default(0),
	last_error: text("last_error"),
	created_at: timestamp("created_at").notNull().defaultNow(),
	updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const GradedSolutions = pgTable("graded_solutions", {
	id: serial("id").primaryKey(),
	question_solution_id: integer("question_solution_id")
		.notNull()
		.references(() => questionSolutions.id, { onDelete: "cascade" }),
	question_paper_id: integer("question_paper_id")
		.notNull()
		.references(() => questionsPaper.id, { onDelete: "cascade" }),
	submission_id: integer("submission_id").references(() => submissions.id, { onDelete: "cascade" }),
	student_name: varchar("student_name", { length: 256 }),
	marks: integer("marks").notNull(),
	feedback: text("feedback"),
	metadata: json("metadata"),
});
