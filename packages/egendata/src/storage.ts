import { StorageAdapter, StoredData } from './types';

/**
 * In-memory storage implementation
 * Detta kommer senare ersättas med IPFS
 */
export class InMemoryStorage implements StorageAdapter {
  private store: Map<string, StoredData> = new Map();

  async get(key: string): Promise<StoredData | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, data: StoredData): Promise<void> {
    this.store.set(key, data);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  // Utility method for debugging
  clear(): void {
    this.store.clear();
  }
}
