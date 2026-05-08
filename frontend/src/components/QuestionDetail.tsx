import type { QuestionEvaluation } from "./types";

type QuestionDetailProps = {
	question: QuestionEvaluation;
};

const QuestionDetail = ({ question }: QuestionDetailProps) => {
	return (
		<div className="rounded-3xl border border-white/10 bg-white/5 p-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="text-xs uppercase tracking-[0.3em] text-white/50">Question</p>
					<h3 className="mt-2 text-xl font-semibold text-white">{question.question_id}</h3>
				</div>
				<div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70">
					Marks: {question.marks_awarded} / {question.max_marks}
				</div>
			</div>

			<div className="mt-4 grid gap-4 md:grid-cols-2">
				<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
					<p className="text-xs uppercase tracking-[0.25em] text-white/50">Answer type</p>
					<p className="mt-2 text-sm text-white">{question.answer_type}</p>
				</div>
				<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
					<p className="text-xs uppercase tracking-[0.25em] text-white/50">Correctness</p>
					<p className="mt-2 text-sm text-white">{question.correctness.replace("_", " ")}</p>
				</div>
			</div>

			{question.steps_analysis && question.steps_analysis.length > 0 && (
				<div className="mt-4">
					<p className="text-xs uppercase tracking-[0.25em] text-white/50">Step analysis</p>
					<div className="mt-3 space-y-2">
						{question.steps_analysis.map((step, index) => (
							<div
								key={`${question.question_id}-${index}`}
								className="rounded-2xl border border-white/10 bg-white/5 p-3"
							>
								<p className="text-xs text-white/80">{step.step}</p>
								<p className="mt-2 text-[11px] text-white/50">
									{step.is_correct ? "Correct" : "Incorrect"} · {step.marks} marks
								</p>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="mt-4 grid gap-4 md:grid-cols-2">
				<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
					<p className="text-xs uppercase tracking-[0.25em] text-white/50">Key points covered</p>
					{question.key_points_covered && question.key_points_covered.length > 0 ? (
						<ul className="mt-2 space-y-1 text-xs text-white/70">
							{question.key_points_covered.map((point, index) => (
								<li key={`${question.question_id}-covered-${index}`}>{point}</li>
							))}
						</ul>
					) : (
						<p className="mt-2 text-xs text-white/40">None</p>
					)}
				</div>
				<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
					<p className="text-xs uppercase tracking-[0.25em] text-white/50">Key points missing</p>
					{question.key_points_missing && question.key_points_missing.length > 0 ? (
						<ul className="mt-2 space-y-1 text-xs text-white/70">
							{question.key_points_missing.map((point, index) => (
								<li key={`${question.question_id}-missing-${index}`}>{point}</li>
							))}
						</ul>
					) : (
						<p className="mt-2 text-xs text-white/40">None</p>
					)}
				</div>
			</div>

			{question.feedback && (
				<div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
					<p className="text-xs uppercase tracking-[0.25em] text-white/50">Feedback</p>
					<p className="mt-2 text-sm text-white">{question.feedback.strengths}</p>
					<p className="mt-2 text-sm text-white/70">{question.feedback.improvements}</p>
				</div>
			)}
		</div>
	);
};

export default QuestionDetail;
