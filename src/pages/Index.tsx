import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ActorCard } from "@/components/ActorCard";
import { DataDisplay } from "@/components/DataDisplay";
import { DataEditor } from "@/components/DataEditor";
import { StepIndicator } from "@/components/StepIndicator";
import { QRKeyDisplay } from "@/components/QRKeyDisplay";
import { QRKeyScanner } from "@/components/QRKeyScanner";
import { IPFSStatus } from "@/components/IPFSStatus";
import { IPFSLink } from "@/components/IPFSLink";
import { ConceptExplainer } from "@/components/ConceptExplainer";
import { Footer } from "@/components/Footer";
import { ExplorePanel } from "@/components/ExplorePanel";
import { Header } from "@/components/Header";
import { EgendataClient, IPFSStorage, type KeyPair } from "@/lib/egendata";
import { encodeKeyForQR, decodeKeyFromQR, validateKeyData, qrKeyDataToJWK } from "@/lib/qr-key-exchange";
import {
  ArrowRight,
  Check,
  QrCode,
  ScanLine,
  Lock,
  LockOpen,
  User,
  X,
  Key,
  Database,
  Shield,
  Lightbulb,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { KeyRingDisplay } from "@/components/KeyRingDisplay";

const Index = () => {
  // IPFS Storage - use useRef to ensure stable instances
  const ipfsStorageRef = useRef<IPFSStorage>();
  const egendataRef = useRef<EgendataClient>();

  if (!ipfsStorageRef.current) {
    ipfsStorageRef.current = new IPFSStorage();
  }
  if (!egendataRef.current) {
    egendataRef.current = new EgendataClient(ipfsStorageRef.current);
  }

  const ipfsStorage = ipfsStorageRef.current;
  const egendata = egendataRef.current;

  const [ipfsReady, setIpfsReady] = useState(false);
  const [ipfsInitializing, setIpfsInitializing] = useState(false);
  const [ipfsError, setIpfsError] = useState<string>();

  const [step, setStep] = useState(0);
  const [alice, setAlice] = useState<KeyPair | null>(null);
  const [bob, setBob] = useState<KeyPair | null>(null);
  const [charlie, setCharlie] = useState<KeyPair | null>(null);

  const [originalData, setOriginalData] = useState({
    ssn: "19800101-1234",
    creditCard: "4111-1111-1111-1111",
    address: "Example Street 123, Stockholm",
  });

  const [encryptedData, setEncryptedData] = useState<string>("");
  const [dataCID, setDataCID] = useState<string>("");

  // Decrypted data for all actors
  const [decryptedDataMap, setDecryptedDataMap] = useState<Map<string, object>>(new Map());

  const [bobRevoked, setBobRevoked] = useState(false);
  const [charlieRevoked, setCharlieRevoked] = useState(false);

  // QR code states
  const [showBobQR, setShowBobQR] = useState(false);
  const [showCharlieQR, setShowCharlieQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanningFor, setScanningFor] = useState<"Bob" | "Charlie" | null>(null);
  const [bobQRData, setBobQRData] = useState<string>("");
  const [charlieQRData, setCharlieQRData] = useState<string>("");

  // Advanced features
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState("");
  const [customRecipients, setCustomRecipients] = useState<Array<{ name: string; keyPair: KeyPair }>>([]);

  // Explore panel state
  const [explorePanelOpen, setExplorePanelOpen] = useState(false);
  const [selectedActorForExplore, setSelectedActorForExplore] = useState<string | null>(null);

  const DATA_ID = "alice-sensitive-data";
  const steps = ["Alice's Data", "Share with Bob", "Share with Charlie", "Revoke Bob", "Re-grant via QR"];

  const getAccessListNames = async () => {
    try {
      const recipients = await egendata.listRecipients(DATA_ID);
      return recipients;
    } catch {
      return [];
    }
  };

  // Helper to get all actors including custom recipients
  const getAllActors = () => {
    const actors = [
      { name: "Alice", keyPair: alice, revoked: false },
      { name: "Bob", keyPair: bob, revoked: bobRevoked },
      { name: "Charlie", keyPair: charlie, revoked: charlieRevoked },
      ...customRecipients.map((r) => ({
        name: r.name,
        keyPair: r.keyPair,
        revoked: !accessList.includes(r.name),
      })),
    ];
    return actors.filter((a) => a.keyPair);
  };

  const [accessList, setAccessList] = useState<string[]>([]);

  // Initialize IPFS on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setIpfsInitializing(true);
      try {
        console.log("🔄 Initializing IPFS...");
        await ipfsStorage.initialize();

        if (mounted) {
          console.log("✅ IPFS initialized, loading existing mappings...");
          await ipfsStorage.restore();
          setIpfsReady(true);
          console.log("✅ IPFS fully ready!");
        }
      } catch (error) {
        console.error("❌ IPFS init failed:", error);
        if (mounted) {
          setIpfsError(error instanceof Error ? error.message : "IPFS could not start");
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
      // Don't stop IPFS on unmount - it should persist for the session
    };
  }, []); // Empty deps - only run once on mount

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
      console.log("🔑 Generating keys...");
      const aliceKeys = await egendata.generateKeyPair("Alice");
      const bobKeys = await egendata.generateKeyPair("Bob");
      const charlieKeys = await egendata.generateKeyPair("Charlie");

      setAlice(aliceKeys);
      setBob(bobKeys);
      setCharlie(charlieKeys);

      const result = await egendata.writeData(DATA_ID, originalData, "Alice", [
        { name: "Alice", publicKey: aliceKeys.publicKey },
      ]);

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
      console.error("❌ Key generation error:", error);
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
      setDecryptedDataMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete("Bob");
        return newMap;
      });
      
      // Uppdatera krypterad data och CID efter key rotation
      const newEncryptedData = await egendata.getRawEncryptedData(DATA_ID);
      if (newEncryptedData) {
        setEncryptedData(newEncryptedData);
      }
      const newCID = ipfsStorage.getCID(DATA_ID);
      if (newCID) {
        setDataCID(newCID);
      }
      
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);
      setStep(4);

      // Open explore panel instead of showing QR code
      setExplorePanelOpen(true);

      toast({
        title: "Access revoked!",
        description: "Alice removed Bob's access. Data has been re-encrypted with a new key.",
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
      setDecryptedDataMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete("Charlie");
        return newMap;
      });
      
      // Uppdatera krypterad data och CID efter key rotation
      const newEncryptedData = await egendata.getRawEncryptedData(DATA_ID);
      if (newEncryptedData) {
        setEncryptedData(newEncryptedData);
      }
      const newCID = ipfsStorage.getCID(DATA_ID);
      if (newCID) {
        setDataCID(newCID);
      }
      
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);

      toast({
        title: "Access revoked!",
        description: "Charlie's access removed. Data re-encrypted with new key.",
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

  const handleReadAsActor = async (actorName: string, privateKey: CryptoKey) => {
    if (!encryptedData) return;

    try {
      const data = await egendata.readData(DATA_ID, actorName, privateKey);
      setDecryptedDataMap((prev) => new Map(prev).set(actorName, data));

      toast({
        title: `Data read as ${actorName}!`,
        description: `${actorName} successfully decrypted the data`,
      });
    } catch (error) {
      setDecryptedDataMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(actorName);
        return newMap;
      });
      toast({
        title: "Access denied",
        description: `${actorName} does not have access to the data`,
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
      console.error("QR scan error:", error);
      toast({
        title: "Scan error",
        description: "Could not read QR code correctly",
        variant: "destructive",
      });
    }
  };

  const handleAddRecipient = async (recipientName: string) => {
    const trimmedName = recipientName.trim();
    
    if (!trimmedName || !alice) {
      toast({
        title: "Invalid name",
        description: "Enter a name for the new recipient",
        variant: "destructive",
      });
      return;
    }

    // Check if name already exists
    const existingNames = ["Alice", "Bob", "Charlie", ...customRecipients.map(r => r.name)];
    if (existingNames.includes(trimmedName)) {
      toast({
        title: "Name already exists",
        description: "Choose a different name for the recipient",
        variant: "destructive",
      });
      return;
    }

    try {
      const newKeyPair = await egendata.generateKeyPair(trimmedName);
      await egendata.reGrantAccess(DATA_ID, trimmedName, newKeyPair.publicKey, alice.privateKey);

      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);

      setCustomRecipients([...customRecipients, { name: trimmedName, keyPair: newKeyPair }]);

      toast({
        title: "Recipient added!",
        description: `${trimmedName} now has access to the data`,
      });
    } catch (error) {
      console.error("Add recipient error:", error);
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
      setCustomRecipients(customRecipients.filter((r) => r.name !== recipientName));
      setDecryptedDataMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(recipientName);
        return newMap;
      });
      
      // Uppdatera krypterad data och CID efter key rotation
      const newEncryptedData = await egendata.getRawEncryptedData(DATA_ID);
      if (newEncryptedData) {
        setEncryptedData(newEncryptedData);
      }
      const newCID = ipfsStorage.getCID(DATA_ID);
      if (newCID) {
        setDataCID(newCID);
      }
      
      const newAccessList = await getAccessListNames();
      setAccessList(newAccessList);

      toast({
        title: "Access revoked",
        description: `${recipientName} no longer has access. Data re-encrypted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not revoke access",
        variant: "destructive",
      });
    }
  };

  const handleUpdateData = async (newData: object) => {
    if (!alice) {
      toast({
        title: "Error",
        description: "Alice's keys are required to update data",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await egendata.updateData(DATA_ID, newData, "Alice");
      setOriginalData(newData as typeof originalData);
      setEncryptedData(result.encryptedData);
      
      const newCID = ipfsStorage.getCID(DATA_ID);
      if (newCID) {
        setDataCID(newCID);
      }

      // Clear all decrypted data to force re-read
      setDecryptedDataMap(new Map());

      toast({
        title: "Data updated!",
        description: "Data has been re-encrypted with the new content",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not update data",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header onOpenExplorer={() => setExplorePanelOpen(true)} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-8">

          {/* Step 0: Introduction */}
          {step === 0 && (
            <div className="animate-fade-in space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Shield className="w-4 h-4" />
                  Why egenDATA?
                </div>
                <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                  True Data Ownership with
                  <br />
                  Communication-less Access Control
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl">
                  egenDATA is a protocol for self-sovereign data management using the <strong>keystone pattern</strong>.
                  It enables you to encrypt data once, share it with multiple recipients, and revoke access
                  instantly—without needing to communicate with or get permission from recipients.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
                    <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold mb-2">Self-Sovereign</h3>
                  <p className="text-sm text-muted-foreground">
                    You own and control your data completely. No platform, company, or third party can access, share, or
                    revoke permissions without you.
                  </p>
                </Card>

                <Card className="p-5 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-3">
                    <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold mb-2">Decentralized</h3>
                  <p className="text-sm text-muted-foreground">
                    Data is stored on IPFS (or any immutable storage). No central server controls access or can censor
                    your data.
                  </p>
                </Card>

                <Card className="p-5 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                    <LockOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold mb-2">Communication-less</h3>
                  <p className="text-sm text-muted-foreground">
                    Revoke access instantly by updating the keystone. No need to notify recipients or wait for their
                    cooperation.
                  </p>
                </Card>
              </div>

              <Card className="p-8 bg-muted/30">
                <h3 className="font-semibold text-lg mb-4">Why This Demo?</h3>
                <p className="text-muted-foreground mb-6">
                  This interactive demo walks you through Alice's journey as she encrypts sensitive data, shares it with
                  Bob and Charlie via IPFS, revokes Bob's access without telling him, and later re-grants it using a QR
                  code. You'll see how the keystone pattern enables efficient access control without ever re-encrypting
                  the data.
                </p>

                <div className="bg-background/50 rounded-lg p-4 border border-border mb-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    <strong className="text-foreground">What you'll learn:</strong>
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span>How the keystone pattern separates data encryption from access control</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span>Why symmetric (AES) and asymmetric (RSA) encryption are combined</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span>How IPFS provides immutable, content-addressed storage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span>How access can be revoked without contacting recipients</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span>How QR codes enable peer-to-peer key exchange</span>
                    </li>
                  </ul>
                </div>

                <Button onClick={handleGenerateKeys} size="lg" className="w-full" disabled={!ipfsReady}>
                  {ipfsInitializing ? "Starting IPFS..." : "Start the Interactive Demo"}{" "}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Card>

              <StepIndicator steps={steps} currentStep={step} />

              {/* Concept explainers at bottom for mobile */}
              <div className="space-y-4 mt-12">
                <ConceptExplainer title="What is Self-Sovereign Data?" icon={<Shield className="w-4 h-4" />}>
                  <p>
                    <strong>Self-sovereign data</strong> means you own and control your data completely. Unlike
                    traditional systems where companies or platforms control your information, self-sovereign systems
                    give you:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Full ownership of your data</li>
                    <li>Complete control over who can access it</li>
                    <li>Ability to revoke access at any time</li>
                    <li>No dependence on centralized services</li>
                  </ul>
                </ConceptExplainer>

                <ConceptExplainer title="Why Decentralization Matters" icon={<Database className="w-4 h-4" />}>
                  <p>Decentralized storage (like IPFS) ensures that:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>
                      <strong>No single point of failure:</strong> Data exists across multiple nodes
                    </li>
                    <li>
                      <strong>Censorship resistance:</strong> No central authority can block access
                    </li>
                    <li>
                      <strong>Permanent addressing:</strong> Content-addressed by cryptographic hash (CID)
                    </li>
                    <li>
                      <strong>Verifiable integrity:</strong> Any tampering changes the CID
                    </li>
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
                  Alice has encrypted her data and stored it in IPFS. Now she wants to share access with Bob. The data
                  remains encrypted - only the access control changes.
                </p>
                <Button onClick={handleShareWithBob} disabled={!alice || !bob} className="mb-4">
                  Grant Access to Bob <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <DataEditor 
                  data={originalData} 
                  onSave={handleUpdateData}
                  disabled={!alice}
                />

                <div className="space-y-4 mt-6">
                  <ActorCard name="Alice" role="Data Owner" status="active" align="left">
                    <div className="space-y-3 mt-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold mb-2">Who can read Alice's data:</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
                            Alice
                          </span>
                        </div>
                      </div>
                      {alice && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReadAsActor("Alice", alice.privateKey)}
                          className="w-full"
                        >
                          <Lock className="w-4 h-4 mr-2" /> Read Data as Alice
                        </Button>
                      )}
                      {decryptedDataMap.has("Alice") && (
                        <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                          <p className="text-xs font-semibold text-success mb-2">✓ Decrypted Data:</p>
                          <pre className="text-xs font-mono overflow-x-auto">
                            {JSON.stringify(decryptedDataMap.get("Alice"), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </ActorCard>
                  <ActorCard name="Bob" role="Recipient" status="default" align="right">
                    <div className="space-y-3 mt-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold mb-2">Can Bob read Alice's data?</p>
                        <span className="text-xs px-2 py-1 bg-destructive/20 text-destructive rounded-full">
                          No - not in keyring yet
                        </span>
                      </div>
                    </div>
                  </ActorCard>
                </div>
              </Card>

              {/* Concept explainers at bottom for mobile */}
              <div className="space-y-4 mt-8">
                <ConceptExplainer title="The Keystone Pattern" icon={<Key className="w-4 h-4" />}>
                  <p>
                    The <strong>keystone pattern</strong> separates data encryption from access control:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>
                      <strong>Data Encryption Key (DEK):</strong> A symmetric AES-256-GCM key encrypts the actual data
                      once
                    </li>
                    <li>
                      <strong>Keystone:</strong> Contains the DEK wrapped (encrypted) separately for each recipient
                      using their RSA public key
                    </li>
                    <li>
                      <strong>Benefit:</strong> To grant access, only the keystone needs updating - the encrypted data
                      never changes
                    </li>
                  </ul>
                </ConceptExplainer>

                <ConceptExplainer title="Asymmetric vs Symmetric Encryption" icon={<Lock className="w-4 h-4" />}>
                  <p>This protocol uses both encryption types strategically:</p>
                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                      <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">Asymmetric (RSA-OAEP-256)</p>
                      <p className="text-sm">
                        For the keystone - wraps the DEK for each recipient. Slower but enables secure key exchange.
                      </p>
                    </div>
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                      <p className="font-semibold text-green-700 dark:text-green-300 mb-1">Symmetric (AES-GCM-256)</p>
                      <p className="text-sm">
                        For the actual data - fast encryption/decryption with authenticated encryption.
                      </p>
                    </div>
                  </div>
                </ConceptExplainer>
              </div>
            </div>
          )}

          {/* Step 2: Share with Charlie */}
          {step === 2 && (
            <div className="animate-fade-in space-y-8">
              <Card className="p-6 bg-muted/30">
                <h3 className="font-semibold text-lg mb-4">Step 2: Share with Charlie</h3>
                <p className="text-muted-foreground mb-4">
                  Alice can grant access to multiple recipients. Each gets their own wrapped copy of the DEK in the
                  keystone. The encrypted data itself remains unchanged on IPFS.
                </p>
                <Button onClick={handleShareWithCharlie} disabled={!alice || !charlie} className="mb-4">
                  Grant Access to Charlie <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <div className="space-y-4 mt-6">
                  <ActorCard name="Alice" role="Data Owner" status="active" align="left">
                    <div className="space-y-3 mt-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold mb-2">Who can read Alice's data:</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
                            Alice
                          </span>
                          <span className="text-xs px-2 py-1 bg-success/20 text-success rounded-full">
                            Bob ✓
                          </span>
                        </div>
                      </div>
                      {alice && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReadAsActor("Alice", alice.privateKey)}
                          className="w-full"
                        >
                          <Lock className="w-4 h-4 mr-2" /> Read Data as Alice
                        </Button>
                      )}
                    </div>
                  </ActorCard>
                  <ActorCard name="Bob" role="Recipient" status="success" align="right">
                    <div className="space-y-3 mt-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold mb-2">Can Bob read Alice's data?</p>
                        <span className="text-xs px-2 py-1 bg-success/20 text-success rounded-full">
                          Yes - Bob is in Alice's keyring ✓
                        </span>
                      </div>
                      {bob && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReadAsActor("Bob", bob.privateKey)}
                          className="w-full"
                        >
                          <Lock className="w-4 h-4 mr-2" /> Read Data as Bob
                        </Button>
                      )}
                      {decryptedDataMap.has("Bob") && (
                        <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                          <p className="text-xs font-semibold text-success mb-2">✓ Decrypted Data:</p>
                          <pre className="text-xs font-mono overflow-x-auto">
                            {JSON.stringify(decryptedDataMap.get("Bob"), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </ActorCard>
                  <ActorCard name="Charlie" role="Recipient" status="default" align="right">
                    <div className="space-y-3 mt-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold mb-2">Can Charlie read Alice's data?</p>
                        <span className="text-xs px-2 py-1 bg-destructive/20 text-destructive rounded-full">
                          No - not in keyring yet
                        </span>
                      </div>
                    </div>
                  </ActorCard>
                </div>
              </Card>

              {/* Concept explainers at bottom for mobile */}
              <div className="space-y-4 mt-8">
                <ConceptExplainer title="Granting Access Without Communication" icon={<Shield className="w-4 h-4" />}>
                  <p>Notice that Alice doesn't need to communicate with Bob or Charlie to grant them access:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>
                      Alice only needs their <strong>public keys</strong> (shareable without risk)
                    </li>
                    <li>She wraps the DEK with each recipient's public key</li>
                    <li>The updated keystone is stored on IPFS with a new CID</li>
                    <li>Recipients can fetch and decrypt whenever they want - no coordination needed</li>
                  </ul>
                </ConceptExplainer>

                <ConceptExplainer title="How the Keyring Works" icon={<Key className="w-4 h-4" />}>
                  <p>The keyring is a simple but powerful data structure:</p>
                  <div className="mt-2 p-3 bg-muted rounded-md font-mono text-xs">
                    {`{
  "Alice": "encrypted_DEK_for_Alice",
  "Bob": "encrypted_DEK_for_Bob",
  "Charlie": "encrypted_DEK_for_Charlie"
}`}
                  </div>
                  <p className="mt-3 text-sm">
                    Each recipient can only decrypt their own entry using their private key, which reveals the DEK they
                    need to decrypt the actual data.
                  </p>
                </ConceptExplainer>

                <ConceptExplainer title="Multiple Recipients" icon={<User className="w-4 h-4" />}>
                  <p>The keystone pattern scales efficiently to many recipients:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>
                      <strong>Data stored once:</strong> The encrypted data blob never changes
                    </li>
                    <li>
                      <strong>Keystone grows linearly:</strong> Only adds one entry per recipient
                    </li>
                    <li>
                      <strong>Independent access:</strong> Recipients don't know about each other
                    </li>
                    <li>
                      <strong>Selective revocation:</strong> Remove individual recipients without affecting others
                    </li>
                  </ul>
                </ConceptExplainer>

                <ConceptExplainer title="IPFS: Permanent, Addressable Storage" icon={<Database className="w-4 h-4" />}>
                  <p>IPFS (InterPlanetary File System) provides the perfect storage layer for this protocol:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>
                      <strong>Content addressing:</strong> Each file gets a unique CID based on its cryptographic hash
                    </li>
                    <li>
                      <strong>Immutability:</strong> Content cannot be changed without changing the CID
                    </li>
                    <li>
                      <strong>Decentralization:</strong> No central server controls access or availability
                    </li>
                    <li>
                      <strong>Verification:</strong> CID proves data integrity - tampering is detectable
                    </li>
                  </ul>
                  <p className="mt-3 text-sm italic">
                    When the keystone updates, a new CID is created. The old version remains accessible but recipients
                    need the new CID for current access.
                  </p>
                </ConceptExplainer>
              </div>
            </div>
          )}

          {/* Step 3: Revoke Bob */}
          {step === 3 && (
            <div className="animate-fade-in space-y-8">
              <Card className="p-6 bg-muted/30">
                <h3 className="font-semibold text-lg mb-4">Step 3: Revoke Bob's Access</h3>
                <p className="text-muted-foreground mb-4">
                  Alice changes her mind about Bob. She can instantly revoke his access without any communication.
                  Charlie's access remains unaffected.
                </p>
                <Button onClick={handleRevokeBob} disabled={bobRevoked} variant="destructive" className="mb-4">
                  <X className="w-4 h-4 mr-2" /> Revoke Bob's Access
                </Button>

                <div className="space-y-4 mt-6">
                  <ActorCard name="Alice" role="Data Owner" status="active" align="left">
                    <div className="space-y-3 mt-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold mb-2">Who can read Alice&apos;s data:</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
                            Alice
                          </span>
                          {!bobRevoked && (
                            <span className="text-xs px-2 py-1 bg-success/20 text-success rounded-full">
                              Bob ✓
                            </span>
                          )}
                          <span className="text-xs px-2 py-1 bg-success/20 text-success rounded-full">
                            Charlie ✓
                          </span>
                        </div>
                      </div>
                      {alice && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReadAsActor("Alice", alice.privateKey)}
                          className="w-full"
                        >
                          <Lock className="w-4 h-4 mr-2" /> Read Data as Alice
                        </Button>
                      )}
                    </div>
                  </ActorCard>
                  <ActorCard name="Bob" role={bobRevoked ? "Revoked" : "Has Access"} status={bobRevoked ? "revoked" : "success"} align="right">
                    <div className="space-y-3 mt-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold mb-2">Can Bob read Alice&apos;s data?</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${bobRevoked ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'}`}>
                          {bobRevoked ? 'No - removed from keyring' : 'Yes - still in keyring ✓'}
                        </span>
                      </div>
                      {bob && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReadAsActor("Bob", bob.privateKey)}
                          className="w-full"
                        >
                          <Lock className="w-4 h-4 mr-2" /> {bobRevoked ? 'Try Read as Bob' : 'Read Data as Bob'}
                        </Button>
                      )}
                      {decryptedDataMap.has("Bob") && (
                        <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                          <p className="text-xs font-semibold text-success mb-2">✓ Decrypted Data:</p>
                          <pre className="text-xs font-mono overflow-x-auto">
                            {JSON.stringify(decryptedDataMap.get("Bob"), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </ActorCard>
                  <ActorCard name="Charlie" role="Has Access" status="success" align="right">
                    <div className="space-y-3 mt-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold mb-2">Can Charlie read Alice's data?</p>
                        <span className="text-xs px-2 py-1 bg-success/20 text-success rounded-full">
                          Yes - Charlie is in Alice's keyring ✓
                        </span>
                      </div>
                      {charlie && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReadAsActor("Charlie", charlie.privateKey)}
                          className="w-full"
                        >
                          <Lock className="w-4 h-4 mr-2" /> Read Data as Charlie
                        </Button>
                      )}
                      {decryptedDataMap.has("Charlie") && (
                        <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                          <p className="text-xs font-semibold text-success mb-2">✓ Decrypted Data:</p>
                          <pre className="text-xs font-mono overflow-x-auto">
                            {JSON.stringify(decryptedDataMap.get("Charlie"), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </ActorCard>
                </div>
              </Card>

              {/* Concept explainers at bottom for mobile */}
              <div className="space-y-4 mt-8">
                <ConceptExplainer title="Communication-less Revocation" icon={<LockOpen className="w-4 h-4" />}>
                  <p>This is one of the most powerful features of the keystone pattern:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>
                      <strong>No notification needed:</strong> Bob doesn't need to be informed
                    </li>
                    <li>
                      <strong>No permission required:</strong> Alice doesn't need Bob's cooperation
                    </li>
                    <li>
                      <strong>Instant effect:</strong> Removal from keystone is immediate
                    </li>
                    <li>
                      <strong>Selective:</strong> Other recipients (Charlie) are unaffected
                    </li>
                  </ul>
                  <p className="mt-3 text-sm">
                    Alice simply removes Bob's entry from the keystone and stores the updated version on IPFS. The new
                    CID points to the version without Bob.
                  </p>
                </ConceptExplainer>

                <ConceptExplainer
                  title="Why This Matters: Real-World Scenarios"
                  icon={<Lightbulb className="w-4 h-4" />}
                >
                  <p>Communication-less revocation solves critical real-world problems:</p>
                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                      <p className="font-semibold mb-1">🏥 Healthcare</p>
                      <p className="text-sm">
                        Revoke a doctor's access to medical records when they leave the clinic - no need to contact
                        them.
                      </p>
                    </div>
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                      <p className="font-semibold mb-1">💼 Business</p>
                      <p className="text-sm">
                        Remove API access for a contractor immediately when contract ends - works even if they're
                        unreachable.
                      </p>
                    </div>
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                      <p className="font-semibold mb-1">🔒 Security</p>
                      <p className="text-sm">
                        In case of key compromise, revoke access instantly without depending on the compromised party.
                      </p>
                    </div>
                  </div>
                </ConceptExplainer>

                <ConceptExplainer title="What Happens Under the Hood" icon={<Database className="w-4 h-4" />}>
                  <p className="font-semibold mb-2">Revocation Flow:</p>
                  <ol className="list-decimal pl-5 space-y-2 text-sm">
                    <li>Alice fetches the current keystone from IPFS</li>
                    <li>She removes Bob's entry from the keyring</li>
                    <li>
                      The updated keystone is stored on IPFS → <strong>new CID created</strong>
                    </li>
                    <li>Alice shares the new CID with authorized recipients (Charlie)</li>
                    <li>Bob still has the old CID, but it points to outdated access control</li>
                  </ol>
                  <p className="mt-3 text-sm italic">
                    Note: Bob can still decrypt data using the old CID/keystone if he cached it. For true forward
                    secrecy, data should be re-encrypted with a new DEK. This demo focuses on the access control
                    mechanism.
                  </p>
                </ConceptExplainer>
              </div>
            </div>
          )}

          {/* Step 4: Re-grant to Bob via manual key exchange */}
          {step === 4 && (
            <div className="animate-fade-in space-y-8">
              <Card className="p-6 bg-muted/30">
                <h3 className="font-semibold text-lg mb-4">Step 4: Re-grant Access Manually</h3>
                <p className="text-muted-foreground mb-6">
                  Alice decides to give Bob another chance. To restore Bob&apos;s access, Alice needs to add Bob&apos;s public key back to her keyring.
                </p>

                <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    How to restore Bob&apos;s access:
                  </h4>
                  <ol className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-semibold mt-0.5">1.</span>
                      <span>Click <strong>&quot;Explore Data&quot;</strong> button in the top right corner</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-semibold mt-0.5">2.</span>
                      <span>Find <strong>Bob</strong> in the node list and click <strong>Copy</strong> to copy his public key</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-semibold mt-0.5">3.</span>
                      <span>Find <strong>Alice</strong> in the node list and click <strong>Paste</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-semibold mt-0.5">4.</span>
                      <span>Paste Bob&apos;s key and click <strong>Grant Access</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-semibold mt-0.5">5.</span>
                      <span>Bob now has access again!</span>
                    </li>
                  </ol>
                </div>

                <Button
                  onClick={() => setExplorePanelOpen(true)}
                  className="w-full"
                  size="lg"
                >
                  <Database className="w-4 h-4 mr-2" /> Open Explore Data
                </Button>


                <div className="space-y-4 mt-6">
                  <ActorCard name="Alice" role="Data Owner" status="active" align="left">
                    <div className="space-y-3 mt-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold mb-2">Who can read Alice's data:</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
                            Alice
                          </span>
                          <span className="text-xs px-2 py-1 bg-success/20 text-success rounded-full">
                            Charlie ✓
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Bob was removed from keyring
                        </p>
                      </div>
                      {alice && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReadAsActor("Alice", alice.privateKey)}
                          className="w-full"
                        >
                          <Lock className="w-4 h-4 mr-2" /> Read Data as Alice
                        </Button>
                      )}
                    </div>
                  </ActorCard>
                  <ActorCard name="Bob" role="Wants Access" status="default" align="right">
                    <div className="space-y-3 mt-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold mb-2">Can Bob read Alice's data?</p>
                        <span className="text-xs px-2 py-1 bg-destructive/20 text-destructive rounded-full">
                          No - removed from keyring
                        </span>
                      </div>
                    </div>
                  </ActorCard>
                  <ActorCard name="Charlie" role="Has Access" status="success" align="right">
                    <div className="space-y-3 mt-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold mb-2">Can Charlie read Alice's data?</p>
                        <span className="text-xs px-2 py-1 bg-success/20 text-success rounded-full">
                          Yes - still in Alice's keyring ✓
                        </span>
                      </div>
                      {charlie && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReadAsActor("Charlie", charlie.privateKey)}
                          className="w-full"
                        >
                          <Lock className="w-4 h-4 mr-2" /> Read Data as Charlie
                        </Button>
                      )}
                      {decryptedDataMap.has("Charlie") && (
                        <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                          <p className="text-xs font-semibold text-success mb-2">✓ Decrypted Data:</p>
                          <pre className="text-xs font-mono overflow-x-auto">
                            {JSON.stringify(decryptedDataMap.get("Charlie"), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </ActorCard>
                </div>
              </Card>

              {/* Concept explainers at bottom for mobile */}
              <div className="space-y-4 mt-8">
                <ConceptExplainer title="Peer-to-Peer Key Exchange" icon={<QrCode className="w-4 h-4" />}>
                  <p>QR codes enable secure, offline key exchange between parties:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>
                      <strong>Public keys only:</strong> QR code contains Bob's public key (safe to share)
                    </li>
                    <li>
                      <strong>No central server:</strong> Keys are exchanged directly between devices
                    </li>
                    <li>
                      <strong>Offline capable:</strong> Works without internet connection
                    </li>
                    <li>
                      <strong>Human-verifiable:</strong> Name is included for manual verification
                    </li>
                  </ul>
                </ConceptExplainer>

                <ConceptExplainer title="QR Code Format & Security" icon={<Shield className="w-4 h-4" />}>
                  <p>The QR code uses Base45 encoding with CBOR compression:</p>
                  <div className="mt-2 space-y-2 text-sm">
                    <p>
                      <strong>Structure:</strong>
                    </p>
                    <div className="p-3 bg-muted rounded-md font-mono text-xs overflow-x-auto">
                      {`HC1:  // Health Certificate v1 prefix
{
  "n": "Bob",          // Name
  "k": {...},          // JWK public key
  "t": 1704067200000   // Timestamp
}`}
                    </div>
                    <p className="mt-2">
                      <strong>Timestamp validation:</strong> QR codes older than 1 hour are rejected to prevent replay
                      attacks.
                    </p>
                  </div>
                </ConceptExplainer>

                <ConceptExplainer title="Interactive Keyring Experimentation" icon={<Key className="w-4 h-4" />}>
                  <p>
                    After completing this step, scroll down to the <strong>Current Keyring</strong> section below to
                    experiment:
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Remove Charlie and try reading as Charlie (access denied)</li>
                    <li>Add Charlie back and verify access is restored</li>
                    <li>Add custom recipients and test their access</li>
                    <li>Observe how the keyring updates in real-time</li>
                  </ul>
                  <p className="mt-3 text-sm italic">
                    This interactive keyring demonstrates how access control is completely in Alice's hands.
                  </p>
                </ConceptExplainer>
              </div>
            </div>
          )}

          {/* Step 5: Completed - Free experimentation */}
          {step === 5 && (
            <div className="animate-fade-in space-y-8">
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Demo Complete!</h3>
                </div>

                <p className="text-muted-foreground mb-4">
                  You've seen the full cycle: encryption, access granting, revocation, and re-granting via QR code.
                </p>

                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    Now Experiment!
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span>
                        Use the <strong>Current Keyring</strong> below to add/remove recipients
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span>Try reading data as different actors after changing access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span>
                        Expand <strong>Advanced Features</strong> to add custom recipients
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span>Check the IPFS links to see the actual encrypted data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span>
                        Read the{" "}
                        <a href="/rfc" className="text-primary hover:underline">
                          RFC
                        </a>{" "}
                        for technical details
                      </span>
                    </li>
                  </ul>
                </div>
              </Card>

              {/* Actor cards for continued experimentation */}
              <div className="space-y-4">
                <ActorCard name="Alice" role="Data Owner" status="active" align="left">
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Keyring:</span>
                      <span className="font-mono text-xs">{accessList.join(", ")}</span>
                    </div>
                    {alice && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReadAsActor("Alice", alice.privateKey)}
                        className="w-full"
                      >
                        <Lock className="w-4 h-4 mr-2" /> Read Data as Alice
                      </Button>
                    )}
                    {decryptedDataMap.has("Alice") && (
                      <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                        <p className="text-xs font-semibold text-success mb-2">✓ Decrypted Data:</p>
                        <pre className="text-xs font-mono overflow-x-auto">
                          {JSON.stringify(decryptedDataMap.get("Alice"), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </ActorCard>

                <ActorCard name="Bob" role="Recipient" status={bobRevoked ? "revoked" : "success"} align="right">
                  <div className="space-y-3 mt-4">
                    {bob && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReadAsActor("Bob", bob.privateKey)}
                        className="w-full"
                      >
                        <Lock className="w-4 h-4 mr-2" /> Read Data as Bob
                      </Button>
                    )}
                    {decryptedDataMap.has("Bob") && (
                      <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                        <p className="text-xs font-semibold text-success mb-2">✓ Decrypted Data:</p>
                        <pre className="text-xs font-mono overflow-x-auto">
                          {JSON.stringify(decryptedDataMap.get("Bob"), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </ActorCard>

                <ActorCard name="Charlie" role="Recipient" status={charlieRevoked ? "revoked" : "success"} align="right">
                  <div className="space-y-3 mt-4">
                    {charlie && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReadAsActor("Charlie", charlie.privateKey)}
                        className="w-full"
                      >
                        <Lock className="w-4 h-4 mr-2" /> Read Data as Charlie
                      </Button>
                    )}
                    {decryptedDataMap.has("Charlie") && (
                      <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                        <p className="text-xs font-semibold text-success mb-2">✓ Decrypted Data:</p>
                        <pre className="text-xs font-mono overflow-x-auto">
                          {JSON.stringify(decryptedDataMap.get("Charlie"), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </ActorCard>

                {/* Custom Recipients */}
                {customRecipients.map((recipient) => {
                  const isRevoked = !accessList.includes(recipient.name);
                  return (
                    <ActorCard 
                      key={recipient.name}
                      name={recipient.name} 
                      role="Custom Recipient" 
                      status={isRevoked ? "revoked" : "success"} 
                      align="right"
                    >
                      <div className="space-y-3 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReadAsActor(recipient.name, recipient.keyPair.privateKey)}
                          className="w-full"
                        >
                          <Lock className="w-4 h-4 mr-2" /> Read Data as {recipient.name}
                        </Button>
                        {decryptedDataMap.has(recipient.name) && (
                          <div className="p-3 bg-success/10 border border-success/20 rounded-md">
                            <p className="text-xs font-semibold text-success mb-2">✓ Decrypted Data:</p>
                            <pre className="text-xs font-mono overflow-x-auto">
                              {JSON.stringify(decryptedDataMap.get(recipient.name), null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </ActorCard>
                  );
                })}
              </div>


              {/* Summary explainer */}
              <ConceptExplainer
                title="What You've Learned"
                icon={<Lightbulb className="w-4 h-4" />}
                defaultExpanded={true}
              >
                <div className="space-y-3">
                  <p className="font-semibold">The egenDATA protocol demonstrates:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Self-Sovereign Data:</strong> Alice has complete control over her data. No platform or
                      third party can grant or revoke access without her permission.
                    </li>
                    <li>
                      <strong>Decentralized Storage:</strong> IPFS ensures data is stored without central servers,
                      making it censorship-resistant and permanently addressable.
                    </li>
                    <li>
                      <strong>Keystone Pattern:</strong> Separating data encryption (AES) from access control (RSA
                      keystone) enables efficient multi-recipient access without re-encrypting data.
                    </li>
                    <li>
                      <strong>Communication-less Revocation:</strong> Access can be revoked instantly without contacting
                      or getting permission from recipients.
                    </li>
                    <li>
                      <strong>Peer-to-Peer Key Exchange:</strong> QR codes enable secure, offline key sharing for
                      re-granting access.
                    </li>
                  </ul>
                  <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm">
                      <strong>Storage Agnostic:</strong> While this demo uses IPFS, the protocol can work with any
                      immutable, decentralized storage system (e.g., Arweave, Filecoin, or even BitTorrent). The only
                      requirements are <strong>immutability</strong> and <strong>content addressing</strong>.
                    </p>
                  </div>
                </div>
              </ConceptExplainer>
            </div>
          )}

          {/* QR Code displays */}
          {showBobQR && bob && <QRKeyDisplay qrData={bobQRData} userName="Bob" publicKeyJWK={bob.publicKeyJWK} />}
          {showCharlieQR && charlie && (
            <QRKeyDisplay qrData={charlieQRData} userName="Charlie" publicKeyJWK={charlie.publicKeyJWK} />
          )}

          {/* QR Scanner */}
          {showScanner && (
            <QRKeyScanner
              onScan={handleScanQR}
              onClose={() => {
                setShowScanner(false);
                setScanningFor(null);
              }}
            />
          )}

          {/* Advanced features section at bottom */}
          {step >= 1 && (
            <div className="animate-fade-in">
              <Card className="p-6 bg-muted/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Advanced Features</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
                    {showAdvanced ? "Hide" : "Show"}
                  </Button>
                </div>

                {showAdvanced && (
                  <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                      Advanced features and IPFS information are available in the Explore Data panel.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* IPFS Status above Footer */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <IPFSStatus isInitialized={ipfsReady} isInitializing={ipfsInitializing} error={ipfsError} />
      </div>

      <Footer />

      {/* Explore Panel */}
      <ExplorePanel
        isOpen={explorePanelOpen}
        onClose={() => {
          setExplorePanelOpen(false);
          setSelectedActorForExplore(null);
        }}
        encryptedData={encryptedData}
        onReadAsActor={handleReadAsActor}
        onGenerateQR={(actorName: string) => {
          let keyPair: KeyPair | undefined;
          if (actorName === "Alice") keyPair = alice ?? undefined;
          else if (actorName === "Bob") keyPair = bob ?? undefined;
          else if (actorName === "Charlie") keyPair = charlie ?? undefined;
          else keyPair = customRecipients.find((r) => r.name === actorName)?.keyPair;
          
          if (keyPair) {
            return encodeKeyForQR(actorName, keyPair.publicKeyJWK);
          }
          return "";
        }}
        onScanQR={handleScanQR}
        selectedActor={
          selectedActorForExplore
            ? {
                name: selectedActorForExplore,
                keyPair:
                  selectedActorForExplore === "Alice"
                    ? alice
                    : selectedActorForExplore === "Bob"
                    ? bob
                    : selectedActorForExplore === "Charlie"
                    ? charlie
                    : customRecipients.find((r) => r.name === selectedActorForExplore)?.keyPair ?? null,
                hasAccess: accessList.includes(selectedActorForExplore),
                decryptedData: decryptedDataMap.get(selectedActorForExplore),
              }
            : null
        }
        dataCID={dataCID}
        accessList={accessList}
        allActors={[
          ...(alice ? [{ name: "Alice", keyPair: alice }] : []),
          ...(bob ? [{ name: "Bob", keyPair: bob }] : []),
          ...(charlie ? [{ name: "Charlie", keyPair: charlie }] : []),
          ...customRecipients.map((r) => ({ name: r.name, keyPair: r.keyPair })),
        ]}
        onRemoveKey={async (name) => {
          if (name === "Bob") {
            await handleRevokeBob();
          } else if (name === "Charlie") {
            await handleRevokeCharlie();
          } else {
            await handleRevokeCustomRecipient(name);
          }
        }}
        onAddKey={async (name) => {
          if (!alice) return;
          let keyPair: KeyPair | undefined;
          if (name === "Bob") keyPair = bob ?? undefined;
          else if (name === "Charlie") keyPair = charlie ?? undefined;
          else keyPair = customRecipients.find((r) => r.name === name)?.keyPair;
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
        onAddRecipient={handleAddRecipient}
        originalData={originalData}
        onUpdateData={handleUpdateData}
      />
    </div>
  );
};

export default Index;
