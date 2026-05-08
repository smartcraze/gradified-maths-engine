import OcrUploadCard from "./OcrUploadCard";
import type { StepId } from "./stepperConfig";

type StepperFormProps = {
	activeStep: StepId;
	questionPaper: string;
	modelAnswers: string;
	studentAnswerSheet: string;
	questionFileName: string | null;
	modelFileName: string | null;
	studentFileName: string | null;
	questionUploading: boolean;
	modelUploading: boolean;
	studentUploading: boolean;
	canContinue: boolean;
	isSubmitting: boolean;
	onUploadQuestion: (file: File) => void;
	onUploadModel: (file: File) => void;
	onUploadStudent: (file: File) => void;
	onBack: () => void;
	onNext: () => void;
	onEvaluate: () => void;
};

const StepperForm = ({
	activeStep,
	questionPaper,
	modelAnswers,
	studentAnswerSheet,
	questionFileName,
	modelFileName,
	studentFileName,
	questionUploading,
	modelUploading,
	studentUploading,
	canContinue,
	isSubmitting,
	onUploadQuestion,
	onUploadModel,
	onUploadStudent,
	onBack,
	onNext,
	onEvaluate,
}: StepperFormProps) => {
	return (
		<div className="rounded-3xl border border-white/10 bg-[#0b0b1f]/90 p-6 shadow-[0_20px_60px_rgba(6,6,20,0.6)] backdrop-blur">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-xs uppercase tracking-[0.3em] text-white/50">Stepper form</p>
					<h2 className="mt-3 text-2xl font-semibold text-white">Build your grading run</h2>
				</div>
				<span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">Step {activeStep + 1} of 3</span>
			</div>

			<div className="mt-6 space-y-5">
				{activeStep === 0 && (
					<OcrUploadCard
						id="question-paper-upload"
						title="Question paper"
						description="Upload the question paper PDF for OCR extraction."
						buttonLabel="Upload PDF"
						isUploading={questionUploading}
						fileName={questionFileName}
						extractedText={questionPaper}
						onFileSelect={onUploadQuestion}
					/>
				)}

				{activeStep === 1 && (
					<OcrUploadCard
						id="model-answers-upload"
						title="Model answers"
						description="Upload the model answers PDF to generate the reference text."
						buttonLabel="Upload PDF"
						isUploading={modelUploading}
						fileName={modelFileName}
						extractedText={modelAnswers}
						onFileSelect={onUploadModel}
					/>
				)}

				{activeStep === 2 && (
					<OcrUploadCard
						id="student-answers-upload"
						title="Student answer sheet"
						description="Upload the student answer sheet PDF before grading."
						buttonLabel="Upload PDF"
						isUploading={studentUploading}
						fileName={studentFileName}
						extractedText={studentAnswerSheet}
						onFileSelect={onUploadStudent}
					/>
				)}
			</div>

			<div className="mt-6 flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={onBack}
						disabled={activeStep === 0}
						className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-white/40 hover:text-white disabled:opacity-40"
					>
						Back
					</button>
					{activeStep < 2 && (
						<button
							type="button"
							onClick={onNext}
							disabled={!canContinue}
							className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#101020] transition hover:-translate-y-0.5 hover:bg-white/90 disabled:opacity-40"
						>
							Continue
						</button>
					)}
					{activeStep === 2 && (
						<button
							type="button"
							onClick={onEvaluate}
							disabled={!canContinue || isSubmitting || studentUploading}
							className="rounded-full bg-gradient-to-r from-[#5c6bff] via-[#8d5cff] to-[#ff4cc1] px-6 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(92,107,255,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(141,92,255,0.4)] disabled:opacity-50"
						>
							{isSubmitting ? "Running..." : "Run grading"}
						</button>
					)}
				</div>
				<p className="text-xs text-white/50">API endpoint: POST /api/evaluate</p>
			</div>
		</div>
	);
};

export default StepperForm;
