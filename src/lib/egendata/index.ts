export { EgendataClient } from './client';
export { InMemoryStorage } from './storage';
export { IPFSStorage } from './ipfs-storage';
export { WriteNode } from './write-node';
export { Aggregator } from './aggregator';
export { ScopeIndexManager } from './scope-index-manager';
export { MountIndexManager } from './mount-index-manager';
export type { 
  KeyPair, 
  Keystone, 
  StoredData, 
  StorageAdapter,
  ScopeIndex,
  ServiceDefinition,
  ServicePolicy,
  ServiceKeystone,
  AggregationKeystone,
  MountIndex,
  MountEntry,
  IPNSKey
} from './types';
