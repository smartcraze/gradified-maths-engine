import { z } from "zod";

export const QuestionTypeSchema = z
  .enum(["mcq", "integer", "very_short", "short", "long", "other"])
  .describe("Normalized question kind used by downstream evaluation logic.");

export const AnswerTypeSchema = z
  .enum(["single", "multi", "numeric", "descriptive"])
  .describe("Expected answer behavior for grading.");

export const QuestionOptionSchema = z
  .object({
    label: z.string().describe("Visible option key, e.g. 'a', 'b', 'c', 'd'."),
    text: z.string().describe("Option text exactly as it appears in the paper."),
  })
  .describe("One MCQ option.");

const SourceSpanSchema = z
  .object({
    page: z.number().int().positive().optional().describe("Source page number if known."),
    lineStart: z.number().int().positive().optional().describe("Starting line index from OCR extraction if known."),
    lineEnd: z.number().int().positive().optional().describe("Ending line index from OCR extraction if known."),
  })
  .describe("Optional OCR/source position metadata for traceability.");

export const QuestionSchema = z
  .object({
    id: z.number().int().positive().describe("Stable numeric identifier for this question node."),
    type: QuestionTypeSchema,
    question: z.string().min(1).describe("Normalized question text. Keep math symbols/LaTeX where present."),
    marks: z.number().nonnegative().describe("Marks allotted to this question node."),
    options: z.array(QuestionOptionSchema).optional().describe("Present only for MCQ questions."),
    get subQuestions() {
      return z
        .array(QuestionSchema)
        .optional()
        .describe("Recursive child questions, such as (i), (ii), or multi-part questions.");
    },
    raw: z.string().optional().describe("Raw OCR fallback snippet copied from source when normalization is uncertain."),
    answerType: AnswerTypeSchema.optional(),
    questionNumber: z
      .string()
      .optional()
      .describe("Original numbering token from the paper, e.g. '14', '16(i)', 'Q3'."),
    section: z.string().optional().describe("Section label from source, e.g. 'Section B'."),
    sourceSpan: SourceSpanSchema.optional(),
    tags: z.array(z.string()).optional().describe("Optional lightweight topic tags, e.g. ['sets', 'trigonometry']."),
  })
  .describe("Canonical recursive question schema used across paper, model answer, and student answer extraction.");

export const QuestionPaperMetadataSchema = z
  .object({
    className: z.string().optional().describe("Class/grade label if available, e.g. 'Class XI'."),
    subject: z.string().optional().describe("Subject name, e.g. 'Mathematics'."),
    examName: z.string().optional().describe("Exam/test name, e.g. 'Unit Test'."),
    totalMarks: z.number().nonnegative().optional().describe("Total marks mentioned in the paper."),
    duration: z.string().optional().describe("Exam duration text, e.g. '1½ Hours'."),
    chapterScope: z.array(z.string()).optional().describe("List of chapter/topic names from the paper header."),
    instructions: z.array(z.string()).optional().describe("General instructions extracted from the paper."),
  })
  .describe("High-level metadata for question papers.");

export const QuestionSectionSchema = z
  .object({
    id: z.string().describe("Stable section id, e.g. 'A', 'B', 'C'."),
    title: z.string().describe("Section title from paper."),
    markPattern: z.string().optional().describe("Section mark pattern, e.g. '(2 × 6 = 12 marks)'."),
    questions: z.array(QuestionSchema).describe("Questions that belong to this section."),
  })
  .describe("Question paper section block.");

export const StructuredQuestionPaperSchema = z
  .object({
    documentType: z.literal("question_paper").describe("Discriminator for routing and validation."),
    metadata: QuestionPaperMetadataSchema,
    sections: z.array(QuestionSectionSchema).describe("Section-wise grouped questions."),
    questionsFlat: z
      .array(QuestionSchema)
      .optional()
      .describe("Optional flattened list for easier downstream iteration."),
  })
  .describe("Final structured output for a question paper OCR/raw input.");

export const ModelAnswerItemSchema = z
  .object({
    questionRef: z.string().describe("Question number/id reference from the source paper, e.g. '15' or '16(ii)'."),
    answer: z.string().describe("Final model answer text for the referenced question."),
    keySteps: z.array(z.string()).optional().describe("Important solving steps for descriptive/numeric answers."),
    finalValue: z.string().optional().describe("Single final value when relevant (e.g. numeric final answer)."),
  })
  .describe("Structured answer unit for the model answer document.");

export const StructuredModelAnswerSchema = z
  .object({
    documentType: z.literal("model_answer").describe("Discriminator for routing and validation."),
    answers: z.array(ModelAnswerItemSchema).describe("Ordered model answers mapped to question refs."),
    raw: z.string().optional().describe("Raw fallback text if some lines could not be mapped cleanly."),
  })
  .describe("Final structured output for model-answer OCR/raw input.");

export const StudentAnswerItemSchema = z
  .object({
    questionRef: z.string().describe("Question number/id reference from the source paper, e.g. '15' or '16(ii)'."),
    response: z.string().describe("Student's extracted answer text for that question."),
    attempted: z.boolean().describe("Whether student attempted the question."),
    raw: z.string().optional().describe("Raw OCR fallback for low-confidence response extraction."),
  })
  .describe("Structured answer unit for one student response.");

export const StructuredStudentSheetSchema = z
  .object({
    documentType: z.literal("student_sheet").describe("Discriminator for routing and validation."),
    studentId: z.string().optional().describe("Student identifier if available in source."),
    studentName: z.string().optional().describe("Student name if available in source."),
    responses: z.array(StudentAnswerItemSchema).describe("Student responses mapped by question reference."),
    raw: z.string().optional().describe("Raw fallback content when mapping confidence is low."),
  })
  .describe("Final structured output for student answer sheet OCR/raw input.");

export type Question = z.infer<typeof QuestionSchema>;
export type StructuredQuestionPaper = z.infer<typeof StructuredQuestionPaperSchema>;
export type StructuredModelAnswer = z.infer<typeof StructuredModelAnswerSchema>;
export type StructuredStudentSheet = z.infer<typeof StructuredStudentSheetSchema>;
