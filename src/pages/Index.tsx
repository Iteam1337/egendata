import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ActorCard } from "@/components/ActorCard";
import { DataDisplay } from "@/components/DataDisplay";
import { StepIndicator } from "@/components/StepIndicator";
import { QRKeyDisplay } from "@/components/QRKeyDisplay";
import { QRKeyScanner } from "@/components/QRKeyScanner";
import { EgendataClient, InMemoryStorage, type KeyPair } from "@/lib/egendata";
import { encodeKeyForQR, decodeKeyFromQR, validateKeyData, qrKeyDataToJWK } from "@/lib/qr-key-exchange";
import { ArrowRight, Check, QrCode, ScanLine } from "lucide-react";

const Index = () => {
  // Start med InMemoryStorage för enkelhetens skull
  const [storage] = useState(() => new InMemoryStorage());
  const [egendata] = useState(() => new EgendataClient(storage));
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
  const steps = ["Alice har data", "Dela med Bob", "Dela med Charlie", "Återkalla Bob", "Återge till Bob"];

  const handleGenerateKeys = async () => {
    try {
      // Generera nycklar för alla tre aktörer
      const aliceKeys = await egendata.generateKeyPair("Alice");
      const bobKeys = await egendata.generateKeyPair("Bob");
      const charlieKeys = await egendata.generateKeyPair("Charlie");
      
      setAlice(aliceKeys);
      setBob(bobKeys);
      setCharlie(charlieKeys);
      
      // Kryptera direkt Alices data
      const result = await egendata.writeData(
        DATA_ID,
        originalData,
        "Alice",
        [{ name: "Alice", publicKey: aliceKeys.publicKey }]
      );
      
      setEncryptedData(result.encryptedData);
      setStep(1);
      
      toast({
        title: "Alice har skapat sin data!",
        description: "Datan är krypterad och endast Alice kan läsa den",
      });
    } catch (error) {
      console.error('❌ Fel vid nyckelgenerering:', error);
      toast({
        title: "Fel",
        description: error instanceof Error ? error.message : "Kunde inte generera nycklar",
        variant: "destructive",
      });
    }
  };

  const handleShareWithBob = async () => {
    if (!alice || !bob) return;
    
    try {
      await egendata.reGrantAccess(
        DATA_ID,
        "Bob",
        bob.publicKey,
        alice.privateKey
      );
      
      setStep(2);
      
      toast({
        title: "Åtkomst delad med Bob!",
        description: "Bob kan nu läsa Alices data",
      });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte dela åtkomst",
        variant: "destructive",
      });
    }
  };

  const handleShareWithCharlie = async () => {
    if (!alice || !charlie) return;
    
    try {
      await egendata.reGrantAccess(
        DATA_ID,
        "Charlie",
        charlie.publicKey,
        alice.privateKey
      );
      
      setStep(3);
      
      toast({
        title: "Åtkomst delad med Charlie!",
        description: "Charlie kan nu också läsa Alices data",
      });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte dela åtkomst",
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
        description: "Alice har tagit bort Bobs åtkomst",
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
        setStep(5);
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
        <div className="max-w-7xl mx-auto px-6 py-6">
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
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-8">
          <StepIndicator steps={steps} currentStep={step} />

        {/* Step 0: Introduction */}
        {step === 0 && (
          <div className="animate-fade-in space-y-8">
            <div className="space-y-4">
              <p className="text-sm italic font-serif text-muted-foreground">Demo:</p>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Secure decentralised datastreams
              </h2>
              <p className="text-lg text-muted-foreground">
                Följ med i berättelsen om hur Alice kontrollerar sin känsliga data och delar den med andra.
              </p>
            </div>

            <Card className="p-8 bg-muted/30">
              <h3 className="font-semibold text-lg mb-4">Berättelsen</h3>
              <p className="text-muted-foreground mb-6">
                Alice har känslig data som hon vill lagra säkert. Hon bestämmer sig för att dela den med Bob, 
                sedan även med Charlie. Men när hon ångrar sig tar hon bort Bobs åtkomst. Efter en tid ger hon Bob 
                ett nytt försök genom att scanna hans QR-kod.
              </p>
              <Button 
                onClick={handleGenerateKeys} 
                size="lg" 
                className="w-full"
              >
                Starta berättelsen <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Card>
          </div>
        )}

        {/* Step 1: Alice har data */}
        {step === 1 && (
          <div className="animate-fade-in space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Alice har känslig data</h2>
              <p className="text-lg text-muted-foreground">
                Alice har krypterat sin känsliga data och lagrar den hos sig själv. Ingen annan kan läsa den.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Alice - Vänster */}
              <div className="space-y-4">
                <ActorCard name="Alice" role="Data Owner" status="active">
                  <div className="space-y-4">
                    <DataDisplay
                      title="Känslig information"
                      data={JSON.stringify(originalData, null, 2)}
                      variant="original"
                    />
                    <Button onClick={handleReadAsAlice} variant="default" size="sm" className="w-full">
                      📖 Läs min data
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
              </div>

              {/* Bob - Höger */}
              <div className="space-y-4">
                <ActorCard name="Bob" role="Mottagare" status="default">
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Väntar på åtkomst från Alice...
                  </div>
                </ActorCard>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-4">
              <div className="p-6 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-semibold mb-3">Dela data med:</h3>
                <div className="flex gap-3">
                  <Button onClick={handleShareWithBob} size="lg" className="flex-1">
                    Dela med Bob <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
              
              <Button variant="outline" onClick={() => setStep(0)}>
                Tillbaka
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Bob får åtkomst */}
        {step === 2 && (
          <div className="animate-fade-in space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Bob får åtkomst</h2>
              <p className="text-lg text-muted-foreground">
                Alice har delat ut en nyckel till Bob. Nu kan Bob läsa Alices data.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Alice - Vänster */}
              <div className="space-y-4">
                <ActorCard name="Alice" role="Data Owner" status="active">
                  <div className="space-y-4">
                    <Button onClick={handleReadAsAlice} variant="default" size="sm" className="w-full">
                      📖 Läs min data
                    </Button>
                    {aliceDecrypted && (
                      <div className="p-2 bg-success/10 border border-success/30 rounded text-xs text-success">
                        ✓ Alice kan alltid läsa sin data
                      </div>
                    )}
                  </div>
                </ActorCard>
              </div>

              {/* Bob - Höger */}
              <div className="space-y-4">
                <ActorCard name="Bob" role="Mottagare" status={bobDecrypted ? "success" : "default"}>
                  <div className="space-y-4">
                    <Button onClick={handleReadAsBob} variant="default" size="sm" className="w-full">
                      📖 Läs Alices data
                    </Button>
                    {bobDecrypted && (
                      <DataDisplay
                        title="Bob läser data"
                        data={JSON.stringify(bobDecrypted, null, 2)}
                        variant="decrypted"
                      />
                    )}
                  </div>
                </ActorCard>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-4">
              <div className="p-6 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-semibold mb-3">Dela data med:</h3>
                <div className="flex gap-3">
                  <Button onClick={handleShareWithCharlie} size="lg" className="flex-1">
                    Dela med Charlie <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
              
              <Button variant="outline" onClick={() => setStep(1)}>
                Tillbaka
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Charlie får också åtkomst */}
        {step === 3 && (
          <div className="animate-fade-in space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Charlie får också åtkomst</h2>
              <p className="text-lg text-muted-foreground">
                Alice har nu delat sin data med både Bob och Charlie. Båda kan läsa datan.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Alice - Vänster */}
              <div className="space-y-4">
                <ActorCard name="Alice" role="Data Owner" status="active">
                  <div className="space-y-4">
                    <Button onClick={handleReadAsAlice} variant="default" size="sm" className="w-full">
                      📖 Läs min data
                    </Button>
                  </div>
                </ActorCard>
              </div>

              {/* Bob & Charlie - Höger */}
              <div className="space-y-4">
                <ActorCard name="Bob" role="Mottagare" status={bobDecrypted ? "success" : "default"}>
                  <Button onClick={handleReadAsBob} variant="default" size="sm" className="w-full">
                    📖 Läs Alices data
                  </Button>
                </ActorCard>

                <ActorCard name="Charlie" role="Mottagare" status={charlieDecrypted ? "success" : "default"}>
                  <div className="space-y-4">
                    <Button onClick={handleReadAsCharlie} variant="default" size="sm" className="w-full">
                      📖 Läs Alices data
                    </Button>
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
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-4">
              <div className="p-6 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-semibold mb-3">Hantera åtkomst:</h3>
                <div className="flex gap-3">
                  <Button onClick={handleRevokeBob} variant="destructive" size="lg" className="flex-1">
                    🚫 Återkalla Bob <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
              
              <Button variant="outline" onClick={() => setStep(2)}>
                Tillbaka
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Bob återkallad */}
        {step === 4 && (
          <div className="animate-fade-in space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Alice ångrar sig</h2>
              <p className="text-lg text-muted-foreground">
                Alice har återkallat Bobs åtkomst. Bob kan inte längre läsa datan.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Alice - Vänster */}
              <div className="space-y-4">
                <ActorCard name="Alice" role="Data Owner" status="active">
                  <div className="space-y-4">
                    <Button onClick={handleReadAsAlice} variant="default" size="sm" className="w-full">
                      📖 Läs min data
                    </Button>
                    
                    {showScanner && scanningFor === 'Bob' && (
                      <Card className="p-4 bg-primary/5 border-primary">
                        <div className="space-y-4">
                          <p className="text-sm font-medium">Scanna Bobs QR-kod</p>
                          <QRKeyScanner 
                            onScan={handleScanQR}
                            onClose={() => {
                              setShowScanner(false);
                              setScanningFor(null);
                            }}
                          />
                          <Button 
                            onClick={() => { 
                              setShowScanner(false); 
                              setScanningFor(null); 
                            }} 
                            variant="ghost" 
                            size="sm" 
                            className="w-full"
                          >
                            Avbryt
                          </Button>
                        </div>
                      </Card>
                    )}
                  </div>
                </ActorCard>
              </div>

              {/* Bob & Charlie - Höger */}
              <div className="space-y-4">
                <ActorCard name="Bob" role="Mottagare" status="revoked">
                  <div className="space-y-4">
                    <Button onClick={handleReadAsBob} variant="default" size="sm" className="w-full">
                      📖 Försök läs Alices data
                    </Button>
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded">
                      <p className="text-xs text-destructive font-medium">⚠️ Åtkomst återkallad</p>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Begär ny åtkomst:</p>
                      <Button 
                        onClick={handleGenerateBobQR} 
                        variant="default"
                        size="sm"
                        className="w-full"
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Skapa QR-kod med min nyckel
                      </Button>
                    </div>
                    
                    {showBobQR && (
                      <div className="mt-4 p-4 bg-primary/5 border-primary rounded">
                        <p className="text-xs font-medium mb-3">Bobs QR-kod - visa för Alice</p>
                        <QRKeyDisplay qrData={bobQRData} userName="Bob" publicKeyJWK={bob!.publicKeyJWK} />
                        <Button 
                          onClick={() => setShowBobQR(false)} 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-2"
                        >
                          Stäng
                        </Button>
                      </div>
                    )}
                  </div>
                </ActorCard>

                <ActorCard name="Charlie" role="Mottagare" status={charlieDecrypted ? "success" : "default"}>
                  <Button onClick={handleReadAsCharlie} variant="default" size="sm" className="w-full">
                    📖 Läs Alices data
                  </Button>
                  <div className="mt-2 p-2 bg-success/10 border border-success/30 rounded text-xs text-success">
                    ✓ Har fortfarande åtkomst
                  </div>
                </ActorCard>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-4">
              <div className="p-6 bg-muted/30 rounded-lg">
                <h3 className="text-sm font-semibold mb-3">Dela med nyckel:</h3>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => {
                      setScanningFor('Bob');
                      setShowScanner(true);
                    }}
                    variant="default"
                    size="lg"
                    className="flex-1"
                    disabled={showScanner}
                  >
                    <ScanLine className="w-4 h-4 mr-2" />
                    Scanna nyckel från Bob/Charlie
                  </Button>
                </div>
              </div>
              
              <Button variant="outline" onClick={() => setStep(3)}>
                Tillbaka
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Bob får åtkomst igen */}
        {step === 5 && (
          <div className="animate-fade-in space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Bob har fått åtkomst igen! 🎉</h2>
              <p className="text-lg text-muted-foreground">
                Alice har scannat Bobs QR-kod och återgett honom åtkomst. Nu kan Bob läsa datan igen.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ActorCard name="Alice" role="Data Owner" status="active">
                <Button onClick={handleReadAsAlice} variant="default" size="sm" className="w-full">
                  📖 Läs
                </Button>
              </ActorCard>

              <ActorCard name="Bob" role="Mottagare" status={bobDecrypted ? "success" : "default"}>
                <div className="space-y-4">
                  <Button onClick={handleReadAsBob} variant="default" size="sm" className="w-full">
                    📖 Läs som Bob
                  </Button>
                  {bobDecrypted && (
                    <DataDisplay
                      title="Bob kan läsa igen!"
                      data={JSON.stringify(bobDecrypted, null, 2)}
                      variant="decrypted"
                    />
                  )}
                </div>
              </ActorCard>

              <ActorCard name="Charlie" role="Mottagare" status={charlieDecrypted ? "success" : "default"}>
                <Button onClick={handleReadAsCharlie} variant="default" size="sm" className="w-full">
                  📖 Läs
                </Button>
              </ActorCard>
            </div>

            <Card className="p-6 bg-success/10 border-success">
              <h3 className="font-semibold text-success mb-4">Berättelsen är klar!</h3>
              <p className="text-muted-foreground mb-4">
                Du har nu sett hela flödet: Alice skapade känslig data, delade den med Bob och Charlie, 
                återkallade Bobs åtkomst när hon ångrade sig, och gav honom sedan nytt försök via QR-kod.
              </p>
              <p className="text-sm text-muted-foreground">
                Detta visar kraften i decentraliserad datakontroll - Alice har full kontroll över vem som kan läsa hennes data, 
                när som helst, utan någon central server.
              </p>
            </Card>

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
    </div>
  );
};

export default Index;
