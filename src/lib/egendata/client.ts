import * as jose from 'jose';
import { StorageAdapter, KeyPair, Keystone, StoredData } from './types';
import { InMemoryStorage } from './storage';

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
   * Returns the encrypted data string for display
   */
  async writeData(
    dataId: string,
    data: object,
    owner: string,
    recipients: { name: string; publicKey: CryptoKey }[]
  ): Promise<string> {
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
    
    // Returnera den krypterade datan för visning
    return encryptedData;
  }

  /**
   * Get raw encrypted data for display purposes
   */
  async getRawEncryptedData(dataId: string): Promise<string | null> {
    const storedData = await this.storage.get(dataId);
    return storedData?.encryptedData || null;
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
    
    // Import the DEK
    const dek = await crypto.subtle.importKey(
      'raw',
      dekRaw,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decode the base64 encrypted data
    const combined = Uint8Array.from(atob(storedData.encryptedData), c => c.charCodeAt(0));
    
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
   */
  async revokeAccess(dataId: string, recipientName: string): Promise<void> {
    const storedData = await this.storage.get(dataId);
    if (!storedData) {
      throw new Error(`Data not found: ${dataId}`);
    }

    storedData.keystone.recipients = storedData.keystone.recipients.filter(
      r => r.name !== recipientName
    );
    storedData.metadata.updatedAt = Date.now();

    await this.storage.set(dataId, storedData);
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
   * Delete data from storage
   */
  async deleteData(dataId: string): Promise<void> {
    await this.storage.delete(dataId);
  }
}
