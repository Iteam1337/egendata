import { Check } from "lucide-react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                index < currentStep
                  ? "bg-success text-success-foreground"
                  : index === currentStep
                  ? "bg-gradient-primary text-primary-foreground shadow-elevated"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {index < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <span className={`text-xs mt-1 font-medium ${
              index <= currentStep ? "text-foreground" : "text-muted-foreground"
            }`}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 mb-6 transition-all ${
                index < currentStep ? "bg-success" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};
