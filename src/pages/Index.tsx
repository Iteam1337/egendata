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
import { ConceptExplainer } from "@/components/ConceptExplainer";
import { Footer } from "@/components/Footer";
import { EgendataClient, IPFSStorage, type KeyPair } from "@/lib/egendata";
import { encodeKeyForQR, decodeKeyFromQR, validateKeyData, qrKeyDataToJWK } from "@/lib/qr-key-exchange";
import { ArrowRight, Check, QrCode, ScanLine, Lock, LockOpen, User, X, Key, Database, Shield, Lightbulb } from "lucide-react";
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
    address: "Example Street 123, Stockholm"
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
  
  // Advanced features
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState("");
  const [customRecipients, setCustomRecipients] = useState<Array<{ name: string; keyPair: KeyPair }>>([]);

  const DATA_ID = "alice-sensitive-data";
  const steps = ["Alice has data", "Share with Bob", "Share with Charlie", "Revoke Bob", "Re-grant to Bob"];

  const getAccessListNames = async () => {
    try {
      const recipients = await egendata.listRecipients(DATA_ID);
      return recipients;
    } catch {
      return [];
    }
  };

  const [accessList, setAccessList] = useState<string[]>([]);

  // Initialize IPFS on mount
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      setIpfsInitializing(true);
      try {
        console.log('🔄 Initializing IPFS...');
        await ipfsStorage.initialize();
        
        if (mounted) {
          console.log('✅ IPFS initialized, loading existing mappings...');
          await ipfsStorage.restore();
          setIpfsReady(true);
          console.log('✅ IPFS fully ready!');
        }
      } catch (error) {
        console.error('❌ IPFS init failed:', error);
        if (mounted) {
          setIpfsError(error instanceof Error ? error.message : 'IPFS could not start');
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
        title: "Wait",
        description: "IPFS is still initializing...",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔑 Generating keys...');
      const aliceKeys = await egendata.generateKeyPair("Alice");
      const bobKeys = await egendata.generateKeyPair("Bob");
      const charlieKeys = await egendata.generateKeyPair("Charlie");
      
      setAlice(aliceKeys);
      setBob(bobKeys);
      setCharlie(charlieKeys);
      
      const result = await egendata.writeData(
        DATA_ID,
        originalData,
        "Alice",
        [{ name: "Alice", publicKey: aliceKeys.publicKey }]
      );
      
      setEncryptedData(result.encryptedData);
      
      const cid = ipfsStorage.getCID(DATA_ID);
      if (cid) {
        setDataCID(cid);
        console.log(`✅ Data stored with CID: ${cid}`);
      }
      
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);
      setStep(1);
      
      toast({
        title: "Alice created her data!",
        description: "Data is encrypted and only Alice can read it",
      });
    } catch (error) {
      console.error('❌ Key generation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not generate keys",
        variant: "destructive",
      });
    }
  };

  const handleShareWithBob = async () => {
    if (!alice || !bob) return;
    
    try {
      await egendata.reGrantAccess(DATA_ID, "Bob", bob.publicKey, alice.privateKey);
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);
      setStep(2);
      
      toast({
        title: "Access shared with Bob!",
        description: "Bob can now read Alice's data",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not share access",
        variant: "destructive",
      });
    }
  };

  const handleShareWithCharlie = async () => {
    if (!alice || !charlie) return;
    
    try {
      await egendata.reGrantAccess(DATA_ID, "Charlie", charlie.publicKey, alice.privateKey);
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);
      setStep(3);
      
      toast({
        title: "Access shared with Charlie!",
        description: "Charlie can now also read Alice's data",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not share access",
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
        title: "Access revoked!",
        description: "Alice removed Bob's access",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not revoke access",
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
        title: "Access revoked!",
        description: "Charlie can no longer decrypt the data",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not revoke access",
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
      title: "QR code generated!",
      description: "Bob can now share his key via QR code",
    });
  };

  const handleGenerateCharlieQR = () => {
    if (!charlie) return;
    
    const qrData = encodeKeyForQR("Charlie", charlie.publicKeyJWK);
    setCharlieQRData(qrData);
    setShowCharlieQR(true);
    
    toast({
      title: "QR code generated!",
      description: "Charlie can now share his key via QR code",
    });
  };

  const handleReadAsAlice = async () => {
    if (!alice || !encryptedData) return;
    
    try {
      const data = await egendata.readData(DATA_ID, "Alice", alice.privateKey);
      setAliceDecrypted(data);
      
      toast({
        title: "Data read as Alice!",
        description: "Alice can always read her own data",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Alice could not read the data",
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
        title: "Data read as Bob!",
        description: "Bob can read the data",
      });
    } catch (error) {
      setBobDecrypted(null);
      toast({
        title: "Access denied",
        description: "Bob does not have access to the data",
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
        title: "Data read as Charlie!",
        description: "Charlie can read the data",
      });
    } catch (error) {
      setCharlieDecrypted(null);
      toast({
        title: "Access denied",
        description: "Charlie does not have access to the data",
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
          title: "Invalid QR code",
          description: "QR code is too old or invalid",
          variant: "destructive",
        });
        return;
      }
      
      const { name, publicKeyJWK } = qrKeyDataToJWK(keyData);
      
      if (!alice) {
        toast({
          title: "Error",
          description: "Missing required data to re-grant access",
          variant: "destructive",
        });
        return;
      }
      
      const recipientPublicKey = await egendata.importPublicKey(publicKeyJWK);
      
      await egendata.reGrantAccess(DATA_ID, name, recipientPublicKey, alice.privateKey);
      
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
        title: "Access restored!",
        description: `${name} now has access to the data again via QR code`,
      });
    } catch (error) {
      console.error('QR scan error:', error);
      toast({
        title: "Scan error",
        description: "Could not read QR code correctly",
        variant: "destructive",
      });
    }
  };

  const handleAddRecipient = async () => {
    if (!newRecipientName.trim() || !alice) {
      toast({
        title: "Invalid name",
        description: "Enter a name for the new recipient",
        variant: "destructive",
      });
      return;
    }

    try {
      const newKeyPair = await egendata.generateKeyPair(newRecipientName);
      await egendata.reGrantAccess(DATA_ID, newRecipientName, newKeyPair.publicKey, alice.privateKey);
      
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);
      
      setCustomRecipients([...customRecipients, { name: newRecipientName, keyPair: newKeyPair }]);
      setNewRecipientName("");
      
      toast({
        title: "Recipient added!",
        description: `${newRecipientName} now has access to the data`,
      });
    } catch (error) {
      console.error('Add recipient error:', error);
      toast({
        title: "Error",
        description: "Could not add recipient",
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
        title: "Access revoked",
        description: `${recipientName} no longer has access`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not revoke access",
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
              <p className="text-sm italic font-serif text-muted-foreground">Interactive Demo:</p>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Decentralized Self-Sovereign Data
              </h2>
              <p className="text-lg text-muted-foreground">
                Follow Alice's story as she maintains full control over her sensitive data, sharing it securely via IPFS while retaining the power to grant and revoke access without needing permission or communication with recipients.
              </p>
            </div>

            <Card className="p-8 bg-muted/30">
              <h3 className="font-semibold text-lg mb-4">The Story</h3>
              <p className="text-muted-foreground mb-6">
                Alice has sensitive data she wants to store securely in IPFS. She decides to share it with Bob, 
                then also with Charlie. But when she changes her mind, she removes Bob's access. After some time, she 
                gives Bob another chance by scanning his QR code with the CID.
              </p>
              <Button 
                onClick={handleGenerateKeys} 
                size="lg" 
                className="w-full"
                disabled={!ipfsReady}
              >
                {ipfsInitializing ? 'Starting IPFS...' : 'Start the Story'} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Card>

            {/* Concept explainers at bottom for mobile */}
            <div className="space-y-4 mt-12">
              <ConceptExplainer 
                title="What is Self-Sovereign Data?" 
                icon={<Shield className="w-4 h-4" />}
              >
                <p>
                  <strong>Self-sovereign data</strong> means you own and control your data completely. Unlike traditional systems where companies or platforms control your information, self-sovereign systems give you:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Full ownership of your data</li>
                  <li>Complete control over who can access it</li>
                  <li>Ability to revoke access at any time</li>
                  <li>No dependence on centralized services</li>
                </ul>
              </ConceptExplainer>

              <ConceptExplainer 
                title="Why Decentralization Matters" 
                icon={<Database className="w-4 h-4" />}
              >
                <p>
                  Decentralized storage (like IPFS) ensures that:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>No single point of failure:</strong> Data exists across multiple nodes</li>
                  <li><strong>Censorship resistance:</strong> No central authority can block access</li>
                  <li><strong>Permanent addressing:</strong> Content-addressed by cryptographic hash (CID)</li>
                  <li><strong>Verifiable integrity:</strong> Any tampering changes the CID</li>
                </ul>
              </ConceptExplainer>
            </div>
          </div>
        )}

        {/* Step 1: Share with Bob */}
        {step === 1 && (
          <div className="animate-fade-in space-y-8">
            <Card className="p-6 bg-muted/30">
              <h3 className="font-semibold text-lg mb-4">Step 1: Share with Bob</h3>
              <p className="text-muted-foreground mb-4">
                Alice has encrypted her data and stored it in IPFS. Now she wants to share access with Bob.
              </p>
              <Button onClick={handleShareWithBob} disabled={!alice || !bob} className="mb-4">
                Share Access with Bob
              </Button>

              <div className="space-y-4">
                <ActorCard name="Alice" role="Data Owner" status="active" align="left" />
                <ActorCard name="Bob" role="Recipient" status="default" align="right" />
              </div>
            </Card>

            <ConceptExplainer 
              title="How Access Sharing Works" 
              icon={<Key className="w-4 h-4" />}
            >
              <p>
                When Alice shares access with Bob, she encrypts the data encryption key (DEK) with Bob's public key and adds it to the keyring. Bob can then decrypt the DEK with his private key to access the data.
              </p>
            </ConceptExplainer>
          </div>
        )}

        {/* Step 2: Share with Charlie */}
        {step === 2 && (
          <div className="animate-fade-in space-y-8">
            <Card className="p-6 bg-muted/30">
              <h3 className="font-semibold text-lg mb-4">Step 2: Share with Charlie</h3>
              <p className="text-muted-foreground mb-4">
                Alice decides to share her data with Charlie as well.
              </p>
              <Button onClick={handleShareWithCharlie} disabled={!alice || !charlie} className="mb-4">
                Share Access with Charlie
              </Button>

              <div className="space-y-4">
                <ActorCard name="Alice" role="Data Owner" status="active" align="left" />
                <ActorCard name="Bob" role="Recipient" status="success" align="right" />
                <ActorCard name="Charlie" role="Recipient" status="default" align="left" />
              </div>
            </Card>

            <ConceptExplainer 
              title="Keyring and Access Control" 
              icon={<Shield className="w-4 h-4" />}
            >
              <p>
                The keyring holds encrypted DEKs for each recipient. Adding Charlie means encrypting the DEK with Charlie's public key and adding it to the keyring, allowing multiple recipients to access the same encrypted data.
              </p>
            </ConceptExplainer>
          </div>
        )}

        {/* Step 3: Revoke Bob */}
        {step === 3 && (
          <div className="animate-fade-in space-y-8">
            <Card className="p-6 bg-muted/30">
              <h3 className="font-semibold text-lg mb-4">Step 3: Revoke Bob</h3>
              <p className="text-muted-foreground mb-4">
                Alice changes her mind and revokes Bob's access.
              </p>
              <Button onClick={handleRevokeBob} disabled={bobRevoked} className="mb-4">
                Revoke Bob's Access
              </Button>

              <div className="space-y-4">
                <ActorCard name="Alice" role="Data Owner" status="active" align="left" />
                <ActorCard name="Bob" role="Recipient" status="revoked" align="right" />
                <ActorCard name="Charlie" role="Recipient" status="success" align="left" />
              </div>
            </Card>

            <ConceptExplainer 
              title="Communication-less Revocation" 
              icon={<X className="w-4 h-4" />}
            >
              <p>
                Revoking access is done by removing Bob's entry from the keyring and updating the keystone. Bob cannot decrypt new versions of the data, and no communication with Bob is needed.
              </p>
            </ConceptExplainer>
          </div>
        )}

        {/* Step 4: Re-grant to Bob */}
        {step === 4 && (
          <div className="animate-fade-in space-y-8">
            <Card className="p-6 bg-muted/30">
              <h3 className="font-semibold text-lg mb-4">Step 4: Re-grant to Bob</h3>
              <p className="text-muted-foreground mb-4">
                Alice decides to give Bob another chance by scanning his QR code to restore access.
              </p>
              <Button onClick={() => { setShowScanner(true); setScanningFor("Bob"); }} className="mb-4">
                Scan Bob's QR Code
              </Button>

              <div className="space-y-4">
                <ActorCard name="Alice" role="Data Owner" status="active" align="left" />
                <ActorCard name="Bob" role="Recipient" status="default" align="right" />
                <ActorCard name="Charlie" role="Recipient" status="success" align="left" />
              </div>
            </Card>

            <ConceptExplainer 
              title="QR Code Key Exchange" 
              icon={<QrCode className="w-4 h-4" />}
            >
              <p>
                Bob shares his public key via a QR code. Alice scans it to import Bob's key and re-grant access by updating the keyring.
              </p>
            </ConceptExplainer>
          </div>
        )}

        {/* QR Code displays */}
        {showBobQR && bob && (
          <QRKeyDisplay qrData={bobQRData} userName="Bob" publicKeyJWK={bob.publicKeyJWK} />
        )}
        {showCharlieQR && charlie && (
          <QRKeyDisplay qrData={charlieQRData} userName="Charlie" publicKeyJWK={charlie.publicKeyJWK} />
        )}

        {/* QR Scanner */}
        {showScanner && (
          <QRKeyScanner 
            onScan={handleScanQR} 
            onClose={() => { setShowScanner(false); setScanningFor(null); }} 
          />
        )}

        {/* Data displays */}
        {(step >= 1) && (
          <div className="space-y-8">
            <Card className="p-6 bg-muted/30">
              <h3 className="font-semibold text-lg mb-4">Encrypted Data</h3>
              <DataDisplay title="Encrypted JSON" data={encryptedData} isEncrypted variant="encrypted" />
            </Card>

            <Card className="p-6 bg-muted/30">
              <h3 className="font-semibold text-lg mb-4">Decrypted Data</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Alice</h4>
                  <DataDisplay 
                    title="Decrypted Data" 
                    data={aliceDecrypted ? JSON.stringify(aliceDecrypted, null, 2) : "No data read yet"} 
                    variant="decrypted" 
                  />
                  <Button onClick={handleReadAsAlice} disabled={!alice || !encryptedData} className="mt-2 w-full">
                    Read as Alice
                  </Button>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Bob {bobRevoked && "(Revoked)"}</h4>
                  <DataDisplay 
                    title="Decrypted Data" 
                    data={bobDecrypted ? JSON.stringify(bobDecrypted, null, 2) : "No data read yet"} 
                    variant={bobRevoked ? "encrypted" : "decrypted"} 
                    isEncrypted={bobRevoked}
                  />
                  <Button onClick={handleReadAsBob} disabled={!bob || !encryptedData} className="mt-2 w-full">
                    Read as Bob
                  </Button>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Charlie {charlieRevoked && "(Revoked)"}</h4>
                  <DataDisplay 
                    title="Decrypted Data" 
                    data={charlieDecrypted ? JSON.stringify(charlieDecrypted, null, 2) : "No data read yet"} 
                    variant={charlieRevoked ? "encrypted" : "decrypted"} 
                    isEncrypted={charlieRevoked}
                  />
                  <Button onClick={handleReadAsCharlie} disabled={!charlie || !encryptedData} className="mt-2 w-full">
                    Read as Charlie
                  </Button>
                </div>
              </div>
            </Card>

            {/* Keyring display */}
            <Card className="p-6 bg-muted/30">
              <h3 className="font-semibold text-lg mb-4">Current Keyring</h3>
              <KeyRingDisplay 
                recipients={accessList} 
                getKeyPair={(name) => {
                  if (name === "Alice") return alice ?? undefined;
                  if (name === "Bob") return bob ?? undefined;
                  if (name === "Charlie") return charlie ?? undefined;
                  const custom = customRecipients.find(r => r.name === name);
                  return custom?.keyPair;
                }}
                interactive={true}
                onRemoveKey={async (name) => {
                  if (name === "Bob") {
                    await handleRevokeBob();
                  } else if (name === "Charlie") {
                    await handleRevokeCharlie();
                  } else {
                    await handleRevokeCustomRecipient(name);
                  }
                }}
                availableKeys={[
                  ...(alice ? [{ name: "Alice", keyPair: alice }] : []),
                  ...(bob ? [{ name: "Bob", keyPair: bob }] : []),
                  ...(charlie ? [{ name: "Charlie", keyPair: charlie }] : []),
                  ...customRecipients,
                ]}
                onAddKey={async (name) => {
                  if (!alice) return;
                  let keyPair: KeyPair | undefined;
                  if (name === "Bob") keyPair = bob ?? undefined;
                  else if (name === "Charlie") keyPair = charlie ?? undefined;
                  else keyPair = customRecipients.find(r => r.name === name)?.keyPair;
                  if (!keyPair) return;
                  try {
                    await egendata.reGrantAccess(DATA_ID, name, keyPair.publicKey, alice.privateKey);
                    const newAccessList = await getAccessListNames();
                    setAccessList(newAccessList);
                    toast({
                      title: "Access granted",
                      description: `${name} now has access`,
                    });
                  } catch {
                    toast({
                      title: "Error",
                      description: "Could not grant access",
                      variant: "destructive",
                    });
                  }
                }}
              />
            </Card>
          </div>
        )}

        {/* Advanced features section at bottom */}
        {step >= 1 && (
          <div className="animate-fade-in">
            <Card className="p-6 bg-muted/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Advanced Features</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Hide' : 'Show'}
                </Button>
              </div>

              {showAdvanced && (
                <div className="space-y-6">
                  {dataCID && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">IPFS Data Explorer</h4>
                      <IPFSLink 
                        cid={dataCID}
                        title="Encrypted data in IPFS"
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        Add more recipients
                      </h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Name of new recipient..."
                          value={newRecipientName}
                          onChange={(e) => setNewRecipientName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
                          className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
                        />
                        <Button onClick={handleAddRecipient} size="sm">
                          Add
                        </Button>
                      </div>
                    </div>

                    {customRecipients.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Additional recipients ({customRecipients.length})
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
                                  Revoke
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
