import * as jose from 'jose';
import { StorageAdapter, KeyPair, Keystone, StoredData } from './types';
import { InMemoryStorage } from './storage';
import { IPFSStorage } from './ipfs-storage';

export class EgendataClient {
  private storage: StorageAdapter;
  private keyPairs: Map<string, KeyPair> = new Map();

  constructor(storage?: StorageAdapter) {
    this.storage = storage || new InMemoryStorage();
  }

  /**
   * Generate a key pair for a user
   */
  async generateKeyPair(name: string): Promise<KeyPair> {
    const { publicKey, privateKey } = await jose.generateKeyPair('RSA-OAEP-256');
    const publicKeyJWK = await jose.exportJWK(publicKey);
    
    const keyPair = {
      publicKey,
      privateKey,
      publicKeyJWK
    };

    this.keyPairs.set(name, keyPair);
    return keyPair;
  }

  /**
   * Get a stored key pair
   */
  getKeyPair(name: string): KeyPair | undefined {
    return this.keyPairs.get(name);
  }

  /**
   * Import a public key from JWK
   */
  async importPublicKey(publicKeyJWK: jose.JWK): Promise<CryptoKey> {
    return await jose.importJWK(publicKeyJWK, 'RSA-OAEP-256') as CryptoKey;
  }

  /**
   * Write encrypted data to storage
   * Returns object with encrypted data string and CID (if using IPFS)
   */
  async writeData(
    dataId: string,
    data: object,
    owner: string,
    recipients: { name: string; publicKey: CryptoKey }[]
  ): Promise<{ encryptedData: string; cid?: string }> {
    // Generate a symmetric Data Encryption Key (DEK)
    const dek = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Generate a random IV for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the actual data with the DEK
    const encodedData = new TextEncoder().encode(JSON.stringify(data));
    const encryptedDataBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      dek,
      encodedData
    );
    
    // Combine IV and encrypted data, then base64 encode
    const combined = new Uint8Array(iv.length + encryptedDataBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedDataBuffer), iv.length);
    const encryptedData = btoa(String.fromCharCode(...combined));
    
    // Export DEK to raw format
    const dekRaw = await crypto.subtle.exportKey('raw', dek);
    
    // Encrypt the DEK for each recipient
    const recipientKeys = await Promise.all(
      recipients.map(async (recipient) => {
        const encryptedDEK = await new jose.CompactEncrypt(
          new Uint8Array(dekRaw)
        )
          .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
          .encrypt(recipient.publicKey);
        
        return {
          name: recipient.name,
          encryptedDEK
        };
      })
    );

    const storedData: StoredData = {
      encryptedData,
      keystone: {
        encryptedKey: 'keystone-v1',
        recipients: recipientKeys
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        owner
      }
    };

    await this.storage.set(dataId, storedData);
    
    // Hämta CID om det är IPFS storage
    let cid: string | undefined;
    if (this.storage instanceof IPFSStorage) {
      cid = this.storage.getCID(dataId) || undefined;
    }
    
    return { encryptedData, cid };
  }

  /**
   * Get raw encrypted data for display purposes
   */
  async getRawEncryptedData(dataId: string): Promise<string | null> {
    const storedData = await this.storage.get(dataId);
    return storedData?.encryptedData || null;
  }

  /**
   * Read data using CID (for IPFS)
   */
  async readDataByCID(
    cid: string,
    recipientName: string,
    privateKey: CryptoKey
  ): Promise<object> {
    if (!(this.storage instanceof IPFSStorage)) {
      throw new Error('CID-baserad läsning kräver IPFSStorage');
    }

    const storedData = await this.storage.getByCID(cid);
    if (!storedData) {
      throw new Error(`Data hittades inte för CID: ${cid}`);
    }

    return this.decryptStoredData(storedData, recipientName, privateKey);
  }

  async readData(
    dataId: string,
    recipientName: string,
    privateKey: CryptoKey
  ): Promise<object> {
    const storedData = await this.storage.get(dataId);
    if (!storedData) {
      throw new Error(`Data not found: ${dataId}`);
    }

    return this.decryptStoredData(storedData, recipientName, privateKey);
  }

  /**
   * Private helper för att dekryptera StoredData
   */
  private async decryptStoredData(
    storedData: StoredData,
    recipientName: string,
    privateKey: CryptoKey
  ): Promise<object> {
    // Find the encrypted DEK for this recipient
    const recipientKey = storedData.keystone.recipients.find(r => r.name === recipientName);
    if (!recipientKey) {
      throw new Error(`No access key found for ${recipientName}`);
    }
    
    // Decrypt the DEK using the recipient's private key
    const { plaintext: dekRaw } = await jose.compactDecrypt(
      recipientKey.encryptedDEK,
      privateKey
    );
    
    // Import the DEK (create new Uint8Array to ensure correct type)
    const dek = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(dekRaw),
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decode the base64 encrypted data
    const combined = new Uint8Array(
      Array.from(atob(storedData.encryptedData), c => c.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedDataBuffer = combined.slice(12);
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      dek,
      encryptedDataBuffer
    );
    
    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decryptedText);
  }

  /**
   * Revoke access for a recipient
   * This creates a new DEK, re-encrypts the data, and wraps the new DEK for all remaining recipients
   */
  async revokeAccess(dataId: string, recipientName: string): Promise<void> {
    const storedData = await this.storage.get(dataId);
    if (!storedData) {
      throw new Error(`Data not found: ${dataId}`);
    }

    // First, decrypt the data using the owner's key (first recipient in list)
    const ownerKey = storedData.keystone.recipients[0];
    if (!ownerKey) {
      throw new Error('No valid key found to decrypt data');
    }

    // Get owner's keypair to decrypt
    const ownerKeyPair = this.keyPairs.get(storedData.metadata.owner);
    if (!ownerKeyPair) {
      throw new Error('Owner key pair not found');
    }

    // Decrypt the old DEK
    const { plaintext: dekRaw } = await jose.compactDecrypt(
      ownerKey.encryptedDEK,
      ownerKeyPair.privateKey
    );

    // Import old DEK (create new Uint8Array to ensure correct type)
    const oldDEK = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(dekRaw),
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt the data
    const encryptedDataBytes = new Uint8Array(
      Array.from(atob(storedData.encryptedData), c => c.charCodeAt(0))
    );
    const iv = encryptedDataBytes.slice(0, 12);
    const encryptedData = encryptedDataBytes.slice(12);

    const decryptedDataBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      oldDEK,
      encryptedData
    );

    const originalData = JSON.parse(new TextDecoder().decode(decryptedDataBuffer));

    // Generate a new DEK
    const newDEK = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Generate a new IV
    const newIV = crypto.getRandomValues(new Uint8Array(12));

    // Re-encrypt the data with the new DEK
    const encodedData = new TextEncoder().encode(JSON.stringify(originalData));
    const newEncryptedDataBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: newIV },
      newDEK,
      encodedData
    );

    // Combine new IV and encrypted data
    const combined = new Uint8Array(newIV.length + newEncryptedDataBuffer.byteLength);
    combined.set(newIV, 0);
    combined.set(new Uint8Array(newEncryptedDataBuffer), newIV.length);
    const newEncryptedData = btoa(String.fromCharCode(...combined));

    // Export new DEK to raw format
    const newDEKRaw = await crypto.subtle.exportKey('raw', newDEK);

    // Filter out the revoked recipient and re-encrypt DEK for all remaining recipients
    const remainingRecipients = storedData.keystone.recipients.filter(
      r => r.name !== recipientName
    );

    const newRecipientKeys = await Promise.all(
      remainingRecipients.map(async (recipient) => {
        // Get the public key for this recipient
        const recipientKeyPair = this.keyPairs.get(recipient.name);
        if (!recipientKeyPair) {
          throw new Error(`Key pair not found for recipient: ${recipient.name}`);
        }

        const encryptedDEK = await new jose.CompactEncrypt(
          new Uint8Array(newDEKRaw)
        )
          .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
          .encrypt(recipientKeyPair.publicKey);

        return {
          name: recipient.name,
          encryptedDEK
        };
      })
    );

    // Create new stored data with rotated key
    const newStoredData: StoredData = {
      encryptedData: newEncryptedData,
      keystone: {
        encryptedKey: 'keystone-v1',
        recipients: newRecipientKeys
      },
      metadata: {
        ...storedData.metadata,
        updatedAt: Date.now()
      }
    };

    await this.storage.set(dataId, newStoredData);
  }

  /**
   * Re-grant access to a recipient
   */
  async reGrantAccess(
    dataId: string,
    recipientName: string,
    recipientPublicKey: CryptoKey,
    ownerPrivateKey: CryptoKey
  ): Promise<void> {
    const storedData = await this.storage.get(dataId);
    if (!storedData) {
      throw new Error(`Data not found: ${dataId}`);
    }

    // Get the owner's encrypted DEK (first recipient)
    const ownerKey = storedData.keystone.recipients[0];
    if (!ownerKey) {
      throw new Error('No valid key found to decrypt data');
    }
    
    // Decrypt DEK using owner's private key
    const { plaintext: dekRaw } = await jose.compactDecrypt(
      ownerKey.encryptedDEK,
      ownerPrivateKey
    );
    
    // Encrypt the DEK for the new recipient
    const encryptedDEK = await new jose.CompactEncrypt(
      dekRaw
    )
      .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
      .encrypt(recipientPublicKey);
    
    // Add the new recipient to the keystone
    storedData.keystone.recipients.push({
      name: recipientName,
      encryptedDEK
    });
    storedData.metadata.updatedAt = Date.now();

    await this.storage.set(dataId, storedData);
  }

  /**
   * Get stored data metadata (without decrypting)
   */
  async getMetadata(dataId: string): Promise<StoredData['metadata'] | null> {
    const storedData = await this.storage.get(dataId);
    return storedData?.metadata || null;
  }

  /**
   * List all recipients with access to data
   */
  async listRecipients(dataId: string): Promise<string[]> {
    const storedData = await this.storage.get(dataId);
    return storedData?.keystone.recipients.map(r => r.name) || [];
  }

  /**
   * Update the plaintext data (re-encrypts with same recipients)
   */
  async updateData(dataId: string, newData: object, ownerName: string): Promise<{ encryptedData: string; cid?: string }> {
    const storedData = await this.storage.get(dataId);
    if (!storedData) {
      throw new Error(`Data not found: ${dataId}`);
    }

    // Get owner's keypair
    const ownerKeyPair = this.keyPairs.get(ownerName);
    if (!ownerKeyPair) {
      throw new Error('Owner key pair not found');
    }

    // Generate a new DEK
    const newDEK = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Generate a new IV
    const newIV = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the new data with the new DEK
    const encodedData = new TextEncoder().encode(JSON.stringify(newData));
    const newEncryptedDataBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: newIV },
      newDEK,
      encodedData
    );

    // Combine new IV and encrypted data
    const combined = new Uint8Array(newIV.length + newEncryptedDataBuffer.byteLength);
    combined.set(newIV, 0);
    combined.set(new Uint8Array(newEncryptedDataBuffer), newIV.length);
    const newEncryptedData = btoa(String.fromCharCode(...combined));

    // Export new DEK to raw format
    const newDEKRaw = await crypto.subtle.exportKey('raw', newDEK);

    // Re-encrypt DEK for all current recipients
    const newRecipientKeys = await Promise.all(
      storedData.keystone.recipients.map(async (recipient) => {
        const recipientKeyPair = this.keyPairs.get(recipient.name);
        if (!recipientKeyPair) {
          throw new Error(`Key pair not found for recipient: ${recipient.name}`);
        }

        const encryptedDEK = await new jose.CompactEncrypt(
          new Uint8Array(newDEKRaw)
        )
          .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
          .encrypt(recipientKeyPair.publicKey);

        return {
          name: recipient.name,
          encryptedDEK
        };
      })
    );

    // Create updated stored data
    const updatedStoredData: StoredData = {
      encryptedData: newEncryptedData,
      keystone: {
        encryptedKey: 'keystone-v1',
        recipients: newRecipientKeys
      },
      metadata: {
        ...storedData.metadata,
        updatedAt: Date.now()
      }
    };

    await this.storage.set(dataId, updatedStoredData);

    // Get CID if using IPFS storage
    let cid: string | undefined;
    if (this.storage instanceof IPFSStorage) {
      cid = this.storage.getCID(dataId) || undefined;
    }

    return { encryptedData: newEncryptedData, cid };
  }

  /**
   * Delete data from storage
   */
  async deleteData(dataId: string): Promise<void> {
    await this.storage.delete(dataId);
  }
}
