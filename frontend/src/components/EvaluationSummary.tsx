import type { Evaluation } from "./types";

type EvaluationSummaryProps = {
	summary: Evaluation["summary"];
};

const EvaluationSummary = ({ summary }: EvaluationSummaryProps) => {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
				<p className="text-xs uppercase tracking-[0.25em] text-white/50">Questions</p>
				<p className="mt-2 text-2xl font-semibold text-white">{summary.total_questions}</p>
			</div>
			<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
				<p className="text-xs uppercase tracking-[0.25em] text-white/50">Score</p>
				<p className="mt-2 text-2xl font-semibold text-white">
					{summary.total_awarded_marks} / {summary.total_max_marks}
				</p>
			</div>
			<div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
				<p className="text-xs uppercase tracking-[0.25em] text-white/50">Percentage</p>
				<p className="mt-2 text-2xl font-semibold text-white">{summary.percentage}%</p>
			</div>
		</div>
	);
};

export default EvaluationSummary;
