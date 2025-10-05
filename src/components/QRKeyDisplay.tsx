import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface QRKeyDisplayProps {
  qrData: string;
  userName: string;
}

export const QRKeyDisplay = ({ qrData, userName }: QRKeyDisplayProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Kopierad!",
      description: "QR-data kopierad till urklipp",
    });
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-card-foreground">QR-kod för {userName}</h3>
        <Badge variant="default" className="ml-auto">CBOR + Base45</Badge>
      </div>
      
      <div className="bg-white p-4 rounded-lg flex items-center justify-center mb-4">
        <QRCodeSVG 
          value={qrData} 
          size={256}
          level="H"
          includeMargin={true}
        />
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Format:</span>
          <code className="text-xs bg-muted px-2 py-1 rounded">KEY1:...</code>
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Eller kopiera nyckeldatan:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={qrData}
              readOnly
              className="flex-1 px-3 py-2 text-xs font-mono bg-muted border border-border rounded-md"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Dela via QR-kod eller kopiera texten
          </p>
        </div>
      </div>
    </Card>
  );
};
