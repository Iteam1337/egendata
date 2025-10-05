import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Key, Lock, LockOpen } from "lucide-react";

interface UserCardProps {
  name: string;
  hasAccess: boolean;
  canDecrypt: boolean;
  publicKeyPreview?: string;
}

export const UserCard = ({ name, hasAccess, canDecrypt, publicKeyPreview }: UserCardProps) => {
  return (
    <Card className="p-4 bg-gradient-card shadow-card border-border">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
            <User className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground">Användare</p>
          </div>
        </div>
        <div className="flex gap-1">
          {hasAccess ? (
            <Badge variant="default" className="gap-1">
              <Key className="w-3 h-3" />
              Åtkomst
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Lock className="w-3 h-3" />
              Ej åtkomst
            </Badge>
          )}
        </div>
      </div>
      
      {publicKeyPreview && (
        <div className="mt-3 p-2 bg-muted rounded-md">
          <div className="flex items-center gap-2 mb-1">
            <Key className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Publik nyckel</span>
          </div>
          <code className="text-xs text-foreground break-all">
            {publicKeyPreview}
          </code>
        </div>
      )}
      
      <div className="mt-3 flex items-center gap-2 text-sm">
        {canDecrypt ? (
          <div className="flex items-center gap-1 text-success">
            <LockOpen className="w-4 h-4" />
            <span className="font-medium">Kan dekryptera</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Lock className="w-4 h-4" />
            <span className="font-medium">Kan ej dekryptera</span>
          </div>
        )}
      </div>
    </Card>
  );
};
