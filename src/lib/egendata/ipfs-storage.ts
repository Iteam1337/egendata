import { createHelia, Helia } from 'helia';
import { json } from '@helia/json';
import type { JSON as HeliaJSON } from '@helia/json';
import { StorageAdapter, StoredData } from './types';
import type { CID } from 'multiformats/cid';

/**
 * IPFS-baserad lagring med Helia
 * Möjliggör decentraliserad delning mellan enheter
 */
export class IPFSStorage implements StorageAdapter {
  private node: Helia | null = null;
  private jsonStore: HeliaJSON | null = null;
  private cidMap: Map<string, CID> = new Map();
  private initialized = false;

  /**
   * Initialiserar Helia node - måste köras innan användning
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('✅ IPFS redan initialiserad');
      return;
    }

    console.log('🚀 Startar Helia node...');
    
    try {
      // Skapa Helia node
      this.node = await createHelia();
      console.log('✅ Helia node skapad');
      
      // Skapa JSON store
      this.jsonStore = json(this.node);
      console.log('✅ JSON store skapad');
      
      this.initialized = true;
      console.log('✅ IPFS helt initialiserad och redo!');
    } catch (error) {
      console.error('❌ Fel vid initialisering av Helia:', error);
      this.initialized = false;
      this.node = null;
      this.jsonStore = null;
      throw new Error(`IPFS initialisering misslyckades: ${error}`);
    }
  }

  /**
   * Lagrar data i IPFS och returnerar CID
   */
  async set(key: string, data: StoredData): Promise<void> {
    if (!this.initialized || !this.jsonStore || !this.node) {
      throw new Error(`IPFS inte redo. Initialized: ${this.initialized}, Node: ${!!this.node}, JsonStore: ${!!this.jsonStore}`);
    }

    try {
      console.log(`📦 Lagrar data med key: ${key}...`);
      
      // Lagra data i IPFS och få tillbaka CID
      const cid = await this.jsonStore.add(data);
      this.cidMap.set(key, cid);
      
      console.log(`✅ Data lagrad i IPFS med CID: ${cid.toString()}`);
      
      // Spara mapping i localStorage för persistence
      this.saveCIDMapping();
    } catch (error) {
      console.error('❌ Fel vid lagring i IPFS:', error);
      throw error;
    }
  }

  /**
   * Hämtar data från IPFS via key (använder lokal CID mapping)
   */
  async get(key: string): Promise<StoredData | null> {
    if (!this.initialized) {
      console.warn('⚠️ IPFS inte initialiserad, returnerar null');
      return null;
    }
    
    const cid = this.cidMap.get(key);
    if (!cid) {
      console.log(`⚠️ Ingen CID hittad för key: ${key}`);
      return null;
    }

    return this.getByCID(cid);
  }

  /**
   * Hämtar data direkt från IPFS via CID
   * Används när man får CID från QR-kod
   */
  async getByCID(cid: CID | string): Promise<StoredData | null> {
    if (!this.initialized || !this.jsonStore) {
      throw new Error('IPFS inte initialiserad');
    }

    try {
      const cidObj = typeof cid === 'string' ? await this.parseCID(cid) : cid;
      console.log(`📥 Hämtar data från IPFS CID: ${cidObj.toString()}`);
      
      const data = await this.jsonStore.get(cidObj);
      return data as StoredData;
    } catch (error) {
      console.error('❌ Fel vid hämtning från IPFS:', error);
      return null;
    }
  }

  /**
   * Tar bort data (tar bort lokal CID mapping)
   */
  async delete(key: string): Promise<void> {
    this.cidMap.delete(key);
    this.saveCIDMapping();
  }

  /**
   * Listar alla lagrade nycklar
   */
  async list(): Promise<string[]> {
    return Array.from(this.cidMap.keys());
  }

  /**
   * Hämtar CID för en given key
   */
  getCID(key: string): string | null {
    const cid = this.cidMap.get(key);
    return cid ? cid.toString() : null;
  }

  /**
   * Lägger till en CID mapping (används när man tar emot data via QR)
   */
  async setCIDMapping(key: string, cidString: string): Promise<void> {
    const cid = await this.parseCID(cidString);
    this.cidMap.set(key, cid);
    this.saveCIDMapping();
  }

  /**
   * Stänger ner Helia node
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
      console.log('💾 CID mappings sparade');
    } catch (error) {
      console.error('❌ Kunde inte spara CID mappings:', error);
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
        console.log('✅ CID mappings laddade');
      }
    } catch (error) {
      console.error('❌ Fel vid laddning av CID mapping:', error);
    }
  }

  /**
   * Laddar befintliga CID mappings från localStorage
   */
  async restore(): Promise<void> {
    if (!this.initialized) {
      console.warn('⚠️ Kan inte restore, IPFS inte initialiserad');
      return;
    }
    await this.loadCIDMapping();
  }
}
