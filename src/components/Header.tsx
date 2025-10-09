import { Menu, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/egendata-logo.png";

interface HeaderProps {
  onOpenExplorer: () => void;
  onRestartDemo?: () => void;
  showRestartButton?: boolean;
}

export const Header = ({ onOpenExplorer, onRestartDemo, showRestartButton = false }: HeaderProps) => {
  return (
    <div className="border-b border-border bg-white sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={onRestartDemo}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <img src={logo} alt="Egendata logo" className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-semibold tracking-tight">
              egen<span className="text-primary">DATA</span>
            </h1>
          </button>
          <div className="flex items-center gap-2">
            {showRestartButton && onRestartDemo && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRestartDemo}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Starta om demon
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenExplorer}
              className="hover:bg-muted"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
