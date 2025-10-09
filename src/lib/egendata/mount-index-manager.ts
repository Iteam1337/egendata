import { MountIndex, MountEntry } from './types';

/**
 * Manages Mount Index for Path Composition pattern
 */
export class MountIndexManager {
  /**
   * Create a new Mount Index
   */
  createMountIndex(): MountIndex {
    return {
      type: 'egendata.mountIndex',
      schema: '1.0',
      mounts: []
    };
  }

  /**
   * Add a mount to the index (returns new immutable version)
   */
  addMount(mountIndex: MountIndex, path: string, targetIPNS: string): MountIndex {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    return {
      ...mountIndex,
      mounts: [
        ...mountIndex.mounts.filter(m => m.path !== normalizedPath),
        { path: normalizedPath, target: targetIPNS }
      ]
    };
  }

  /**
   * Remove a mount from the index (returns new immutable version)
   */
  removeMount(mountIndex: MountIndex, path: string): MountIndex {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    return {
      ...mountIndex,
      mounts: mountIndex.mounts.filter(m => m.path !== normalizedPath)
    };
  }

  /**
   * Get mount target for a given path
   */
  getMount(mountIndex: MountIndex, path: string): string | null {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const mount = mountIndex.mounts.find(m => m.path === normalizedPath);
    return mount?.target || null;
  }

  /**
   * Resolve a path to its target IPNS
   */
  resolvePath(mountIndex: MountIndex, path: string): string | null {
    // Find longest matching mount
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    let bestMatch: MountEntry | null = null;
    let bestMatchLength = 0;

    for (const mount of mountIndex.mounts) {
      if (normalizedPath.startsWith(mount.path) && mount.path.length > bestMatchLength) {
        bestMatch = mount;
        bestMatchLength = mount.path.length;
      }
    }

    return bestMatch?.target || null;
  }

  /**
   * Validate Mount Index structure
   */
  validate(mountIndex: MountIndex): boolean {
    if (mountIndex.type !== 'egendata.mountIndex') return false;
    if (!Array.isArray(mountIndex.mounts)) return false;

    // Check for duplicate paths
    const paths = mountIndex.mounts.map(m => m.path);
    if (new Set(paths).size !== paths.length) return false;

    return true;
  }
}
