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
            Get Started with egenDATA
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            A decentralized protocol for self-sovereign data management with the keystone pattern.
            Encrypt, share, and revoke access without communicating with recipients—built on cryptographic principles for maximum security.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/">
                <Code className="w-4 h-4 mr-2" />
                Try Demo
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/rfc">Read Documentation</Link>
            </Button>
          </div>
        </div>

        {/* Key Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-2">
            <CardHeader>
              <Lock className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Communication-less Access Control</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Revoke access instantly using cryptographic re-keying without contacting recipients
            </CardContent>
          </Card>
          
          <Card className="border-2">
            <CardHeader>
              <Database className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Decentralized Storage</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Store encrypted data on IPFS for permanent, tamper-proof distributed access
            </CardContent>
          </Card>
          
          <Card className="border-2">
            <CardHeader>
              <Key className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Keystone Pattern</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Efficient multi-recipient encryption with instant revocation using industry-standard algorithms
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
              2. Basic Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Create a client, generate key pairs, and encrypt data for multiple recipients with end-to-end encryption:
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
              3. Secure Access Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Revoke access instantly without communication—cryptographically enforced:
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
              4. Decentralized Storage with IPFS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Use IPFS for permanent, tamper-proof, decentralized data storage:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre">
              {codeExamples.ipfs}
            </div>
          </CardContent>
        </Card>

        {/* API Overview */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle>API Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Key Management
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">generateKeyPair(name)</code> - Generate RSA-OAEP 2048-bit key pair</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">getKeyPair(name)</code> - Retrieve stored key pair</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">importPublicKey(jwk)</code> - Import public key from JWK format</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Data Management
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">writeData(id, data, owner, recipients)</code> - Encrypt with AES-256-GCM and store</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">readData(id, recipient, privateKey)</code> - Decrypt data securely</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">updateData(id, newData, owner)</code> - Update with automatic re-encryption</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">deleteData(id)</code> - Permanently remove data</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Access Control
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">revokeAccess(id, recipient)</code> - Instant cryptographic revocation</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">reGrantAccess(id, recipient, publicKey, privateKey)</code> - Re-grant access</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">listRecipients(id)</code> - List authorized recipients</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="border-2 border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Explore the <Link to="/" className="text-primary hover:underline">interactive demo</Link> to see the protocol in action</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Read the <Link to="/rfc" className="text-primary hover:underline">complete RFC documentation</Link> for security specifications</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Check out the <a href="https://github.com" className="text-primary hover:underline">GitHub repository</a> for source code and examples</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Review security best practices for key storage and management in production environments</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary mt-0.5" />
                <span>Test with IPFS storage for decentralized, censorship-resistant data storage</span>
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
