import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface IPFSLinkProps {
  cid: string;
  title?: string;
}

export const IPFSLink = ({ cid, title = "IPFS Data" }: IPFSLinkProps) => {
  const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
  const dwebUrl = `https://dweb.link/ipfs/${cid}`;
  
  const handleCopy = (url: string, gateway: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: `${gateway} link copied to clipboard`,
    });
  };

  return (
    <Card className="p-4 border-primary/30 bg-primary/5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-card-foreground">{title}</h4>
        </div>
        
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            CID: <code className="text-primary font-mono">{cid}</code>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(ipfsUrl, '_blank')}
              className="text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              ipfs.io
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(dwebUrl, '_blank')}
              className="text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              dweb.link
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(ipfsUrl, 'ipfs.io')}
              className="text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground italic">
            Click to view the encrypted raw data in IPFS explorer
          </p>
        </div>
      </div>
    </Card>
  );
};
