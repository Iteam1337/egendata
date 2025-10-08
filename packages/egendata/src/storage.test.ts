import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorage } from './storage';
import type { StoredData } from './types';

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage;
  const mockData: StoredData = {
    encryptedData: 'encrypted-test-data',
    keystone: {
      encryptedKey: 'encrypted-dek',
      recipients: [
        { name: 'Alice', encryptedDEK: 'alice-dek' },
        { name: 'Bob', encryptedDEK: 'bob-dek' }
      ]
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      owner: 'Alice'
    }
  };

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve data', async () => {
      await storage.set('test-key', mockData);
      const retrieved = await storage.get('test-key');
      
      expect(retrieved).toEqual(mockData);
    });

    it('should return null for non-existent key', async () => {
      const retrieved = await storage.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should delete data', async () => {
      await storage.set('test-key', mockData);
      await storage.delete('test-key');
      const retrieved = await storage.get('test-key');
      
      expect(retrieved).toBeNull();
    });

    it('should list all keys', async () => {
      await storage.set('key1', mockData);
      await storage.set('key2', mockData);
      await storage.set('key3', mockData);

      const keys = await storage.list();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
      expect(keys).toHaveLength(3);
    });

    it('should clear all data', async () => {
      await storage.set('key1', mockData);
      await storage.set('key2', mockData);
      
      storage.clear();
      
      const keys = await storage.list();
      expect(keys).toHaveLength(0);
    });
  });

  describe('Data Integrity', () => {
    it('should store independent copies of data', async () => {
      const data1 = { ...mockData };
      const data2 = { ...mockData, encryptedData: 'different-data' };

      await storage.set('key1', data1);
      await storage.set('key2', data2);

      const retrieved1 = await storage.get('key1');
      const retrieved2 = await storage.get('key2');

      expect(retrieved1?.encryptedData).toBe('encrypted-test-data');
      expect(retrieved2?.encryptedData).toBe('different-data');
    });

    it('should handle updates correctly', async () => {
      await storage.set('key', mockData);
      
      const updatedData = {
        ...mockData,
        encryptedData: 'updated-data'
      };
      await storage.set('key', updatedData);

      const retrieved = await storage.get('key');
      expect(retrieved?.encryptedData).toBe('updated-data');
    });
  });
});
