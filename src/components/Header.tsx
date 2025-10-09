import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/egendata-logo.png";

interface HeaderProps {
  onOpenExplorer: () => void;
}

export const Header = ({ onOpenExplorer }: HeaderProps) => {
  return (
    <div className="border-b border-border bg-white sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Egendata logo" className="w-10 h-10" />
            <h1 className="text-xl font-semibold tracking-tight">
              egen<span className="text-primary">DATA</span>
            </h1>
          </div>
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
  );
};
