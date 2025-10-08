import { describe, it, expect, beforeEach } from 'vitest';
import { EgendataClient } from './client';
import { InMemoryStorage } from './storage';
import type { KeyPair } from './types';

describe('EgendataClient', () => {
  let client: EgendataClient;
  let aliceKeys: KeyPair;
  let bobKeys: KeyPair;

  beforeEach(async () => {
    client = new EgendataClient(new InMemoryStorage());
    aliceKeys = await client.generateKeyPair('Alice');
    bobKeys = await client.generateKeyPair('Bob');
  });

  describe('Key Management', () => {
    it('should generate a key pair', async () => {
      const keys = await client.generateKeyPair('TestUser');
      expect(keys).toHaveProperty('publicKey');
      expect(keys).toHaveProperty('privateKey');
      expect(keys).toHaveProperty('publicKeyJWK');
    });

    it('should retrieve a stored key pair', async () => {
      const retrieved = client.getKeyPair('Alice');
      expect(retrieved).toBeDefined();
      expect(retrieved?.publicKey).toBe(aliceKeys.publicKey);
    });

    it('should return undefined for non-existent key pair', () => {
      const retrieved = client.getKeyPair('NonExistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Data Writing and Reading', () => {
    const testData = { 
      message: 'Secret medical data',
      timestamp: Date.now() 
    };

    it('should write and read data successfully', async () => {
      await client.writeData(
        'test-data-1',
        testData,
        'Alice',
        [
          { name: 'Alice', publicKey: aliceKeys.publicKey },
          { name: 'Bob', publicKey: bobKeys.publicKey }
        ]
      );

      const decrypted = await client.readData(
        'test-data-1',
        'Bob',
        bobKeys.privateKey
      );

      expect(decrypted).toEqual(testData);
    });

    it('should throw error when recipient not found', async () => {
      await client.writeData(
        'test-data-2',
        testData,
        'Alice',
        [{ name: 'Alice', publicKey: aliceKeys.publicKey }]
      );

      await expect(
        client.readData('test-data-2', 'Bob', bobKeys.privateKey)
      ).rejects.toThrow('Recipient Bob not found');
    });

    it('should throw error when data not found', async () => {
      await expect(
        client.readData('non-existent', 'Alice', aliceKeys.privateKey)
      ).rejects.toThrow('Data not found');
    });
  });

  describe('Access Control', () => {
    const testData = { secret: 'confidential' };

    beforeEach(async () => {
      await client.writeData(
        'access-test',
        testData,
        'Alice',
        [
          { name: 'Alice', publicKey: aliceKeys.publicKey },
          { name: 'Bob', publicKey: bobKeys.publicKey }
        ]
      );
    });

    it('should revoke access successfully', async () => {
      // Bob can read initially
      const data = await client.readData('access-test', 'Bob', bobKeys.privateKey);
      expect(data).toEqual(testData);

      // Revoke Bob's access
      await client.revokeAccess('access-test', 'Bob');

      // Bob can no longer read
      await expect(
        client.readData('access-test', 'Bob', bobKeys.privateKey)
      ).rejects.toThrow('Recipient Bob not found');

      // Alice can still read
      const aliceData = await client.readData('access-test', 'Alice', aliceKeys.privateKey);
      expect(aliceData).toEqual(testData);
    });

    it('should re-grant access successfully', async () => {
      // Revoke Bob's access
      await client.revokeAccess('access-test', 'Bob');

      // Re-grant access
      await client.reGrantAccess(
        'access-test',
        'Bob',
        bobKeys.publicKey,
        aliceKeys.privateKey
      );

      // Bob can read again
      const data = await client.readData('access-test', 'Bob', bobKeys.privateKey);
      expect(data).toEqual(testData);
    });

    it('should list recipients correctly', async () => {
      const recipients = await client.listRecipients('access-test');
      expect(recipients).toContain('Alice');
      expect(recipients).toContain('Bob');
      expect(recipients).toHaveLength(2);
    });
  });

  describe('Data Updates', () => {
    it('should update data while preserving access control', async () => {
      const originalData = { version: 1 };
      const updatedData = { version: 2 };

      await client.writeData(
        'update-test',
        originalData,
        'Alice',
        [
          { name: 'Alice', publicKey: aliceKeys.publicKey },
          { name: 'Bob', publicKey: bobKeys.publicKey }
        ]
      );

      await client.updateData('update-test', updatedData, 'Alice');

      // Both recipients can read updated data
      const aliceRead = await client.readData('update-test', 'Alice', aliceKeys.privateKey);
      const bobRead = await client.readData('update-test', 'Bob', bobKeys.privateKey);

      expect(aliceRead).toEqual(updatedData);
      expect(bobRead).toEqual(updatedData);
    });
  });

  describe('Data Deletion', () => {
    it('should delete data successfully', async () => {
      await client.writeData(
        'delete-test',
        { data: 'to be deleted' },
        'Alice',
        [{ name: 'Alice', publicKey: aliceKeys.publicKey }]
      );

      await client.deleteData('delete-test');

      await expect(
        client.readData('delete-test', 'Alice', aliceKeys.privateKey)
      ).rejects.toThrow('Data not found');
    });
  });

  describe('Metadata', () => {
    it('should retrieve metadata correctly', async () => {
      await client.writeData(
        'metadata-test',
        { data: 'test' },
        'Alice',
        [{ name: 'Alice', publicKey: aliceKeys.publicKey }]
      );

      const metadata = await client.getMetadata('metadata-test');
      expect(metadata).toBeDefined();
      expect(metadata?.owner).toBe('Alice');
      expect(metadata?.createdAt).toBeDefined();
      expect(metadata?.updatedAt).toBeDefined();
    });

    it('should return null for non-existent metadata', async () => {
      const metadata = await client.getMetadata('non-existent');
      expect(metadata).toBeNull();
    });
  });
});
