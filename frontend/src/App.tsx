import { useMemo, useState } from "react";
import EvaluationPanel from "./components/EvaluationPanel";
import HeroPanel from "./components/HeroPanel";
import StepperForm from "./components/StepperForm";
import type { StepId } from "./components/stepperConfig";
import type { ApiResponse, Evaluation, OcrResponse } from "./components/types";

function App() {
	const [activeStep, setActiveStep] = useState<StepId>(0);
	const [questionPaper, setQuestionPaper] = useState("");
	const [modelAnswers, setModelAnswers] = useState("");
	const [studentAnswerSheet, setStudentAnswerSheet] = useState("");
	const [questionFileName, setQuestionFileName] = useState<string | null>(null);
	const [modelFileName, setModelFileName] = useState<string | null>(null);
	const [studentFileName, setStudentFileName] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [questionUploading, setQuestionUploading] = useState(false);
	const [modelUploading, setModelUploading] = useState(false);
	const [studentUploading, setStudentUploading] = useState(false);
	const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
	const [error, setError] = useState<string | null>(null);

	const canContinue = useMemo(() => {
		if (activeStep === 0) {
			return !questionUploading && questionPaper.trim().length > 0;
		}
		if (activeStep === 1) {
			return !modelUploading && modelAnswers.trim().length > 0;
		}
		return !studentUploading && studentAnswerSheet.trim().length > 0;
	}, [
		activeStep,
		questionPaper,
		modelAnswers,
		studentAnswerSheet,
		questionUploading,
		modelUploading,
		studentUploading,
	]);

	const handleNext = () => {
		setError(null);
		setEvaluation(null);
		if (activeStep < 2) {
			setActiveStep((activeStep + 1) as StepId);
		}
	};

	const handleBack = () => {
		setError(null);
		if (activeStep > 0) {
			setActiveStep((activeStep - 1) as StepId);
		}
	};

	const handleEvaluate = async () => {
		setIsSubmitting(true);
		setError(null);
		setEvaluation(null);

		try {
			const res = await fetch("/api/evaluate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					questionPaper,
					modelAnswers,
					studentAnswerSheet,
				}),
			});

			const data = (await res.json()) as ApiResponse<Evaluation>;
			if (!res.ok || !data.success) {
				throw new Error(data.message || "Request failed");
			}

			setEvaluation(data.data ?? null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleOcrUpload = async (
		file: File,
		options: {
			setUploading: (value: boolean) => void;
			setFileName: (value: string | null) => void;
			setText: (value: string) => void;
		},
	) => {
		options.setUploading(true);
		setError(null);
		setEvaluation(null);
		options.setFileName(file.name);

		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("pdfPath", file.name);

			const res = await fetch("/api/olm-ocr", {
				method: "POST",
				body: formData,
			});

			const rawBody = await res.text();
			const data = (rawBody ? JSON.parse(rawBody) : {}) as ApiResponse<OcrResponse>;
			if (!res.ok || !data.success || !data.data) {
				throw new Error(data.message || `OCR request failed (${res.status})`);
			}

			options.setText(data.data.rawmarkdown?.trim() ?? "");
		} catch (err) {
			setError(err instanceof Error ? err.message : "OCR upload failed");
			options.setText("");
		} finally {
			options.setUploading(false);
		}
	};

	return (
		<div className="relative min-h-screen overflow-hidden">
			<div className="hero-grid pointer-events-none absolute inset-0" />
			<div className="pointer-events-none absolute -left-20 top-24 h-64 w-64 rounded-full bg-[#5c6bff]/30 blur-[120px]" />
			<div className="pointer-events-none absolute right-10 top-16 h-72 w-72 rounded-full bg-[#b15cff]/25 blur-[140px]" />
			<div className="pointer-events-none absolute bottom-16 left-1/3 h-64 w-64 rounded-full bg-[#ff4cc1]/20 blur-[160px]" />

			<div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-10 pt-10 lg:flex-row lg:items-start">
				<HeroPanel activeStep={activeStep} />
				<div className="flex w-full max-w-xl flex-col gap-6">
					<StepperForm
						activeStep={activeStep}
						questionPaper={questionPaper}
						modelAnswers={modelAnswers}
						studentAnswerSheet={studentAnswerSheet}
						questionFileName={questionFileName}
						modelFileName={modelFileName}
						studentFileName={studentFileName}
						questionUploading={questionUploading}
						modelUploading={modelUploading}
						studentUploading={studentUploading}
						canContinue={canContinue}
						isSubmitting={isSubmitting}
						onUploadQuestion={(file) =>
							handleOcrUpload(file, {
								setUploading: setQuestionUploading,
								setFileName: setQuestionFileName,
								setText: setQuestionPaper,
							})
						}
						onUploadModel={(file) =>
							handleOcrUpload(file, {
								setUploading: setModelUploading,
								setFileName: setModelFileName,
								setText: setModelAnswers,
							})
						}
						onUploadStudent={(file) =>
							handleOcrUpload(file, {
								setUploading: setStudentUploading,
								setFileName: setStudentFileName,
								setText: setStudentAnswerSheet,
							})
						}
						onBack={handleBack}
						onNext={handleNext}
						onEvaluate={handleEvaluate}
					/>
				</div>
			</div>
			<div className="relative mx-auto w-full max-w-6xl px-6 pb-16">
				<EvaluationPanel isLoading={isSubmitting} error={error} evaluation={evaluation} />
			</div>
		</div>
	);
}

export default App;
