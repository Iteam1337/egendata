import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Activity } from "lucide-react";

interface ActorCardProps {
  name: string;
  role?: string;
  status?: "active" | "success" | "revoked" | "default";
  align?: "left" | "right";
  children?: React.ReactNode;
  isReading?: boolean;
}

export const ActorCard = ({ 
  name, 
  role, 
  status = "default", 
  align = "left",
  children,
  isReading = false
}: ActorCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case "active":
        return "border-primary bg-primary/5";
      case "success":
        return "border-success bg-success/5";
      case "revoked":
        return "border-destructive bg-destructive/5";
      default:
        return "border-border bg-card";
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return <Badge className="bg-primary">Active</Badge>;
      case "success":
        return <Badge className="bg-success">Access</Badge>;
      case "revoked":
        return <Badge variant="destructive">Revoked</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className={`p-6 transition-all duration-300 ${getStatusColor()} ${
      align === "right" ? "ml-auto" : "mr-auto"
    } max-w-md ${isReading ? 'ring-2 ring-primary ring-opacity-50 scale-[1.02]' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center relative ${
            status === "active" || status === "success" ? "bg-primary" : "bg-muted"
          }`}>
            <Shield className={`w-6 h-6 ${
              status === "active" || status === "success" ? "text-white" : "text-muted-foreground"
            }`} />
            {isReading && (
              <div className="absolute -top-1 -right-1">
                <Activity className="w-4 h-4 text-primary animate-pulse" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            {role && <p className="text-sm text-muted-foreground">{role}</p>}
          </div>
        </div>
        {getStatusBadge()}
      </div>
      {children}
    </Card>
  );
};