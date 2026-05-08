import { useMemo, useState } from "react";
import QuestionCard from "./QuestionCard";
import QuestionDetail from "./QuestionDetail";
import type { QuestionEvaluation } from "./types";

type QuestionListProps = {
	questions: QuestionEvaluation[];
};

const QuestionList = ({ questions }: QuestionListProps) => {
	const sortedQuestions = useMemo(() => {
		return [...questions].sort((a, b) => Number(a.question_id) - Number(b.question_id));
	}, [questions]);

	const [activeId, setActiveId] = useState(sortedQuestions[0]?.question_id ?? "");
	const activeQuestion = sortedQuestions.find((question) => question.question_id === activeId) ?? sortedQuestions[0];

	if (!activeQuestion) {
		return null;
	}

	return (
		<div className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-2">
				{sortedQuestions.map((question) => (
					<QuestionCard
						key={question.question_id}
						question={question}
						isActive={question.question_id === activeQuestion.question_id}
						onSelect={() => setActiveId(question.question_id)}
					/>
				))}
			</div>
			<QuestionDetail question={activeQuestion} />
		</div>
	);
};

export default QuestionList;
