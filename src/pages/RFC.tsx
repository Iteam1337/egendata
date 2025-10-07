import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Footer } from "@/components/Footer";

const RFC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Demo
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Technical Specification</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-slate max-w-none">
          {/* Title */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              RFC: Egendata Protocol
            </h1>
            <p className="text-xl text-muted-foreground">
              Decentralized Self-Sovereign Data Sharing
            </p>
            <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
              <span>Version: 1.0</span>
              <span>•</span>
              <span>Status: Draft</span>
              <span>•</span>
              <span>Date: 2025-01-07</span>
            </div>
          </div>

          {/* Table of Contents */}
          <Card className="p-6 mb-12 bg-muted/30">
            <h2 className="text-lg font-semibold mb-4">Table of Contents</h2>
            <nav className="space-y-2 text-sm">
              <a href="#abstract" className="block text-primary hover:underline">1. Abstract</a>
              <a href="#introduction" className="block text-primary hover:underline">2. Introduction</a>
              <a href="#architecture" className="block text-primary hover:underline">3. Architecture</a>
              <a href="#storage" className="block text-primary hover:underline">4. Storage Requirements</a>
              <a href="#protocol" className="block text-primary hover:underline">5. Protocol Operations</a>
              <a href="#security" className="block text-primary hover:underline">6. Security Considerations</a>
              <a href="#implementation" className="block text-primary hover:underline">7. Implementation Notes</a>
              <a href="#use-cases" className="block text-primary hover:underline">8. Use Cases</a>
              <a href="#future" className="block text-primary hover:underline">9. Future Extensions</a>
              <a href="#references" className="block text-primary hover:underline">10. References</a>
            </nav>
          </Card>

          {/* 1. Abstract */}
          <section id="abstract" className="mb-12">
            <h2 className="text-3xl font-bold mb-4">1. Abstract</h2>
            <p className="text-muted-foreground mb-4">
              The Egendata protocol is a cryptographic framework for self-sovereign data management that enables 
              data owners to share encrypted information with multiple recipients while maintaining complete control 
              over access rights. The protocol leverages asymmetric and symmetric encryption, content-addressable 
              storage, and a novel "keystone" pattern to enable communication-less access revocation.
            </p>
            <p className="text-muted-foreground">
              Unlike traditional access control systems that rely on centralized servers or require direct 
              communication with recipients, Egendata allows data owners to grant and revoke access unilaterally 
              by updating a cryptographic keyring stored alongside the encrypted data.
            </p>
          </section>

          {/* 2. Introduction */}
          <section id="introduction" className="mb-12">
            <h2 className="text-3xl font-bold mb-4">2. Introduction</h2>
            
            <h3 className="text-2xl font-semibold mb-3">2.1 Problem Statement</h3>
            <p className="text-muted-foreground mb-4">
              Current data sharing systems suffer from several fundamental limitations:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
              <li><strong>Lack of ownership:</strong> Users don't control their data once shared with platforms</li>
              <li><strong>Centralized control:</strong> Access management depends on centralized services</li>
              <li><strong>Communication requirement:</strong> Revoking access typically requires contacting recipients</li>
              <li><strong>Vendor lock-in:</strong> Data is tied to specific platforms or service providers</li>
            </ul>

            <h3 className="text-2xl font-semibold mb-3">2.2 Goals and Non-Goals</h3>
            <p className="text-muted-foreground mb-2"><strong>Goals:</strong></p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Enable self-sovereign data ownership</li>
              <li>Provide communication-less access revocation</li>
              <li>Support decentralized, immutable storage</li>
              <li>Maintain storage-agnostic architecture</li>
              <li>Use standard cryptographic primitives</li>
            </ul>

            <p className="text-muted-foreground mb-2"><strong>Non-Goals:</strong></p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
              <li>Provide forward secrecy for historical data</li>
              <li>Hide metadata (number of recipients, access patterns)</li>
              <li>Prevent recipients from copying decrypted data</li>
              <li>Replace general-purpose authorization systems</li>
            </ul>

            <h3 className="text-2xl font-semibold mb-3">2.3 Terminology</h3>
            <dl className="space-y-4 text-muted-foreground">
              <div>
                <dt className="font-semibold text-foreground">Data Owner</dt>
                <dd className="ml-4">The entity that creates and controls access to the encrypted data</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Recipient</dt>
                <dd className="ml-4">An entity that has been granted access to read the encrypted data</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Keystone</dt>
                <dd className="ml-4">
                  The complete data package consisting of:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li><strong>Encrypted Data:</strong> The actual payload encrypted with a DEK</li>
                    <li><strong>Keyring:</strong> Collection of wrapped DEKs for each recipient</li>
                    <li><strong>IPFS Pointer:</strong> CID or IPNS name pointing to the current version</li>
                    <li><strong>Metadata:</strong> Creation time, version, owner information</li>
                  </ul>
                  The keystone is stored in IPFS and can be referenced via either:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li><strong>CID (Content Identifier):</strong> Immutable hash of specific version</li>
                    <li><strong>IPNS (InterPlanetary Name System):</strong> Mutable pointer that can be updated to point to new CIDs when data is re-encrypted</li>
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">Keyring</dt>
                <dd className="ml-4">A collection of wrapped DEKs, each encrypted for a specific recipient's public key. When access is revoked, a new keyring is created with a new DEK, excluding the revoked recipient.</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">DEK (Data Encryption Key)</dt>
                <dd className="ml-4">The symmetric AES-256-GCM key used to encrypt the actual data payload. A new DEK is generated during key rotation (access revocation).</dd>
              </div>
            </dl>
          </section>

          {/* 3. Architecture */}
          <section id="architecture" className="mb-12">
            <h2 className="text-3xl font-bold mb-4">3. Architecture</h2>
            
            <h3 className="text-2xl font-semibold mb-3">3.1 The Keystone Pattern</h3>
            <p className="text-muted-foreground mb-4">
              The Keystone pattern is the core architectural innovation of Egendata. It combines encrypted data 
              with a dynamic access control list (the keyring) in a single, versioned data structure.
            </p>
            
            <Card className="p-6 mb-6 bg-muted/30">
              <h4 className="font-semibold mb-3">Keystone Structure</h4>
              <pre className="text-xs bg-background p-4 rounded overflow-x-auto">
{`{
  "encryptedData": "<JWE-encrypted payload>",
  "keyring": [
    {
      "name": "Alice",
      "wrappedKey": "<DEK encrypted with Alice's public key>"
    },
    {
      "name": "Bob", 
      "wrappedKey": "<DEK encrypted with Bob's public key>"
    }
  ],
  "metadata": {
    "created": "2025-01-07T12:00:00Z",
    "version": 1
  }
}`}
              </pre>
            </Card>

            <h3 className="text-2xl font-semibold mb-3">3.2 Cryptographic Primitives</h3>
            <p className="text-muted-foreground mb-4">
              Egendata relies on industry-standard cryptographic algorithms:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
              <li><strong>RSA-OAEP-256:</strong> Asymmetric encryption for wrapping the DEK</li>
              <li><strong>AES-GCM-256:</strong> Symmetric encryption for the data payload</li>
              <li><strong>JWE (JSON Web Encryption):</strong> Standard format for encrypted data</li>
              <li><strong>JWK (JSON Web Key):</strong> Standard format for key representation</li>
            </ul>

            <h3 className="text-2xl font-semibold mb-3">3.3 Data Flow</h3>
            <p className="text-muted-foreground mb-4">
              The following diagram illustrates how data flows through the Egendata protocol:
            </p>

            <Card className="p-6 mb-6 bg-muted/30">
              <h4 className="font-semibold mb-3">Encryption & Access Granting</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Step 1:</strong> Owner generates a random DEK (AES-256)</p>
                <p><strong>Step 2:</strong> Owner encrypts data with DEK using AES-GCM-256</p>
                <p><strong>Step 3:</strong> For each recipient, Owner encrypts DEK with recipient's RSA public key</p>
                <p><strong>Step 4:</strong> Owner creates keystone with encrypted data + keyring</p>
                <p><strong>Step 5:</strong> Owner stores keystone in immutable storage (e.g., IPFS)</p>
                <p><strong>Step 6:</strong> Recipient fetches keystone from storage</p>
                <p><strong>Step 7:</strong> Recipient finds their entry in keyring</p>
                <p><strong>Step 8:</strong> Recipient decrypts DEK with their RSA private key</p>
                <p><strong>Step 9:</strong> Recipient decrypts data with DEK</p>
              </div>
            </Card>

            <h3 className="text-2xl font-semibold mb-3">3.4 Storage Interface</h3>
            <p className="text-muted-foreground mb-4">
              The protocol defines a minimal storage interface to remain storage-agnostic:
            </p>
            
            <Card className="p-6 mb-6 bg-muted/30">
              <pre className="text-xs bg-background p-4 rounded overflow-x-auto">
{`interface StorageAdapter {
  // Store data and return content identifier (CID)
  store(dataId: string, keystone: Keystone): Promise<string>;
  
  // Retrieve data by identifier
  retrieve(dataId: string): Promise<Keystone>;
  
  // Get current CID for a data ID
  getCID(dataId: string): string | null;
}`}
              </pre>
            </Card>
          </section>

          {/* 4. Storage Requirements */}
          <section id="storage" className="mb-12">
            <h2 className="text-3xl font-bold mb-4">4. Storage Requirements</h2>
            
            <h3 className="text-2xl font-semibold mb-3">4.1 Immutability</h3>
            <p className="text-muted-foreground mb-4">
              The storage layer MUST provide immutable storage. Each update to a keystone creates a new version 
              with a unique identifier. This ensures that:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
              <li>Historical versions remain accessible</li>
              <li>Revoked recipients cannot modify access records</li>
              <li>Data integrity is cryptographically verifiable</li>
            </ul>

            <h3 className="text-2xl font-semibold mb-3">4.2 Decentralization</h3>
            <p className="text-muted-foreground mb-4">
              The storage layer SHOULD be decentralized to prevent single points of failure and ensure 
              censorship resistance. Suitable storage systems include:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
              <li><strong>IPFS:</strong> Content-addressed, peer-to-peer file system</li>
              <li><strong>Arweave:</strong> Permanent, immutable data storage</li>
              <li><strong>Filecoin:</strong> Decentralized storage network</li>
              <li><strong>Ceramic:</strong> Decentralized data network</li>
            </ul>

            <h3 className="text-2xl font-semibold mb-3">4.3 Content Addressing with IPNS</h3>
            <p className="text-muted-foreground mb-4">
              The storage layer combines two IPFS technologies for optimal data management:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>CID (Content Identifier):</strong> Immutable hash of each keystone version, provides verifiable data integrity</li>
              <li><strong>IPNS (InterPlanetary Name System):</strong> Mutable pointer that references the current CID</li>
            </ul>
            
            <Card className="p-6 mb-6 bg-muted/30">
              <h4 className="font-semibold mb-3">IPNS Pointer Pattern</h4>
              <p className="text-sm text-muted-foreground mb-3">
                When data is updated or access is revoked (requiring key rotation):
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>1.</strong> New keystone is created with new DEK and encrypted data → New CID generated</p>
                <p><strong>2.</strong> IPNS name is updated to point to the new CID</p>
                <p><strong>3.</strong> Recipients using the IPNS name automatically get the latest version</p>
                <p><strong>4.</strong> Old CID remains accessible for audit/history</p>
              </div>
              <div className="mt-4 p-3 bg-background rounded text-xs font-mono">
                <p>IPNS: /ipns/k51qz...abc (always points to current version)</p>
                <p className="text-muted-foreground">  ↓</p>
                <p>CID v1: bafyb...123 (original encrypted data)</p>
                <p>CID v2: bafyb...456 (after first key rotation)</p>
                <p>CID v3: bafyb...789 (after second key rotation) ← current</p>
              </div>
            </Card>

            <p className="text-muted-foreground mb-4">
              This pattern provides:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
              <li>Verifiable data integrity through CIDs</li>
              <li>Stable references through IPNS names</li>
              <li>Complete version history</li>
              <li>Automatic updates for authorized recipients</li>
              <li>Immediate revocation - old CIDs become invalid for revoked users</li>
            </ul>
          </section>

          {/* 5. Protocol Operations */}
          <section id="protocol" className="mb-12">
            <h2 className="text-3xl font-bold mb-4">5. Protocol Operations</h2>
            
            <h3 className="text-2xl font-semibold mb-3">5.1 Key Generation</h3>
            <Card className="p-6 mb-6 bg-muted/30">
              <pre className="text-xs bg-background p-4 rounded overflow-x-auto">
{`// Generate RSA-OAEP-256 key pair
const keyPair = await crypto.subtle.generateKey(
  {
    name: "RSA-OAEP",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true,
  ["encrypt", "decrypt"]
);`}
              </pre>
            </Card>

            <h3 className="text-2xl font-semibold mb-3">5.2 Data Encryption</h3>
            <Card className="p-6 mb-6 bg-muted/30">
              <pre className="text-xs bg-background p-4 rounded overflow-x-auto">
{`// 1. Generate random DEK (AES-256)
const dek = await crypto.subtle.generateKey(
  { name: "AES-GCM", length: 256 },
  true,
  ["encrypt", "decrypt"]
);

// 2. Encrypt data with DEK
const encryptedData = await new CompactEncrypt(
  new TextEncoder().encode(JSON.stringify(data))
)
  .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
  .encrypt(dek);`}
              </pre>
            </Card>

            <h3 className="text-2xl font-semibold mb-3">5.3 Access Granting</h3>
            <p className="text-muted-foreground mb-4">
              To grant access to a new recipient:
            </p>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2 mb-6">
              <li>Retrieve the current keystone from storage</li>
              <li>Decrypt the DEK using Owner's private key</li>
              <li>Encrypt the DEK with the new recipient's public key</li>
              <li>Add the wrapped DEK to the keyring</li>
              <li>Store the updated keystone (creates new CID)</li>
            </ol>

            <h3 className="text-2xl font-semibold mb-3">5.4 Access Revocation with Key Rotation</h3>
            <p className="text-muted-foreground mb-4">
              To securely revoke access from a recipient, the protocol implements automatic key rotation:
            </p>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2 mb-6">
              <li>Retrieve the current keystone from storage</li>
              <li>Decrypt the data using the owner's private key and the old DEK</li>
              <li>Generate a completely new symmetric DEK</li>
              <li>Re-encrypt the data payload with the new DEK</li>
              <li>Encrypt the new DEK for all remaining recipients (excluding the revoked party)</li>
              <li>Store the new keystone with re-encrypted data (creates new CID in IPFS)</li>
              <li>Update the IPNS pointer to reference the new CID</li>
              <li>No communication with the revoked recipient is required</li>
            </ol>
            <Card className="p-4 mb-6 bg-emerald-50 border-emerald-200">
              <p className="text-sm text-emerald-900 mb-3">
                <strong>Enhanced Security Through Key Rotation:</strong> Key rotation ensures that revoked recipients cannot decrypt 
                the data even if they cached the old encrypted payload. The old DEK becomes useless after revocation.
              </p>
              <p className="text-sm text-emerald-900 mb-3">
                <strong>IPNS Update Pattern:</strong> When access is revoked:
              </p>
              <ul className="list-disc pl-6 text-sm text-emerald-900 space-y-1">
                <li>New keystone stored → new CID generated (e.g., bafyb...789)</li>
                <li>IPNS name updated to point to new CID</li>
                <li>Authorized recipients automatically get latest version via IPNS</li>
                <li>Revoked recipients still have old CID but missing from new keyring</li>
                <li>Old versions remain in IPFS for audit trail</li>
              </ul>
            </Card>

            <h3 className="text-2xl font-semibold mb-3">5.5 Data Retrieval</h3>
            <p className="text-muted-foreground mb-4">
              To read shared data:
            </p>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2 mb-6">
              <li>Recipient fetches keystone from storage using the data ID</li>
              <li>Recipient searches for their name in the keyring</li>
              <li>If found, decrypt the wrapped DEK with their private key</li>
              <li>Use the DEK to decrypt the data payload</li>
              <li>If not found in keyring, access is denied</li>
            </ol>
          </section>

          {/* 6. Security Considerations */}
          <section id="security" className="mb-12">
            <h2 className="text-3xl font-bold mb-4">6. Security Considerations</h2>
            
            <h3 className="text-2xl font-semibold mb-3">6.1 Key Management</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
              <li>Private keys MUST be stored securely (e.g., hardware security modules, secure enclaves)</li>
              <li>Key rotation is the responsibility of individual users</li>
              <li>Lost private keys cannot be recovered</li>
            </ul>

            <h3 className="text-2xl font-semibold mb-3">6.2 Forward Secrecy via Key Rotation</h3>
            <p className="text-muted-foreground mb-4">
              The protocol implements automatic key rotation during revocation to provide forward secrecy. 
              When access is revoked:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>A new symmetric DEK is generated</li>
              <li>The data is re-encrypted with the new DEK</li>
              <li>The new DEK is wrapped only for remaining recipients</li>
              <li>A new IPFS CID is created, pointing to the re-encrypted keystone</li>
              <li>The IPNS pointer is updated to reference the new CID</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              This ensures that revoked recipients cannot decrypt future versions of the data, even if they 
              cached the old encrypted payload. By using IPNS, authorized recipients automatically reference 
              the latest version without needing to track individual CIDs.
            </p>
            <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-900 mb-3">
                <strong>IPFS Immutability + IPNS Mutability:</strong> This combination provides both security and convenience:
              </p>
              <ul className="list-disc pl-6 text-sm text-blue-900 space-y-2">
                <li><strong>Old CID remains accessible</strong> for audit/history, but revoked users aren't in the new keyring</li>
                <li><strong>IPNS name stays constant</strong> - recipients always use the same IPNS reference</li>
                <li><strong>IPNS automatically resolves</strong> to the latest CID with current keyring</li>
                <li><strong>No manual updates needed</strong> - the IPNS pointer is updated by the data owner</li>
              </ul>
            </Card>

            <h3 className="text-2xl font-semibold mb-3">6.3 Metadata Leakage</h3>
            <p className="text-muted-foreground mb-4">
              The keyring reveals:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
              <li>Names/identifiers of all recipients</li>
              <li>Number of recipients with access</li>
              <li>Access history (via immutable version history)</li>
            </ul>

            <h3 className="text-2xl font-semibold mb-3">6.4 Attack Vectors</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
              <li><strong>Key compromise:</strong> If a recipient's private key is compromised, their access should be revoked immediately</li>
              <li><strong>Data copying:</strong> Recipients can copy decrypted data; the protocol cannot prevent this</li>
              <li><strong>Storage manipulation:</strong> Using immutable storage prevents tampering, but does not prevent deletion</li>
            </ul>
          </section>

          {/* 7. Implementation Notes */}
          <section id="implementation" className="mb-12">
            <h2 className="text-3xl font-bold mb-4">7. Implementation Notes</h2>
            
            <h3 className="text-2xl font-semibold mb-3">7.1 Web Crypto API Usage</h3>
            <p className="text-muted-foreground mb-4">
              Modern browsers provide the Web Crypto API for cryptographic operations. Example implementation 
              uses SubtleCrypto for key generation and encryption.
            </p>

            <h3 className="text-2xl font-semibold mb-3">7.2 JOSE/JWE Compatibility</h3>
            <p className="text-muted-foreground mb-4">
              The protocol uses JOSE (JSON Object Signing and Encryption) standards for interoperability. 
              The encrypted data is stored as JWE (JSON Web Encryption) compact serialization.
            </p>

            <h3 className="text-2xl font-semibold mb-3">7.3 Performance Optimization with IPFS PubSub</h3>
            <p className="text-muted-foreground mb-4">
              IPFS supports a publish-subscribe (PubSub) pattern that significantly improves performance for 
              real-time data updates:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>Automatic notifications:</strong> When data is updated, all subscribed nodes are automatically notified</li>
              <li><strong>No polling overhead:</strong> Nodes don't need to continuously check if data has changed</li>
              <li><strong>Reduced latency:</strong> Updates propagate immediately to all subscribers</li>
              <li><strong>Network efficiency:</strong> Only changed data is communicated, not repeated queries</li>
            </ul>
            <Card className="p-4 mb-6 bg-green-50 border-green-200">
              <p className="text-sm text-green-900 mb-3">
                <strong>Implementation:</strong> Clients can subscribe to IPNS names to receive real-time notifications 
                when the data owner updates their keystone. This eliminates the need for periodic polling and ensures 
                that all authorized recipients stay synchronized with minimal overhead.
              </p>
              <pre className="text-xs bg-background p-4 rounded overflow-x-auto mt-3">
{`// Example: Subscribe to IPNS updates
ipfs.pubsub.subscribe(ipnsName, (msg) => {
  // Automatically fetch and decrypt new version
  const newCID = await ipfs.name.resolve(ipnsName);
  const updatedData = await fetchAndDecrypt(newCID);
});`}
              </pre>
            </Card>

            <h3 className="text-2xl font-semibold mb-3">7.4 Access Control and Write Permissions</h3>
            <p className="text-muted-foreground mb-4">
              In the Egendata protocol, access control operates on two distinct levels: read access and write access.
            </p>
            
            <h4 className="text-xl font-semibold mb-3">7.4.1 Who Can Modify User Data?</h4>
            <p className="text-muted-foreground mb-4">
              Write access is controlled exclusively through IPNS (InterPlanetary Name System) private keys:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>Data owner:</strong> Only the holder of the IPNS private key can update the IPNS pointer to reference new data versions</li>
              <li><strong>IPFS immutability:</strong> No one can modify existing data in IPFS - only create new versions with new CIDs</li>
              <li><strong>Update mechanism:</strong> Updating data means creating a new keystone with a new CID and updating the IPNS name to point to it</li>
            </ul>

            <h4 className="text-xl font-semibold mb-3">7.4.2 Key Storage</h4>
            <p className="text-muted-foreground mb-4">
              IPNS private keys MUST be stored securely:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>Browser storage:</strong> For demo purposes, keys can be stored in IndexedDB or localStorage (not recommended for production)</li>
              <li><strong>Hardware security:</strong> Production implementations should use hardware security modules (HSM), secure enclaves, or hardware tokens</li>
              <li><strong>Key derivation:</strong> Keys can be derived from user passwords using PBKDF2 or Argon2, though this requires careful key management</li>
              <li><strong>Backup responsibility:</strong> Users are responsible for backing up their IPNS keys - lost keys mean permanent loss of write access</li>
            </ul>

            <h4 className="text-xl font-semibold mb-3">7.4.3 Delegating Write Permissions</h4>
            <p className="text-muted-foreground mb-4">
              There are several approaches to grant write access to other parties:
            </p>
            <Card className="p-4 mb-4 bg-purple-50 border-purple-200">
              <p className="text-sm font-semibold text-purple-900 mb-2">Option 1: Share IPNS Private Key</p>
              <ul className="list-disc pl-6 text-sm text-purple-900 space-y-1">
                <li>Securely share the IPNS private key with trusted parties</li>
                <li>Recipients can update the IPNS pointer with new keystones</li>
                <li><strong>Risk:</strong> Shared key holders have full write control - cannot be selectively revoked</li>
              </ul>
            </Card>
            <Card className="p-4 mb-4 bg-purple-50 border-purple-200">
              <p className="text-sm font-semibold text-purple-900 mb-2">Option 2: Multiple IPNS Names with Aggregation</p>
              <ul className="list-disc pl-6 text-sm text-purple-900 space-y-1">
                <li>Each writer maintains their own IPNS name for their contributions</li>
                <li>A root IPNS name references an aggregated index of all contributor IPNS names</li>
                <li>Writers can update their own data independently</li>
                <li><strong>Benefit:</strong> Fine-grained control - each party manages their own namespace</li>
              </ul>
            </Card>
            <Card className="p-4 mb-6 bg-purple-50 border-purple-200">
              <p className="text-sm font-semibold text-purple-900 mb-2">Option 3: Smart Contract or Consensus Mechanism</p>
              <ul className="list-disc pl-6 text-sm text-purple-900 space-y-1">
                <li>Use blockchain or distributed ledger to manage write permissions</li>
                <li>Define policies for who can update which data and under what conditions</li>
                <li>Updates are validated by the consensus mechanism before being published</li>
                <li><strong>Benefit:</strong> Programmable, auditable access control with multi-party governance</li>
              </ul>
            </Card>

            <h4 className="text-xl font-semibold mb-3">7.4.4 Example: Collaborative Health Data</h4>
            <p className="text-muted-foreground mb-4">
              A patient can grant their doctor write access to specific medical records:
            </p>
            <pre className="text-xs bg-muted/30 p-4 rounded overflow-x-auto mb-6">
{`// Patient creates a dedicated IPNS name for lab results
const labResultsIPNS = await ipfs.name.create();

// Doctor receives the IPNS private key (securely transmitted)
// Doctor can now add new lab results:
const newResult = encryptForPatient(labData, patientPublicKey);
const newCID = await ipfs.add(newResult);
await ipfs.name.publish(labResultsIPNS, newCID);

// Patient's main health record references this IPNS name
// Patient retains read access; doctor can write new results`}
            </pre>

            <h3 className="text-2xl font-semibold mb-3">7.5 QR Code Key Exchange</h3>
            <p className="text-muted-foreground mb-4">
              Public keys can be shared via QR codes for peer-to-peer key exchange. The demo implementation uses 
              Base45 encoding for QR code compatibility.
            </p>
            <Card className="p-6 mb-6 bg-muted/30">
              <h4 className="font-semibold mb-3">QR Key Data Format</h4>
              <pre className="text-xs bg-background p-4 rounded overflow-x-auto">
{`{
  "name": "Bob",
  "publicKeyJWK": {
    "kty": "RSA",
    "n": "...",
    "e": "AQAB",
    "alg": "RSA-OAEP-256",
    "ext": true
  },
  "timestamp": 1704628800000
}`}
              </pre>
            </Card>
          </section>

          {/* 8. Use Cases */}
          <section id="use-cases" className="mb-12">
            <h2 className="text-3xl font-bold mb-4">8. Use Cases</h2>
            
            <h3 className="text-2xl font-semibold mb-3">8.1 Personal Data Management</h3>
            <p className="text-muted-foreground mb-4">
              Individuals can manage their personal data (medical records, financial documents, identity credentials) 
              and selectively share with service providers while maintaining control.
            </p>

            <h3 className="text-2xl font-semibold mb-3">8.2 Healthcare Records</h3>
            <p className="text-muted-foreground mb-4">
              Patients can share medical records with doctors, specialists, and insurance providers, and revoke 
              access when switching providers without requiring cooperation from previous providers.
            </p>

            <h3 className="text-2xl font-semibold mb-3">8.3 Financial Services</h3>
            <p className="text-muted-foreground mb-4">
              Users can share financial data with accountants, advisors, or lenders for specific periods, 
              and revoke access after the engagement ends.
            </p>

            <h3 className="text-2xl font-semibold mb-3">8.4 API Access Control</h3>
            <p className="text-muted-foreground mb-4">
              Developers can grant API access to third-party services by sharing encrypted credentials, 
              and revoke access by removing the service from the keyring.
            </p>

            <h3 className="text-2xl font-semibold mb-3">8.5 Personal AI Tools & Agents</h3>
            <p className="text-muted-foreground mb-4">
              AI assistants and personal agents require access to sensitive user information to provide relevant, 
              contextualized responses. With Egendata, users can grant their AI agents secure access to continuously 
              updated personal data (preferences, history, sensitive information) without exposing it to the AI provider's 
              servers. As the user's information changes, the AI agent always accesses the latest encrypted data through 
              the IPNS pointer, ensuring context remains current and relevant while maintaining complete user control 
              over what information is shared.
            </p>

            <h3 className="text-2xl font-semibold mb-3">8.6 Data Sovereignty & Geopolitical Independence</h3>
            <p className="text-muted-foreground mb-4">
              In an era of shifting geopolitical power dynamics, individuals and organizations face the risk of losing 
              access to their data due to platform shutdowns, sanctions, or political instability. Egendata ensures 
              data sovereignty by storing encrypted information on decentralized networks that transcend national 
              borders and corporate control. Users retain ownership and access regardless of geopolitical changes, 
              preventing data loss from service provider failures or regulatory restrictions.
            </p>

            <h3 className="text-2xl font-semibold mb-3">8.7 Cross-Platform Data Migration</h3>
            <p className="text-muted-foreground mb-4">
              Users often become locked into platforms because their data cannot be easily transferred. Egendata enables 
              seamless migration between services and applications. For example, a user can grant both Spotify and Apple 
              Music write access to their Egendata-stored music preferences and favorites. As they use either service, 
              their listening history, playlists, and favorites are synchronized through the shared encrypted keystone. 
              This allows users to switch between platforms freely, try new services, or use multiple providers 
              simultaneously, with all services accessing and updating the same canonical user data without vendor lock-in.
            </p>
          </section>

          {/* 9. Future Extensions */}
          <section id="future" className="mb-12">
            <h2 className="text-3xl font-bold mb-4">9. Future Extensions</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
              <li><strong>Group keys:</strong> Support for sharing with groups without enumerating all members</li>
              <li><strong>Delegation:</strong> Allow recipients to re-share data with sub-recipients</li>
              <li><strong>Automated re-encryption:</strong> Periodic re-encryption to improve forward secrecy</li>
              <li><strong>Anonymous credentials:</strong> Hide recipient identities in the keyring</li>
              <li><strong>Smart contracts:</strong> On-chain access control with off-chain encrypted data</li>
            </ul>
          </section>

          {/* 10. References */}
          <section id="references" className="mb-12">
            <h2 className="text-3xl font-bold mb-4">10. References</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li>
                <strong>RFC 7516:</strong> JSON Web Encryption (JWE) - 
                <a href="https://tools.ietf.org/html/rfc7516" className="text-primary hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                  https://tools.ietf.org/html/rfc7516
                </a>
              </li>
              <li>
                <strong>RFC 7517:</strong> JSON Web Key (JWK) - 
                <a href="https://tools.ietf.org/html/rfc7517" className="text-primary hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                  https://tools.ietf.org/html/rfc7517
                </a>
              </li>
              <li>
                <strong>Web Crypto API:</strong> W3C Recommendation - 
                <a href="https://www.w3.org/TR/WebCryptoAPI/" className="text-primary hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                  https://www.w3.org/TR/WebCryptoAPI/
                </a>
              </li>
              <li>
                <strong>IPFS:</strong> InterPlanetary File System - 
                <a href="https://ipfs.tech" className="text-primary hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                  https://ipfs.tech
                </a>
              </li>
              <li>
                <strong>Self-Sovereign Identity:</strong> Principles and concepts - 
                <a href="https://www.lifewithalacrity.com/2016/04/the-path-to-self-soverereign-identity.html" className="text-primary hover:underline ml-1" target="_blank" rel="noopener noreferrer">
                  lifewithalacrity.com
                </a>
              </li>
            </ul>
          </section>

          {/* Back to top */}
          <div className="pt-12 border-t border-border text-center">
            <Link to="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Interactive Demo
              </Button>
            </Link>
          </div>
        </article>
      </div>

      <Footer />
    </div>
  );
};

export default RFC;