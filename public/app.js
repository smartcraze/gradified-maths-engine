const ui = {
	prepareBtn: document.getElementById("prepareBtn"),
	submitBtn: document.getElementById("submitBtn"),
	evaluateBtn: document.getElementById("evaluateBtn"),
	resultEl: document.getElementById("result"),
	resultPanel: document.getElementById("resultPanel"),
	examIdText: document.getElementById("examIdText"),
	submissionIdText: document.getElementById("submissionIdText"),
	examIdInput: document.getElementById("examId"),
	submissionIdInput: document.getElementById("submissionId"),
	studentMeta: document.getElementById("studentMeta"),
	sourceMeta: document.getElementById("sourceMeta"),
	gradeChip: document.getElementById("gradeChip"),
	totalMarks: document.getElementById("totalMarks"),
	percentage: document.getElementById("percentage"),
	questionCount: document.getElementById("questionCount"),
	scoreTableBody: document.getElementById("scoreTableBody"),
	overallFeedback: document.getElementById("overallFeedback"),
	strengths: document.getElementById("strengths"),
	improvements: document.getElementById("improvements"),
};

function setResult(value) {
	ui.resultEl.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function toArray(value) {
	return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
	const num = Number(value);
	return Number.isFinite(num) ? num : fallback;
}

function percentOf(score, max) {
	if (!max) {
		return 0;
	}

	return Math.max(0, Math.min(100, (score / max) * 100));
}

function getGradeLetter(percentage) {
	if (percentage >= 90) return "A+";
	if (percentage >= 80) return "A";
	if (percentage >= 70) return "B";
	if (percentage >= 60) return "C";
	if (percentage >= 50) return "D";
	return "F";
}

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function statusFromVerdict(verdict, awardedMarks) {
	if (verdict === "correct") {
		return { label: "Scored", className: "correct", color: "#1fd3a3" };
	}

	if (verdict === "partially_correct") {
		return { label: "Partially Scored", className: "partial", color: "#f9a826" };
	}

	if (awardedMarks > 0) {
		return { label: "Scored", className: "correct", color: "#1fd3a3" };
	}

	return { label: "Not Scored", className: "bad", color: "#f45e5e" };
}

function listToHtml(items, fallback = "-") {
	const safeItems = toArray(items).filter(Boolean);
	if (!safeItems.length) {
		return `<span>${escapeHtml(fallback)}</span>`;
	}

	return `<ul>${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderList(element, items, fallback) {
	const safeItems = toArray(items).filter(Boolean);
	if (!safeItems.length) {
		element.innerHTML = `<li>${escapeHtml(fallback)}</li>`;
		return;
	}

	element.innerHTML = safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function mergeQuestionDetails(rawData) {
	const result = rawData?.result;
	if (result && Array.isArray(result.questionResults)) {
		return result.questionResults.map((row) => ({
			questionRef: row.questionRef,
			maxMarks: toNumber(row.maxMarks),
			awardedMarks: toNumber(row.awardedMarks),
			verdict: row.verdict,
			rationale: row.rationale,
			mistakes: toArray(row.mistakes),
			improvementSuggestions: toArray(row.improvementSuggestions),
			rubricBreakdown: toArray(row.rubricBreakdown),
		}));
	}

	const evaluation = rawData?.evaluation ?? {};
	const marksRows = toArray(evaluation.questionWiseMarks);
	const rubricMap = new Map(
		toArray(evaluation.rubricBreakdown).map((item) => [item?.questionRef, toArray(item?.rubricBreakdown)]),
	);
	const feedbackMap = new Map(toArray(evaluation.feedback?.perQuestion).map((item) => [item?.questionRef, item]));

	return marksRows.map((row) => {
		const feedback = feedbackMap.get(row?.questionRef) ?? {};
		return {
			questionRef: row?.questionRef,
			maxMarks: toNumber(row?.maxMarks),
			awardedMarks: toNumber(row?.awardedMarks),
			verdict: row?.verdict,
			rationale: feedback?.rationale ?? "No rationale available.",
			mistakes: toArray(feedback?.mistakes),
			improvementSuggestions: toArray(feedback?.improvementSuggestions),
			rubricBreakdown: rubricMap.get(row?.questionRef) ?? [],
		};
	});
}

function renderScoreboard(rawResponse) {
	const rawData = rawResponse?.data ?? {};
	const evaluation = rawData?.result ?? rawData?.evaluation ?? {};
	const totalMarks = toNumber(evaluation.totalMarks);
	const maxMarks = toNumber(evaluation.maxMarks);
	const percentage = toNumber(evaluation.percentage, percentOf(totalMarks, maxMarks));
	const questions = mergeQuestionDetails(rawData);
	const studentIdentifier = rawData?.submission?.studentIdentifier ?? "-";
	const studentName = rawData?.submission?.studentName;
	const source = rawData?.source ?? "-";
	const summary = evaluation.summary ?? rawData?.evaluation?.feedback?.summary ?? {};

	ui.resultPanel.classList.remove("hidden");
	ui.studentMeta.textContent = `Student ID: ${studentIdentifier}${studentName ? ` (${studentName})` : ""}`;
	ui.sourceMeta.textContent = `Source: ${source}`;
	ui.gradeChip.textContent = getGradeLetter(percentage);
	ui.totalMarks.textContent = `${totalMarks.toFixed(2)} / ${maxMarks.toFixed(2)}`;
	ui.percentage.textContent = `${percentage.toFixed(2)}%`;
	ui.questionCount.textContent = `${questions.length}`;

	ui.scoreTableBody.innerHTML = questions
		.map((row) => {
			const qPct = percentOf(row.awardedMarks, row.maxMarks);
			const status = statusFromVerdict(row.verdict, row.awardedMarks);
			const rubricRows = toArray(row.rubricBreakdown)
				.map(
					(criterion) =>
						`<li><strong>${escapeHtml(criterion.criterion ?? "criterion")}</strong>: ${toNumber(
							criterion.awardedMarks,
						).toFixed(2)}/${toNumber(criterion.maxMarks).toFixed(2)} - ${escapeHtml(
							criterion.rationale ?? "No rationale",
						)}</li>`,
				)
				.join("");

			const rubricHtml = rubricRows ? `<ul>${rubricRows}</ul>` : "<span>-</span>";

			return `
        <tr>
          <td>
            <div class="qref">${escapeHtml(row.questionRef ?? "-")}</div>
          </td>
          <td>${row.awardedMarks.toFixed(2)}</td>
          <td>${row.maxMarks.toFixed(2)}</td>
          <td>
            <div>${qPct.toFixed(0)}%</div>
            <div class="pct-track"><div class="pct-bar" style="width:${qPct}%;background:${status.color}"></div></div>
          </td>
          <td><span class="status ${status.className}">${status.label}</span></td>
          <td>
            <details>
              <summary>View details</summary>
              <div class="detail-box">
                <div><strong>Rationale:</strong> ${escapeHtml(row.rationale ?? "No rationale available.")}</div>
                <div><strong>Mistakes:</strong> ${listToHtml(row.mistakes, "No major mistakes recorded.")}</div>
                <div><strong>Improvement Suggestions:</strong> ${listToHtml(
									row.improvementSuggestions,
									"No improvement suggestions recorded.",
								)}</div>
                <div><strong>Rubric Breakdown:</strong> ${rubricHtml}</div>
              </div>
            </details>
          </td>
        </tr>
      `;
		})
		.join("");

	ui.overallFeedback.textContent = summary?.overallFeedback ?? "No overall feedback available.";
	renderList(ui.strengths, summary?.strengths, "No explicit strengths listed.");
	renderList(ui.improvements, summary?.priorityImprovements, "No priority improvements listed.");
}

async function postJson(url, payload) {
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	const data = await response.json();
	if (!response.ok || data?.success === false) {
		throw new Error(data?.message || `Request failed with status ${response.status}`);
	}

	return data;
}

ui.prepareBtn.addEventListener("click", async () => {
	const examCode = document.getElementById("examCode").value.trim();
	const questionPaperRaw = document.getElementById("questionPaperRaw").value.trim();
	const modelAnswerRaw = document.getElementById("modelAnswerRaw").value.trim();

	if (!questionPaperRaw || !modelAnswerRaw) {
		setResult("questionPaperRaw and modelAnswerRaw are required");
		return;
	}

	ui.prepareBtn.disabled = true;
	setResult("Preparing exam structure...");

	try {
		const data = await postJson("/api/structure/exam/prepare", {
			examCode: examCode || undefined,
			questionPaperRaw,
			modelAnswerRaw,
		});

		const examId = data?.data?.examId;
		if (examId) {
			ui.examIdInput.value = examId;
			ui.examIdText.textContent = `Exam ID: ${examId}`;
		}

		setResult(data);
	} catch (error) {
		setResult({
			success: false,
			message: "Failed to prepare exam",
			error: String(error),
		});
	} finally {
		ui.prepareBtn.disabled = false;
	}
});

ui.submitBtn.addEventListener("click", async () => {
	const examId = ui.examIdInput.value.trim();
	const studentIdentifier = document.getElementById("studentIdentifier").value.trim();
	const studentName = document.getElementById("studentName").value.trim();
	const studentSheetRaw = document.getElementById("studentSheetRaw").value.trim();

	if (!examId || !studentIdentifier || !studentSheetRaw) {
		setResult("examId, studentIdentifier, and studentSheetRaw are required");
		return;
	}

	ui.submitBtn.disabled = true;
	setResult("Structuring student sheet and creating submission...");

	try {
		const data = await postJson("/api/structure/student/submit", {
			examId,
			studentIdentifier,
			studentName: studentName || undefined,
			studentSheetRaw,
		});

		const submissionId = data?.data?.submission?.id;
		if (submissionId) {
			ui.submissionIdInput.value = submissionId;
			ui.submissionIdText.textContent = `Submission ID: ${submissionId}`;
		}

		setResult(data);
	} catch (error) {
		setResult({
			success: false,
			message: "Failed to submit student sheet",
			error: String(error),
		});
	} finally {
		ui.submitBtn.disabled = false;
	}
});

ui.evaluateBtn.addEventListener("click", async () => {
	const submissionId = ui.submissionIdInput.value.trim();
	const forceRegrade = document.getElementById("forceRegrade").checked;

	if (!submissionId) {
		setResult("submissionId is required");
		return;
	}

	ui.evaluateBtn.disabled = true;
	setResult("Evaluating submission...");

	try {
		const data = await postJson("/api/engine/evaluate", {
			submissionId,
			forceRegrade,
		});

		renderScoreboard(data);
		setResult(data);
	} catch (error) {
		setResult({
			success: false,
			message: "Failed to evaluate submission",
			error: String(error),
		});
	} finally {
		ui.evaluateBtn.disabled = false;
	}
});
