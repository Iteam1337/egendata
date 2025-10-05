import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ActorCard } from "@/components/ActorCard";
import { DataDisplay } from "@/components/DataDisplay";
import { StepIndicator } from "@/components/StepIndicator";
import { QRKeyDisplay } from "@/components/QRKeyDisplay";
import { QRKeyScanner } from "@/components/QRKeyScanner";
import { EgendataClient, type KeyPair } from "@/lib/egendata";
import { encodeKeyForQR, decodeKeyFromQR, validateKeyData, qrKeyDataToJWK } from "@/lib/qr-key-exchange";
import { ArrowRight, Check, QrCode, ScanLine } from "lucide-react";

const Index = () => {
  const [egendata] = useState(() => new EgendataClient());
  const [step, setStep] = useState(0);
  const [alice, setAlice] = useState<KeyPair | null>(null);
  const [bob, setBob] = useState<KeyPair | null>(null);
  const [charlie, setCharlie] = useState<KeyPair | null>(null);
  
  const [originalData] = useState({
    ssn: "19800101-1234",
    creditCard: "4111-1111-1111-1111",
    address: "Exempelgatan 123, Stockholm"
  });
  
  const [encryptedData, setEncryptedData] = useState<string>("");
  const [bobDecrypted, setBobDecrypted] = useState<object | null>(null);
  const [charlieDecrypted, setCharlieDecrypted] = useState<object | null>(null);
  const [bobRevoked, setBobRevoked] = useState(false);
  
  // QR code states
  const [showBobQR, setShowBobQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [bobQRData, setBobQRData] = useState<string>("");
  const [bobReGranted, setBobReGranted] = useState(false);

  const DATA_ID = "alice-sensitive-data";
  const steps = ["Setup", "Encrypt", "Share", "Revoke", "Re-grant"];

  const handleGenerateKeys = async () => {
    try {
      const aliceKeys = await egendata.generateKeyPair("Alice");
      const bobKeys = await egendata.generateKeyPair("Bob");
      const charlieKeys = await egendata.generateKeyPair("Charlie");
      
      setAlice(aliceKeys);
      setBob(bobKeys);
      setCharlie(charlieKeys);
      setStep(1);
      
      toast({
        title: "Nycklar genererade!",
        description: "Alice, Bob och Charlie har nu krypteringsnycklar",
      });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte generera nycklar",
        variant: "destructive",
      });
    }
  };

  const handleEncrypt = async () => {
    if (!alice || !bob || !charlie) return;
    
    try {
      const encryptedDataStr = await egendata.writeData(
        DATA_ID,
        originalData,
        "Alice",
        [
          { name: "Alice", publicKey: alice.publicKey },
          { name: "Bob", publicKey: bob.publicKey },
          { name: "Charlie", publicKey: charlie.publicKey }
        ]
      );
      
      setEncryptedData(encryptedDataStr);
      setStep(2);
      
      toast({
        title: "Data krypterad!",
        description: "Datan är nu krypterad och sparad i egendata",
      });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte kryptera data",
        variant: "destructive",
      });
    }
  };

  const handleShareAccess = async () => {
    if (!bob || !charlie) return;
    
    try {
      const bobData = await egendata.readData(DATA_ID, "Bob", bob.privateKey);
      const charlieData = await egendata.readData(DATA_ID, "Charlie", charlie.privateKey);
      
      setBobDecrypted(bobData);
      setCharlieDecrypted(charlieData);
      setStep(3);
      
      toast({
        title: "Åtkomst bekräftad!",
        description: "Bob och Charlie kan nu dekryptera datan",
      });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte dekryptera data",
        variant: "destructive",
      });
    }
  };

  const handleRevokeBob = async () => {
    try {
      await egendata.revokeAccess(DATA_ID, "Bob");
      setBobRevoked(true);
      setBobDecrypted(null);
      setStep(4);
      
      toast({
        title: "Åtkomst återkallad!",
        description: "Bob kan inte längre dekryptera datan",
      });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte återkalla åtkomst",
        variant: "destructive",
      });
    }
  };

  const handleGenerateBobQR = () => {
    if (!bob) return;
    
    const qrData = encodeKeyForQR("Bob", bob.publicKeyJWK);
    setBobQRData(qrData);
    setShowBobQR(true);
    
    toast({
      title: "QR-kod genererad!",
      description: "Bob kan nu dela sin nyckel via QR-kod",
    });
  };

  const handleScanQR = async (qrData: string) => {
    setShowScanner(false);
    
    try {
      const keyData = decodeKeyFromQR(qrData);
      
      if (!validateKeyData(keyData)) {
        toast({
          title: "Ogiltig QR-kod",
          description: "QR-koden är för gammal eller ogiltig",
          variant: "destructive",
        });
        return;
      }
      
      const { name, publicKeyJWK } = qrKeyDataToJWK(keyData);
      
      if (name !== "Bob") {
        toast({
          title: "Fel användare",
          description: `QR-koden tillhör ${name}, inte Bob`,
          variant: "destructive",
        });
        return;
      }
      
      if (!alice) {
        toast({
          title: "Fel",
          description: "Saknar nödvändig data för att återge åtkomst",
          variant: "destructive",
        });
        return;
      }
      
      const bobPublicKey = await egendata.importPublicKey(publicKeyJWK);
      
      await egendata.reGrantAccess(
        DATA_ID,
        "Bob",
        bobPublicKey,
        alice.privateKey
      );
      
      setBobReGranted(true);
      setBobRevoked(false);
      
      toast({
        title: "Åtkomst återställd!",
        description: "Bob har nu åtkomst till datan igen via QR-kod",
      });
    } catch (error) {
      console.error('QR scan error:', error);
      toast({
        title: "Fel vid skanning",
        description: "Kunde inte läsa QR-koden korrekt",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-white rounded-sm" style={{ 
                backgroundImage: `repeating-linear-gradient(90deg, hsl(195 100% 52%) 0px, hsl(195 100% 52%) 2px, transparent 2px, transparent 4px),
                                 repeating-linear-gradient(0deg, hsl(195 100% 52%) 0px, hsl(195 100% 52%) 2px, transparent 2px, transparent 4px)` 
              }} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              egen<span className="text-primary">DATA</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <StepIndicator steps={steps} currentStep={step} />

        {/* Step 0: Introduction & Key Generation */}
        {step === 0 && (
          <div className="animate-fade-in space-y-8">
            <div className="space-y-4">
              <p className="text-sm italic font-serif text-muted-foreground">Demo:</p>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Secure decentralised datastreams
              </h2>
              <p className="text-lg text-muted-foreground">
                Den här demon visar hur Alice kan kryptera känslig data, dela åtkomst med Bob och Charlie, 
                och sedan dynamiskt återkalla och återge åtkomst – allt med full kontroll.
              </p>
            </div>

            <Card className="p-8 bg-muted/30">
              <h3 className="font-semibold text-lg mb-4">Steg 1: Generera krypteringsnycklar</h3>
              <p className="text-muted-foreground mb-6">
                Först skapar vi RSA-nyckelpar för Alice, Bob och Charlie. Varje person får en publik och privat nyckel.
              </p>
              <Button onClick={handleGenerateKeys} size="lg" className="w-full">
                Starta demo <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Card>
          </div>
        )}

        {/* Step 1: Encrypt Data */}
        {step === 1 && (
          <div className="animate-fade-in space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Kryptera känslig data</h2>
              <p className="text-lg text-muted-foreground">
                Alice har känslig information som hon vill dela med Bob och Charlie, men ingen annan ska kunna läsa den.
              </p>
            </div>

            <div className="space-y-6">
              <ActorCard name="Alice" role="Data Owner" status="active" align="left">
                <DataDisplay
                  title="Känslig information"
                  data={JSON.stringify(originalData, null, 2)}
                  variant="original"
                />
              </ActorCard>

              {encryptedData && (
                <div className="ml-auto">
                  <DataDisplay
                    title="Krypterad data (Base64)"
                    data={encryptedData.substring(0, 150) + "..."}
                    isEncrypted
                    variant="encrypted"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(0)}>
                Tillbaka
              </Button>
              {!encryptedData ? (
                <Button onClick={handleEncrypt} size="lg" className="flex-1">
                  Kryptera med AES-GCM <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button onClick={() => setStep(2)} size="lg" className="flex-1">
                  Fortsätt <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Share Access */}
        {step === 2 && (
          <div className="animate-fade-in space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Dela åtkomst</h2>
              <p className="text-lg text-muted-foreground">
                Bob och Charlie kan nu dekryptera datan med sina privata nycklar. 
                Varje person får en krypterad DEK (Data Encryption Key) som endast de kan dekryptera.
              </p>
            </div>

            <div className="space-y-6">
              <ActorCard name="Bob" role="Recipient" status={bobDecrypted ? "success" : "default"} align="left">
                {bobDecrypted && (
                  <DataDisplay
                    title="Dekrypterad data"
                    data={JSON.stringify(bobDecrypted, null, 2)}
                    variant="decrypted"
                  />
                )}
              </ActorCard>

              <ActorCard name="Charlie" role="Recipient" status={charlieDecrypted ? "success" : "default"} align="right">
                {charlieDecrypted && (
                  <DataDisplay
                    title="Dekrypterad data"
                    data={JSON.stringify(charlieDecrypted, null, 2)}
                    variant="decrypted"
                  />
                )}
              </ActorCard>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Tillbaka
              </Button>
              {!bobDecrypted ? (
                <Button onClick={handleShareAccess} size="lg" className="flex-1">
                  Låt Bob & Charlie dekryptera <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button onClick={() => setStep(3)} size="lg" className="flex-1">
                  Fortsätt <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Revoke Access */}
        {step === 3 && (
          <div className="animate-fade-in space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Återkalla åtkomst</h2>
              <p className="text-lg text-muted-foreground">
                Alice vill inte längre att Bob ska ha åtkomst. 
                Hon kan återkalla Bobs åtkomst genom att ta bort hans nyckel från keystone.
              </p>
            </div>

            <div className="space-y-6">
              <ActorCard name="Bob" role="Recipient" status={bobRevoked ? "revoked" : "success"} align="left">
                {bobRevoked ? (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      ✗ Åtkomst återkallad
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bob kan inte längre dekryptera datan
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                    <p className="text-sm text-success font-medium">
                      ✓ Har åtkomst
                    </p>
                  </div>
                )}
              </ActorCard>

              <ActorCard name="Charlie" role="Recipient" status="success" align="right">
                <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                  <p className="text-sm text-success font-medium">
                    ✓ Behåller åtkomst
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Charlie påverkas inte av Bobs återkallade åtkomst
                  </p>
                </div>
              </ActorCard>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Tillbaka
              </Button>
              {!bobRevoked ? (
                <Button onClick={handleRevokeBob} variant="destructive" size="lg" className="flex-1">
                  Återkalla Bobs åtkomst <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button onClick={() => setStep(4)} size="lg" className="flex-1">
                  Fortsätt <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Re-grant Access via QR */}
        {step === 4 && (
          <div className="animate-fade-in space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Återge åtkomst via QR-kod</h2>
              <p className="text-lg text-muted-foreground">
                Bob vill få tillgång igen. Han kan dela sin publika nyckel via QR-kod eller copy/paste, 
                och Alice kan scanna den för att återge åtkomst.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Bob's side */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Bob delar sin nyckel</h3>
                </div>
                
                {!showBobQR ? (
                  <Button onClick={handleGenerateBobQR} className="w-full">
                    Generera QR-kod
                  </Button>
                ) : (
                  <QRKeyDisplay qrData={bobQRData} userName="Bob" publicKeyJWK={bob!.publicKeyJWK} />
                )}
              </Card>

              {/* Alice's side */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ScanLine className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Alice scannar nyckeln</h3>
                </div>
                
                {!showScanner && !bobReGranted && (
                  <Button 
                    onClick={() => setShowScanner(true)} 
                    variant="secondary"
                    className="w-full"
                  >
                    Scanna / Klistra in
                  </Button>
                )}
                
                {showScanner && (
                  <QRKeyScanner 
                    onScan={handleScanQR}
                    onClose={() => setShowScanner(false)}
                  />
                )}
                
                {bobReGranted && (
                  <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                    <p className="text-sm text-success font-medium flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Åtkomst återställd!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bob har nu åtkomst till datan igen
                    </p>
                  </div>
                )}
              </Card>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(3)}>
                Tillbaka
              </Button>
              {bobReGranted && (
                <Button onClick={() => setStep(0)} size="lg" className="flex-1">
                  Börja om demo <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
