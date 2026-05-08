import type { QuestionEvaluation } from "./types";

type QuestionCardProps = {
	question: QuestionEvaluation;
	isActive: boolean;
	onSelect: () => void;
};

const QuestionCard = ({ question, isActive, onSelect }: QuestionCardProps) => {
	const badgeStyles = {
		correct: "bg-emerald-500/20 text-emerald-200",
		partially_correct: "bg-amber-500/20 text-amber-200",
		incorrect: "bg-rose-500/20 text-rose-200",
	} as const;

	return (
		<button
			type="button"
			onClick={onSelect}
			className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
				isActive ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
			}`}
		>
			<div className="flex items-center justify-between">
				<p className="text-sm font-semibold text-white">Question {question.question_id}</p>
				<span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${badgeStyles[question.correctness]}`}>
					{question.correctness.replace("_", " ")}
				</span>
			</div>
			<p className="mt-2 text-xs text-white/60">
				Marks: {question.marks_awarded} / {question.max_marks}
			</p>
		</button>
	);
};

export default QuestionCard;
