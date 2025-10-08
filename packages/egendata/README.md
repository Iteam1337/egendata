# @egendata/core

A decentralized protocol for self-sovereign data management using the keystone pattern.

## Features

- 🔐 **Communication-less Access Control**: Revoke access instantly without contacting recipients
- 🌐 **Decentralized Storage**: Store data on IPFS for permanent, distributed access
- 🔑 **Keystone Pattern**: Efficient multi-recipient encryption with instant revocation
- 🚀 **Zero Knowledge**: Recipients can't decrypt data after access is revoked
- 📦 **Pluggable Storage**: Use in-memory storage or IPFS

## Installation

```bash
npm install @egendata/core jose
```

## Quick Start

```typescript
import { EgendataClient, InMemoryStorage } from '@egendata/core';

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
);
console.log(data); // { diagnosis: 'Healthy', date: '2024-01-15' }

// Revoke access
await client.revokeAccess('medical-record-1', 'Bob');

// Bob can no longer decrypt the data
```

## Using IPFS Storage

```typescript
import { EgendataClient, IPFSStorage } from '@egendata/core';

const storage = new IPFSStorage();
await storage.initialize();

const client = new EgendataClient(storage);

// Data is now stored on IPFS
const { cid } = await client.writeData(/* ... */);
console.log('Data stored at CID:', cid);
```

## API Documentation

### EgendataClient

#### `generateKeyPair(name: string): Promise<KeyPair>`
Generates an RSA-OAEP key pair for a recipient.

#### `writeData(dataId, data, owner, recipients): Promise<{ encryptedData, cid? }>`
Encrypts and stores data for multiple recipients.

#### `readData(dataId, recipientName, privateKey): Promise<object>`
Decrypts and retrieves data for a recipient.

#### `revokeAccess(dataId, recipientName): Promise<void>`
Revokes a recipient's access by re-encrypting data with a new key.

#### `reGrantAccess(dataId, recipientName, recipientPublicKey, ownerPrivateKey): Promise<void>`
Re-grants access to a previously revoked recipient.

#### `updateData(dataId, newData, ownerName): Promise<{ encryptedData, cid? }>`
Updates existing data while maintaining access control.

#### `deleteData(dataId): Promise<void>`
Deletes data from storage.

### Storage Adapters

#### InMemoryStorage
Simple in-memory storage for development and testing.

#### IPFSStorage
Decentralized storage using Helia/IPFS.

**Methods:**
- `initialize()`: Must be called before use
- `stop()`: Shuts down the IPFS node
- `getCID(key)`: Gets the CID for a stored key

## How It Works

### The Keystone Pattern

1. **Data Encryption**: Data is encrypted with a symmetric Data Encryption Key (DEK)
2. **Key Distribution**: The DEK is encrypted separately for each recipient using their public key
3. **Access Control**: Recipients are stored in a "keystone" structure alongside the encrypted data
4. **Instant Revocation**: To revoke access, data is re-encrypted with a new DEK, excluding revoked recipients

### Security Model

- Recipients cannot decrypt data after access is revoked
- No communication needed with recipients during revocation
- Owner maintains full control over their data
- All encryption uses Web Crypto API (RSA-OAEP, AES-GCM)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build package
npm run build

# Run tests with coverage
npm run test:coverage
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
