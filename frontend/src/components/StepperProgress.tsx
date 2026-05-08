import type { StepId } from "./stepperConfig";
import { steps } from "./stepperConfig";

const StepperProgress = ({ activeStep }: { activeStep: StepId }) => {
	const stepIndex = steps.findIndex((step) => step.id === activeStep);

	return (
		<div className="flex items-center gap-4">
			{steps.map((step, index) => (
				<div key={step.id} className="flex items-center gap-3">
					<div
						className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold ${
							index <= stepIndex ? "border-white/30 bg-white/20 text-white" : "border-white/10 bg-white/5 text-white/50"
						}`}
					>
						{index + 1}
					</div>
					<div className="hidden sm:block">
						<p className="text-sm font-semibold text-white">{step.label}</p>
						<p className="text-xs text-white/60">{step.subtitle}</p>
					</div>
					{index < steps.length - 1 && <div className="hidden h-[2px] w-10 rounded-full bg-white/20 sm:block" />}
				</div>
			))}
		</div>
	);
};

export default StepperProgress;
