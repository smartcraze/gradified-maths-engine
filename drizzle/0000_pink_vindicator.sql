CREATE TYPE "public"."ocr_status" AS ENUM('pending', 'processing', 'complete', 'failed');--> statement-breakpoint
CREATE TABLE "graded_solutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_solution_id" integer NOT NULL,
	"question_paper_id" integer NOT NULL,
	"student_name" varchar(256),
	"marks" integer NOT NULL,
	"feedback" text,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "ocr_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"request_id" varchar(256) NOT NULL,
	"status" "ocr_status" DEFAULT 'pending' NOT NULL,
	"parsed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ocr_requests_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "question_solutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_paper_id" integer NOT NULL,
	"solution" text NOT NULL,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "questions_paper" (
	"id" serial PRIMARY KEY NOT NULL,
	"ocr_request_id" integer NOT NULL,
	"question_number" integer NOT NULL,
	"content" text NOT NULL,
	"structure_question" json NOT NULL,
	"metadata" json
);
--> statement-breakpoint
ALTER TABLE "graded_solutions" ADD CONSTRAINT "graded_solutions_question_solution_id_question_solutions_id_fk" FOREIGN KEY ("question_solution_id") REFERENCES "public"."question_solutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graded_solutions" ADD CONSTRAINT "graded_solutions_question_paper_id_questions_paper_id_fk" FOREIGN KEY ("question_paper_id") REFERENCES "public"."questions_paper"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_solutions" ADD CONSTRAINT "question_solutions_question_paper_id_questions_paper_id_fk" FOREIGN KEY ("question_paper_id") REFERENCES "public"."questions_paper"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions_paper" ADD CONSTRAINT "questions_paper_ocr_request_id_ocr_requests_id_fk" FOREIGN KEY ("ocr_request_id") REFERENCES "public"."ocr_requests"("id") ON DELETE cascade ON UPDATE no action;