import type { ChartData, ChartOptions } from "chart.js";
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import type { Evaluation } from "./types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type PerformanceChartsProps = {
	evaluation: Evaluation;
};

const PerformanceCharts = ({ evaluation }: PerformanceChartsProps) => {
	const sortedQuestions = [...evaluation.evaluation].sort((a, b) => Number(a.question_id) - Number(b.question_id));
	const totalQuestions = evaluation.evaluation.length || 1;

	const questionLabels = sortedQuestions.map((item) => `Q${item.question_id}`);
	const maxMarksData = sortedQuestions.map((item) => item.max_marks);
	const awardedData = sortedQuestions.map((item) => item.marks_awarded);
	const awardedColors = sortedQuestions.map((item) => {
		switch (item.correctness) {
			case "correct":
				return "rgba(52, 211, 153, 0.8)";
			case "partially_correct":
				return "rgba(251, 191, 36, 0.8)";
			default:
				return "rgba(248, 113, 113, 0.8)";
		}
	});

	const marksByQuestion: ChartData<"bar"> = {
		labels: questionLabels,
		datasets: [
			{
				label: "Max marks",
				data: maxMarksData,
				backgroundColor: "rgba(255, 255, 255, 0.15)",
				borderRadius: 6,
				barThickness: 14,
			},
			{
				label: "Awarded",
				data: awardedData,
				backgroundColor: awardedColors,
				borderRadius: 6,
				barThickness: 14,
			},
		],
	};

	const correctnessCounts = {
		correct: evaluation.evaluation.filter((item) => item.correctness === "correct").length,
		partially_correct: evaluation.evaluation.filter((item) => item.correctness === "partially_correct").length,
		incorrect: evaluation.evaluation.filter((item) => item.correctness === "incorrect").length,
	};

	const correctnessData: ChartData<"bar"> = {
		labels: ["Correct", "Partial", "Incorrect"],
		datasets: [
			{
				label: "Questions",
				data: [correctnessCounts.correct, correctnessCounts.partially_correct, correctnessCounts.incorrect],
				backgroundColor: ["rgba(52, 211, 153, 0.8)", "rgba(251, 191, 36, 0.8)", "rgba(248, 113, 113, 0.8)"],
				borderRadius: 8,
				barThickness: 28,
			},
		],
	};

	const types = ["mcq", "numerical", "short", "long"] as const;
	const typeStats = types
		.map((type) => {
			const rows = evaluation.evaluation.filter((item) => item.answer_type === type);
			const maxMarks = rows.reduce((sum, item) => sum + item.max_marks, 0);
			const awarded = rows.reduce((sum, item) => sum + item.marks_awarded, 0);
			return {
				label: type.toUpperCase(),
				count: rows.length,
				awarded,
				maxMarks,
				percentage: maxMarks > 0 ? Math.round((awarded / maxMarks) * 100) : 0,
			};
		})
		.filter((item) => item.count > 0);

	const typeData: ChartData<"bar"> = {
		labels: typeStats.map((item) => item.label),
		datasets: [
			{
				label: "% Awarded",
				data: typeStats.map((item) => item.percentage),
				backgroundColor: "rgba(141, 92, 255, 0.8)",
				borderRadius: 10,
				barThickness: 30,
			},
		],
	};

	const baseOptions: ChartOptions<"bar"> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				labels: {
					color: "rgba(255,255,255,0.7)",
					font: { size: 11 },
				},
			},
			title: { display: false },
		},
		scales: {
			x: {
				grid: { color: "rgba(255,255,255,0.08)" },
				ticks: { color: "rgba(255,255,255,0.6)", font: { size: 10 } },
			},
			y: {
				grid: { color: "rgba(255,255,255,0.08)" },
				ticks: { color: "rgba(255,255,255,0.6)", font: { size: 10 } },
				beginAtZero: true,
			},
		},
	};

	return (
		<div className="grid gap-4">
			<div className="rounded-3xl border border-white/10 bg-white/5 p-5">
				<p className="text-xs uppercase tracking-[0.25em] text-white/50">Marks by question</p>
				<div className="mt-4 h-56">
					<Bar data={marksByQuestion} options={baseOptions} />
				</div>
				<div className="mt-3 text-xs text-white/50">
					Each question shows max marks vs awarded marks with correctness color.
				</div>
			</div>

			<div className="rounded-3xl border border-white/10 bg-white/5 p-5">
				<p className="text-xs uppercase tracking-[0.25em] text-white/50">Correctness distribution</p>
				<div className="mt-4 h-40">
					<Bar
						data={correctnessData}
						options={{
							...baseOptions,
							scales: {
								...baseOptions.scales,
								y: {
									...baseOptions.scales?.y,
									max: totalQuestions,
								},
							},
						}}
					/>
				</div>
			</div>

			{typeStats.length > 0 && (
				<div className="rounded-3xl border border-white/10 bg-white/5 p-5">
					<p className="text-xs uppercase tracking-[0.25em] text-white/50">Marks by answer type</p>
					<div className="mt-4 h-48">
						<Bar
							data={typeData}
							options={{
								...baseOptions,
								scales: {
									...baseOptions.scales,
									y: {
										...baseOptions.scales?.y,
										max: 100,
									},
								},
								plugins: {
									...baseOptions.plugins,
									legend: { display: false },
								},
							}}
						/>
					</div>
					<div className="mt-3 flex flex-wrap gap-3 text-xs text-white/50">
						{typeStats.map((item) => (
							<span key={item.label}>
								{item.label}: {item.awarded}/{item.maxMarks} · {item.count} questions
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default PerformanceCharts;
