import type { Evaluation } from "./types";

type OverallFeedbackProps = {
	feedback: Evaluation["overall_feedback"];
};

const OverallFeedback = ({ feedback }: OverallFeedbackProps) => {
	return (
		<div className="rounded-3xl border border-white/10 bg-white/5 p-5">
			<p className="text-xs uppercase tracking-[0.25em] text-white/50">Overall feedback</p>
			<p className="mt-3 text-sm text-white/80">{feedback}</p>
		</div>
	);
};

export default OverallFeedback;
