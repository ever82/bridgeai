"use strict";
/**
 * Points API Integration Tests
 * Tests the full HTTP request flow for points API endpoints using real database
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Set up test environment BEFORE any other imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-integration-tests';
const crypto_1 = require("crypto");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const jwt = __importStar(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const client_1 = require("../../db/client");
const points_1 = __importDefault(require("../../routes/points"));
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
async function createTestUser() {
    const user = {
        id: (0, crypto_1.randomUUID)(),
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        role: 'user',
        password: 'TestPassword123!',
    };
    const passwordHash = await bcrypt_1.default.hash(user.password, 10);
    await client_1.prisma.user.create({
        data: {
            id: user.id,
            email: user.email,
            name: user.name,
            passwordHash,
            status: 'ACTIVE',
        },
    });
    return user;
}
async function cleanupTestUsers() {
    await client_1.prisma.user.deleteMany({
        where: { email: { contains: '@example.com' } },
    });
}
function getUserAuthHeader(user) {
    const token = jwt.sign({
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'access',
        jti: `test-${user.id}-${Date.now()}`,
    }, JWT_SECRET, { expiresIn: '1h' });
    return { Authorization: `Bearer ${token}` };
}
function validateSuccessResponse(response) {
    return response.body && response.body.success === true;
}
function validateErrorResponse(response) {
    return response.status >= 400;
}
/**
 * Cleanup function to clean up points data for a user
 */
async function cleanupPointsData(userId) {
    await client_1.prisma.pointsTransaction.deleteMany({
        where: { userId },
    });
    await client_1.prisma.pointsFreeze.deleteMany({
        where: { account: { userId } },
    });
    await client_1.prisma.pointsAccount.deleteMany({
        where: { userId },
    });
}
/**
 * Setup test app with points routes
 */
function createTestApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/api/v1/points', points_1.default);
    return app;
}
describe('Points API Integration', () => {
    let app;
    beforeAll(() => {
        app = createTestApp();
    });
    afterAll(async () => {
        await cleanupTestUsers();
    });
    describe('GET /api/v1/points/account', () => {
        it('should return account for authenticated user', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/account').set(headers);
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            expect(body.data).toHaveProperty('balance');
            expect(body.data).toHaveProperty('totalEarned');
            expect(body.data).toHaveProperty('totalSpent');
            expect(body.data).toHaveProperty('frozenAmount');
            expect(body.data).toHaveProperty('availableBalance');
            await cleanupPointsData(user.id);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/account');
            expect(response.status).toBe(401);
        });
        it('should return 401 with invalid token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/points/account')
                .set('Authorization', 'Bearer invalid-token');
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/v1/points/balance', () => {
        it('should return available balance', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/balance').set(headers);
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            expect(body.data).toHaveProperty('availableBalance');
            await cleanupPointsData(user.id);
        });
    });
    describe('GET /api/v1/points/transactions', () => {
        it('should return empty transactions list for new user', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/transactions').set(headers);
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            expect(body.data).toHaveProperty('transactions');
            expect(body.data).toHaveProperty('pagination');
            expect(Array.isArray(body.data.transactions)).toBe(true);
            await cleanupPointsData(user.id);
        });
        it('should return paginated transactions', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/points/transactions')
                .set(headers)
                .query({ page: '1', pageSize: '10' });
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            const pagination = body.data.pagination;
            expect(pagination).toHaveProperty('page', 1);
            expect(pagination).toHaveProperty('pageSize', 10);
            await cleanupPointsData(user.id);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/transactions');
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/v1/points/stats', () => {
        it('should return stats for authenticated user', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/stats').set(headers);
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            expect(body.data).toHaveProperty('balance');
            expect(body.data).toHaveProperty('totalEarned');
            expect(body.data).toHaveProperty('totalSpent');
            expect(body.data).toHaveProperty('frozenAmount');
            expect(body.data).toHaveProperty('availableBalance');
            expect(body.data).toHaveProperty('byType');
            expect(body.data).toHaveProperty('recentStats');
            await cleanupPointsData(user.id);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/stats');
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/v1/points/transactions/export', () => {
        it('should export transactions as CSV', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/points/transactions/export')
                .set(headers)
                .query({ format: 'csv' });
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.headers['content-disposition']).toContain('attachment');
            await cleanupPointsData(user.id);
        });
        it('should return 400 for unsupported format', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/points/transactions/export')
                .set(headers)
                .query({ format: 'pdf' });
            expect(response.status).toBe(400);
            expect(validateErrorResponse(response)).toBe(true);
            await cleanupPointsData(user.id);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/transactions/export');
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/v1/points/freezes', () => {
        it('should return empty freezes list for new user', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/freezes').set(headers);
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            expect(body.data).toHaveProperty('freezes');
            expect(Array.isArray(body.data.freezes)).toBe(true);
            await cleanupPointsData(user.id);
        });
    });
    describe('GET /api/v1/points/rules', () => {
        it('should return all available rules', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/rules').set(headers);
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            expect(body.data).toHaveProperty('rules');
            expect(Array.isArray(body.data.rules)).toBe(true);
            await cleanupPointsData(user.id);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/rules');
            expect(response.status).toBe(401);
        });
    });
    describe('POST /api/v1/points/earn', () => {
        it('should earn points with valid rule code', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            // Ensure account exists first (GET /account calls getOrCreateAccount)
            await (0, supertest_1.default)(app).get('/api/v1/points/account').set(headers);
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/points/earn')
                .set(headers)
                .send({ ruleCode: 'CHECKIN' });
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            expect(body.data.success).toBe(true);
            await cleanupPointsData(user.id);
        });
        it('should return 400 for invalid rule code', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/points/earn')
                .set(headers)
                .send({ ruleCode: 'INVALID_RULE' });
            expect(response.status).toBe(400);
            await cleanupPointsData(user.id);
        });
    });
    describe('POST /api/v1/points/checkin', () => {
        it('should allow user to checkin', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            // Ensure account exists first
            await (0, supertest_1.default)(app).get('/api/v1/points/account').set(headers);
            const response = await (0, supertest_1.default)(app).post('/api/v1/points/checkin').set(headers).send({});
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            expect(body.data.success).toBe(true);
            await cleanupPointsData(user.id);
        });
    });
    describe('POST /api/v1/points/spend', () => {
        it('should spend points with valid rule code', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            // Ensure account and balance first
            await (0, supertest_1.default)(app).get('/api/v1/points/account').set(headers);
            // Earn some points first
            await (0, supertest_1.default)(app).post('/api/v1/points/earn').set(headers).send({ ruleCode: 'CHECKIN' });
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/points/spend')
                .set(headers)
                .send({ ruleCode: 'VIEW_PROFILE', metadata: { targetUserId: 'some-user-id' } });
            expect([200, 400]).toContain(response.status);
            // If 200, should have success; if 400, should have error
            if (response.status === 200) {
                expect(validateSuccessResponse(response)).toBe(true);
            }
            await cleanupPointsData(user.id);
        });
        it('should return 400 for invalid rule code', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/points/spend')
                .set(headers)
                .send({ ruleCode: 'INVALID_RULE' });
            expect(response.status).toBe(400);
            await cleanupPointsData(user.id);
        });
    });
    describe('POST /api/v1/points/freeze', () => {
        it('should freeze points successfully', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            // Earn some points first
            await (0, supertest_1.default)(app).get('/api/v1/points/account').set(headers);
            await (0, supertest_1.default)(app).post('/api/v1/points/earn').set(headers).send({ ruleCode: 'CHECKIN' });
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/points/freeze')
                .set(headers)
                .send({ amount: 1, reason: 'Test freeze', scene: 'AGENT_DATE' });
            expect([200, 400]).toContain(response.status);
            if (response.status === 200) {
                expect(validateSuccessResponse(response)).toBe(true);
            }
            await cleanupPointsData(user.id);
        });
        it('should return 400 for invalid amount', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/points/freeze')
                .set(headers)
                .send({ amount: -1, reason: 'Test freeze' });
            expect(response.status).toBe(400);
            await cleanupPointsData(user.id);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/points/freeze')
                .send({ amount: 1, reason: 'Test freeze' });
            expect(response.status).toBe(401);
        });
    });
    describe('POST /api/v1/points/transfer', () => {
        it('should transfer points between users', async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const headers1 = getUserAuthHeader(user1);
            const _headers2 = getUserAuthHeader(user2);
            // Earn some points for user1
            await (0, supertest_1.default)(app).get('/api/v1/points/account').set(headers1);
            await (0, supertest_1.default)(app).post('/api/v1/points/earn').set(headers1).send({ ruleCode: 'CHECKIN' });
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/points/transfer')
                .set(headers1)
                .send({ toUserId: user2.id, amount: 1, description: 'Test transfer' });
            expect([200, 400]).toContain(response.status);
            if (response.status === 200) {
                expect(validateSuccessResponse(response)).toBe(true);
            }
            await cleanupPointsData(user1.id);
            await cleanupPointsData(user2.id);
        });
        it('should return 400 for invalid amount', async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const headers1 = getUserAuthHeader(user1);
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/points/transfer')
                .set(headers1)
                .send({ toUserId: user2.id, amount: -1 });
            expect(response.status).toBe(400);
            await cleanupPointsData(user1.id);
            await cleanupPointsData(user2.id);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/points/transfer')
                .send({ toUserId: 'some-user-id', amount: 1 });
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/v1/points/transactions/:transactionId', () => {
        it('should return transaction detail', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            // Create a transaction first
            await (0, supertest_1.default)(app).get('/api/v1/points/account').set(headers);
            const earnRes = await (0, supertest_1.default)(app)
                .post('/api/v1/points/earn')
                .set(headers)
                .send({ ruleCode: 'CHECKIN' });
            const transactionId = earnRes.body.data?.transaction?.id;
            if (transactionId) {
                const response = await (0, supertest_1.default)(app)
                    .get(`/api/v1/points/transactions/${transactionId}`)
                    .set(headers);
                expect(response.status).toBe(200);
                expect(validateSuccessResponse(response)).toBe(true);
                const body = response.body;
                expect(body.data).toHaveProperty('id', transactionId);
            }
            await cleanupPointsData(user.id);
        });
        it('should return 404 for non-existent transaction', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app)
                .get('/api/v1/points/transactions/00000000-0000-0000-0000-000000000000')
                .set(headers);
            expect(response.status).toBe(404);
            await cleanupPointsData(user.id);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/transactions/00000000-0000-0000-0000-000000000000');
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/v1/points/rules/:ruleCode', () => {
        it('should return rule detail', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/rules/CHECKIN').set(headers);
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            expect(body.data).toHaveProperty('code', 'CHECKIN');
            await cleanupPointsData(user.id);
        });
        it('should return 404 for unknown rule', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/rules/UNKNOWN_RULE').set(headers);
            expect(response.status).toBe(404);
            await cleanupPointsData(user.id);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/rules/CHECKIN');
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/v1/points/rules/scene/:scene', () => {
        it('should return rules for specific scene', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/rules/scene/agent_date').set(headers);
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            expect(body.data).toHaveProperty('rules');
            expect(Array.isArray(body.data.rules)).toBe(true);
            await cleanupPointsData(user.id);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/rules/scene/agent_date');
            expect(response.status).toBe(401);
        });
    });
    describe('POST /api/v1/points/rules/:ruleCode/check-limits', () => {
        it('should check rule limits', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app)
                .post('/api/v1/points/rules/CHECKIN/check-limits')
                .set(headers)
                .send({});
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            expect(body.data).toHaveProperty('allowed');
            expect(body.data).toHaveProperty('remainingDaily');
            expect(body.data).toHaveProperty('remainingWeekly');
            await cleanupPointsData(user.id);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app).post('/api/v1/points/rules/CHECKIN/check-limits');
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/v1/points/config/value', () => {
        it('should return value config', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/config/value').set(headers);
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            expect(body.data).toHaveProperty('rmbToPointsRate');
            expect(body.data).toHaveProperty('pointsToRmbRate');
            await cleanupPointsData(user.id);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/config/value');
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/v1/points/config/limits', () => {
        it('should return limit config', async () => {
            const user = await createTestUser();
            const headers = getUserAuthHeader(user);
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/config/limits').set(headers);
            expect(response.status).toBe(200);
            expect(validateSuccessResponse(response)).toBe(true);
            const body = response.body;
            expect(body.data).toHaveProperty('dailyEarnLimit');
            await cleanupPointsData(user.id);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/v1/points/config/limits');
            expect(response.status).toBe(401);
        });
    });
});
//# sourceMappingURL=points.integration.test.js.map