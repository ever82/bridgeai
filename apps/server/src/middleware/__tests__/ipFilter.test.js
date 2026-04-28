"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ipFilter_1 = require("../ipFilter");
const ipList_1 = require("../../config/ipList");
// Mock request context
jest.mock('../requestContext', () => ({
    getRequestContext: () => ({
        logWarning: jest.fn(),
        logInfo: jest.fn(),
    }),
}));
// Mock console
const originalWarn = console.warn;
const originalLog = console.log;
describe('IP Filter Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    beforeEach(() => {
        mockReq = {
            path: '/api/test',
            method: 'GET',
            ip: '192.168.1.100',
            socket: { remoteAddress: '192.168.1.100' },
            headers: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
        console.warn = jest.fn();
        console.log = jest.fn();
        // Reset config to default
        (0, ipFilter_1.updateConfig)({ ...ipList_1.defaultIPListConfig });
    });
    afterEach(() => {
        console.warn = originalWarn;
        console.log = originalLog;
    });
    describe('isValidIP', () => {
        it('should validate IPv4 addresses', () => {
            expect((0, ipFilter_1.isValidIP)('192.168.1.1')).toBe(true);
            expect((0, ipFilter_1.isValidIP)('10.0.0.1')).toBe(true);
            expect((0, ipFilter_1.isValidIP)('255.255.255.255')).toBe(true);
        });
        it('should invalidate malformed IPv4 addresses', () => {
            expect((0, ipFilter_1.isValidIP)('192.168.1')).toBe(false);
            expect((0, ipFilter_1.isValidIP)('192.168.1.1.1')).toBe(false);
            expect((0, ipFilter_1.isValidIP)('192.168.1.256')).toBe(false);
            expect((0, ipFilter_1.isValidIP)('not-an-ip')).toBe(false);
        });
    });
    describe('isValidCIDR', () => {
        it('should validate CIDR notation', () => {
            expect((0, ipFilter_1.isValidCIDR)('192.168.1.0/24')).toBe(true);
            expect((0, ipFilter_1.isValidCIDR)('10.0.0.0/8')).toBe(true);
            expect((0, ipFilter_1.isValidCIDR)('172.16.0.0/16')).toBe(true);
        });
        it('should invalidate malformed CIDR', () => {
            expect((0, ipFilter_1.isValidCIDR)('192.168.1.1')).toBe(false);
            expect((0, ipFilter_1.isValidCIDR)('192.168.1.0/33')).toBe(false);
            expect((0, ipFilter_1.isValidCIDR)('not-a-cidr')).toBe(false);
        });
    });
    describe('isIPInCIDR', () => {
        it('should check if IP is in CIDR range', () => {
            expect((0, ipFilter_1.isIPInCIDR)('192.168.1.50', '192.168.1.0/24')).toBe(true);
            expect((0, ipFilter_1.isIPInCIDR)('192.168.2.50', '192.168.1.0/24')).toBe(false);
            expect((0, ipFilter_1.isIPInCIDR)('10.0.50.1', '10.0.0.0/8')).toBe(true);
        });
        it('should handle edge cases', () => {
            expect((0, ipFilter_1.isIPInCIDR)('192.168.1.0', '192.168.1.0/24')).toBe(true);
            expect((0, ipFilter_1.isIPInCIDR)('192.168.1.255', '192.168.1.0/24')).toBe(true);
        });
    });
    describe('ipFilter', () => {
        it('should skip when disabled', () => {
            (0, ipFilter_1.updateConfig)({ mode: 'disabled' });
            (0, ipFilter_1.ipFilter)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should allow whitelisted IPs', () => {
            (0, ipFilter_1.updateConfig)({ mode: 'whitelist' });
            (0, ipFilter_1.addToWhitelist)({ ip: '192.168.1.100', description: 'Test' });
            (0, ipFilter_1.ipFilter)(mockReq, mockRes, mockNext);
            expect(mockRes.setHeader).toHaveBeenCalledWith('X-IP-Filter', 'whitelisted');
            expect(mockNext).toHaveBeenCalled();
        });
        it('should block non-whitelisted IPs in whitelist mode', () => {
            (0, ipFilter_1.updateConfig)({ mode: 'whitelist' });
            (0, ipFilter_1.ipFilter)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: 'IP_NOT_WHITELISTED',
                }),
            }));
        });
        it('should block blacklisted IPs', () => {
            (0, ipFilter_1.updateConfig)({ mode: 'blacklist' });
            (0, ipFilter_1.addToBlacklist)({ ip: '192.168.1.100', description: 'Test' });
            (0, ipFilter_1.ipFilter)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
        it('should allow non-blacklisted IPs', () => {
            (0, ipFilter_1.updateConfig)({ mode: 'blacklist' });
            (0, ipFilter_1.ipFilter)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should handle X-Forwarded-For header', () => {
            mockReq.headers = { 'x-forwarded-for': '203.0.113.1, 192.168.1.1' };
            (0, ipFilter_1.updateConfig)({ mode: 'blacklist' });
            (0, ipFilter_1.addToBlacklist)({ ip: '203.0.113.1', description: 'Test' });
            (0, ipFilter_1.ipFilter)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
        it('should handle X-Real-IP header', () => {
            mockReq.headers = { 'x-real-ip': '203.0.113.2' };
            (0, ipFilter_1.updateConfig)({ mode: 'blacklist' });
            (0, ipFilter_1.addToBlacklist)({ ip: '203.0.113.2', description: 'Test' });
            (0, ipFilter_1.ipFilter)(mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });
    });
    describe('Whitelist management', () => {
        it('should add IP to whitelist', () => {
            const result = (0, ipFilter_1.addToWhitelist)({ ip: '10.0.0.1', description: 'Office' });
            expect(result).toBe(true);
            const whitelist = (0, ipFilter_1.getWhitelistedIPs)();
            expect(whitelist).toContain('10.0.0.1');
        });
        it('should not add invalid IP to whitelist', () => {
            const result = (0, ipFilter_1.addToWhitelist)({ ip: 'invalid', description: 'Test' });
            expect(result).toBe(false);
        });
        it('should not add duplicate IP', () => {
            (0, ipFilter_1.addToWhitelist)({ ip: '10.0.0.2', description: 'Test' });
            const result = (0, ipFilter_1.addToWhitelist)({ ip: '10.0.0.2', description: 'Test' });
            expect(result).toBe(false);
        });
        it('should remove IP from whitelist', () => {
            (0, ipFilter_1.addToWhitelist)({ ip: '10.0.0.3', description: 'Test' });
            const result = (0, ipFilter_1.removeFromWhitelist)('10.0.0.3');
            expect(result).toBe(true);
            const whitelist = (0, ipFilter_1.getWhitelistedIPs)();
            expect(whitelist).not.toContain('10.0.0.3');
        });
        it('should return false when removing non-existent IP', () => {
            const result = (0, ipFilter_1.removeFromWhitelist)('10.0.0.999');
            expect(result).toBe(false);
        });
    });
    describe('Blacklist management', () => {
        it('should add IP to blacklist', () => {
            const result = (0, ipFilter_1.addToBlacklist)({ ip: '192.168.100.1', description: 'Attacker' });
            expect(result).toBe(true);
            const blacklist = (0, ipFilter_1.getBlockedIPs)();
            expect(blacklist).toContain('192.168.100.1');
        });
        it('should not add invalid IP to blacklist', () => {
            const result = (0, ipFilter_1.addToBlacklist)({ ip: 'invalid', description: 'Test' });
            expect(result).toBe(false);
        });
        it('should remove IP from blacklist', () => {
            (0, ipFilter_1.addToBlacklist)({ ip: '192.168.100.2', description: 'Test' });
            const result = (0, ipFilter_1.removeFromBlacklist)('192.168.100.2');
            expect(result).toBe(true);
        });
        it('should return false when removing non-existent IP', () => {
            const result = (0, ipFilter_1.removeFromBlacklist)('192.168.100.999');
            expect(result).toBe(false);
        });
    });
    describe('CIDR range management', () => {
        it('should add CIDR range to whitelist', () => {
            const result = (0, ipFilter_1.addWhitelistRange)({
                range: '10.0.0.0/8',
                description: 'Private network',
            });
            expect(result).toBe(true);
        });
        it('should not add invalid CIDR to whitelist', () => {
            const result = (0, ipFilter_1.addWhitelistRange)({
                range: 'invalid',
                description: 'Test',
            });
            expect(result).toBe(false);
        });
        it('should remove CIDR range from whitelist', () => {
            (0, ipFilter_1.addWhitelistRange)({ range: '172.16.0.0/12', description: 'Test' });
            const result = (0, ipFilter_1.removeWhitelistRange)('172.16.0.0/12');
            expect(result).toBe(true);
        });
        it('should add CIDR range to blacklist', () => {
            const result = (0, ipFilter_1.addBlacklistRange)({
                range: '192.168.0.0/16',
                description: 'Blocked network',
            });
            expect(result).toBe(true);
        });
        it('should remove CIDR range from blacklist', () => {
            (0, ipFilter_1.addBlacklistRange)({ range: '203.0.113.0/24', description: 'Test' });
            const result = (0, ipFilter_1.removeBlacklistRange)('203.0.113.0/24');
            expect(result).toBe(true);
        });
    });
    describe('getStats', () => {
        it('should return statistics', () => {
            const stats = (0, ipFilter_1.getStats)();
            expect(stats).toHaveProperty('mode');
            expect(stats).toHaveProperty('whitelistCount');
            expect(stats).toHaveProperty('blacklistCount');
            expect(stats).toHaveProperty('whitelistRangeCount');
            expect(stats).toHaveProperty('blacklistRangeCount');
        });
    });
});
//# sourceMappingURL=ipFilter.test.js.map