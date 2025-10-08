import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Package, Download, Key, Lock, Database, Check } from "lucide-react";
import { Link } from "react-router-dom";

const GetStarted = () => {

  const codeExamples = {
    install: `npm install @egendata/core jose`,
    basic: `import { EgendataClient, InMemoryStorage } from '@egendata/core';

// Initialize client
const client = new EgendataClient(new InMemoryStorage());

// Generate key pairs
const aliceKeys = await client.generateKeyPair('Alice');
const bobKeys = await client.generateKeyPair('Bob');

// Write encrypted data
await client.writeData(
  'medical-record-1',
  { diagnosis: 'Healthy', date: '2024-01-15' },
  'Alice',
  [
    { name: 'Alice', publicKey: aliceKeys.publicKey },
    { name: 'Bob', publicKey: bobKeys.publicKey }
  ]
);

// Read data
const data = await client.readData(
  'medical-record-1',
  'Bob',
  bobKeys.privateKey
);`,
    ipfs: `import { EgendataClient, IPFSStorage } from '@egendata/core';

const storage = new IPFSStorage();
await storage.initialize();

const client = new EgendataClient(storage);

// Data lagras nu på IPFS
const { cid } = await client.writeData(/* ... */);
console.log('Data lagrat på CID:', cid);`,
    revoke: `// Återkalla åtkomst omedelbart
await client.revokeAccess('medical-record-1', 'Bob');

// Bob kan inte längre dekryptera datan
// Ingen kommunikation med Bob krävs!`
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header onOpenExplorer={() => window.location.href = '/'} />
      
      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">@egendata/core v0.1.0</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Kom igång med egenDATA
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Ett decentraliserat protokoll för självsuverän datahantering med keystone-mönstret.
            Kryptera, dela och återkalla åtkomst utan att kommunicera med mottagarna.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/">
                <Code className="w-4 h-4 mr-2" />
                Prova demo
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/rfc">Läs dokumentation</Link>
            </Button>
          </div>
        </div>

        {/* Key Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-2">
            <CardHeader>
              <Lock className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Kommunikationslös åtkomstkontroll</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Återkalla åtkomst omedelbart utan att behöva kontakta mottagarna
            </CardContent>
          </Card>
          
          <Card className="border-2">
            <CardHeader>
              <Database className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Decentraliserad lagring</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Lagra data på IPFS för permanent, distribuerad åtkomst
            </CardContent>
          </Card>
          
          <Card className="border-2">
            <CardHeader>
              <Key className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Keystone-mönstret</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Effektiv multi-mottagare kryptering med omedelbar återkallelse
            </CardContent>
          </Card>
        </div>

        {/* Installation */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              1. Installation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm">
              {codeExamples.install}
            </div>
          </CardContent>
        </Card>

        {/* Basic Usage */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              2. Grundläggande användning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Skapa en klient, generera nyckelpar och kryptera data för flera mottagare:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre">
              {codeExamples.basic}
            </div>
          </CardContent>
        </Card>

        {/* Access Control */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              3. Åtkomstkontroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Återkalla åtkomst omedelbart utan kommunikation:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre">
              {codeExamples.revoke}
            </div>
          </CardContent>
        </Card>

        {/* IPFS Storage */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              4. Decentraliserad lagring med IPFS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Använd IPFS för permanent, decentraliserad datalagring:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre">
              {codeExamples.ipfs}
            </div>
          </CardContent>
        </Card>

        {/* API Overview */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle>API-översikt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Nyckelhantering
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">generateKeyPair(name)</code> - Generera RSA nyckelpar</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">getKeyPair(name)</code> - Hämta sparat nyckelpar</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">importPublicKey(jwk)</code> - Importera publik nyckel</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Datahantering
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">writeData(id, data, owner, recipients)</code> - Kryptera och spara data</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">readData(id, recipient, privateKey)</code> - Dekryptera data</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">updateData(id, newData, owner)</code> - Uppdatera data</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">deleteData(id)</code> - Ta bort data</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Åtkomstkontroll
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">revokeAccess(id, recipient)</code> - Återkalla åtkomst</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">reGrantAccess(id, recipient, publicKey, privateKey)</code> - Återge åtkomst</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">listRecipients(id)</code> - Lista mottagare</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="border-2 border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>Nästa steg</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Utforska den <Link to="/" className="text-primary hover:underline">interaktiva demon</Link> för att se protokollet i aktion</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Läs den <Link to="/rfc" className="text-primary hover:underline">fullständiga RFC-dokumentationen</Link> för tekniska detaljer</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Kolla in <a href="https://github.com" className="text-primary hover:underline">GitHub-repot</a> för källkod och exempel</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Testa med IPFS-lagring för decentraliserad datalagring</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default GetStarted;
