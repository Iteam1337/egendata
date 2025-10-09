import { AuthorizedServices, ServiceDefinition, StorageAdapter } from './types';

/**
 * Manages Authorized Services - lists authorized Write Nodes
 */
export class AuthorizedServicesManager {
  private storage?: StorageAdapter;

  constructor(storage?: StorageAdapter) {
    this.storage = storage;
  }

  /**
   * Create a new Authorized Services registry
   */
  createAuthorizedServices(owner: string): AuthorizedServices {
    return {
      type: 'egendata.authorizedServices',
      schema: '1.0',
      owner,
      created: new Date().toISOString(),
      version: 1,
      services: []
    };
  }

  /**
   * Add a service to the Authorized Services (returns new immutable version)
   */
  addService(authorizedServices: AuthorizedServices, service: ServiceDefinition): AuthorizedServices {
    return {
      ...authorizedServices,
      version: authorizedServices.version + 1,
      services: [...authorizedServices.services, service]
    };
  }

  /**
   * Remove a service from the Authorized Services (returns new immutable version)
   */
  removeService(authorizedServices: AuthorizedServices, serviceId: string): AuthorizedServices {
    return {
      ...authorizedServices,
      version: authorizedServices.version + 1,
      services: authorizedServices.services.filter(s => s.id !== serviceId)
    };
  }

  /**
   * Update a service in the Authorized Services (returns new immutable version)
   */
  updateService(authorizedServices: AuthorizedServices, serviceId: string, updates: Partial<ServiceDefinition>): AuthorizedServices {
    return {
      ...authorizedServices,
      version: authorizedServices.version + 1,
      services: authorizedServices.services.map(s => 
        s.id === serviceId ? { ...s, ...updates } : s
      )
    };
  }

  /**
   * Get a service by ID
   */
  getService(authorizedServices: AuthorizedServices, serviceId: string): ServiceDefinition | undefined {
    return authorizedServices.services.find(s => s.id === serviceId);
  }

  /**
   * Validate Authorized Services structure
   */
  validate(authorizedServices: AuthorizedServices): boolean {
    if (authorizedServices.type !== 'egendata.authorizedServices') return false;
    if (!authorizedServices.owner || !authorizedServices.created) return false;
    if (!Array.isArray(authorizedServices.services)) return false;
    
    // Check for duplicate service IDs
    const ids = authorizedServices.services.map(s => s.id);
    if (new Set(ids).size !== ids.length) return false;

    // Validate service definitions
    for (const service of authorizedServices.services) {
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
   * Publish Authorized Services to storage and return CID
   */
  async publishAuthorizedServices(authorizedServices: AuthorizedServices): Promise<string> {
    if (!this.storage) {
      throw new Error('Storage adapter not configured');
    }

    if (!this.validate(authorizedServices)) {
      throw new Error('Invalid Authorized Services structure');
    }

    const key = `authorized-services-${authorizedServices.owner}-${authorizedServices.version}`;
    
    // Store as a pseudo-StoredData structure (Authorized Services is public metadata)
    await this.storage.set(key, {
      encryptedData: JSON.stringify(authorizedServices),
      keystone: {
        encryptedKey: '',
        recipients: []
      },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        owner: authorizedServices.owner
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
