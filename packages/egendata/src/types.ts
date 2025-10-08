import * as jose from 'jose';

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyJWK: jose.JWK;
}

export interface Keystone {
  encryptedKey: string;
  recipients: {
    name: string;
    encryptedDEK: string;
  }[];
}

export interface StoredData {
  encryptedData: string;
  keystone: Keystone;
  metadata: {
    createdAt: number;
    updatedAt: number;
    owner: string;
  };
}

export interface StorageAdapter {
  get(key: string): Promise<StoredData | null>;
  set(key: string, data: StoredData): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}
