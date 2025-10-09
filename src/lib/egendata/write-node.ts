import * as jose from 'jose';
import { ServiceKeystone } from './types';
import { IPFSStorage } from './ipfs-storage';

/**
 * Write Node - enables external services to publish data
 * without accessing the owner's Root IPNS key
 */
export class WriteNode {
  private serviceId: string;
  private domain: string;
  private storage: IPFSStorage;
  private ipnsKeyName: string;
  private version: number = 0;

  constructor(serviceId: string, domain: string, storage: IPFSStorage) {
    this.serviceId = serviceId;
    this.domain = domain;
    this.storage = storage;
    this.ipnsKeyName = `service-${serviceId}`;
  }

  /**
   * Generate IPNS key for this Write Node
   */
  async generateIPNSKey(): Promise<string> {
    await this.storage.createIPNSKey(this.ipnsKeyName);
    const keys = await this.storage.listIPNSKeys();
    const key = keys.find(k => k.name === this.ipnsKeyName);
    return key?.id || '';
  }

  /**
   * Export Service IPNS public key (for QR/URL sharing)
   */
  async exportServicePublicKey(): Promise<string> {
    const keys = await this.storage.listIPNSKeys();
    const key = keys.find(k => k.name === this.ipnsKeyName);
    if (!key) {
      throw new Error('Service IPNS key not found. Call generateIPNSKey() first.');
    }
    return `/ipns/${key.id}`;
  }

  /**
   * Publish Service Keystone to Service IPNS
   */
  async publishServiceKeystone(
    data: object,
    recipients: { name: string; publicKey: CryptoKey }[]
  ): Promise<{ cid: string; ipns: string }> {
    // Generate DEK
    const dek = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Encrypt data
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));
    const encryptedDataBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      dek,
      encodedData
    );

    const combined = new Uint8Array(iv.length + encryptedDataBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedDataBuffer), iv.length);
    const payload = btoa(String.fromCharCode(...combined));

    // Wrap DEK for each recipient
    const dekRaw = await crypto.subtle.exportKey('raw', dek);
    const keyring = await Promise.all(
      recipients.map(async (recipient) => {
        const wrappedKey = await new jose.CompactEncrypt(
          new Uint8Array(dekRaw)
        )
          .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
          .encrypt(recipient.publicKey);

        return {
          name: recipient.name,
          wrappedKey
        };
      })
    );

    this.version++;

    const serviceKeystone: ServiceKeystone = {
      type: 'egendata.keystone.service',
      schema: '1.0',
      domain: this.domain,
      keyring,
      payload,
      metadata: {
        version: this.version,
        producer: this.serviceId,
        created: new Date().toISOString()
      }
    };

    // Store in IPFS
    const tempKey = `${this.serviceId}-${this.version}`;
    await this.storage.set(tempKey, serviceKeystone as any);
    const cid = this.storage.getCID(tempKey);
    
    if (!cid) {
      throw new Error('Failed to get CID after storing');
    }

    // Publish to Service IPNS
    const ipns = await this.storage.publishToIPNS(cid, this.ipnsKeyName);

    console.log(`✅ Service Keystone published: CID=${cid}, IPNS=${ipns}`);

    return { cid, ipns };
  }

  /**
   * Get current version
   */
  getVersion(): number {
    return this.version;
  }
}
