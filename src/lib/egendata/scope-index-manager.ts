import { ScopeIndex, ServiceDefinition, StorageAdapter } from './types';

/**
 * Manages Scope Index - lists authorized Write Nodes
 */
export class ScopeIndexManager {
  private storage?: StorageAdapter;

  constructor(storage?: StorageAdapter) {
    this.storage = storage;
  }
  /**
   * Create a new Scope Index
   */
  createScopeIndex(owner: string): ScopeIndex {
    return {
      type: 'egendata.scopeIndex',
      schema: '1.0',
      owner,
      created: new Date().toISOString(),
      version: 1,
      services: []
    };
  }

  /**
   * Add a service to the Scope Index (returns new immutable version)
   */
  addService(scopeIndex: ScopeIndex, service: ServiceDefinition): ScopeIndex {
    return {
      ...scopeIndex,
      version: scopeIndex.version + 1,
      services: [...scopeIndex.services, service]
    };
  }

  /**
   * Remove a service from the Scope Index (returns new immutable version)
   */
  removeService(scopeIndex: ScopeIndex, serviceId: string): ScopeIndex {
    return {
      ...scopeIndex,
      version: scopeIndex.version + 1,
      services: scopeIndex.services.filter(s => s.id !== serviceId)
    };
  }

  /**
   * Update a service in the Scope Index (returns new immutable version)
   */
  updateService(scopeIndex: ScopeIndex, serviceId: string, updates: Partial<ServiceDefinition>): ScopeIndex {
    return {
      ...scopeIndex,
      version: scopeIndex.version + 1,
      services: scopeIndex.services.map(s => 
        s.id === serviceId ? { ...s, ...updates } : s
      )
    };
  }

  /**
   * Get a service by ID
   */
  getService(scopeIndex: ScopeIndex, serviceId: string): ServiceDefinition | undefined {
    return scopeIndex.services.find(s => s.id === serviceId);
  }

  /**
   * Validate Scope Index structure
   */
  validate(scopeIndex: ScopeIndex): boolean {
    if (scopeIndex.type !== 'egendata.scopeIndex') return false;
    if (!scopeIndex.owner || !scopeIndex.created) return false;
    if (!Array.isArray(scopeIndex.services)) return false;
    
    // Check for duplicate service IDs
    const ids = scopeIndex.services.map(s => s.id);
    if (new Set(ids).size !== ids.length) return false;

    // Validate service definitions
    for (const service of scopeIndex.services) {
      if (!service.id || !service.serviceIpns || !Array.isArray(service.scopes)) {
        return false;
      }
      if (!service.policy || !['by-id', 'append', 'replace'].includes(service.policy.merge)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Publish Scope Index to storage and return CID
   */
  async publishScopeIndex(scopeIndex: ScopeIndex): Promise<string> {
    if (!this.storage) {
      throw new Error('Storage adapter not configured');
    }

    if (!this.validate(scopeIndex)) {
      throw new Error('Invalid Scope Index structure');
    }

    const key = `scope-index-${scopeIndex.owner}-${scopeIndex.version}`;
    
    // Store as a pseudo-StoredData structure (Scope Index is public metadata)
    await this.storage.set(key, {
      encryptedData: JSON.stringify(scopeIndex),
      keystone: {
        encryptedKey: '',
        recipients: []
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        owner: scopeIndex.owner
      }
    });

    // Return CID if storage adapter supports it
    if ('getCID' in this.storage && typeof this.storage.getCID === 'function') {
      const cid = this.storage.getCID(key);
      if (!cid) {
        throw new Error('Failed to get CID from storage');
      }
      return cid;
    }

    // Fallback: return the key as identifier
    return key;
  }
}
