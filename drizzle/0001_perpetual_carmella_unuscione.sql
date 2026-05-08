CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('structure', 'grade');--> statement-breakpoint
CREATE TABLE "exams" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(128) NOT NULL,
	"question_ocr_id" integer NOT NULL,
	"model_ocr_id" integer NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"structure_output" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_type" "job_type" NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"exam_id" integer,
	"submission_id" integer,
	"payload" json NOT NULL,
	"result" json,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(128) NOT NULL,
	"exam_id" integer NOT NULL,
	"student_ocr_id" integer NOT NULL,
	"student_name" varchar(256),
	"student_roll" varchar(128),
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "graded_solutions" ADD COLUMN "submission_id" integer;--> statement-breakpoint
ALTER TABLE "ocr_requests" ADD COLUMN "slug" varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE "ocr_requests" ADD COLUMN "raw_response" json;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_question_ocr_id_ocr_requests_id_fk" FOREIGN KEY ("question_ocr_id") REFERENCES "public"."ocr_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_model_ocr_id_ocr_requests_id_fk" FOREIGN KEY ("model_ocr_id") REFERENCES "public"."ocr_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_ocr_id_ocr_requests_id_fk" FOREIGN KEY ("student_ocr_id") REFERENCES "public"."ocr_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graded_solutions" ADD CONSTRAINT "graded_solutions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_requests" ADD CONSTRAINT "ocr_requests_slug_unique" UNIQUE("slug");