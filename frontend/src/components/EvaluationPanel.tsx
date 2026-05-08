import EvaluationSummary from "./EvaluationSummary";
import OverallFeedback from "./OverallFeedback";
import PerformanceCharts from "./PerformanceCharts";
import QuestionList from "./QuestionList";
import type { Evaluation } from "./types";

type EvaluationPanelProps = {
	evaluation: Evaluation | null;
	error: string | null;
	isLoading: boolean;
};

const EvaluationPanel = ({ evaluation, error, isLoading }: EvaluationPanelProps) => {
	return (
		<div className="rounded-3xl border border-white/10 bg-white/5 p-5">
			<h3 className="text-sm font-semibold text-white">Latest response</h3>
			<div className="mt-3 space-y-4">
				{error && (
					<div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">{error}</div>
				)}
				{!error && !evaluation && !isLoading && (
					<div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/60">
						Run the grading call to see results.
					</div>
				)}
				{isLoading && (
					<div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/60">
						<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
						Running evaluation...
					</div>
				)}
				{evaluation && (
					<div className="space-y-5">
						<EvaluationSummary summary={evaluation.summary} />
						<PerformanceCharts evaluation={evaluation} />
						<OverallFeedback feedback={evaluation.overall_feedback} />
						<QuestionList questions={evaluation.evaluation} />
					</div>
				)}
			</div>
		</div>
	);
};

export default EvaluationPanel;
