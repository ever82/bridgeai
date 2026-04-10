/**
 * Tests for Firewall Service
 */
import {
  blockIP,
  unblockIP,
  getBlockedIPs,
  isIPBlocked,
  getSecurityStats,
  getSecurityEvents,
  resolveSecurityEvent,
  addSecurityRule,
  updateSecurityRule,
  deleteSecurityRule,
  getSecurityRules,
  analyzeTraffic,
  bulkBlockIPs,
  bulkUnblockIPs,
  logSecurityEvent,
} from '../firewall';

// Mock console
const originalWarn = console.warn;
const originalLog = console.log;

describe('Firewall Service', () => {
  beforeEach(() => {
    console.warn = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    console.warn = originalWarn;
    console.log = originalLog;
  });

  describe('logSecurityEvent', () => {
    it('should log a security event', () => {
      const event = logSecurityEvent({
        type: 'IP_BLOCKED',
        severity: 'medium',
        ip: '192.168.1.1',
        details: { reason: 'Test' },
      });

      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('timestamp');
      expect(event.type).toBe('IP_BLOCKED');
      expect(event.severity).toBe('medium');
    });

    it('should log high severity events to console', () => {
      logSecurityEvent({
        type: 'DDOS_DETECTED',
        severity: 'critical',
        ip: '192.168.1.2',
        details: { attackType: 'Volumetric' },
      });

      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('blockIP', () => {
    it('should block an IP address', () => {
      const result = blockIP('192.168.1.10', 'Suspicious activity', 60);

      expect(result.success).toBe(true);
      expect(result.message).toContain('192.168.1.10');
    });

    it('should log the block event', () => {
      blockIP('192.168.1.11', 'Test reason', 30, 'admin-123');

      const events = getSecurityEvents({ type: 'IP_BLOCKED' });
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('unblockIP', () => {
    it('should unblock an IP address', () => {
      // First block the IP
      blockIP('192.168.1.20', 'Test', 60);

      // Then unblock it
      const result = unblockIP('192.168.1.20', 'admin-123');

      expect(result.success).toBe(true);
    });

    it('should fail when unblocking non-existent IP', () => {
      const result = unblockIP('192.168.1.999');
      expect(result.success).toBe(false);
    });
  });

  describe('getBlockedIPs', () => {
    it('should return list of blocked IPs', () => {
      blockIP('192.168.1.30', 'Test', 60);

      const blocked = getBlockedIPs();

      expect(Array.isArray(blocked)).toBe(true);
      expect(blocked.some(b => b.ip === '192.168.1.30')).toBe(true);
    });

    it('should include block metadata', () => {
      blockIP('192.168.1.31', 'Test reason', 60, 'admin-456');

      const blocked = getBlockedIPs();
      const entry = blocked.find(b => b.ip === '192.168.1.31');

      expect(entry).toHaveProperty('blockedAt');
      expect(entry).toHaveProperty('expiresAt');
      expect(entry).toHaveProperty('reason');
    });
  });

  describe('isIPBlocked', () => {
    it('should return true for blocked IP', () => {
      blockIP('192.168.1.40', 'Test', 60);

      const result = isIPBlocked('192.168.1.40');

      expect(result.blocked).toBe(true);
      expect(result.info).toBeDefined();
    });

    it('should return false for non-blocked IP', () => {
      const result = isIPBlocked('192.168.1.999');

      expect(result.blocked).toBe(false);
      expect(result.info).toBeUndefined();
    });
  });

  describe('getSecurityStats', () => {
    it('should return security statistics', () => {
      const stats = getSecurityStats();

      expect(stats).toHaveProperty('blockedIPs');
      expect(stats).toHaveProperty('whitelistedIPs');
      expect(stats).toHaveProperty('recentEvents');
      expect(stats).toHaveProperty('eventsByType');
      expect(stats).toHaveProperty('eventsBySeverity');
      expect(stats).toHaveProperty('ddosStats');
      expect(stats).toHaveProperty('ipFilterStats');
    });
  });

  describe('getSecurityEvents', () => {
    beforeEach(() => {
      // Create some test events
      logSecurityEvent({
        type: 'XSS_ATTEMPT',
        severity: 'high',
        ip: '192.168.1.50',
        details: {},
      });
      logSecurityEvent({
        type: 'SQL_INJECTION_ATTEMPT',
        severity: 'high',
        ip: '192.168.1.51',
        details: {},
      });
    });

    it('should return events with filter by type', () => {
      const events = getSecurityEvents({ type: 'XSS_ATTEMPT' });

      expect(events.every(e => e.type === 'XSS_ATTEMPT')).toBe(true);
    });

    it('should return events with filter by severity', () => {
      const events = getSecurityEvents({ severity: 'high' });

      expect(events.every(e => e.severity === 'high')).toBe(true);
    });

    it('should return events with filter by IP', () => {
      const events = getSecurityEvents({ ip: '192.168.1.50' });

      expect(events.every(e => e.ip === '192.168.1.50')).toBe(true);
    });

    it('should limit results', () => {
      const events = getSecurityEvents({ limit: 5 });

      expect(events.length).toBeLessThanOrEqual(5);
    });

    it('should sort by timestamp desc', () => {
      const events = getSecurityEvents({ limit: 10 });

      for (let i = 1; i < events.length; i++) {
        expect(events[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          events[i].timestamp.getTime()
        );
      }
    });
  });

  describe('resolveSecurityEvent', () => {
    it('should mark event as resolved', () => {
      const event = logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'medium',
        details: {},
      });

      const result = resolveSecurityEvent(event.id, 'admin-123');

      expect(result).toBe(true);
    });

    it('should return false for non-existent event', () => {
      const result = resolveSecurityEvent('non-existent-id', 'admin-123');

      expect(result).toBe(false);
    });
  });

  describe('Security Rules', () => {
    describe('addSecurityRule', () => {
      it('should add a new security rule', () => {
        const rule = addSecurityRule({
          name: 'Block suspicious IPs',
          type: 'ip_block',
          enabled: true,
          config: { threshold: 10 },
        });

        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('createdAt');
        expect(rule.name).toBe('Block suspicious IPs');
      });
    });

    describe('updateSecurityRule', () => {
      it('should update an existing rule', () => {
        const rule = addSecurityRule({
          name: 'Test Rule',
          type: 'rate_limit',
          enabled: true,
          config: {},
        });

        const updated = updateSecurityRule(rule.id, { enabled: false });

        expect(updated?.enabled).toBe(false);
        expect(updated?.updatedAt).not.toEqual(rule.updatedAt);
      });

      it('should return null for non-existent rule', () => {
        const result = updateSecurityRule('non-existent', { enabled: false });

        expect(result).toBeNull();
      });
    });

    describe('deleteSecurityRule', () => {
      it('should delete a security rule', () => {
        const rule = addSecurityRule({
          name: 'To Delete',
          type: 'pattern_match',
          enabled: true,
          config: {},
        });

        const result = deleteSecurityRule(rule.id);

        expect(result).toBe(true);
      });

      it('should return false for non-existent rule', () => {
        const result = deleteSecurityRule('non-existent');

        expect(result).toBe(false);
      });
    });

    describe('getSecurityRules', () => {
      it('should return all rules', () => {
        addSecurityRule({
          name: 'Rule 1',
          type: 'ip_block',
          enabled: true,
          config: {},
        });
        addSecurityRule({
          name: 'Rule 2',
          type: 'geo_block',
          enabled: false,
          config: {},
        });

        const rules = getSecurityRules();

        expect(rules.length).toBeGreaterThanOrEqual(2);
      });

      it('should return only enabled rules when specified', () => {
        const allRules = getSecurityRules();
        const enabledRules = getSecurityRules(true);

        expect(enabledRules.length).toBeLessThanOrEqual(allRules.length);
        expect(enabledRules.every(r => r.enabled)).toBe(true);
      });
    });
  });

  describe('analyzeTraffic', () => {
    it('should detect blocked IPs', () => {
      const ip = '192.168.1.60';
      blockIP(ip, 'Test', 60);

      const analysis = analyzeTraffic(ip, '/api/test', 'GET');

      expect(analysis.isSuspicious).toBe(true);
      expect(analysis.reasons).toContain('IP is already blocked');
    });

    it('should detect path traversal attempts', () => {
      const analysis = analyzeTraffic('192.168.1.70', '/../../../etc/passwd', 'GET');

      expect(analysis.isSuspicious).toBe(true);
      expect(analysis.riskScore).toBeGreaterThan(0);
    });

    it('should detect system file access attempts', () => {
      const analysis = analyzeTraffic('192.168.1.71', '/proc/self/environ', 'GET');

      expect(analysis.isSuspicious).toBe(true);
    });

    it('should allow normal requests', () => {
      const analysis = analyzeTraffic('192.168.1.80', '/api/users', 'GET');

      expect(analysis.isSuspicious).toBe(false);
      expect(analysis.riskScore).toBe(0);
    });
  });

  describe('bulkBlockIPs', () => {
    it('should block multiple IPs', () => {
      const ips = ['192.168.1.90', '192.168.1.91', '192.168.1.92'];

      const result = bulkBlockIPs(ips, 'Bulk test', 60, 'admin-123');

      expect(result.success.length).toBe(3);
      expect(result.failed.length).toBe(0);
    });

    it('should track failed blocks', () => {
      const ips = ['192.168.1.93', 'invalid-ip'];

      const result = bulkBlockIPs(ips, 'Test', 60);

      expect(result.success.length).toBe(1);
      expect(result.failed.length).toBe(1);
    });
  });

  describe('bulkUnblockIPs', () => {
    it('should unblock multiple IPs', () => {
      const ips = ['192.168.1.100', '192.168.1.101'];
      bulkBlockIPs(ips, 'Test', 60);

      const result = bulkUnblockIPs(ips, 'admin-123');

      expect(result.success.length).toBe(2);
    });
  });
});
