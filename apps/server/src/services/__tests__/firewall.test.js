"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Tests for Firewall Service
 */
const firewall_1 = require("../firewall");
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
            const event = (0, firewall_1.logSecurityEvent)({
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
            (0, firewall_1.logSecurityEvent)({
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
            const result = (0, firewall_1.blockIP)('192.168.1.10', 'Suspicious activity', 60);
            expect(result.success).toBe(true);
            expect(result.message).toContain('192.168.1.10');
        });
        it('should log the block event', () => {
            (0, firewall_1.blockIP)('192.168.1.11', 'Test reason', 30, 'admin-123');
            const events = (0, firewall_1.getSecurityEvents)({ type: 'IP_BLOCKED' });
            expect(events.length).toBeGreaterThan(0);
        });
    });
    describe('unblockIP', () => {
        it('should unblock an IP address', () => {
            // First block the IP
            (0, firewall_1.blockIP)('192.168.1.20', 'Test', 60);
            // Then unblock it
            const result = (0, firewall_1.unblockIP)('192.168.1.20', 'admin-123');
            expect(result.success).toBe(true);
        });
        it('should fail when unblocking non-existent IP', () => {
            const result = (0, firewall_1.unblockIP)('192.168.1.999');
            expect(result.success).toBe(false);
        });
    });
    describe('getBlockedIPs', () => {
        it('should return list of blocked IPs', () => {
            (0, firewall_1.blockIP)('192.168.1.30', 'Test', 60);
            const blocked = (0, firewall_1.getBlockedIPs)();
            expect(Array.isArray(blocked)).toBe(true);
            expect(blocked.some(b => b.ip === '192.168.1.30')).toBe(true);
        });
        it('should include block metadata', () => {
            (0, firewall_1.blockIP)('192.168.1.31', 'Test reason', 60, 'admin-456');
            const blocked = (0, firewall_1.getBlockedIPs)();
            const entry = blocked.find(b => b.ip === '192.168.1.31');
            expect(entry).toHaveProperty('blockedAt');
            expect(entry).toHaveProperty('expiresAt');
            expect(entry).toHaveProperty('reason');
        });
    });
    describe('isIPBlocked', () => {
        it('should return true for blocked IP', () => {
            (0, firewall_1.blockIP)('192.168.1.40', 'Test', 60);
            const result = (0, firewall_1.isIPBlocked)('192.168.1.40');
            expect(result.blocked).toBe(true);
            expect(result.info).toBeDefined();
        });
        it('should return false for non-blocked IP', () => {
            const result = (0, firewall_1.isIPBlocked)('192.168.1.999');
            expect(result.blocked).toBe(false);
            expect(result.info).toBeUndefined();
        });
    });
    describe('getSecurityStats', () => {
        it('should return security statistics', () => {
            const stats = (0, firewall_1.getSecurityStats)();
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
            (0, firewall_1.logSecurityEvent)({
                type: 'XSS_ATTEMPT',
                severity: 'high',
                ip: '192.168.1.50',
                details: {},
            });
            (0, firewall_1.logSecurityEvent)({
                type: 'SQL_INJECTION_ATTEMPT',
                severity: 'high',
                ip: '192.168.1.51',
                details: {},
            });
        });
        it('should return events with filter by type', () => {
            const events = (0, firewall_1.getSecurityEvents)({ type: 'XSS_ATTEMPT' });
            expect(events.every(e => e.type === 'XSS_ATTEMPT')).toBe(true);
        });
        it('should return events with filter by severity', () => {
            const events = (0, firewall_1.getSecurityEvents)({ severity: 'high' });
            expect(events.every(e => e.severity === 'high')).toBe(true);
        });
        it('should return events with filter by IP', () => {
            const events = (0, firewall_1.getSecurityEvents)({ ip: '192.168.1.50' });
            expect(events.every(e => e.ip === '192.168.1.50')).toBe(true);
        });
        it('should limit results', () => {
            const events = (0, firewall_1.getSecurityEvents)({ limit: 5 });
            expect(events.length).toBeLessThanOrEqual(5);
        });
        it('should sort by timestamp desc', () => {
            const events = (0, firewall_1.getSecurityEvents)({ limit: 10 });
            for (let i = 1; i < events.length; i++) {
                expect(events[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(events[i].timestamp.getTime());
            }
        });
    });
    describe('resolveSecurityEvent', () => {
        it('should mark event as resolved', () => {
            const event = (0, firewall_1.logSecurityEvent)({
                type: 'SUSPICIOUS_ACTIVITY',
                severity: 'medium',
                details: {},
            });
            const result = (0, firewall_1.resolveSecurityEvent)(event.id, 'admin-123');
            expect(result).toBe(true);
        });
        it('should return false for non-existent event', () => {
            const result = (0, firewall_1.resolveSecurityEvent)('non-existent-id', 'admin-123');
            expect(result).toBe(false);
        });
    });
    describe('Security Rules', () => {
        describe('addSecurityRule', () => {
            it('should add a new security rule', () => {
                const rule = (0, firewall_1.addSecurityRule)({
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
                const rule = (0, firewall_1.addSecurityRule)({
                    name: 'Test Rule',
                    type: 'rate_limit',
                    enabled: true,
                    config: {},
                });
                const updated = (0, firewall_1.updateSecurityRule)(rule.id, { enabled: false });
                expect(updated?.enabled).toBe(false);
                expect(updated?.updatedAt).not.toEqual(rule.updatedAt);
            });
            it('should return null for non-existent rule', () => {
                const result = (0, firewall_1.updateSecurityRule)('non-existent', { enabled: false });
                expect(result).toBeNull();
            });
        });
        describe('deleteSecurityRule', () => {
            it('should delete a security rule', () => {
                const rule = (0, firewall_1.addSecurityRule)({
                    name: 'To Delete',
                    type: 'pattern_match',
                    enabled: true,
                    config: {},
                });
                const result = (0, firewall_1.deleteSecurityRule)(rule.id);
                expect(result).toBe(true);
            });
            it('should return false for non-existent rule', () => {
                const result = (0, firewall_1.deleteSecurityRule)('non-existent');
                expect(result).toBe(false);
            });
        });
        describe('getSecurityRules', () => {
            it('should return all rules', () => {
                (0, firewall_1.addSecurityRule)({
                    name: 'Rule 1',
                    type: 'ip_block',
                    enabled: true,
                    config: {},
                });
                (0, firewall_1.addSecurityRule)({
                    name: 'Rule 2',
                    type: 'geo_block',
                    enabled: false,
                    config: {},
                });
                const rules = (0, firewall_1.getSecurityRules)();
                expect(rules.length).toBeGreaterThanOrEqual(2);
            });
            it('should return only enabled rules when specified', () => {
                const allRules = (0, firewall_1.getSecurityRules)();
                const enabledRules = (0, firewall_1.getSecurityRules)(true);
                expect(enabledRules.length).toBeLessThanOrEqual(allRules.length);
                expect(enabledRules.every(r => r.enabled)).toBe(true);
            });
        });
    });
    describe('analyzeTraffic', () => {
        it('should detect blocked IPs', () => {
            const ip = '192.168.1.60';
            (0, firewall_1.blockIP)(ip, 'Test', 60);
            const analysis = (0, firewall_1.analyzeTraffic)(ip, '/api/test', 'GET');
            expect(analysis.isSuspicious).toBe(true);
            expect(analysis.reasons).toContain('IP is already blocked');
        });
        it('should detect path traversal attempts', () => {
            const analysis = (0, firewall_1.analyzeTraffic)('192.168.1.70', '/../../../etc/passwd', 'GET');
            expect(analysis.isSuspicious).toBe(true);
            expect(analysis.riskScore).toBeGreaterThan(0);
        });
        it('should detect system file access attempts', () => {
            const analysis = (0, firewall_1.analyzeTraffic)('192.168.1.71', '/proc/self/environ', 'GET');
            expect(analysis.isSuspicious).toBe(true);
        });
        it('should allow normal requests', () => {
            const analysis = (0, firewall_1.analyzeTraffic)('192.168.1.80', '/api/users', 'GET');
            expect(analysis.isSuspicious).toBe(false);
            expect(analysis.riskScore).toBe(0);
        });
    });
    describe('bulkBlockIPs', () => {
        it('should block multiple IPs', () => {
            const ips = ['192.168.1.90', '192.168.1.91', '192.168.1.92'];
            const result = (0, firewall_1.bulkBlockIPs)(ips, 'Bulk test', 60, 'admin-123');
            expect(result.success.length).toBe(3);
            expect(result.failed.length).toBe(0);
        });
        it('should track failed blocks', () => {
            const ips = ['192.168.1.93', 'invalid-ip'];
            const result = (0, firewall_1.bulkBlockIPs)(ips, 'Test', 60);
            expect(result.success.length).toBe(1);
            expect(result.failed.length).toBe(1);
        });
    });
    describe('bulkUnblockIPs', () => {
        it('should unblock multiple IPs', () => {
            const ips = ['192.168.1.100', '192.168.1.101'];
            (0, firewall_1.bulkBlockIPs)(ips, 'Test', 60);
            const result = (0, firewall_1.bulkUnblockIPs)(ips, 'admin-123');
            expect(result.success.length).toBe(2);
        });
    });
});
//# sourceMappingURL=firewall.test.js.map