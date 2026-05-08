import StepperProgress from "./StepperProgress";
import type { StepId } from "./stepperConfig";

const HeroPanel = ({ activeStep }: { activeStep: StepId }) => {
	return (
		<div className="flex flex-1 flex-col gap-8">
			<div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-xs uppercase tracking-[0.35em] text-white/60">Gradified</p>
						<h1 className="heading-display mt-4 text-5xl leading-none text-white sm:text-6xl">
							Explore the future of grading
						</h1>
						<p className="mt-4 max-w-xl text-sm text-white/70 sm:text-base">
							Run a guided grading flow in three steps. Upload the PDFs, extract OCR text, then grade a student sheet
							with the structured engine.
						</p>
					</div>
					<div className="hidden h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-2xl text-white/70 lg:flex">
						★
					</div>
				</div>

				<div className="mt-8 flex flex-col gap-6">
					<StepperProgress activeStep={activeStep} />
					<div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6">
						<h2 className="text-lg font-semibold text-white">How it works</h2>
						<ul className="mt-4 space-y-3 text-sm text-white/70">
							<li>Step 1 uploads the question paper PDF to OCR.</li>
							<li>Step 2 uploads model answers and prepares the reference text.</li>
							<li>Step 3 uploads the student sheet and runs grading.</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
};

export default HeroPanel;
