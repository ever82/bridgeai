/**
 * Fallback Strategies Index
 * 导出所有降级策略
 */

export {
  FallbackStrategy,
  FallbackContext,
  FallbackResult,
  ResponseCache,
  ModelDowngradeStrategy,
  ProviderSwitchStrategy,
  CacheFallbackStrategy,
  SimplifiedOutputStrategy,
  AsyncQueueFallbackStrategy,
  FallbackChain,
  createDefaultFallbackChain
} from './strategies';
