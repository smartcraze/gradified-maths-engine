const prepareBtn = document.getElementById("prepareBtn");
const resultEl = document.getElementById("result");

function setResult(value) {
  resultEl.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

prepareBtn.addEventListener("click", async () => {
  const examCode = document.getElementById("examCode").value.trim();
  const questionPaperRaw = document.getElementById("questionPaperRaw").value.trim();
  const modelAnswerRaw = document.getElementById("modelAnswerRaw").value.trim();

  if (!questionPaperRaw || !modelAnswerRaw) {
    setResult("questionPaperRaw and modelAnswerRaw are required");
    return;
  }

  prepareBtn.disabled = true;
  setResult("Preparing exam structure...");

  try {
    const response = await fetch("/api/structure/exam/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        examCode: examCode || undefined,
        questionPaperRaw,
        modelAnswerRaw,
      }),
    });

    const data = await response.json();
    setResult(data);
  } catch (error) {
    setResult({
      success: false,
      message: "Request failed",
      error: String(error),
    });
  } finally {
    prepareBtn.disabled = false;
  }
});
