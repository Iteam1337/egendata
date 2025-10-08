import { createHelia, Helia } from 'helia';
import { json } from '@helia/json';
import type { JSON as HeliaJSON } from '@helia/json';
import { StorageAdapter, StoredData } from './types';
import type { CID } from 'multiformats/cid';

/**
 * IPFS-based storage with Helia
 * Enables decentralized sharing between devices
 */
export class IPFSStorage implements StorageAdapter {
  private node: Helia | null = null;
  private jsonStore: HeliaJSON | null = null;
  private cidMap: Map<string, CID> = new Map();
  private initialized = false;

  /**
   * Initializes Helia node - must run before use
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('✅ IPFS already initialized');
      return;
    }

    console.log('🚀 Starting Helia node...');
    
    try {
      // Create Helia node
      this.node = await createHelia();
      console.log('✅ Helia node created');
      
      // Create JSON store
      this.jsonStore = json(this.node);
      console.log('✅ JSON store created');
      
      this.initialized = true;
      console.log('✅ IPFS fully initialized and ready!');
    } catch (error) {
      console.error('❌ Error initializing Helia:', error);
      this.initialized = false;
      this.node = null;
      this.jsonStore = null;
      throw new Error(`IPFS initialization failed: ${error}`);
    }
  }

  /**
   * Stores data in IPFS and returns CID
   */
  async set(key: string, data: StoredData): Promise<void> {
    if (!this.initialized || !this.jsonStore || !this.node) {
      throw new Error(`IPFS not ready. Initialized: ${this.initialized}, Node: ${!!this.node}, JsonStore: ${!!this.jsonStore}`);
    }

    try {
      console.log(`📦 Storing data with key: ${key}...`);
      
      // Store data in IPFS and get back CID
      const cid = await this.jsonStore.add(data);
      this.cidMap.set(key, cid);
      
      console.log(`✅ Data stored in IPFS with CID: ${cid.toString()}`);
      
      // Save mapping in localStorage for persistence
      this.saveCIDMapping();
    } catch (error) {
      console.error('❌ Error storing in IPFS:', error);
      throw error;
    }
  }

  /**
   * Fetches data from IPFS via key (uses local CID mapping)
   */
  async get(key: string): Promise<StoredData | null> {
    if (!this.initialized) {
      console.warn('⚠️ IPFS not initialized, returning null');
      return null;
    }
    
    const cid = this.cidMap.get(key);
    if (!cid) {
      console.log(`⚠️ No CID found for key: ${key}`);
      return null;
    }

    return this.getByCID(cid);
  }

  /**
   * Fetches data directly from IPFS via CID
   * Used when receiving CID from QR code
   */
  async getByCID(cid: CID | string): Promise<StoredData | null> {
    if (!this.initialized || !this.jsonStore) {
      throw new Error('IPFS not initialized');
    }

    try {
      const cidObj = typeof cid === 'string' ? await this.parseCID(cid) : cid;
      console.log(`📥 Fetching data from IPFS CID: ${cidObj.toString()}`);
      
      const data = await this.jsonStore.get(cidObj);
      return data as StoredData;
    } catch (error) {
      console.error('❌ Error fetching from IPFS:', error);
      return null;
    }
  }

  /**
   * Deletes data (removes local CID mapping)
   */
  async delete(key: string): Promise<void> {
    this.cidMap.delete(key);
    this.saveCIDMapping();
  }

  /**
   * Lists all stored keys
   */
  async list(): Promise<string[]> {
    return Array.from(this.cidMap.keys());
  }

  /**
   * Gets CID for a given key
   */
  getCID(key: string): string | null {
    const cid = this.cidMap.get(key);
    return cid ? cid.toString() : null;
  }

  /**
   * Adds a CID mapping (used when receiving data via QR)
   */
  async setCIDMapping(key: string, cidString: string): Promise<void> {
    const cid = await this.parseCID(cidString);
    this.cidMap.set(key, cid);
    this.saveCIDMapping();
  }

  /**
   * Shuts down Helia node
   */
  async stop(): Promise<void> {
    if (this.node) {
      await this.node.stop();
      this.node = null;
      this.jsonStore = null;
      this.initialized = false;
    }
  }

  // Private helpers

  private async parseCID(cidString: string): Promise<CID> {
    const { CID } = await import('multiformats/cid');
    return CID.parse(cidString);
  }

  private saveCIDMapping(): void {
    try {
      const mapping: Record<string, string> = {};
      this.cidMap.forEach((cid, key) => {
        mapping[key] = cid.toString();
      });
      localStorage.setItem('ipfs-cid-mapping', JSON.stringify(mapping));
      console.log('💾 CID mappings saved');
    } catch (error) {
      console.error('❌ Could not save CID mappings:', error);
    }
  }

  private async loadCIDMapping(): Promise<void> {
    try {
      const saved = localStorage.getItem('ipfs-cid-mapping');
      if (saved) {
        const mapping = JSON.parse(saved);
        for (const [key, cidString] of Object.entries(mapping)) {
          const cid = await this.parseCID(cidString as string);
          this.cidMap.set(key, cid);
        }
        console.log('✅ CID mappings loaded');
      }
    } catch (error) {
      console.error('❌ Error loading CID mapping:', error);
    }
  }

  /**
   * Loads existing CID mappings from localStorage
   */
  async restore(): Promise<void> {
    if (!this.initialized) {
      console.warn('⚠️ Cannot restore, IPFS not initialized');
      return;
    }
    await this.loadCIDMapping();
  }
}
