import { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScanLine, X, Keyboard } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface QRKeyScannerProps {
  onScan: (qrData: string) => void;
  onClose: () => void;
}

export const QRKeyScanner = ({ onScan, onClose }: QRKeyScannerProps) => {
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [activeTab, setActiveTab] = useState('scan');

  useEffect(() => {
    if (activeTab === 'scan') {
      const qrScanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        },
        false
      );

      qrScanner.render(
        (decodedText) => {
          onScan(decodedText);
          qrScanner.clear();
        },
        (error) => {
          // Ignore errors, they happen continuously during scanning
          console.debug('QR scan error:', error);
        }
      );

      setScanner(qrScanner);

      return () => {
        if (qrScanner) {
          qrScanner.clear().catch(console.error);
        }
      };
    } else {
      // Clean up scanner when switching to manual tab
      if (scanner) {
        scanner.clear().catch(console.error);
        setScanner(null);
      }
    }
  }, [activeTab, onScan]);

  const handleClose = () => {
    if (scanner) {
      scanner.clear().catch(console.error);
    }
    onClose();
  };

  const handleManualSubmit = () => {
    const trimmedInput = manualInput.trim();
    
    if (!trimmedInput) {
      toast({
        title: "Fel",
        description: "Ange nyckeldata",
        variant: "destructive",
      });
      return;
    }
    
    if (!trimmedInput.startsWith('KEY1:') && !trimmedInput.startsWith('KEY2:')) {
      toast({
        title: "Ogiltig nyckeldata",
        description: "Nyckeldatan måste börja med KEY1: (QR) eller KEY2: (copy/paste)",
        variant: "destructive",
      });
      return;
    }
    
    onScan(trimmedInput);
    setManualInput('');
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-elevated">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-card-foreground">Lägg till nyckel</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="scan" className="gap-2">
            <ScanLine className="w-4 h-4" />
            Scanna QR
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Keyboard className="w-4 h-4" />
            Klistra in
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-4 mt-0">
          <div id="qr-reader" className="w-full"></div>
          <p className="text-xs text-muted-foreground text-center">
            Rikta kameran mot QR-koden för att skanna
          </p>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4 mt-0">
          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">
              Klistra in nyckeldata (KEY1: eller KEY2:):
            </label>
            <textarea
              placeholder="KEY2:... (Base62 format)"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="w-full min-h-[120px] px-3 py-2 text-xs font-mono bg-muted border border-border rounded-md resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Klistra in den kopierade nyckeldatan här
            </p>
          </div>
          <Button onClick={handleManualSubmit} className="w-full shadow-card">
            Lägg till nyckel
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
