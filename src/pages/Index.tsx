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
  const [aliceDecrypted, setAliceDecrypted] = useState<object | null>(null);
  const [bobRevoked, setBobRevoked] = useState(false);
  const [charlieRevoked, setCharlieRevoked] = useState(false);
  
  // QR code states
  const [showBobQR, setShowBobQR] = useState(false);
  const [showCharlieQR, setShowCharlieQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanningFor, setScanningFor] = useState<'Bob' | 'Charlie' | null>(null);
  const [bobQRData, setBobQRData] = useState<string>("");
  const [charlieQRData, setCharlieQRData] = useState<string>("");

  const DATA_ID = "alice-sensitive-data";
  const steps = ["Setup", "Encrypt", "Test Access Control"];

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

  const handleRevokeBob = async () => {
    try {
      await egendata.revokeAccess(DATA_ID, "Bob");
      setBobRevoked(true);
      setBobDecrypted(null);
      
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

  const handleRevokeCharlie = async () => {
    try {
      await egendata.revokeAccess(DATA_ID, "Charlie");
      setCharlieRevoked(true);
      setCharlieDecrypted(null);
      
      toast({
        title: "Åtkomst återkallad!",
        description: "Charlie kan inte längre dekryptera datan",
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

  const handleGenerateCharlieQR = () => {
    if (!charlie) return;
    
    const qrData = encodeKeyForQR("Charlie", charlie.publicKeyJWK);
    setCharlieQRData(qrData);
    setShowCharlieQR(true);
    
    toast({
      title: "QR-kod genererad!",
      description: "Charlie kan nu dela sin nyckel via QR-kod",
    });
  };

  const handleReadAsAlice = async () => {
    if (!alice || !encryptedData) return;
    
    try {
      const data = await egendata.readData(DATA_ID, "Alice", alice.privateKey);
      setAliceDecrypted(data);
      
      toast({
        title: "Data läst som Alice!",
        description: "Alice kan alltid läsa sin egen data",
      });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Alice kunde inte läsa datan",
        variant: "destructive",
      });
    }
  };

  const handleReadAsBob = async () => {
    if (!bob || !encryptedData) return;
    
    try {
      const data = await egendata.readData(DATA_ID, "Bob", bob.privateKey);
      setBobDecrypted(data);
      
      toast({
        title: "Data läst som Bob!",
        description: "Bob kan läsa datan",
      });
    } catch (error) {
      setBobDecrypted(null);
      toast({
        title: "Åtkomst nekad",
        description: "Bob har inte åtkomst till datan",
        variant: "destructive",
      });
    }
  };

  const handleReadAsCharlie = async () => {
    if (!charlie || !encryptedData) return;
    
    try {
      const data = await egendata.readData(DATA_ID, "Charlie", charlie.privateKey);
      setCharlieDecrypted(data);
      
      toast({
        title: "Data läst som Charlie!",
        description: "Charlie kan läsa datan",
      });
    } catch (error) {
      setCharlieDecrypted(null);
      toast({
        title: "Åtkomst nekad",
        description: "Charlie har inte åtkomst till datan",
        variant: "destructive",
      });
    }
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
      
      if (!alice) {
        toast({
          title: "Fel",
          description: "Saknar nödvändig data för att återge åtkomst",
          variant: "destructive",
        });
        return;
      }
      
      const recipientPublicKey = await egendata.importPublicKey(publicKeyJWK);
      
      await egendata.reGrantAccess(
        DATA_ID,
        name,
        recipientPublicKey,
        alice.privateKey
      );
      
      if (name === "Bob") {
        setBobRevoked(false);
      } else if (name === "Charlie") {
        setCharlieRevoked(false);
      }
      
      setScanningFor(null);
      
      toast({
        title: "Åtkomst återställd!",
        description: `${name} har nu åtkomst till datan igen via QR-kod`,
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
                {encryptedData && (
                  <Button onClick={handleReadAsAlice} variant="outline" size="sm" className="mt-4 w-full">
                    Läs som Alice
                  </Button>
                )}
                {aliceDecrypted && (
                  <DataDisplay
                    title="Alice läser sin egen data"
                    data={JSON.stringify(aliceDecrypted, null, 2)}
                    variant="decrypted"
                  />
                )}
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

        {/* Step 2: Interactive Testing */}
        {step >= 2 && (
          <div className="animate-fade-in space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Testa åtkomstkontroll</h2>
              <p className="text-lg text-muted-foreground">
                Nu kan du fritt testa att läsa data, återkalla och återge åtkomst. Alla aktörer har sina egna läsknappar.
              </p>
            </div>

            <div className="space-y-6">
              {/* Alice */}
              <ActorCard name="Alice" role="Data Owner" status="active" align="left">
                <div className="space-y-4">
                  <Button onClick={handleReadAsAlice} variant="default" size="sm" className="w-full">
                    📖 Läs som Alice
                  </Button>
                  {aliceDecrypted && (
                    <DataDisplay
                      title="Alice läser sin egen data"
                      data={JSON.stringify(aliceDecrypted, null, 2)}
                      variant="decrypted"
                    />
                  )}
                </div>
              </ActorCard>

              {/* Bob */}
              <ActorCard name="Bob" role="Recipient" status={bobRevoked ? "revoked" : (bobDecrypted ? "success" : "default")} align="right">
                <div className="space-y-4">
                  <Button 
                    onClick={handleReadAsBob} 
                    variant="default"
                    size="sm" 
                    className="w-full"
                  >
                    📖 Läs som Bob
                  </Button>
                  
                  <div className="flex gap-2">
                    {!bobRevoked ? (
                      <Button 
                        onClick={handleRevokeBob} 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1"
                      >
                        🚫 Återkalla
                      </Button>
                    ) : (
                      <>
                        <Button 
                          onClick={handleGenerateBobQR} 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          QR-kod
                        </Button>
                        <Button 
                          onClick={() => {
                            setScanningFor('Bob');
                            setShowScanner(true);
                          }} 
                          variant="default"
                          size="sm" 
                          className="flex-1"
                        >
                          <ScanLine className="w-4 h-4 mr-2" />
                          Återge
                        </Button>
                      </>
                    )}
                  </div>

                  {bobRevoked && !showBobQR && !(showScanner && scanningFor === 'Bob') && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        ✗ Åtkomst återkallad
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Dela QR-kod och scanna för att återge
                      </p>
                    </div>
                  )}

                  {showBobQR && (
                    <div className="space-y-2">
                      <QRKeyDisplay qrData={bobQRData} userName="Bob" publicKeyJWK={bob!.publicKeyJWK} />
                      <Button 
                        onClick={() => setShowBobQR(false)} 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                      >
                        Stäng QR
                      </Button>
                    </div>
                  )}
                  
                  {showScanner && scanningFor === 'Bob' && (
                    <div className="space-y-2">
                      <QRKeyScanner 
                        onScan={handleScanQR}
                        onClose={() => {
                          setShowScanner(false);
                          setScanningFor(null);
                        }}
                      />
                    </div>
                  )}

                  {bobDecrypted && (
                    <DataDisplay
                      title="Bob läser data"
                      data={JSON.stringify(bobDecrypted, null, 2)}
                      variant="decrypted"
                    />
                  )}
                </div>
              </ActorCard>

              {/* Charlie */}
              <ActorCard name="Charlie" role="Recipient" status={charlieRevoked ? "revoked" : (charlieDecrypted ? "success" : "default")} align="left">
                <div className="space-y-4">
                  <Button onClick={handleReadAsCharlie} variant="default" size="sm" className="w-full">
                    📖 Läs som Charlie
                  </Button>
                  
                  <div className="flex gap-2">
                    {!charlieRevoked ? (
                      <Button 
                        onClick={handleRevokeCharlie} 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1"
                      >
                        🚫 Återkalla
                      </Button>
                    ) : (
                      <>
                        <Button 
                          onClick={handleGenerateCharlieQR} 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          QR-kod
                        </Button>
                        <Button 
                          onClick={() => {
                            setScanningFor('Charlie');
                            setShowScanner(true);
                          }} 
                          variant="default"
                          size="sm" 
                          className="flex-1"
                        >
                          <ScanLine className="w-4 h-4 mr-2" />
                          Återge
                        </Button>
                      </>
                    )}
                  </div>

                  {charlieRevoked && !showCharlieQR && !(showScanner && scanningFor === 'Charlie') && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        ✗ Åtkomst återkallad
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Dela QR-kod och scanna för att återge
                      </p>
                    </div>
                  )}

                  {showCharlieQR && (
                    <div className="space-y-2">
                      <QRKeyDisplay qrData={charlieQRData} userName="Charlie" publicKeyJWK={charlie!.publicKeyJWK} />
                      <Button 
                        onClick={() => setShowCharlieQR(false)} 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                      >
                        Stäng QR
                      </Button>
                    </div>
                  )}
                  
                  {showScanner && scanningFor === 'Charlie' && (
                    <div className="space-y-2">
                      <QRKeyScanner 
                        onScan={handleScanQR}
                        onClose={() => {
                          setShowScanner(false);
                          setScanningFor(null);
                        }}
                      />
                    </div>
                  )}

                  {charlieDecrypted && (
                    <DataDisplay
                      title="Charlie läser data"
                      data={JSON.stringify(charlieDecrypted, null, 2)}
                      variant="decrypted"
                    />
                  )}
                </div>
              </ActorCard>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => {
                setStep(0);
                setEncryptedData("");
                setAliceDecrypted(null);
                setBobDecrypted(null);
                setCharlieDecrypted(null);
                setBobRevoked(false);
                setCharlieRevoked(false);
                setShowBobQR(false);
                setShowCharlieQR(false);
                setShowScanner(false);
                setScanningFor(null);
              }}>
                Börja om
              </Button>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default Index;
