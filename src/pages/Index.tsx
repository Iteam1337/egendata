import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ActorCard } from "@/components/ActorCard";
import { DataDisplay } from "@/components/DataDisplay";
import { StepIndicator } from "@/components/StepIndicator";
import { QRKeyDisplay } from "@/components/QRKeyDisplay";
import { QRKeyScanner } from "@/components/QRKeyScanner";
import { IPFSStatus } from "@/components/IPFSStatus";
import { IPFSLink } from "@/components/IPFSLink";
import { EgendataClient, IPFSStorage, type KeyPair } from "@/lib/egendata";
import { encodeKeyForQR, decodeKeyFromQR, validateKeyData, qrKeyDataToJWK } from "@/lib/qr-key-exchange";
import { ArrowRight, Check, QrCode, ScanLine, Lock, LockOpen, User, X, Key } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { KeyRingDisplay } from "@/components/KeyRingDisplay";

const Index = () => {
  // IPFS Storage
  const [ipfsStorage] = useState(() => new IPFSStorage());
  const [egendata] = useState(() => new EgendataClient(ipfsStorage));
  const [ipfsReady, setIpfsReady] = useState(false);
  const [ipfsInitializing, setIpfsInitializing] = useState(false);
  const [ipfsError, setIpfsError] = useState<string>();
  
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
  const [dataCID, setDataCID] = useState<string>("");
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
  
  // Avancerade funktioner
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState("");
  const [customRecipients, setCustomRecipients] = useState<Array<{ name: string; keyPair: KeyPair }>>([]);

  const DATA_ID = "alice-sensitive-data";
  const steps = ["Alice har data", "Dela med Bob", "Dela med Charlie", "Återkalla Bob", "Återge till Bob"];
  
  // Hämta nyckelringsinformation
  const getAccessListNames = async () => {
    try {
      const recipients = await egendata.listRecipients(DATA_ID);
      return recipients;
    } catch {
      return [];
    }
  };
  
  const [accessList, setAccessList] = useState<string[]>([]);

  // Initialisera IPFS vid start
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      setIpfsInitializing(true);
      try {
        console.log('🔄 Initierar IPFS...');
        await ipfsStorage.initialize();
        
        if (mounted) {
          console.log('✅ IPFS initierad, laddar befintliga mappings...');
          await ipfsStorage.restore();
          setIpfsReady(true);
          console.log('✅ IPFS helt redo!');
        }
      } catch (error) {
        console.error('❌ IPFS init failed:', error);
        if (mounted) {
          setIpfsError(error instanceof Error ? error.message : 'IPFS kunde inte startas');
        }
      } finally {
        if (mounted) {
          setIpfsInitializing(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      ipfsStorage.stop();
    };
  }, [ipfsStorage]);

  const handleGenerateKeys = async () => {
    if (!ipfsReady) {
      toast({
        title: "Vänta",
        description: "IPFS initialiseras fortfarande...",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔑 Genererar nycklar...');
      // Generera nycklar för alla tre aktörer
      const aliceKeys = await egendata.generateKeyPair("Alice");
      const bobKeys = await egendata.generateKeyPair("Bob");
      const charlieKeys = await egendata.generateKeyPair("Charlie");
      
      setAlice(aliceKeys);
      setBob(bobKeys);
      setCharlie(charlieKeys);
      
      // Kryptera direkt Alices data och lagra i IPFS
      const result = await egendata.writeData(
        DATA_ID,
        originalData,
        "Alice",
        [{ name: "Alice", publicKey: aliceKeys.publicKey }]
      );
      
      setEncryptedData(result.encryptedData);
      
      // Hämta CID från IPFS storage
      const cid = ipfsStorage.getCID(DATA_ID);
      if (cid) {
        setDataCID(cid);
        console.log(`✅ Data lagrad med CID: ${cid}`);
      }
      
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);
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
      
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);
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
      
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);
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
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);
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
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);
      
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
      
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);
      
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

  const handleAddRecipient = async () => {
    if (!newRecipientName.trim() || !alice) {
      toast({
        title: "Ogiltigt namn",
        description: "Ange ett namn för den nya mottagaren",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generera nyckelpar för ny mottagare
      const newKeyPair = await egendata.generateKeyPair(newRecipientName);
      
      // Dela data med ny mottagare
      await egendata.reGrantAccess(
        DATA_ID,
        newRecipientName,
        newKeyPair.publicKey,
        alice.privateKey
      );
      
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);
      
      // Lägg till i listan
      setCustomRecipients([...customRecipients, { name: newRecipientName, keyPair: newKeyPair }]);
      setNewRecipientName("");
      
      toast({
        title: "Mottagare tillagd!",
        description: `${newRecipientName} har nu åtkomst till datan`,
      });
    } catch (error) {
      console.error('Add recipient error:', error);
      toast({
        title: "Fel",
        description: "Kunde inte lägga till mottagare",
        variant: "destructive",
      });
    }
  };

  const handleRevokeCustomRecipient = async (recipientName: string) => {
    try {
      await egendata.revokeAccess(DATA_ID, recipientName);
      setCustomRecipients(customRecipients.filter(r => r.name !== recipientName));
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);
      
      toast({
        title: "Åtkomst återkallad",
        description: `${recipientName} har inte längre åtkomst`,
      });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte återkalla åtkomst",
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
          <IPFSStatus 
            isInitialized={ipfsReady}
            isInitializing={ipfsInitializing}
            error={ipfsError}
          />
          
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
                Följ med i berättelsen om hur Alice kontrollerar sin känsliga data och delar den med andra via IPFS.
              </p>
            </div>

            <Card className="p-8 bg-muted/30">
              <h3 className="font-semibold text-lg mb-4">Berättelsen</h3>
              <p className="text-muted-foreground mb-6">
                Alice har känslig data som hon vill lagra säkert i IPFS. Hon bestämmer sig för att dela den med Bob, 
                sedan även med Charlie. Men när hon ångrar sig tar hon bort Bobs åtkomst. Efter en tid ger hon Bob 
                ett nytt försök genom att scanna hans QR-kod med CID.
              </p>
              <Button 
                onClick={handleGenerateKeys} 
                size="lg" 
                className="w-full"
                disabled={!ipfsReady}
              >
                {ipfsInitializing ? 'Startar IPFS...' : 'Starta berättelsen'} <ArrowRight className="w-5 h-5 ml-2" />
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
                    
                    <div className="pt-3 border-t border-border space-y-3">
                      <KeyRingDisplay 
                        recipients={accessList} 
                        getKeyPair={(name) => {
                          if (name === "Alice") return alice || undefined;
                          if (name === "Bob") return bob || undefined;
                          if (name === "Charlie") return charlie || undefined;
                          return customRecipients.find(r => r.name === name)?.keyPair;
                        }}
                      />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Status:</p>
                        <div className="flex gap-2">
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-success/10 text-success">
                            <User className="w-3 h-3" />
                            <span>Alice (själv)</span>
                            <Check className="w-3 h-3" />
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>Bob</span>
                            <X className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
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
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <QrCode className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Publik nyckel finns</span>
                    </div>
                    <div className="p-4 text-center text-muted-foreground text-sm border-t border-border">
                      Väntar på åtkomst från Alice...
                    </div>
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
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Delad med:</p>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-success/10 text-success">
                          <User className="w-3 h-3" />
                          <span>Alice</span>
                          <Check className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-success/10 text-success">
                          <User className="w-3 h-3" />
                          <span>Bob</span>
                          <Check className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>Charlie</span>
                          <X className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                    
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
                    <div className="space-y-3 pb-3 border-b border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <QrCode className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Publik nyckel finns</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Lock className="w-4 h-4 text-warning" />
                        <span className="text-muted-foreground">Ser krypterad data från IPFS</span>
                      </div>
                      <KeyRingDisplay 
                        recipients={accessList} 
                        getKeyPair={(name) => {
                          if (name === "Alice") return alice || undefined;
                          if (name === "Bob") return bob || undefined;
                          if (name === "Charlie") return charlie || undefined;
                          return customRecipients.find(r => r.name === name)?.keyPair;
                        }}
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <LockOpen className="w-4 h-4 text-success" />
                        <span className="text-success font-medium">Kan dekryptera (Bobs nyckel finns i nyckelring)</span>
                      </div>
                    </div>
                    
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
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Delad med:</p>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-success/10 text-success">
                          <User className="w-3 h-3" />
                          <span>Alice</span>
                          <Check className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-success/10 text-success">
                          <User className="w-3 h-3" />
                          <span>Bob</span>
                          <Check className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-success/10 text-success">
                          <User className="w-3 h-3" />
                          <span>Charlie</span>
                          <Check className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                    
                    <Button onClick={handleReadAsAlice} variant="default" size="sm" className="w-full">
                      📖 Läs min data
                    </Button>
                  </div>
                </ActorCard>
              </div>

              {/* Bob & Charlie - Höger */}
              <div className="space-y-4">
                <ActorCard name="Bob" role="Mottagare" status={bobDecrypted ? "success" : "default"}>
                  <div className="space-y-3">
                    <div className="space-y-3 pb-3 border-b border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <QrCode className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Publik nyckel finns</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Lock className="w-4 h-4 text-warning" />
                        <span className="text-muted-foreground">Ser krypterad data från IPFS</span>
                      </div>
                      <KeyRingDisplay 
                        recipients={accessList} 
                        getKeyPair={(name) => {
                          if (name === "Alice") return alice || undefined;
                          if (name === "Bob") return bob || undefined;
                          if (name === "Charlie") return charlie || undefined;
                          return customRecipients.find(r => r.name === name)?.keyPair;
                        }}
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <LockOpen className="w-4 h-4 text-success" />
                        <span className="text-success font-medium">Kan dekryptera (Bobs nyckel finns i nyckelring)</span>
                      </div>
                    </div>
                    
                    <Button onClick={handleReadAsBob} variant="default" size="sm" className="w-full">
                      📖 Läs Alices data
                    </Button>
                  </div>
                </ActorCard>

                <ActorCard name="Charlie" role="Mottagare" status={charlieDecrypted ? "success" : "default"}>
                  <div className="space-y-4">
                    <div className="space-y-3 pb-3 border-b border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <QrCode className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Publik nyckel finns</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Lock className="w-4 h-4 text-warning" />
                        <span className="text-muted-foreground">Ser krypterad data från IPFS</span>
                      </div>
                      <KeyRingDisplay 
                        recipients={accessList} 
                        getKeyPair={(name) => {
                          if (name === "Alice") return alice || undefined;
                          if (name === "Bob") return bob || undefined;
                          if (name === "Charlie") return charlie || undefined;
                          return customRecipients.find(r => r.name === name)?.keyPair;
                        }}
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <LockOpen className="w-4 h-4 text-success" />
                        <span className="text-success font-medium">Kan dekryptera (Charlies nyckel finns i nyckelring)</span>
                      </div>
                    </div>
                    
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
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Delad med:</p>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-success/10 text-success">
                          <User className="w-3 h-3" />
                          <span>Alice</span>
                          <Check className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-destructive/10 text-destructive">
                          <User className="w-3 h-3" />
                          <span>Bob</span>
                          <X className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-success/10 text-success">
                          <User className="w-3 h-3" />
                          <span>Charlie</span>
                          <Check className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                    
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
                    <div className="space-y-3 pb-3 border-b border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <QrCode className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Publik nyckel finns</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Lock className="w-4 h-4 text-warning" />
                        <span className="text-muted-foreground">Ser krypterad data från IPFS</span>
                      </div>
                      <KeyRingDisplay 
                        recipients={accessList} 
                        getKeyPair={(name) => {
                          if (name === "Alice") return alice || undefined;
                          if (name === "Bob") return bob || undefined;
                          if (name === "Charlie") return charlie || undefined;
                          return customRecipients.find(r => r.name === name)?.keyPair;
                        }}
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <Lock className="w-4 h-4 text-destructive" />
                        <span className="text-destructive font-medium">Kan EJ dekryptera (Bobs nyckel saknas i nyckelring)</span>
                      </div>
                    </div>
                    
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
                  <div className="space-y-3">
                    <div className="space-y-3 pb-3 border-b border-border">
                      <div className="flex items-center gap-2 text-sm">
                        <QrCode className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Publik nyckel finns</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Lock className="w-4 h-4 text-warning" />
                        <span className="text-muted-foreground">Ser krypterad data från IPFS</span>
                      </div>
                      <KeyRingDisplay 
                        recipients={accessList} 
                        getKeyPair={(name) => {
                          if (name === "Alice") return alice || undefined;
                          if (name === "Bob") return bob || undefined;
                          if (name === "Charlie") return charlie || undefined;
                          return customRecipients.find(r => r.name === name)?.keyPair;
                        }}
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <LockOpen className="w-4 h-4 text-success" />
                        <span className="text-success font-medium">Kan dekryptera (Charlies nyckel finns i nyckelring)</span>
                      </div>
                    </div>
                    
                    <Button onClick={handleReadAsCharlie} variant="default" size="sm" className="w-full">
                      📖 Läs Alices data
                    </Button>
                    <div className="mt-2 p-2 bg-success/10 border border-success/30 rounded text-xs text-success">
                      ✓ Har fortfarande åtkomst
                    </div>
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

        {/* Step 5: Bob får åtkomst igen - Interaktiv nyckelring */}
        {step === 5 && (
          <div className="animate-fade-in space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Laborera med nyckelringen! 🔬</h2>
              <p className="text-lg text-muted-foreground">
                Nu kan du experimentera med nyckelringen - lägg till och ta bort nycklar för att se hur åtkomsten fungerar.
              </p>
            </div>

            {/* Interaktiv nyckelring kontroll */}
            <Card className="p-6 bg-primary/5 border-primary">
              <h3 className="text-lg font-semibold mb-4">Nyckelring - Experimentpanel</h3>
              <KeyRingDisplay 
                recipients={accessList} 
                getKeyPair={(name) => {
                  if (name === "Alice") return alice || undefined;
                  if (name === "Bob") return bob || undefined;
                  if (name === "Charlie") return charlie || undefined;
                  return customRecipients.find(r => r.name === name)?.keyPair;
                }}
                interactive={true}
                onRemoveKey={async (name) => {
                  try {
                    await egendata.revokeAccess(DATA_ID, name);
                    const newAccessList = await getAccessListNames();
                    setAccessList(newAccessList);
                    
                    if (name === "Bob") {
                      setBobRevoked(true);
                      setBobDecrypted(null);
                    } else if (name === "Charlie") {
                      setCharlieRevoked(true);
                      setCharlieDecrypted(null);
                    }
                    
                    toast({
                      title: `${name} borttagen från nyckelringen`,
                      description: `${name} kan inte längre dekryptera datan`,
                    });
                  } catch (error) {
                    toast({
                      title: "Fel",
                      description: "Kunde inte ta bort nyckeln",
                      variant: "destructive",
                    });
                  }
                }}
                availableKeys={[
                  ...(bob ? [{ name: "Bob", keyPair: bob }] : []),
                  ...(charlie ? [{ name: "Charlie", keyPair: charlie }] : []),
                  ...customRecipients
                ]}
                onAddKey={async (name) => {
                  if (!alice) return;
                  
                  try {
                    let publicKey: CryptoKey;
                    
                    if (name === "Bob" && bob) {
                      publicKey = bob.publicKey;
                    } else if (name === "Charlie" && charlie) {
                      publicKey = charlie.publicKey;
                    } else {
                      const customRecipient = customRecipients.find(r => r.name === name);
                      if (!customRecipient) return;
                      publicKey = customRecipient.keyPair.publicKey;
                    }
                    
                    await egendata.reGrantAccess(
                      DATA_ID,
                      name,
                      publicKey,
                      alice.privateKey
                    );
                    
                    const newAccessList = await getAccessListNames();
                    setAccessList(newAccessList);
                    
                    if (name === "Bob") {
                      setBobRevoked(false);
                    } else if (name === "Charlie") {
                      setCharlieRevoked(false);
                    }
                    
                    toast({
                      title: `${name} tillagd i nyckelringen`,
                      description: `${name} kan nu dekryptera datan`,
                    });
                  } catch (error) {
                    toast({
                      title: "Fel",
                      description: "Kunde inte lägga till nyckeln",
                      variant: "destructive",
                    });
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-4">
                💡 Tips: Ta bort och lägg till nycklar för att se hur Bob och Charlie påverkas. 
                Alice nyckel kan inte tas bort eftersom hon är ägaren.
              </p>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ActorCard name="Alice" role="Data Owner" status="active">
                <Button onClick={handleReadAsAlice} variant="default" size="sm" className="w-full">
                  📖 Läs som Alice
                </Button>
              </ActorCard>

              <ActorCard name="Bob" role="Mottagare" status={
                bobDecrypted ? "success" : (accessList.includes("Bob") ? "default" : "revoked")
              }>
                <div className="space-y-4">
                  <div className="space-y-3 pb-3 border-b border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <QrCode className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Publik nyckel finns</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Lock className="w-4 h-4 text-warning" />
                      <span className="text-muted-foreground">Ser krypterad data från IPFS</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {accessList.includes("Bob") ? (
                        <>
                          <LockOpen className="w-4 h-4 text-success" />
                          <span className="text-success font-medium">Kan dekryptera (finns i nyckelring)</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-destructive" />
                          <span className="text-destructive font-medium">Kan EJ dekryptera (saknas i nyckelring)</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleReadAsBob} 
                    variant="default" 
                    size="sm" 
                    className="w-full"
                    disabled={!accessList.includes("Bob")}
                  >
                    📖 Läs som Bob
                  </Button>
                  {bobDecrypted && (
                    <DataDisplay
                      title="Bob läser data"
                      data={JSON.stringify(bobDecrypted, null, 2)}
                      variant="decrypted"
                    />
                  )}
                  {!accessList.includes("Bob") && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
                      ⚠️ Bobs nyckel finns inte i nyckelringen
                    </div>
                  )}
                </div>
              </ActorCard>
        
              <ActorCard name="Charlie" role="Mottagare" status={
                charlieDecrypted ? "success" : (accessList.includes("Charlie") ? "default" : "revoked")
              }>
                <div className="space-y-4">
                  <div className="space-y-3 pb-3 border-b border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <QrCode className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Publik nyckel finns</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Lock className="w-4 h-4 text-warning" />
                      <span className="text-muted-foreground">Ser krypterad data från IPFS</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {accessList.includes("Charlie") ? (
                        <>
                          <LockOpen className="w-4 h-4 text-success" />
                          <span className="text-success font-medium">Kan dekryptera (finns i nyckelring)</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-destructive" />
                          <span className="text-destructive font-medium">Kan EJ dekryptera (saknas i nyckelring)</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleReadAsCharlie} 
                    variant="default" 
                    size="sm" 
                    className="w-full"
                    disabled={!accessList.includes("Charlie")}
                  >
                    📖 Läs som Charlie
                  </Button>
                  {charlieDecrypted && (
                    <DataDisplay
                      title="Charlie läser data"
                      data={JSON.stringify(charlieDecrypted, null, 2)}
                      variant="decrypted"
                    />
                  )}
                  {!accessList.includes("Charlie") && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive">
                      ⚠️ Charlies nyckel finns inte i nyckelringen
                    </div>
                  )}
                </div>
              </ActorCard>
            </div>
            
            <Button variant="outline" onClick={() => setStep(0)}>
              Återställ berättelsen
            </Button>
          </div>
        )}

        {/* Avancerade funktioner - efter huvudberättelsen */}
        {step >= 1 && (
          <div className="animate-fade-in">
            <Card className="p-6 bg-muted/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Avancerade funktioner</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Dölj' : 'Visa'}
                </Button>
              </div>

              {showAdvanced && (
                <div className="space-y-6">
                  {/* IPFS Explorer länkar */}
                  {dataCID && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">IPFS Data Explorer</h4>
                      <IPFSLink 
                        cid={dataCID}
                        title="Krypterad data i IPFS"
                      />
                    </div>
                  )}

                  {/* Lägg till fler mottagare */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        Lägg till fler mottagare
                      </h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Namn på ny mottagare..."
                          value={newRecipientName}
                          onChange={(e) => setNewRecipientName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
                          className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
                        />
                        <Button onClick={handleAddRecipient} size="sm">
                          Lägg till
                        </Button>
                      </div>
                    </div>

                    {/* Lista över custom mottagare */}
                    {customRecipients.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Ytterligare mottagare ({customRecipients.length})
                        </h4>
                        <div className="space-y-2">
                          {customRecipients.map((recipient) => (
                            <Card key={recipient.name} className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-medium text-primary">
                                      {recipient.name[0].toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium">{recipient.name}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevokeCustomRecipient(recipient.name)}
                                  className="text-xs text-destructive hover:text-destructive"
                                >
                                  Återkalla
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Info om alla aktiva mottagare */}
                    <div className="pt-4 border-t border-border">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Alla aktiva mottagare
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {alice && (
                          <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                            Alice (Owner)
                          </span>
                        )}
                        {!bobRevoked && bob && (
                          <span className="px-2 py-1 text-xs bg-success/10 text-success rounded">
                            Bob
                          </span>
                        )}
                        {!charlieRevoked && charlie && (
                          <span className="px-2 py-1 text-xs bg-success/10 text-success rounded">
                            Charlie
                          </span>
                        )}
                        {customRecipients.map((r) => (
                          <span key={r.name} className="px-2 py-1 text-xs bg-success/10 text-success rounded">
                            {r.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Index;
