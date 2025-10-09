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
    ipnsName?: string;
    ipnsVersion?: number;
  };
}

export interface StorageAdapter {
  get(key: string): Promise<StoredData | null>;
  set(key: string, data: StoredData): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

// Write Nodes & DAG Types

export interface ServicePolicy {
  merge: 'by-id' | 'append' | 'replace';
  retentionDays?: number;
}

export interface ServiceDefinition {
  id: string;
  serviceIpns: string;
  scopes: string[];
  policy: ServicePolicy;
}

export interface AuthorizedServices {
  type: 'egendata.authorizedServices';
  schema: string;
  owner: string;
  created: string;
  version: number;
  services: ServiceDefinition[];
}

export interface ServiceMetadata {
  version: number;
  producer: string;
  created: string;
}

export interface ServiceKeystone {
  type: 'egendata.keystone.service';
  schema: string;
  domain: string;
  keyring: {
    name: string;
    wrappedKey: string;
  }[];
  payload: string;
  metadata: ServiceMetadata;
}

export interface AggregationInfo {
  authorizedServicesCid: string;
  servicesIncluded: string[];
  missingServices: string[];
}

export interface AggregationMetadata {
  version: number;
  created: string;
  aggregation: AggregationInfo;
  mountIndexCid?: string;
}

export interface AggregationKeystone {
  type: 'egendata.keystone.aggregation';
  schema: string;
  keyring: {
    name: string;
    wrappedKey: string;
  }[];
  payload: string;
  metadata: AggregationMetadata;
}

export interface MountEntry {
  path: string;
  target: string;
}

export interface MountIndex {
  type: 'egendata.mountIndex';
  schema: string;
  mounts: MountEntry[];
}

export interface IPNSKey {
  name: string;
  id: string;
}
