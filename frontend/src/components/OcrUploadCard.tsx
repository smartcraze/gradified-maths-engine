type OcrUploadCardProps = {
	id: string;
	title: string;
	description: string;
	buttonLabel: string;
	isUploading: boolean;
	fileName: string | null;
	extractedText: string;
	onFileSelect: (file: File) => void;
};

const OcrUploadCard = ({
	id,
	title,
	description,
	buttonLabel,
	isUploading,
	fileName,
	extractedText,
	onFileSelect,
}: OcrUploadCardProps) => {
	const preview = extractedText.trim().slice(0, 260);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<label htmlFor={id} className="text-sm font-semibold text-white">
						{title}
					</label>
					<p className="text-xs text-white/50">{description}</p>
				</div>
				<label
					htmlFor={id}
					className={`cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold text-white/80 transition ${
						isUploading
							? "border-white/10 bg-white/5 text-white/50"
							: "border-white/20 bg-white/5 hover:border-white/60 hover:text-white"
					}`}
				>
					{isUploading ? "Processing..." : buttonLabel}
				</label>
			</div>

			<input
				id={id}
				type="file"
				accept="application/pdf"
				className="hidden"
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) {
						onFileSelect(file);
					}
					event.currentTarget.value = "";
				}}
				disabled={isUploading}
			/>

			<div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
				{isUploading && (
					<div className="mb-2 flex items-center gap-2 text-white/60">
						<span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
						Processing OCR...
					</div>
				)}
				<p className="text-white/80">{fileName ?? "No file uploaded yet."}</p>
				{preview ? (
					<p className="mt-2 text-white/60">Preview: {preview}...</p>
				) : (
					<p className="mt-2 text-white/40">OCR text will appear here after upload.</p>
				)}
			</div>
		</div>
	);
};

export default OcrUploadCard;
