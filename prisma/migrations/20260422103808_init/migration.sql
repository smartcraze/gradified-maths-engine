-- CreateEnum
CREATE TYPE "ExamStructureStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "SubmissionParseStatus" AS ENUM ('PARSED', 'FAILED');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ExamCache" (
    "id" TEXT NOT NULL,
    "examCode" TEXT,
    "questionPaperHash" TEXT NOT NULL,
    "modelAnswerHash" TEXT NOT NULL,
    "questionPaperRaw" TEXT,
    "modelAnswerRaw" TEXT,
    "structuredQuestionPaper" JSONB NOT NULL,
    "structuredModelAnswer" JSONB NOT NULL,
    "alignmentReport" JSONB,
    "status" "ExamStructureStatus" NOT NULL DEFAULT 'READY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSubmission" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentIdentifier" TEXT NOT NULL,
    "studentName" TEXT,
    "studentSheetHash" TEXT NOT NULL,
    "studentSheetRaw" TEXT,
    "structuredStudentSheet" JSONB NOT NULL,
    "parseStatus" "SubmissionParseStatus" NOT NULL DEFAULT 'PARSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationResult" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "totalMarks" DECIMAL(6,2),
    "maxMarks" DECIMAL(6,2),
    "percentage" DECIMAL(5,2),
    "questionWiseMarks" JSONB,
    "rubricBreakdown" JSONB,
    "feedback" JSONB,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamCache_examCode_idx" ON "ExamCache"("examCode");

-- CreateIndex
CREATE INDEX "ExamCache_createdAt_idx" ON "ExamCache"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "exam_hash_pair_unique" ON "ExamCache"("questionPaperHash", "modelAnswerHash");

-- CreateIndex
CREATE INDEX "StudentSubmission_examId_studentIdentifier_idx" ON "StudentSubmission"("examId", "studentIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "submission_dedupe_unique" ON "StudentSubmission"("examId", "studentIdentifier", "studentSheetHash");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationResult_submissionId_key" ON "EvaluationResult"("submissionId");

-- AddForeignKey
ALTER TABLE "StudentSubmission" ADD CONSTRAINT "StudentSubmission_examId_fkey" FOREIGN KEY ("examId") REFERENCES "ExamCache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResult" ADD CONSTRAINT "EvaluationResult_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "StudentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
