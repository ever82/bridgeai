"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const oauthService_1 = require("../oauthService");
const client_1 = require("../../db/client");
const logger_1 = require("../../utils/logger");
// Mock prisma
jest.mock('../../db/client', () => ({
    prisma: {
        oAuthConnection: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            updateMany: jest.fn(),
            deleteMany: jest.fn(),
        },
        user: {
            create: jest.fn(),
        },
    },
}));
// Mock logger
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;
describe('OAuth Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getOAuthAuthorizationUrl', () => {
        it('should generate WeChat authorization URL', () => {
            process.env.WECHAT_APP_ID = 'wx-test-app-id';
            const url = (0, oauthService_1.getOAuthAuthorizationUrl)('wechat', 'test-state');
            expect(url).toContain('https://open.weixin.qq.com/connect/oauth2/authorize');
            expect(url).toContain('client_id=wx-test-app-id');
            expect(url).toContain('response_type=code');
            expect(url).toContain('state=test-state');
            expect(url).toContain('scope=snsapi_userinfo');
        });
        it('should generate Google authorization URL', () => {
            process.env.GOOGLE_CLIENT_ID = 'google-test-client-id';
            const url = (0, oauthService_1.getOAuthAuthorizationUrl)('google');
            expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
            expect(url).toContain('client_id=google-test-client-id');
            expect(url).toContain('access_type=offline');
            expect(url).toContain('prompt=consent');
            expect(url).toContain('scope=openid+email+profile');
        });
        it('should throw error when provider is not configured', () => {
            process.env.WECHAT_APP_ID = '';
            expect(() => (0, oauthService_1.getOAuthAuthorizationUrl)('wechat')).toThrow('wechat OAuth 未配置');
        });
    });
    describe('exchangeCodeForToken', () => {
        it('should exchange code for access token', async () => {
            process.env.WECHAT_APP_ID = 'wx-test';
            process.env.WECHAT_APP_SECRET = 'wx-secret';
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    access_token: 'mock-access-token',
                    refresh_token: 'mock-refresh-token',
                    expires_in: 7200,
                }),
            });
            const result = await (0, oauthService_1.exchangeCodeForToken)('wechat', 'auth-code');
            expect(result.accessToken).toBe('mock-access-token');
            expect(result.refreshToken).toBe('mock-refresh-token');
            expect(result.expiresIn).toBe(7200);
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('api.weixin.qq.com'), expect.objectContaining({ method: 'POST' }));
        });
        it('should throw error when token exchange fails', async () => {
            process.env.WECHAT_APP_ID = 'wx-test';
            process.env.WECHAT_APP_SECRET = 'wx-secret';
            mockFetch.mockResolvedValue({
                ok: false,
                text: jest.fn().mockResolvedValue('invalid code'),
            });
            await expect((0, oauthService_1.exchangeCodeForToken)('wechat', 'bad-code')).rejects.toThrow('OAuth token exchange failed');
        });
    });
    describe('getOAuthUserInfo', () => {
        it('should get WeChat user info', async () => {
            process.env.WECHAT_APP_ID = 'wx-test';
            process.env.WECHAT_APP_SECRET = 'wx-secret';
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    openid: 'wx-user-1',
                    nickname: 'WeChat User',
                    headimgurl: 'https://example.com/avatar.jpg',
                }),
            });
            const result = await (0, oauthService_1.getOAuthUserInfo)('wechat', 'access-token');
            expect(result.id).toBe('wx-user-1');
            expect(result.name).toBe('WeChat User');
            expect(result.avatar).toBe('https://example.com/avatar.jpg');
        });
        it('should get Google user info', async () => {
            process.env.GOOGLE_CLIENT_ID = 'g-test';
            process.env.GOOGLE_CLIENT_SECRET = 'g-secret';
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    id: 'google-user-1',
                    email: 'user@gmail.com',
                    name: 'Google User',
                    picture: 'https://example.com/pic.jpg',
                }),
            });
            const result = await (0, oauthService_1.getOAuthUserInfo)('google', 'access-token');
            expect(result.id).toBe('google-user-1');
            expect(result.email).toBe('user@gmail.com');
            expect(result.name).toBe('Google User');
            expect(result.avatar).toBe('https://example.com/pic.jpg');
        });
        it('should throw error when user info request fails', async () => {
            process.env.WECHAT_APP_ID = 'wx-test';
            process.env.WECHAT_APP_SECRET = 'wx-secret';
            mockFetch.mockResolvedValue({
                ok: false,
                text: jest.fn().mockResolvedValue('unauthorized'),
            });
            await expect((0, oauthService_1.getOAuthUserInfo)('wechat', 'bad-token')).rejects.toThrow('Failed to get user info');
        });
    });
    describe('handleOAuthCallback', () => {
        it('should create new user for new OAuth connection', async () => {
            process.env.WECHAT_APP_ID = 'wx-test';
            process.env.WECHAT_APP_SECRET = 'wx-secret';
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    access_token: 'token-1',
                    refresh_token: 'refresh-1',
                    expires_in: 7200,
                }),
            })
                .mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    openid: 'wx-user-1',
                    nickname: 'New User',
                    headimgurl: 'https://example.com/avatar.jpg',
                }),
            });
            client_1.prisma.oAuthConnection.findFirst.mockResolvedValue(null);
            client_1.prisma.user.create.mockResolvedValue({
                id: 'user-1',
                email: null,
                phone: null,
                name: 'New User',
                avatarUrl: 'https://example.com/avatar.jpg',
                role: 'user',
                status: 'active',
                passwordHash: '',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            client_1.prisma.oAuthConnection.create.mockResolvedValue({});
            const result = await (0, oauthService_1.handleOAuthCallback)('wechat', 'auth-code');
            expect(result).toBeDefined();
            expect(result.user.id).toBe('user-1');
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(logger_1.logger.info).toHaveBeenCalledWith('New user created via OAuth', expect.any(Object));
        });
        it('should login existing OAuth user', async () => {
            process.env.WECHAT_APP_ID = 'wx-test';
            process.env.WECHAT_APP_SECRET = 'wx-secret';
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    access_token: 'token-1',
                    refresh_token: 'refresh-1',
                    expires_in: 7200,
                }),
            })
                .mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    openid: 'wx-user-1',
                    nickname: 'Existing User',
                }),
            });
            client_1.prisma.oAuthConnection.findFirst.mockResolvedValue({
                user: {
                    id: 'user-2',
                    email: 'existing@example.com',
                    phone: null,
                    name: 'Existing User',
                    avatarUrl: null,
                    role: 'user',
                    status: 'active',
                    passwordHash: '',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });
            client_1.prisma.oAuthConnection.updateMany.mockResolvedValue({});
            const result = await (0, oauthService_1.handleOAuthCallback)('wechat', 'auth-code');
            expect(result.user.id).toBe('user-2');
            expect(result.user.email).toBe('existing@example.com');
            expect(logger_1.logger.info).toHaveBeenCalledWith('User logged in via OAuth', expect.any(Object));
        });
    });
    describe('bindOAuthAccount', () => {
        it('should bind OAuth account to user', async () => {
            process.env.WECHAT_APP_ID = 'wx-test';
            process.env.WECHAT_APP_SECRET = 'wx-secret';
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    access_token: 'token-1',
                    refresh_token: 'refresh-1',
                    expires_in: 7200,
                }),
            })
                .mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    openid: 'wx-user-1',
                    nickname: 'OAuth User',
                }),
            });
            client_1.prisma.oAuthConnection.findFirst.mockResolvedValue(null);
            client_1.prisma.oAuthConnection.create.mockResolvedValue({});
            await (0, oauthService_1.bindOAuthAccount)('user-1', 'wechat', 'auth-code');
            expect(client_1.prisma.oAuthConnection.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'user-1',
                    provider: 'wechat',
                    providerUserId: 'wx-user-1',
                }),
            }));
            expect(logger_1.logger.info).toHaveBeenCalledWith('OAuth account bound', {
                userId: 'user-1',
                provider: 'wechat',
            });
        });
        it('should throw error when account already bound', async () => {
            process.env.WECHAT_APP_ID = 'wx-test';
            process.env.WECHAT_APP_SECRET = 'wx-secret';
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    access_token: 'token-1',
                    refresh_token: 'refresh-1',
                    expires_in: 7200,
                }),
            })
                .mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    openid: 'wx-user-1',
                    nickname: 'OAuth User',
                }),
            });
            client_1.prisma.oAuthConnection.findFirst.mockResolvedValue({ id: 'conn-1' });
            await expect((0, oauthService_1.bindOAuthAccount)('user-1', 'wechat', 'auth-code')).rejects.toThrow('该账号已绑定到其他用户');
        });
    });
    describe('unbindOAuthAccount', () => {
        it('should unbind OAuth account', async () => {
            client_1.prisma.oAuthConnection.deleteMany.mockResolvedValue({ count: 1 });
            await (0, oauthService_1.unbindOAuthAccount)('user-1', 'wechat');
            expect(client_1.prisma.oAuthConnection.deleteMany).toHaveBeenCalledWith({
                where: { userId: 'user-1', provider: 'wechat' },
            });
            expect(logger_1.logger.info).toHaveBeenCalledWith('OAuth account unbound', {
                userId: 'user-1',
                provider: 'wechat',
            });
        });
    });
    describe('getUserOAuthConnections', () => {
        it('should return user OAuth connections', async () => {
            client_1.prisma.oAuthConnection.findMany.mockResolvedValue([
                { provider: 'wechat', createdAt: new Date('2024-01-01') },
                { provider: 'google', createdAt: new Date('2024-02-01') },
            ]);
            const result = await (0, oauthService_1.getUserOAuthConnections)('user-1');
            expect(result).toHaveLength(2);
            expect(result[0].provider).toBe('wechat');
            expect(result[1].provider).toBe('google');
            expect(client_1.prisma.oAuthConnection.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                select: { provider: true, createdAt: true },
            });
        });
        it('should return empty array when no connections', async () => {
            client_1.prisma.oAuthConnection.findMany.mockResolvedValue([]);
            const result = await (0, oauthService_1.getUserOAuthConnections)('user-1');
            expect(result).toHaveLength(0);
        });
    });
});
//# sourceMappingURL=oauthService.test.js.map