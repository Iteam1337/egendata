import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-12">
      {steps.map((_, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ${
              index < currentStep
                ? "bg-primary text-white"
                : index === currentStep
                ? "bg-primary text-white scale-110"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {index < currentStep ? (
              <Check className="w-4 h-4" />
            ) : (
              <span className="text-sm font-medium">{index + 1}</span>
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 transition-colors duration-300 ${
                index < currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};
