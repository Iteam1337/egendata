import { Mounts, MountEntry, StorageAdapter } from './types';

/**
 * Manages Mounts for Path Composition pattern
 */
export class MountsManager {
  private storage?: StorageAdapter;

  constructor(storage?: StorageAdapter) {
    this.storage = storage;
  }
  /**
   * Create a new Mounts registry
   */
  createMounts(): Mounts {
    return {
      type: 'egendata.mounts',
      schema: '1.0',
      mounts: []
    };
  }

  /**
   * Add a mount to the registry (returns new immutable version)
   */
  addMount(mounts: Mounts, path: string, targetIPNS: string): Mounts {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    return {
      ...mounts,
      mounts: [
        ...mounts.mounts.filter(m => m.path !== normalizedPath),
        { path: normalizedPath, target: targetIPNS }
      ]
    };
  }

  /**
   * Remove a mount from the registry (returns new immutable version)
   */
  removeMount(mounts: Mounts, path: string): Mounts {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    return {
      ...mounts,
      mounts: mounts.mounts.filter(m => m.path !== normalizedPath)
    };
  }

  /**
   * Get mount target for a given path
   */
  getMount(mounts: Mounts, path: string): string | null {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const mount = mounts.mounts.find(m => m.path === normalizedPath);
    return mount?.target || null;
  }

  /**
   * Resolve a path to its target IPNS
   */
  resolvePath(mounts: Mounts, path: string): string | null {
    // Find longest matching mount
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    let bestMatch: MountEntry | null = null;
    let bestMatchLength = 0;

    for (const mount of mounts.mounts) {
      if (normalizedPath.startsWith(mount.path) && mount.path.length > bestMatchLength) {
        bestMatch = mount;
        bestMatchLength = mount.path.length;
      }
    }

    return bestMatch?.target || null;
  }

  /**
   * Validate Mounts structure
   */
  validate(mounts: Mounts): boolean {
    if (mounts.type !== 'egendata.mounts') return false;
    if (!Array.isArray(mounts.mounts)) return false;

    // Check for duplicate paths
    const paths = mounts.mounts.map(m => m.path);
    if (new Set(paths).size !== paths.length) return false;

    return true;
  }

  /**
   * Publish Mounts to storage and return CID
   */
  async publishMounts(mounts: Mounts): Promise<string> {
    if (!this.storage) {
      throw new Error('StorageAdapter not configured');
    }

    if (!this.validate(mounts)) {
      throw new Error('Invalid Mounts structure');
    }

    // Store as pseudo-StoredData structure
    const key = `mounts-${Date.now()}`;
    const pseudoStoredData = {
      encryptedData: JSON.stringify(mounts),
      keystone: { encryptedKey: '', recipients: [] },
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        owner: 'system'
      }
    };

    await this.storage.set(key, pseudoStoredData);

    // Return CID if storage adapter supports it
    if ('getCID' in this.storage && typeof this.storage.getCID === 'function') {
      const cid = (this.storage as any).getCID(key);
      if (cid) return cid;
    }

    return key;
  }
}
