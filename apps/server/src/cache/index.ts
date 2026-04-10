/**
 * Cache Module
 * Provides caching functionality for BridgeAI API
 */

export {
  // Core operations
  get,
  set,
  del,
  delPattern,
  exists,
  getOrSet,
  mget,
  mset,
  incr,
  decr,
  expire,
  ttl,
  clear,
  acquireLock,
  warmCache,
  invalidateNamespace,

  // Statistics
  getStats,
  resetStats,

  // Constants
  CacheNamespaces,
} from './redis';

// Re-export default
export { default } from './redis';
