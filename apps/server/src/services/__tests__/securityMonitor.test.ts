/**
 * Tests for Security Monitor Service
 */
import {
  initializeSecurityMonitoring,
  trackSecurityEvent,
  getRealTimeStats,
  updateConfig,
  getConfig,
  resetAggregations,
  exportSecurityData,
} from '../securityMonitor';
import { logSecurityEvent, getSecurityEvents } from '../firewall';
import { SecurityEvent } from '../firewall';

// Mock console
const originalLog = console.log;
const originalWarn = console.warn;

describe('Security Monitor Service', () => {
  beforeEach(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    resetAggregations();
  });

  afterEach(() => {
    console.log = originalLog;
    console.warn = originalWarn;
  });

  describe('initializeSecurityMonitoring', () => {
    it('should initialize without errors', () => {
      expect(() => initializeSecurityMonitoring()).not.toThrow();
    });

    it('should log initialization message', () => {
      initializeSecurityMonitoring();
      expect(console.log).toHaveBeenCalledWith(
        '[Security Monitor] Initialized with config:',
        expect.any(Object)
      );
    });
  });

  describe('trackSecurityEvent', () => {
    it('should track DDoS detected events', () => {
      const event: SecurityEvent = {
        id: 'test-1',
        type: 'DDOS_DETECTED',
        severity: 'critical',
        ip: '192.168.1.1',
        timestamp: new Date(),
        details: { reason: 'High traffic' },
        resolved: false,
      };

      trackSecurityEvent(event);

      const stats = getRealTimeStats();
      expect(stats.recentEvents).toBeGreaterThan(0);
    });

    it('should track rate limit events', () => {
      const event: SecurityEvent = {
        id: 'test-2',
        type: 'RATE_LIMIT_EXCEEDED',
        severity: 'warning',
        ip: '192.168.1.2',
        timestamp: new Date(),
        details: {},
        resolved: false,
      };

      trackSecurityEvent(event);

      const stats = getRealTimeStats();
      expect(stats.eventAggregations.some(ea => ea.type === 'RATE_LIMIT_EXCEEDED')).toBe(true);
    });

    it('should track XSS attempts', () => {
      const event: SecurityEvent = {
        id: 'test-3',
        type: 'XSS_ATTEMPT',
        severity: 'high',
        ip: '192.168.1.3',
        timestamp: new Date(),
        details: { pattern: '<script>' },
        resolved: false,
      };

      trackSecurityEvent(event);

      const stats = getRealTimeStats();
      expect(stats.eventAggregations.some(ea => ea.type === 'XSS_ATTEMPT')).toBe(true);
    });

    it('should aggregate multiple events of same type', () => {
      for (let i = 0; i < 5; i++) {
        const event: SecurityEvent = {
          id: `test-${i}`,
          type: 'SQL_INJECTION_ATTEMPT',
          severity: 'high',
          ip: '192.168.1.4',
          timestamp: new Date(),
          details: {},
          resolved: false,
        };
        trackSecurityEvent(event);
      }

      const stats = getRealTimeStats();
      const sqlInjectionAgg = stats.eventAggregations.find(
        ea => ea.type === 'SQL_INJECTION_ATTEMPT'
      );
      expect(sqlInjectionAgg?.count).toBe(5);
    });

    it('should track unique IPs per event type', () => {
      for (let i = 0; i < 3; i++) {
        const event: SecurityEvent = {
          id: `test-${i}`,
          type: 'AUTH_FAILURE',
          severity: 'medium',
          ip: `192.168.1.${i + 10}`,
          timestamp: new Date(),
          details: {},
          resolved: false,
        };
        trackSecurityEvent(event);
      }

      const stats = getRealTimeStats();
      const authFailureAgg = stats.eventAggregations.find(ea => ea.type === 'AUTH_FAILURE');
      expect(authFailureAgg?.uniqueIPs).toBe(3);
    });
  });

  describe('getRealTimeStats', () => {
    it('should return current statistics', () => {
      const stats = getRealTimeStats();

      expect(stats).toHaveProperty('activeAlerts');
      expect(stats).toHaveProperty('recentEvents');
      expect(stats).toHaveProperty('eventAggregations');
      expect(stats).toHaveProperty('lastUpdated');
    });

    it('should update after tracking events', () => {
      const initialStats = getRealTimeStats();

      const event: SecurityEvent = {
        id: 'test-stats',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'medium',
        timestamp: new Date(),
        details: {},
        resolved: false,
      };
      trackSecurityEvent(event);

      const updatedStats = getRealTimeStats();
      expect(updatedStats.recentEvents).toBeGreaterThan(initialStats.recentEvents);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        realTimeMonitoring: false,
        thresholds: {
          requestsPerMinute: 500,
          failedLoginsPerMinute: 20,
          suspiciousRequestsPerMinute: 100,
          blockedIPsThreshold: 200,
        },
      };

      updateConfig(newConfig);

      const config = getConfig();
      expect(config.realTimeMonitoring).toBe(false);
      expect(config.thresholds.requestsPerMinute).toBe(500);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = getConfig();

      expect(config).toHaveProperty('realTimeMonitoring');
      expect(config).toHaveProperty('thresholds');
      expect(config).toHaveProperty('reports');
      expect(config).toHaveProperty('autoResponse');
    });

    it('should return a copy of config', () => {
      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });

  describe('resetAggregations', () => {
    it('should clear all aggregations', () => {
      const event: SecurityEvent = {
        id: 'test-reset',
        type: 'IP_BLOCKED',
        severity: 'medium',
        timestamp: new Date(),
        details: {},
        resolved: false,
      };
      trackSecurityEvent(event);

      const statsBefore = getRealTimeStats();
      expect(statsBefore.recentEvents).toBeGreaterThan(0);

      resetAggregations();

      const statsAfter = getRealTimeStats();
      expect(statsAfter.recentEvents).toBe(0);
    });
  });

  describe('exportSecurityData', () => {
    it('should export data in JSON format', () => {
      const event: SecurityEvent = {
        id: 'test-export',
        type: 'IP_BLOCKED',
        severity: 'medium',
        ip: '192.168.1.1',
        timestamp: new Date(),
        details: { reason: 'Test' },
        resolved: false,
      };
      trackSecurityEvent(event);

      const data = exportSecurityData('json', new Date(Date.now() - 3600000));

      expect(() => JSON.parse(data)).not.toThrow();
      const parsed = JSON.parse(data);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export data in CSV format', () => {
      const data = exportSecurityData('csv');

      expect(data).toContain('timestamp,type,severity');
      expect(data.split('\n').length).toBeGreaterThan(0);
    });
  });

  describe('Threshold alerts', () => {
    beforeEach(() => {
      updateConfig({
        realTimeMonitoring: true,
        thresholds: {
          requestsPerMinute: 5,
          failedLoginsPerMinute: 3,
          suspiciousRequestsPerMinute: 2,
          blockedIPsThreshold: 10,
        },
      });
      resetAggregations();
    });

    it('should trigger alert for DDoS detection', () => {
      const event: SecurityEvent = {
        id: 'test-ddos',
        type: 'DDOS_DETECTED',
        severity: 'critical',
        ip: '192.168.1.100',
        timestamp: new Date(),
        details: { type: 'BURST_ATTACK' },
        resolved: false,
      };

      trackSecurityEvent(event);

      expect(console.warn).toHaveBeenCalled();
    });

    it('should trigger alert for high rate limit violations', () => {
      // Generate multiple rate limit events
      for (let i = 0; i < 6; i++) {
        const event: SecurityEvent = {
          id: `test-rate-${i}`,
          type: 'RATE_LIMIT_EXCEEDED',
          severity: 'warning',
          timestamp: new Date(),
          details: {},
          resolved: false,
        };
        trackSecurityEvent(event);
      }

      expect(console.warn).toHaveBeenCalled();
    });

    it('should trigger alert for multiple injection attempts', () => {
      for (let i = 0; i < 6; i++) {
        const event: SecurityEvent = {
          id: `test-xss-${i}`,
          type: 'XSS_ATTEMPT',
          severity: 'high',
          timestamp: new Date(),
          details: {},
          resolved: false,
        };
        trackSecurityEvent(event);
      }

      expect(console.warn).toHaveBeenCalled();
    });
  });
});
