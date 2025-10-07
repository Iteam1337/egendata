import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConceptExplainerProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const ConceptExplainer = ({ 
  title, 
  icon, 
  children, 
  defaultExpanded = false 
}: ConceptExplainerProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
            {icon || <Lightbulb className="w-4 h-4" />}
          </div>
          <h4 className="font-semibold text-sm text-card-foreground">{title}</h4>
        </div>
        <div className="text-primary">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-primary/20 text-sm text-card-foreground space-y-3 animate-fade-in">
          {children}
        </div>
      )}
    </Card>
  );
};