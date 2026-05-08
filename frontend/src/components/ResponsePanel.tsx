type ResponsePanelProps = {
	isLoading: boolean;
	error: string | null;
	response: unknown | null;
};

const ResponsePanel = ({ isLoading, error, response }: ResponsePanelProps) => {
	return (
		<div className="rounded-3xl border border-white/10 bg-white/5 p-5">
			<h3 className="text-sm font-semibold text-white">Latest response</h3>
			<div className="mt-3 min-h-[120px] rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/70">
				{error && <p className="text-red-300">{error}</p>}
				{!error && !response && !isLoading && <p>Run the grading call to see results.</p>}
				{isLoading && !response && <p>Running evaluation...</p>}
				{response && <pre className="whitespace-pre-wrap break-words">{JSON.stringify(response, null, 2)}</pre>}
			</div>
		</div>
	);
};

export default ResponsePanel;
