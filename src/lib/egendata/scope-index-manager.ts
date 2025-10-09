import { ScopeIndex, ServiceDefinition } from './types';

/**
 * Manages Scope Index - lists authorized Write Nodes
 */
export class ScopeIndexManager {
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

    return true;
  }
}
