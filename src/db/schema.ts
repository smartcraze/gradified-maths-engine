import { boolean, integer, json, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const ocrStatusEnum = pgEnum("ocr_status", ["pending", "processing", "complete", "failed"]);

export const ocrRequests = pgTable("ocr_requests", {
	id: serial("id").primaryKey(),
	file_name: text("file_name").notNull(),
	mime_type: varchar("mime_type", { length: 128 }).notNull(),
	size_bytes: integer("size_bytes").notNull().default(0),
	request_id: varchar("request_id", { length: 256 }).notNull().unique(),
	status: ocrStatusEnum("status").notNull().default("pending"),
	parsed: boolean("parsed").notNull().default(false),
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

export const GradedSolutions = pgTable("graded_solutions", {
	id: serial("id").primaryKey(),
	question_solution_id: integer("question_solution_id")
		.notNull()
		.references(() => questionSolutions.id, { onDelete: "cascade" }),
	question_paper_id: integer("question_paper_id")
		.notNull()
		.references(() => questionsPaper.id, { onDelete: "cascade" }),
	student_name: varchar("student_name", { length: 256 }),
	marks: integer("marks").notNull(),
	feedback: text("feedback"),
	metadata: json("metadata"),
});
