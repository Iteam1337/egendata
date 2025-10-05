import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

interface ActorCardProps {
  name: string;
  role?: string;
  status?: "active" | "success" | "revoked" | "default";
  align?: "left" | "right";
  children?: React.ReactNode;
}

export const ActorCard = ({ 
  name, 
  role, 
  status = "default", 
  align = "left",
  children 
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
        return <Badge className="bg-primary">Aktiv</Badge>;
      case "success":
        return <Badge className="bg-success">Åtkomst</Badge>;
      case "revoked":
        return <Badge variant="destructive">Återkallad</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className={`p-6 transition-all duration-300 ${getStatusColor()} ${
      align === "right" ? "ml-auto" : "mr-auto"
    } max-w-md`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            status === "active" || status === "success" ? "bg-primary" : "bg-muted"
          }`}>
            <Shield className={`w-6 h-6 ${
              status === "active" || status === "success" ? "text-white" : "text-muted-foreground"
            }`} />
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