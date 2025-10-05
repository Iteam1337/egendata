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
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  /**
   * Initialiserar Helia node
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ IPFS redan initialiserad');
      return;
    }
    
    if (this.initPromise) {
      console.log('⏳ Väntar på pågående initialisering...');
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        console.log('🚀 Startar Helia node...');
        this.node = await createHelia();
        console.log('✅ Helia node skapad, initierar JSON store...');
        
        this.jsonStore = json(this.node);
        console.log('✅ JSON store skapad');
        
        this.isInitialized = true;
        console.log('✅ Helia node redo!', { 
          hasNode: !!this.node, 
          hasJsonStore: !!this.jsonStore 
        });
      } catch (error) {
        console.error('❌ Fel vid initialisering av Helia:', error);
        this.isInitialized = false;
        this.node = null;
        this.jsonStore = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Lagrar data i IPFS och returnerar CID
   */
  async set(key: string, data: StoredData): Promise<void> {
    await this.ensureInitialized();
    
    if (!this.jsonStore || !this.node) {
      throw new Error(`IPFS är inte korrekt initialiserad. Node: ${!!this.node}, JsonStore: ${!!this.jsonStore}`);
    }

    try {
      console.log(`📦 Lagrar data med key: ${key}`);
      // Lagra data i IPFS och få tillbaka CID
      const cid = await this.jsonStore.add(data);
      this.cidMap.set(key, cid);
      
      console.log(`📦 Data lagrad i IPFS med CID: ${cid.toString()}`);
      
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
    await this.ensureInitialized();
    
    const cid = this.cidMap.get(key);
    if (!cid) {
      return null;
    }

    return this.getByCID(cid);
  }

  /**
   * Hämtar data direkt från IPFS via CID
   * Används när man får CID från QR-kod
   */
  async getByCID(cid: CID | string): Promise<StoredData | null> {
    await this.ensureInitialized();
    
    if (!this.jsonStore) {
      throw new Error('IPFS JSON store inte initialiserad');
    }

    try {
      const cidObj = typeof cid === 'string' ? await this.parseCID(cid) : cid;
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
      this.isInitialized = false;
    }
  }

  // Private helpers

  private async ensureInitialized(): Promise<void> {
    console.log('🔍 ensureInitialized called. State:', {
      isInitialized: this.isInitialized,
      hasNode: !!this.node,
      hasJsonStore: !!this.jsonStore,
      hasInitPromise: !!this.initPromise
    });
    
    if (!this.isInitialized) {
      console.log('⚠️ Not initialized, calling initialize()');
      await this.initialize();
    }
    
    console.log('🔍 After initialization check:', {
      isInitialized: this.isInitialized,
      hasNode: !!this.node,
      hasJsonStore: !!this.jsonStore
    });
  }

  private async parseCID(cidString: string): Promise<CID> {
    // Dynamisk import för att undvika bundling issues
    const { CID } = await import('multiformats/cid');
    return CID.parse(cidString);
  }

  private saveCIDMapping(): void {
    const mapping: Record<string, string> = {};
    this.cidMap.forEach((cid, key) => {
      mapping[key] = cid.toString();
    });
    localStorage.setItem('ipfs-cid-mapping', JSON.stringify(mapping));
  }

  private async loadCIDMapping(): Promise<void> {
    const saved = localStorage.getItem('ipfs-cid-mapping');
    if (saved) {
      try {
        const mapping = JSON.parse(saved);
        for (const [key, cidString] of Object.entries(mapping)) {
          const cid = await this.parseCID(cidString as string);
          this.cidMap.set(key, cid);
        }
      } catch (error) {
        console.error('❌ Fel vid laddning av CID mapping:', error);
      }
    }
  }

  /**
   * Laddar befintliga CID mappings från localStorage
   */
  async restore(): Promise<void> {
    await this.ensureInitialized();
    await this.loadCIDMapping();
  }
}
