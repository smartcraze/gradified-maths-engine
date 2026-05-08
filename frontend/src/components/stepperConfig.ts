export type StepId = 0 | 1 | 2;

export const steps = [
	{
		id: 0,
		label: "Question paper",
		subtitle: "Upload the question paper PDF",
	},
	{
		id: 1,
		label: "Model answers",
		subtitle: "Upload the model answers PDF",
	},
	{
		id: 2,
		label: "Grade answers",
		subtitle: "Upload the student sheet",
	},
] as const;
