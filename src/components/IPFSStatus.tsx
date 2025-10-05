import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Cloud, CloudOff, Loader2 } from "lucide-react";

interface IPFSStatusProps {
  isInitialized: boolean;
  isInitializing: boolean;
  error?: string;
}

export const IPFSStatus = ({ isInitialized, isInitializing, error }: IPFSStatusProps) => {
  if (error) {
    return (
      <Card className="p-3 border-destructive/30 bg-destructive/5">
        <div className="flex items-center gap-2">
          <CloudOff className="w-4 h-4 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">IPFS-anslutning misslyckades</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (isInitializing) {
    return (
      <Card className="p-3 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <div className="flex-1">
            <p className="text-sm font-medium text-card-foreground">Startar IPFS-nod...</p>
            <p className="text-xs text-muted-foreground">Detta kan ta några sekunder</p>
          </div>
        </div>
      </Card>
    );
  }

  if (isInitialized) {
    return (
      <Card className="p-3 border-success/30 bg-success/5">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-success" />
          <div className="flex-1">
            <p className="text-sm font-medium text-success">IPFS-nod aktiv</p>
            <p className="text-xs text-muted-foreground">Decentraliserad lagring aktiverad</p>
          </div>
          <Badge variant="outline" className="border-success/30 text-success">
            Ansluten
          </Badge>
        </div>
      </Card>
    );
  }

  return null;
};
