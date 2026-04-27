import { mobilePerformance } from '../mobilePerformance';

// Mock imageCache
jest.mock('../../../utils/imageCache', () => ({
  imageCache: {
    getStats: jest.fn(() => ({ totalSize: 1024 * 1024 * 50, totalEntries: 200 })),
  },
}));

// Mock InteractionManager
jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: (fn: () => void) => {
      fn();
      return { then: (cb: () => void) => cb() };
    },
  },
  Platform: { OS: 'ios' },
}));

describe('MobilePerformanceService', () => {
  beforeEach(() => {
    mobilePerformance.reset();
  });

  describe('StartupTracker', () => {
    it('should track startup time', () => {
      mobilePerformance.initialize();
      mobilePerformance.markNavigationReady();
      mobilePerformance.markFirstContentfulPaint();
      mobilePerformance.markInteractive();

      const metrics = mobilePerformance.getStartupMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics!.totalStartupMs).toBeGreaterThanOrEqual(0);
      expect(metrics!.appInitStart).toBeGreaterThan(0);
      expect(metrics!.appInitEnd).toBeGreaterThanOrEqual(metrics!.appInitStart);
    });

    it('should return null before startup completes', () => {
      mobilePerformance.initialize();
      expect(mobilePerformance.getStartupMetrics()).toBeNull();
    });

    it('should check startup target (3s)', () => {
      mobilePerformance.initialize();
      mobilePerformance.markNavigationReady();
      mobilePerformance.markFirstContentfulPaint();
      mobilePerformance.markInteractive();

      const result = mobilePerformance.checkStartupTarget();
      expect(result.targetMs).toBe(3000);
      expect(result.passed).toBe(true); // Should be fast in test
      expect(result.startupMs).toBeLessThan(3000);
    });
  });

  describe('MemoryMonitor', () => {
    it('should start and stop memory tracking', () => {
      mobilePerformance.startMemoryTracking(100);
      mobilePerformance.stopMemoryTracking();
      // Should not throw
    });

    it('should return empty snapshots when not tracking', () => {
      const snapshots = mobilePerformance.getMemorySnapshots();
      expect(snapshots).toEqual([]);
    });
  });

  describe('ImageCacheTracker', () => {
    it('should track image load performance', () => {
      mobilePerformance.recordImageLoad(50, true);
      mobilePerformance.recordImageLoad(120, false);
      mobilePerformance.recordImageLoad(30, true);

      const metrics = mobilePerformance.getImageCacheMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics!.hitRate).toBeCloseTo(2 / 3);
      expect(metrics!.avgLoadTimeMs).toBeCloseTo((50 + 120 + 30) / 3);
      expect(metrics!.entryCount).toBe(200);
    });

    it('should return null when no loads recorded', () => {
      expect(mobilePerformance.getImageCacheMetrics()).toBeNull();
    });
  });

  describe('NetworkTracker', () => {
    it('should track network request performance', () => {
      mobilePerformance.recordNetworkRequest(100, 5000, true);
      mobilePerformance.recordNetworkRequest(200, 10000, true);
      mobilePerformance.recordNetworkRequest(50, 3000, false);

      const metrics = mobilePerformance.getNetworkMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics!.totalRequests).toBe(3);
      expect(metrics!.failedRequests).toBe(1);
    });

    it('should return null when no requests recorded', () => {
      expect(mobilePerformance.getNetworkMetrics()).toBeNull();
    });
  });

  describe('Battery optimization', () => {
    it('should toggle battery optimization', () => {
      expect(mobilePerformance.isBatteryOptimized()).toBe(false);
      mobilePerformance.enableBatteryOptimization();
      expect(mobilePerformance.isBatteryOptimized()).toBe(true);
      mobilePerformance.disableBatteryOptimization();
      expect(mobilePerformance.isBatteryOptimized()).toBe(false);
    });
  });

  describe('Performance report', () => {
    it('should generate a complete report', () => {
      mobilePerformance.initialize();
      mobilePerformance.markInteractive();
      mobilePerformance.recordImageLoad(50, true);
      mobilePerformance.recordNetworkRequest(100, 5000, true);

      const report = mobilePerformance.generateReport();
      expect(report.timestamp).toBeTruthy();
      expect(report.startup).not.toBeNull();
      expect(report.imageCache).not.toBeNull();
      expect(report.network).not.toBeNull();
      expect(report.batteryOptimized).toBe(false);
      expect(report.frameRate).toHaveProperty('avgFps');
      expect(report.memory).toHaveProperty('peakMB');
    });
  });

  describe('Reset', () => {
    it('should clear all tracked data', () => {
      mobilePerformance.initialize();
      mobilePerformance.markInteractive();
      mobilePerformance.recordImageLoad(50, true);
      mobilePerformance.recordNetworkRequest(100, 5000, true);

      mobilePerformance.reset();

      expect(mobilePerformance.getStartupMetrics()).toBeNull();
      expect(mobilePerformance.getImageCacheMetrics()).toBeNull();
      expect(mobilePerformance.getNetworkMetrics()).toBeNull();
    });
  });
});
