import { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScanLine, X } from 'lucide-react';

interface QRKeyScannerProps {
  onScan: (qrData: string) => void;
  onClose: () => void;
}

export const QRKeyScanner = ({ onScan, onClose }: QRKeyScannerProps) => {
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);

  useEffect(() => {
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
  }, [onScan]);

  const handleClose = () => {
    if (scanner) {
      scanner.clear().catch(console.error);
    }
    onClose();
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-elevated">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-card-foreground">Skanna QR-kod</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div id="qr-reader" className="w-full"></div>
      
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Rikta kameran mot QR-koden för att skanna
      </p>
    </Card>
  );
};
