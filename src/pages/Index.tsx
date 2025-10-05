import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { UserCard } from "@/components/UserCard";
import { DataDisplay } from "@/components/DataDisplay";
import { StepIndicator } from "@/components/StepIndicator";
import { QRKeyDisplay } from "@/components/QRKeyDisplay";
import { QRKeyScanner } from "@/components/QRKeyScanner";
import { 
  generateKeyPair, 
  encryptWithSharedAccess, 
  decryptData, 
  revokeAccess,
  reGrantAccess,
  KeyPair,
  Keystone
} from "@/lib/crypto";
import { encodeKeyForQR, decodeKeyFromQR, validateKeyData } from "@/lib/qr-key-exchange";
import { Shield, PlayCircle, UserX, QrCode, ScanLine, UserPlus } from "lucide-react";
import * as jose from 'jose';

const Index = () => {
  const [step, setStep] = useState(0);
  const [alice, setAlice] = useState<KeyPair | null>(null);
  const [bob, setBob] = useState<KeyPair | null>(null);
  const [charlie, setCharlie] = useState<KeyPair | null>(null);
  
  const [originalData] = useState({
    name: "Alice",
    email: "alice@example.com",
    message: "Detta är min privata information!"
  });
  
  const [encryptedData, setEncryptedData] = useState<string>("");
  const [keystone, setKeystone] = useState<Keystone | null>(null);
  const [bobDecrypted, setBobDecrypted] = useState<object | null>(null);
  const [charlieDecrypted, setCharlieDecrypted] = useState<object | null>(null);
  const [charlieDecryptedAfterRevoke, setCharlieDecryptedAfterRevoke] = useState<object | null>(null);
  const [bobRevoked, setBobRevoked] = useState(false);
  const [bobFailedDecrypt, setBobFailedDecrypt] = useState(false);
  
  // QR code states
  const [showBobQR, setShowBobQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [bobQRData, setBobQRData] = useState<string>("");
  const [bobReGranted, setBobReGranted] = useState(false);

  const steps = ["Generera nycklar", "Kryptera", "Dekryptera", "Revoke Bob", "Verifiera"];

  const handleGenerateKeys = async () => {
    try {
      const aliceKeys = await generateKeyPair("Alice");
      const bobKeys = await generateKeyPair("Bob");
      const charlieKeys = await generateKeyPair("Charlie");
      
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
      const { encryptedData: encrypted, keystone: ks } = await encryptWithSharedAccess(
        originalData,
        [
          { name: "Bob", publicKey: bob.publicKey },
          { name: "Charlie", publicKey: charlie.publicKey }
        ]
      );
      
      setEncryptedData(encrypted);
      setKeystone(ks);
      setStep(2);
      
      toast({
        title: "Data krypterad!",
        description: "Bob och Charlie har nu åtkomst via keystone",
      });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte kryptera data",
        variant: "destructive",
      });
    }
  };

  const handleDecrypt = async () => {
    if (!bob || !charlie || !keystone || !encryptedData) return;
    
    try {
      const bobData = await decryptData(encryptedData, keystone, "Bob", bob.privateKey);
      const charlieData = await decryptData(encryptedData, keystone, "Charlie", charlie.privateKey);
      
      setBobDecrypted(bobData);
      setCharlieDecrypted(charlieData);
      setStep(3);
      
      toast({
        title: "Dekryptering lyckades!",
        description: "Både Bob och Charlie kunde läsa datan",
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
    if (!keystone) return;
    
    const newKeystone = revokeAccess(keystone, "Bob");
    setKeystone(newKeystone);
    setBobRevoked(true);
    setStep(4);
    
    toast({
      title: "Bobs åtkomst återkallad!",
      description: "Bob kan inte längre dekryptera datan",
    });
  };

  const handleVerifyCharlie = async () => {
    if (!charlie || !keystone || !encryptedData) return;
    
    try {
      const charlieData = await decryptData(encryptedData, keystone, "Charlie", charlie.privateKey);
      setCharlieDecryptedAfterRevoke(charlieData);
      setStep(5);
      
      toast({
        title: "Verifiering lyckades!",
        description: "Charlie kan fortfarande läsa datan efter Bobs revoke",
      });
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte dekryptera data",
        variant: "destructive",
      });
    }
  };

  const handleTestBobDecrypt = async () => {
    if (!bob || !keystone || !encryptedData) return;
    
    try {
      await decryptData(encryptedData, keystone, "Bob", bob.privateKey);
      // Om detta lyckas (vilket det inte borde), visa varning
      toast({
        title: "Oväntat resultat",
        description: "Bob kunde dekryptera - något är fel!",
        variant: "destructive",
      });
    } catch (error) {
      setBobFailedDecrypt(true);
      toast({
        title: "Dekryptering nekad! ✓",
        description: "Bob kan inte längre dekryptera datan efter revoke",
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
      description: "Bob kan nu visa sin QR-kod för Alice",
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
      
      if (keyData.name !== "Bob") {
        toast({
          title: "Fel användare",
          description: `QR-koden tillhör ${keyData.name}, inte Bob`,
          variant: "destructive",
        });
        return;
      }
      
      if (!alice || !keystone || !encryptedData) {
        toast({
          title: "Fel",
          description: "Saknar nödvändig data för att återge åtkomst",
          variant: "destructive",
        });
        return;
      }
      
      // Import Bob's public key from JWK
      const bobPublicKey = await jose.importJWK(keyData.publicKeyJWK, 'RSA-OAEP-256') as CryptoKey;
      
      // Re-grant access to Bob
      const newKeystone = await reGrantAccess(
        encryptedData,
        keystone,
        "Bob",
        bobPublicKey,
        alice.privateKey
      );
      
      setKeystone(newKeystone);
      setBobReGranted(true);
      
      toast({
        title: "Åtkomst återställd!",
        description: "Bob har nu åtkomst till datan igen",
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
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4 shadow-elevated">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Egendata Kryptering Demo
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            En interaktiv demonstration av delad kryptering med dynamisk åtkomstkontroll
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator steps={steps} currentStep={step} />

        {/* Main Content */}
        <div className="space-y-8">
          {/* Step 1: Generate Keys */}
          {step >= 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</span>
                Generera krypteringsnycklar
              </h2>
              
              {!alice ? (
                <Button onClick={handleGenerateKeys} size="lg" className="shadow-elevated">
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Generera nycklar för Alice, Bob & Charlie
                </Button>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  <UserCard
                    name="Alice"
                    hasAccess={true}
                    canDecrypt={true}
                    publicKeyPreview={JSON.stringify(alice.publicKeyJWK).substring(0, 50) + "..."}
                  />
                  <UserCard
                    name="Bob"
                    hasAccess={!bobRevoked}
                    canDecrypt={!bobRevoked && !!bobDecrypted}
                    publicKeyPreview={JSON.stringify(bob!.publicKeyJWK).substring(0, 50) + "..."}
                  />
                  <UserCard
                    name="Charlie"
                    hasAccess={true}
                    canDecrypt={!!charlieDecrypted}
                    publicKeyPreview={JSON.stringify(charlie!.publicKeyJWK).substring(0, 50) + "..."}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Encrypt */}
          {step >= 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</span>
                Kryptera Alices data
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <DataDisplay
                  title="Original data (Alice)"
                  data={JSON.stringify(originalData, null, 2)}
                  variant="original"
                />
                
                {encryptedData && (
                  <DataDisplay
                    title="Krypterad data"
                    data={encryptedData.substring(0, 200) + "..."}
                    isEncrypted
                    variant="encrypted"
                  />
                )}
              </div>
              
              {!encryptedData && (
                <Button onClick={handleEncrypt} size="lg" className="shadow-elevated">
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Kryptera och dela med Bob & Charlie
                </Button>
              )}
            </div>
          )}

          {/* Step 3: Decrypt */}
          {step >= 2 && !bobRevoked && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</span>
                Dekryptera data
              </h2>
              
              {!bobDecrypted ? (
                <Button onClick={handleDecrypt} size="lg" className="shadow-elevated">
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Låt Bob & Charlie dekryptera
                </Button>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <DataDisplay
                    title="Bobs dekrypterade data"
                    data={JSON.stringify(bobDecrypted, null, 2)}
                    variant="decrypted"
                  />
                  <DataDisplay
                    title="Charlies dekrypterade data"
                    data={JSON.stringify(charlieDecrypted, null, 2)}
                    variant="decrypted"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 4: Revoke Bob */}
          {step >= 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</span>
                Återkalla Bobs åtkomst
              </h2>
              
              {!bobRevoked ? (
                <Button onClick={handleRevokeBob} variant="destructive" size="lg" className="shadow-elevated">
                  <UserX className="w-5 h-5 mr-2" />
                  Återkalla Bobs åtkomst
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-3">
                      Bobs nyckel har tagits bort från keystone. Bob kan inte längre dekryptera datan.
                    </p>
                  </div>
                  
                  {!bobFailedDecrypt && (
                    <Button 
                      onClick={handleTestBobDecrypt} 
                      variant="outline" 
                      size="lg" 
                      className="shadow-card border-destructive/50 hover:bg-destructive/10"
                    >
                      <PlayCircle className="w-5 h-5 mr-2" />
                      Testa dekryptera med Bobs nyckel
                    </Button>
                  )}
                  
                  {bobFailedDecrypt && (
                    <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                      <p className="text-sm font-medium text-success">
                        ✓ Bekräftat: Bob kan inte längre dekryptera datan!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Verify Charlie */}
          {step >= 4 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-sm font-bold">5</span>
                Verifiera Charlies åtkomst
              </h2>
              
              {!charlieDecryptedAfterRevoke ? (
                <Button onClick={handleVerifyCharlie} size="lg" className="shadow-elevated">
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Verifiera att Charlie fortfarande kan dekryptera
                </Button>
              ) : (
                <DataDisplay
                  title="Charlies dekrypterade data (efter Bobs revoke)"
                  data={JSON.stringify(charlieDecryptedAfterRevoke, null, 2)}
                  variant="decrypted"
                />
              )}
            </div>
          )}

          {/* Step 6: QR Code Key Exchange */}
          {step >= 4 && bobRevoked && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-sm font-bold">6</span>
                Nyckelutbyte med QR-kod
              </h2>
              
              <p className="text-muted-foreground">
                Bob vill få tillgång igen. Bob visar sin publika nyckel via QR-kod och Alice scannar den för att återge åtkomst.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Bob generates QR code */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-primary" />
                    Steg 1: Bob visar sin nyckel
                  </h3>
                  
                  {!showBobQR ? (
                    <Button onClick={handleGenerateBobQR} size="lg" className="w-full shadow-card">
                      <QrCode className="w-5 h-5 mr-2" />
                      Generera Bobs QR-kod
                    </Button>
                  ) : (
                    <QRKeyDisplay qrData={bobQRData} userName="Bob" />
                  )}
                </div>
                
                {/* Alice scans QR code */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ScanLine className="w-4 h-4 text-accent" />
                    Steg 2: Alice scannar QR-koden
                  </h3>
                  
                  {!showScanner && !bobReGranted && (
                    <Button 
                      onClick={() => setShowScanner(true)} 
                      size="lg" 
                      className="w-full shadow-card"
                      variant="secondary"
                    >
                      <ScanLine className="w-5 h-5 mr-2" />
                      Skanna Bobs QR-kod
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
                      <div className="flex items-center gap-2 text-success mb-2">
                        <UserPlus className="w-5 h-5" />
                        <span className="font-semibold">Åtkomst återställd!</span>
                      </div>
                      <p className="text-sm text-success">
                        Bob har nu åtkomst till datan igen via QR-kod-utbyte
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
