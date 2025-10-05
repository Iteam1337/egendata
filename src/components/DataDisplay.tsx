import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileJson, Lock, LockOpen } from "lucide-react";

interface DataDisplayProps {
  title: string;
  data: string;
  isEncrypted?: boolean;
  variant?: "original" | "encrypted" | "decrypted";
}

export const DataDisplay = ({ title, data, isEncrypted = false, variant = "original" }: DataDisplayProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "encrypted":
        return "border-destructive/30 bg-destructive/5";
      case "decrypted":
        return "border-success/30 bg-success/5";
      default:
        return "border-primary/30 bg-primary/5";
    }
  };

  const getIcon = () => {
    switch (variant) {
      case "encrypted":
        return <Lock className="w-4 h-4 text-destructive" />;
      case "decrypted":
        return <LockOpen className="w-4 h-4 text-success" />;
      default:
        return <FileJson className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <Card className={`p-4 ${getVariantStyles()} shadow-card`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getIcon()}
          <h3 className="font-semibold text-card-foreground">{title}</h3>
        </div>
        {isEncrypted && (
          <Badge variant="destructive" className="text-xs">
            Krypterad
          </Badge>
        )}
      </div>
      <div className="bg-card/50 rounded-md p-3 border border-border/50">
        <pre className="text-xs text-card-foreground overflow-x-auto whitespace-pre-wrap break-all">
          {data}
        </pre>
      </div>
    </Card>
  );
};
