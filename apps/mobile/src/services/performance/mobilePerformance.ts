/**
 * Mobile Performance Monitoring Service
 *
 * Provides startup timing, frame rate monitoring, memory tracking,
 * image cache performance, and network traffic analysis.
 * Targets: startup < 3s, scroll 60fps, memory < 150MB active.
 */

import { InteractionManager } from 'react-native';

// Lazy getter to avoid circular dependency with imageCache
function getImageCacheStats(): { totalSize: number; totalEntries: number } {
  try {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const { imageCache } =
      require('../../utils/imageCache') as typeof import('../../utils/imageCache');
    /* eslint-enable @typescript-eslint/no-var-requires */
    return imageCache.getStats();
  } catch {
    return { totalSize: 0, totalEntries: 0 };
  }
}

// --- Types ---

export interface StartupMetrics {
  appInitStart: number;
  appInitEnd: number;
  navigationReady: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
  totalStartupMs: number;
}

export interface FrameMetrics {
  timestamp: number;
  frameTimeMs: number;
  droppedFrames: number;
  fps: number;
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsedMB: number;
  jsHeapSizeMB: number;
  cacheSizeMB: number;
  cacheEntries: number;
}

export interface ImageCacheMetrics {
  hitRate: number;
  missRate: number;
  avgLoadTimeMs: number;
  totalSizeMB: number;
  entryCount: number;
  evictionCount: number;
}

export interface NetworkMetrics {
  totalRequests: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  totalBytesReceived: number;
  failedRequests: number;
  cacheHitRate: number;
}

export interface PerformanceReport {
  startup: StartupMetrics | null;
  frameRate: {
    avgFps: number;
    minFps: number;
    droppedFrameCount: number;
    totalFrames: number;
  };
  memory: {
    peakMB: number;
    avgMB: number;
    snapshots: number;
  };
  imageCache: ImageCacheMetrics | null;
  network: NetworkMetrics | null;
  batteryOptimized: boolean;
  timestamp: string;
}

// --- Startup Tracker ---

class StartupTracker {
  private metrics: Partial<StartupMetrics> = {};
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    this.metrics.appInitStart = Date.now();
  }

  markNavigationReady(): void {
    this.metrics.navigationReady = Date.now();
  }

  markFirstContentfulPaint(): void {
    this.metrics.firstContentfulPaint = Date.now();
  }

  markInteractive(): void {
    this.metrics.timeToInteractive = Date.now();
    this.metrics.appInitEnd = Date.now();
  }

  getMetrics(): StartupMetrics | null {
    if (!this.metrics.appInitStart || !this.metrics.appInitEnd) return null;
    return {
      appInitStart: this.metrics.appInitStart,
      appInitEnd: this.metrics.appInitEnd,
      navigationReady: this.metrics.navigationReady ?? 0,
      firstContentfulPaint: this.metrics.firstContentfulPaint ?? 0,
      timeToInteractive: this.metrics.timeToInteractive ?? 0,
      totalStartupMs: this.metrics.appInitEnd - this.metrics.appInitStart,
    };
  }

  reset(): void {
    this.metrics = {};
    this.started = false;
  }
}

// --- Frame Rate Monitor ---

class FrameRateMonitor {
  private frameTimes: number[] = [];
  private isMonitoring = false;
  private lastTimestamp = 0;
  private animationFrameId: number | null = null;

  start(sampleDurationMs: number = 5000): Promise<FrameMetrics[]> {
    if (this.isMonitoring) return Promise.resolve([]);

    return new Promise(resolve => {
      this.isMonitoring = true;
      this.frameTimes = [];
      const frames: FrameMetrics[] = [];
      this.lastTimestamp = Date.now();

      const measureFrame = () => {
        if (!this.isMonitoring) return;

        const now = Date.now();
        const delta = now - this.lastTimestamp;
        this.lastTimestamp = now;

        if (delta > 0) {
          this.frameTimes.push(delta);
          const fps = Math.round(1000 / delta);
          const droppedFrames = Math.max(0, Math.floor(delta / 16.67) - 1);

          frames.push({
            timestamp: now,
            frameTimeMs: delta,
            droppedFrames,
            fps,
          });
        }

        const elapsed = now - (frames[0]?.timestamp ?? now);
        if (elapsed < sampleDurationMs) {
          // Use requestAnimationFrame if available, else setTimeout fallback
          if (typeof requestAnimationFrame === 'function') {
            this.animationFrameId = requestAnimationFrame(measureFrame);
          } else {
            setTimeout(measureFrame, 16);
          }
        } else {
          this.isMonitoring = false;
          resolve(frames);
        }
      };

      measureFrame();
    });
  }

  stop(): void {
    this.isMonitoring = false;
    if (this.animationFrameId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  getAverageFps(): number {
    if (this.frameTimes.length === 0) return 0;
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return Math.round(1000 / avgFrameTime);
  }

  getMinFps(): number {
    if (this.frameTimes.length === 0) return 0;
    const maxFrameTime = Math.max(...this.frameTimes);
    return Math.round(1000 / maxFrameTime);
  }

  getDroppedFrameCount(): number {
    return this.frameTimes.filter(t => t > 16.67).length;
  }

  getTotalFrames(): number {
    return this.frameTimes.length;
  }
}

// --- Memory Monitor ---

class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private peakMB = 0;

  startTracking(intervalMs: number = 5000): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);
  }

  stopTracking(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async takeSnapshot(): Promise<void> {
    const cacheStats = getImageCacheStats();
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsedMB: this.estimateJsHeap(),
      jsHeapSizeMB: 0,
      cacheSizeMB: cacheStats.totalSize / (1024 * 1024),
      cacheEntries: cacheStats.totalEntries,
    };

    this.snapshots.push(snapshot);

    if (snapshot.heapUsedMB + snapshot.cacheSizeMB > this.peakMB) {
      this.peakMB = snapshot.heapUsedMB + snapshot.cacheSizeMB;
    }

    // Keep last 100 snapshots
    if (this.snapshots.length > 100) {
      this.snapshots.shift();
    }
  }

  private estimateJsHeap(): number {
    // Estimate based on available runtime info
    // Hermes engine provides (global as any).HermesInternal
    try {
      const hermes = (
        global as unknown as { HermesInternal?: { getGCStats?: () => { allocatedBytes?: number } } }
      ).HermesInternal;
      if (hermes?.getGCStats) {
        const stats = hermes.getGCStats();
        return Math.round((stats.allocatedBytes ?? 0) / (1024 * 1024));
      }
    } catch {
      // Not Hermes or stats unavailable
    }
    // Fallback: rough estimate
    return 0;
  }

  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  getPeakMB(): number {
    return this.peakMB;
  }

  getAverageMB(): number {
    if (this.snapshots.length === 0) return 0;
    const total = this.snapshots.reduce((sum, s) => sum + s.heapUsedMB + s.cacheSizeMB, 0);
    return Math.round(total / this.snapshots.length);
  }

  reset(): void {
    this.snapshots = [];
    this.peakMB = 0;
  }
}

// --- Image Cache Performance Tracker ---

class ImageCacheTracker {
  private loadTimes: number[] = [];
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  recordLoad(durationMs: number, fromCache: boolean): void {
    this.loadTimes.push(durationMs);
    if (fromCache) {
      this.hits++;
    } else {
      this.misses++;
    }
  }

  recordEviction(): void {
    this.evictions++;
  }

  getMetrics(): ImageCacheMetrics | null {
    if (this.loadTimes.length === 0) return null;

    const total = this.hits + this.misses;
    const cacheStats = getImageCacheStats();

    return {
      hitRate: total > 0 ? this.hits / total : 0,
      missRate: total > 0 ? this.misses / total : 0,
      avgLoadTimeMs: this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length,
      totalSizeMB: cacheStats.totalSize / (1024 * 1024),
      entryCount: cacheStats.totalEntries,
      evictionCount: this.evictions,
    };
  }

  reset(): void {
    this.loadTimes = [];
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }
}

// --- Network Performance Tracker ---

class NetworkTracker {
  private requests: Array<{ durationMs: number; bytes: number; success: boolean }> = [];
  private cacheHits = 0;
  private cacheMisses = 0;

  recordRequest(durationMs: number, bytesReceived: number, success: boolean): void {
    this.requests.push({ durationMs, bytes: bytesReceived, success });
  }

  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  getMetrics(): NetworkMetrics | null {
    if (this.requests.length === 0) return null;

    const durations = this.requests.map(r => r.durationMs).sort((a, b) => a - b);
    const totalCache = this.cacheHits + this.cacheMisses;

    return {
      totalRequests: this.requests.length,
      avgResponseTimeMs: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95ResponseTimeMs: durations[Math.floor(durations.length * 0.95)] ?? 0,
      totalBytesReceived: this.requests.reduce((sum, r) => sum + r.bytes, 0),
      failedRequests: this.requests.filter(r => !r.success).length,
      cacheHitRate: totalCache > 0 ? this.cacheHits / totalCache : 0,
    };
  }

  reset(): void {
    this.requests = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// --- Main Service ---

class MobilePerformanceService {
  private startupTracker: StartupTracker;
  private frameRateMonitor: FrameRateMonitor;
  private memoryMonitor: MemoryMonitor;
  private imageCacheTracker: ImageCacheTracker;
  private networkTracker: NetworkTracker;
  private batteryOptimized = false;
  private initialized = false;

  constructor() {
    this.startupTracker = new StartupTracker();
    this.frameRateMonitor = new FrameRateMonitor();
    this.memoryMonitor = new MemoryMonitor();
    this.imageCacheTracker = new ImageCacheTracker();
    this.networkTracker = new NetworkTracker();
  }

  /**
   * Initialize performance monitoring. Call early in app startup.
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.startupTracker.start();
  }

  // --- Startup ---

  markNavigationReady(): void {
    this.startupTracker.markNavigationReady();
  }

  markFirstContentfulPaint(): void {
    this.startupTracker.markFirstContentfulPaint();
  }

  markInteractive(): void {
    this.startupTracker.markInteractive();
  }

  getStartupMetrics(): StartupMetrics | null {
    return this.startupTracker.getMetrics();
  }

  // --- Frame Rate ---

  async measureScrollPerformance(durationMs: number = 3000): Promise<{
    avgFps: number;
    minFps: number;
    droppedFrames: number;
    totalFrames: number;
    meets60FpsTarget: boolean;
  }> {
    await this.frameRateMonitor.start(durationMs);
    const avgFps = this.frameRateMonitor.getAverageFps();
    const minFps = this.frameRateMonitor.getMinFps();
    const droppedFrames = this.frameRateMonitor.getDroppedFrameCount();
    const totalFrames = this.frameRateMonitor.getTotalFrames();

    return {
      avgFps,
      minFps,
      droppedFrames,
      totalFrames,
      meets60FpsTarget: avgFps >= 55, // Allow 5fps tolerance
    };
  }

  // --- Memory ---

  startMemoryTracking(intervalMs?: number): void {
    this.memoryMonitor.startTracking(intervalMs);
  }

  stopMemoryTracking(): void {
    this.memoryMonitor.stopTracking();
  }

  getMemorySnapshots(): MemorySnapshot[] {
    return this.memoryMonitor.getSnapshots();
  }

  // --- Image Cache ---

  recordImageLoad(durationMs: number, fromCache: boolean): void {
    this.imageCacheTracker.recordLoad(durationMs, fromCache);
  }

  getImageCacheMetrics(): ImageCacheMetrics | null {
    return this.imageCacheTracker.getMetrics();
  }

  // --- Network ---

  recordNetworkRequest(durationMs: number, bytesReceived: number, success: boolean): void {
    this.networkTracker.recordRequest(durationMs, bytesReceived, success);
  }

  getNetworkMetrics(): NetworkMetrics | null {
    return this.networkTracker.getMetrics();
  }

  // --- Battery ---

  enableBatteryOptimization(): void {
    this.batteryOptimized = true;
    this.memoryMonitor.stopTracking();
  }

  disableBatteryOptimization(): void {
    this.batteryOptimized = false;
  }

  isBatteryOptimized(): boolean {
    return this.batteryOptimized;
  }

  // --- Report ---

  generateReport(): PerformanceReport {
    return {
      startup: this.startupTracker.getMetrics(),
      frameRate: {
        avgFps: this.frameRateMonitor.getAverageFps(),
        minFps: this.frameRateMonitor.getMinFps(),
        droppedFrameCount: this.frameRateMonitor.getDroppedFrameCount(),
        totalFrames: this.frameRateMonitor.getTotalFrames(),
      },
      memory: {
        peakMB: this.memoryMonitor.getPeakMB(),
        avgMB: this.memoryMonitor.getAverageMB(),
        snapshots: this.memoryMonitor.getSnapshots().length,
      },
      imageCache: this.imageCacheTracker.getMetrics(),
      network: this.networkTracker.getMetrics(),
      batteryOptimized: this.batteryOptimized,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Run after interactions complete to avoid blocking UI.
   */
  runAfterInteraction<T>(fn: () => T): Promise<T> {
    return new Promise(resolve => {
      InteractionManager.runAfterInteractions(() => {
        resolve(fn());
      });
    });
  }

  /**
   * Check startup performance against targets.
   */
  checkStartupTarget(): { passed: boolean; startupMs: number; targetMs: number } {
    const metrics = this.startupTracker.getMetrics();
    if (!metrics) {
      return { passed: false, startupMs: -1, targetMs: 3000 };
    }
    return {
      passed: metrics.totalStartupMs <= 3000,
      startupMs: metrics.totalStartupMs,
      targetMs: 3000,
    };
  }

  /**
   * Reset all tracking state.
   */
  reset(): void {
    this.startupTracker.reset();
    this.frameRateMonitor.stop();
    this.memoryMonitor.stopTracking();
    this.memoryMonitor.reset();
    this.imageCacheTracker.reset();
    this.networkTracker.reset();
    this.initialized = false;
  }
}

export const mobilePerformance = new MobilePerformanceService();
export default mobilePerformance;
