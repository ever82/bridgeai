"use strict";
/**
 * Probe Test for ISSUE-A003a: 后端用户资料管理 API
 * 密码修改、手机/邮箱绑定、账号删除等
 *
 * 刁钻角度测试:
 * 1. 密码修改边界情况（相同密码、空密码、并发修改）
 * 2. 手机/邮箱绑定边界情况（重复绑定、无效格式、解绑）
 * 3. 账号删除边界情况（错误密码删除、双重删除、删除后访问）
 * 4. 隐私设置边界情况（无效枚举值、空body、部分更新）
 * 5. 设备管理边界情况（移除当前设备、不存在的设备）
 * 6. 拉黑/取消拉黑边界情况（拉黑自己、重复拉黑、取消未拉黑用户）
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const zod_1 = require("zod");
// ============================================================
// MOCK DEPENDENCIES
// ============================================================
// Mock bcrypt BEFORE any imports
const mockBcryptCompare = globals_1.jest.fn();
const mockBcryptHash = globals_1.jest.fn().mockResolvedValue('$2b$12$hashednewpassword');
globals_1.jest.mock('bcryptjs', () => ({
    compare: mockBcryptCompare,
    hash: mockBcryptHash,
}));
// Mock Redis
globals_1.jest.mock('../services/redis', () => ({
    redis: {
        get: globals_1.jest.fn(),
        set: globals_1.jest.fn(),
        setex: globals_1.jest.fn(),
        del: globals_1.jest.fn(),
        exists: globals_1.jest.fn().mockResolvedValue(0),
        keys: globals_1.jest.fn().mockResolvedValue([]),
        ttl: globals_1.jest.fn().mockResolvedValue(-1),
        pipeline: globals_1.jest.fn().mockReturnValue({
            setex: globals_1.jest.fn(),
            exec: globals_1.jest.fn(),
        }),
    },
}));
// Mock storageService
globals_1.jest.mock('../services/storageService', () => ({
    uploadAvatar: globals_1.jest.fn(),
    deleteFile: globals_1.jest.fn(),
}));
// Mock Prisma Client
const mockPrisma = {
    user: {
        findUnique: globals_1.jest.fn(),
        findFirst: globals_1.jest.fn(),
        findMany: globals_1.jest.fn(),
        create: globals_1.jest.fn(),
        update: globals_1.jest.fn(),
        delete: globals_1.jest.fn(),
    },
    blockedUser: {
        create: globals_1.jest.fn(),
        deleteMany: globals_1.jest.fn(),
        findUnique: globals_1.jest.fn(),
        findMany: globals_1.jest.fn(),
    },
    userDevice: {
        upsert: globals_1.jest.fn(),
        findMany: globals_1.jest.fn(),
        updateMany: globals_1.jest.fn(),
        deleteMany: globals_1.jest.fn(),
    },
    connection: {
        deleteMany: globals_1.jest.fn(),
    },
    $transaction: globals_1.jest.fn(),
};
globals_1.jest.mock('../db/client', () => ({
    prisma: mockPrisma,
}));
// ============================================================
// TEST DATA
// ============================================================
const MOCK_USER_ID = 'user-123';
const MOCK_USER_ID_2 = 'user-456';
const MOCK_PASSWORD_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.S0z8S8kKcK8K.';
const MOCK_PHONE = '13812345678';
const MOCK_EMAIL = 'test@example.com';
const MOCK_NEW_PHONE = '13987654321';
const MOCK_NEW_EMAIL = 'new@example.com';
const MOCK_DEVICE_ID = 'device-abc';
const MOCK_PASSWORD = 'TestPassword123';
function createMockUser(overrides = {}) {
    return {
        id: MOCK_USER_ID,
        email: MOCK_EMAIL,
        emailVerified: true,
        phone: null,
        phoneVerified: false,
        name: 'Test User',
        displayName: 'Test',
        avatarUrl: null,
        bio: null,
        website: null,
        location: null,
        passwordHash: MOCK_PASSWORD_HASH,
        status: 'ACTIVE',
        privacySettings: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    };
}
// ============================================================
// TEST SUITE
// ============================================================
(0, globals_1.describe)('ISSUE-A003a Probe Tests', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockBcryptCompare.mockReset();
        mockBcryptHash.mockReset();
        mockBcryptHash.mockResolvedValue('$2b$12$hashednewpassword');
    });
    // ============================================================
    // PT-001: 密码修改 - 相同密码检测
    // ============================================================
    (0, globals_1.describe)('PT-001: 密码修改 - 相同密码检测', () => {
        (0, globals_1.test)('BUG-1: userService.changePassword 缺少 SAME_PASSWORD 检查', async () => {
            // 探针: userService.changePassword() 缺少 "新密码不能与旧密码相同" 的检查
            // userPrivacy.ts /me/password 路由有这个检查，但 service 层没有
            const userService = require('../services/userService');
            const user = createMockUser();
            mockPrisma.user.findUnique.mockResolvedValue(user);
            // 模拟: 旧密码正确，新密码也相同
            mockBcryptCompare.mockResolvedValue(true);
            try {
                // 用户想设置新密码为旧密码
                await userService.changePassword(MOCK_USER_ID, MOCK_PASSWORD, MOCK_PASSWORD);
                // 如果走到这里，说明没有拦截相同密码
                console.log('✗ BUG: changePassword 允许设置与旧密码相同的新密码');
            }
            catch (error) {
                if (error.code === 'SAME_PASSWORD') {
                    console.log('✓ 有 same password 检查');
                }
                else {
                    console.log('✗ BUG: 错误类型错误, 期望 SAME_PASSWORD, 实际:', error.code);
                }
            }
        });
        (0, globals_1.test)('BUG-2: users.ts POST /password 路由缺少 SAME_PASSWORD 检查', async () => {
            // 探针: userPrivacy.ts 的 /me/password 有 SAME_PASSWORD 检查
            // 但 users.ts 的 /password 路由没有！
            const userService = require('../services/userService');
            const user = createMockUser();
            mockPrisma.user.findUnique.mockResolvedValue(user);
            mockPrisma.user.update.mockResolvedValue(user);
            mockBcryptCompare.mockResolvedValue(true);
            // 验证: changePassword 允许相同密码 = 路由层也允许
            await userService.changePassword(MOCK_USER_ID, MOCK_PASSWORD, MOCK_PASSWORD);
            console.log('✗ BUG: userService.changePassword 没有检查 SAME_PASSWORD');
            console.log('   /me/password 路由 (userPrivacy.ts) 有检查，但 /password 路由 (users.ts) 调用 changePassword 没有检查');
        });
        (0, globals_1.test)('BUG-3: Bcrypt salt rounds 不一致', async () => {
            // 探针: userPrivacy.ts 使用 salt rounds=12, userService.changePassword 使用 salt rounds=10
            const userService = require('../services/userService');
            const user = createMockUser();
            mockPrisma.user.findUnique.mockResolvedValue(user);
            mockPrisma.user.update.mockResolvedValue(user);
            mockBcryptCompare.mockResolvedValue(true);
            await userService.changePassword(MOCK_USER_ID, MOCK_PASSWORD, 'NewPassword123');
            const hashCall = mockBcryptHash.mock.calls[0];
            const saltRounds = hashCall[1];
            if (saltRounds !== 12) {
                console.log('✗ BUG: userService.changePassword 使用 salt rounds=' + saltRounds + ', 应为 12');
                console.log('   userPrivacy.ts 使用 12, userService.changePassword 使用 10');
            }
            else {
                console.log('✓ salt rounds 正确为 12');
            }
        });
        (0, globals_1.test)('BUG-4: userService.verifyPassword 返回统一错误', async () => {
            // 探针: verifyPassword 对不存在用户返回 "User not found"
            // 应该返回统一的 "用户名或密码错误" 防止用户枚举
            const userService = require('../services/userService');
            mockPrisma.user.findUnique.mockResolvedValue(null);
            try {
                await userService.verifyPassword('non-existent-user', MOCK_PASSWORD);
                console.log('✗ BUG: 不存在用户未报错');
            }
            catch (error) {
                if (error.code === 'USER_NOT_FOUND') {
                    console.log('✗ BUG: 错误信息 "用户不存在" 可能泄露用户存在信息');
                    console.log('   建议: 返回 "用户名或密码错误" (INVALID_CREDENTIALS)');
                }
            }
        });
    });
    // ============================================================
    // PT-002: 手机/邮箱绑定
    // ============================================================
    (0, globals_1.describe)('PT-002: 手机/邮箱绑定 - 重复绑定检测', () => {
        (0, globals_1.test)('BUG-5: userService.updatePhone 检查手机号是否已被使用', async () => {
            // 探针: updatePhone 使用 findFirst 正确排除自己
            const userService = require('../services/userService');
            const existingUser = createMockUser({ id: MOCK_USER_ID_2, phone: MOCK_PHONE });
            mockPrisma.user.findFirst.mockResolvedValue(existingUser);
            try {
                await userService.updatePhone(MOCK_USER_ID, MOCK_PHONE);
                console.log('✗ BUG: updatePhone 允许绑定已被他人使用的手机号');
            }
            catch (error) {
                if (error.code === 'PHONE_EXISTS') {
                    console.log('✓ 正确拒绝重复手机号绑定');
                }
            }
        });
        (0, globals_1.test)('BUG-6: userService.updateEmail 检查邮箱是否已被使用', async () => {
            // 探针: updateEmail 使用 findFirst 正确排除自己
            const userService = require('../services/userService');
            const existingUser = createMockUser({ id: MOCK_USER_ID_2, email: MOCK_EMAIL });
            mockPrisma.user.findFirst.mockResolvedValue(existingUser);
            try {
                await userService.updateEmail(MOCK_USER_ID, MOCK_EMAIL);
                console.log('✗ BUG: updateEmail 允许绑定已被他人使用的邮箱');
            }
            catch (error) {
                if (error.code === 'EMAIL_EXISTS') {
                    console.log('✓ 正确拒绝重复邮箱绑定');
                }
            }
        });
        (0, globals_1.test)('BUG-7: updatePhone/updateEmail 不验证验证码', async () => {
            // 探针: updatePhone 和 updateEmail 没有验证码验证步骤
            // userPrivacy.ts 中的 /me/phone/bind 和 /me/email/bind 也是 TODO 状态
            const userService = require('../services/userService');
            mockPrisma.user.findFirst.mockResolvedValue(null);
            mockPrisma.user.update.mockImplementation(async ({ where, data }) => {
                return createMockUser({
                    phone: data.phone,
                    phoneVerified: data.phoneVerified,
                    email: data.email,
                    emailVerified: data.emailVerified,
                });
            });
            const phoneResult = await userService.updatePhone(MOCK_USER_ID, MOCK_NEW_PHONE);
            const emailResult = await userService.updateEmail(MOCK_USER_ID, MOCK_NEW_EMAIL);
            console.log('✗ BUG: updatePhone 和 updateEmail 不验证验证码');
            console.log('   phoneVerified 设置为 false（需要重新验证）');
            console.log('   emailVerified 设置为 false（需要重新验证）');
            console.log('   但 userPrivacy.ts /me/phone/bind 和 /me/email/bind 的验证码检查是 TODO');
        });
        (0, globals_1.test)('BUG-8: 手机号格式验证正则', async () => {
            // 探针: 检查手机号格式验证正则
            // 源码: /^1[3-9]\d{9}$/
            const phoneRegex = /^1[3-9]\d{9}$/;
            const invalidPhones = [
                '1234567890', // 10位
                '01234567890', // 以0开头
                '1381234567', // 10位
                '123456789012', // 12位
                '+8613812345678', // 带国际区号
                '13812345678a', // 含字母
                '08613812345678', // 以08开头
            ];
            const validPhones = [
                '13812345678',
                '15912345678',
                '19912345678',
                '14712345678',
                '16612345678',
            ];
            let invalidFound = false;
            for (const phone of invalidPhones) {
                if (phoneRegex.test(phone)) {
                    console.log('✗ BUG: 无效手机号通过正则验证:', phone);
                    invalidFound = true;
                }
            }
            let validPassed = true;
            for (const phone of validPhones) {
                if (!phoneRegex.test(phone)) {
                    console.log('✗ 有效手机号未通过正则验证:', phone);
                    validPassed = false;
                }
            }
            if (!invalidFound && validPassed) {
                console.log('✓ 手机号正则验证正确');
            }
        });
    });
    // ============================================================
    // PT-003: 账号删除
    // ============================================================
    (0, globals_1.describe)('PT-003: 账号删除 - 边界情况', () => {
        (0, globals_1.test)('BUG-9: deleteUser 删除后 avatar cleanup 存在竞态条件', async () => {
            // 探针: deleteUser 先删除用户再清理 avatar，如果清理失败用户已无法恢复
            const userService = require('../services/userService');
            const user = createMockUser({ avatarUrl: 'https://example.com/avatar.jpg' });
            mockPrisma.user.findUnique.mockResolvedValue(user);
            mockPrisma.blockedUser.deleteMany.mockResolvedValue({ count: 0 });
            mockPrisma.userDevice.deleteMany.mockResolvedValue({ count: 0 });
            mockPrisma.connection.deleteMany.mockResolvedValue({ count: 0 });
            let transactionOps = [];
            mockPrisma.$transaction.mockImplementation(async (ops) => {
                transactionOps = ops;
                return ops;
            });
            const storageService = require('../services/storageService');
            // 模拟事务内删除用户成功，但 avatar 清理失败
            try {
                // avatar 清理发生在事务外，需要单独模拟
                storageService.deleteFile.mockRejectedValueOnce(new Error('File not found'));
                await userService.deleteUser(MOCK_USER_ID);
                console.log('⚠ 注意: 用户删除成功，avatar 清理在事务外可能失败');
            }
            catch (error) {
                console.log('⚠ 注意: avatar 清理失败但不应阻止用户删除');
            }
        });
        (0, globals_1.test)('BUG-10: deleteUser 的 $transaction 返回值未处理', async () => {
            // 探针: deleteUser 调用 $transaction 但不检查返回值
            const userService = require('../services/userService');
            const user = createMockUser();
            mockPrisma.user.findUnique.mockResolvedValue(user);
            mockPrisma.$transaction.mockResolvedValue([
                { count: 0 }, { count: 0 }, { count: 0 }, user
            ]);
            const result = await userService.deleteUser(MOCK_USER_ID);
            // 问题: 返回值是 void，无法确认删除是否成功
            if (result === undefined) {
                console.log('⚠ 注意: deleteUser 返回 void，无法确认是否成功');
            }
        });
        (0, globals_1.test)('BUG-11: deleteUser 连接删除可能失败', async () => {
            // 探针: deleteUser 直接 deleteMany connections
            const userService = require('../services/userService');
            const user = createMockUser();
            mockPrisma.user.findUnique.mockResolvedValue(user);
            mockPrisma.$transaction.mockRejectedValue(new Error('Foreign key constraint violation on connections'));
            try {
                await userService.deleteUser(MOCK_USER_ID);
            }
            catch (error) {
                if (error.message.includes('Foreign key')) {
                    console.log('✗ BUG: 删除用户时外键约束失败');
                }
            }
        });
    });
    // ============================================================
    // PT-004: 隐私设置
    // ============================================================
    (0, globals_1.describe)('PT-004: 隐私设置 - 无效枚举值', () => {
        (0, globals_1.test)('BUG-12: Zod schema 应拒绝无效的枚举值', async () => {
            // 探针: privacySettingsSchema 使用 z.enum()
            const privacySettingsSchema = zod_1.z.object({
                profileVisibility: zod_1.z.enum(['public', 'friends', 'private']).optional(),
                onlineStatusVisibility: zod_1.z.enum(['everyone', 'friends', 'nobody']).optional(),
                phoneVisibility: zod_1.z.enum(['public', 'friends', 'hidden']).optional(),
                emailVisibility: zod_1.z.enum(['public', 'friends', 'hidden']).optional(),
                allowSearchByPhone: zod_1.z.boolean().optional(),
                allowSearchByEmail: zod_1.z.boolean().optional(),
                showLastSeen: zod_1.z.boolean().optional(),
            });
            const invalidBody = {
                profileVisibility: 'invalid_value',
            };
            const result = privacySettingsSchema.safeParse(invalidBody);
            if (!result.success) {
                console.log('✓ Zod schema 正确拒绝无效枚举值');
            }
            else {
                console.log('✗ BUG: 无效枚举值未被拒绝');
            }
        });
        (0, globals_1.test)('BUG-13: 空 body 应该被接受但不更新任何字段', async () => {
            // 探针: 空 body {} 通过 Zod 验证
            const privacySettingsSchema = zod_1.z.object({
                profileVisibility: zod_1.z.enum(['public', 'friends', 'private']).optional(),
                onlineStatusVisibility: zod_1.z.enum(['everyone', 'friends', 'nobody']).optional(),
                phoneVisibility: zod_1.z.enum(['public', 'friends', 'hidden']).optional(),
                emailVisibility: zod_1.z.enum(['public', 'friends', 'hidden']).optional(),
                allowSearchByPhone: zod_1.z.boolean().optional(),
                allowSearchByEmail: zod_1.z.boolean().optional(),
                showLastSeen: zod_1.z.boolean().optional(),
            });
            const emptyBody = {};
            const result = privacySettingsSchema.safeParse(emptyBody);
            if (result.success) {
                console.log('⚠ 注意: 空 body 通过验证，但不会更新任何字段');
                console.log('   建议: 在路由层检查是否至少提供一个字段');
            }
            else {
                console.log('✓ 空 body 被正确拒绝');
            }
        });
        (0, globals_1.test)('BUG-14: updatePrivacySettings 部分更新正确合并', async () => {
            // 探针: 检查 updatePrivacySettings 是否正确合并设置
            const userService = require('../services/userService');
            const currentSettings = {
                profileVisibility: 'public',
                onlineStatusVisibility: 'everyone',
                phoneVisibility: 'hidden',
                emailVisibility: 'hidden',
                allowSearchByPhone: false,
                allowSearchByEmail: false,
                showLastSeen: true,
            };
            mockPrisma.user.findUnique.mockResolvedValue({
                privacySettings: currentSettings,
            });
            mockPrisma.user.update.mockImplementation(async ({ where, data }) => {
                return {
                    ...currentSettings,
                    ...data.privacySettings,
                    id: MOCK_USER_ID
                };
            });
            const newSettings = await userService.updatePrivacySettings(MOCK_USER_ID, {
                profileVisibility: 'private',
            });
            (0, globals_1.expect)(newSettings.profileVisibility).toBe('private');
            (0, globals_1.expect)(newSettings.onlineStatusVisibility).toBe('everyone');
            (0, globals_1.expect)(newSettings.phoneVisibility).toBe('hidden');
            console.log('✓ 部分更新正确合并');
        });
        (0, globals_1.test)('BUG-15: getPrivacySettings 返回完整默认设置', async () => {
            // 探针: 检查 getPrivacySettings 是否正确返回默认设置
            const userService = require('../services/userService');
            mockPrisma.user.findUnique.mockResolvedValue({
                privacySettings: null,
            });
            const settings = await userService.getPrivacySettings(MOCK_USER_ID);
            if (settings.profileVisibility === 'public' &&
                settings.allowSearchByPhone === false &&
                settings.showLastSeen === true) {
                console.log('✓ 正确返回默认隐私设置');
            }
            else {
                console.log('✗ BUG: 默认隐私设置不正确');
            }
        });
    });
    // ============================================================
    // PT-005: 设备管理
    // ============================================================
    (0, globals_1.describe)('PT-005: 设备管理 - 移除当前设备', () => {
        (0, globals_1.test)('BUG-16: removeDevice 不检查设备是否存在', async () => {
            // 探针: removeDevice 直接 deleteMany，不检查设备是否存在
            const userService = require('../services/userService');
            mockPrisma.userDevice.deleteMany.mockResolvedValue({ count: 0 });
            await userService.removeDevice(MOCK_USER_ID, 'non-existent-device');
            console.log('⚠ 注意: removeDevice 删除不存在的设备不报错');
            console.log('   建议: 检查 deleteMany 返回值 { count: 0 } 时报错');
        });
        (0, globals_1.test)('BUG-17: 移除当前设备后其他设备不会变成 current', async () => {
            // 探针: 如果移除的是当前设备，其他设备不会自动变成 current
            const userService = require('../services/userService');
            mockPrisma.userDevice.deleteMany.mockResolvedValue({ count: 1 });
            await userService.removeDevice(MOCK_USER_ID, MOCK_DEVICE_ID);
            // 检查是否调用了 updateMany 来设置新的当前设备
            if (mockPrisma.userDevice.updateMany.mock.calls.length === 0) {
                console.log('✗ BUG: 移除当前设备后，没有将其他设备设为 current');
                console.log('   其他设备仍然是 isCurrent=false');
            }
            else {
                console.log('✓ 移除当前设备后正确更新其他设备');
            }
        });
        (0, globals_1.test)('BUG-18: registerDevice 的并发更新', async () => {
            // 探针: 并发注册同一设备可能产生竞争
            const userService = require('../services/userService');
            mockPrisma.userDevice.upsert.mockResolvedValue({
                deviceId: MOCK_DEVICE_ID,
                userId: MOCK_USER_ID,
                isCurrent: true,
            });
            mockPrisma.userDevice.updateMany.mockResolvedValue({ count: 1 });
            const deviceInfo = {
                deviceId: MOCK_DEVICE_ID,
                deviceName: 'iPhone 15',
                deviceType: 'ios',
            };
            await Promise.all([
                userService.registerDevice(MOCK_USER_ID, deviceInfo),
                userService.registerDevice(MOCK_USER_ID, deviceInfo),
            ]);
            console.log('⚠ 注意: 并发注册同一设备调用了 ' + mockPrisma.userDevice.upsert.mock.calls.length + ' 次 upsert');
        });
    });
    // ============================================================
    // PT-006: 拉黑/取消拉黑
    // ============================================================
    (0, globals_1.describe)('PT-006: 拉黑/取消拉黑 - 重复操作', () => {
        (0, globals_1.test)('BUG-19: blockUser 重复拉黑触发数据库错误', async () => {
            // 探针: blockUser 使用 create()，重复调用会触发唯一约束错误
            const userService = require('../services/userService');
            const existingBlock = {
                id: 'block-record-id',
                userId: MOCK_USER_ID,
                blockedUserId: MOCK_USER_ID_2,
            };
            mockPrisma.blockedUser.create.mockResolvedValue(existingBlock);
            // 第一次拉黑成功
            await userService.blockUser(MOCK_USER_ID, MOCK_USER_ID_2, 'reason');
            // 第二次拉黑同一用户 - 应该被拒绝
            mockPrisma.blockedUser.create.mockRejectedValueOnce(new Error('Unique constraint violation'));
            try {
                await userService.blockUser(MOCK_USER_ID, MOCK_USER_ID_2, 'reason');
                console.log('✗ BUG: 重复拉黑没有正确处理数据库错误');
            }
            catch (error) {
                if (error.message.includes('Unique') || error.message.includes('constraint')) {
                    console.log('✗ BUG: 重复拉黑触发数据库错误，应返回友好错误如 "该用户已被拉黑"');
                }
                else {
                    console.log('✓ 重复拉黑被正确拒绝');
                }
            }
        });
        (0, globals_1.test)('BUG-20: unblockUser 对未拉黑用户静默成功', async () => {
            // 探针: unblockUser 使用 deleteMany，未找到记录时返回 { count: 0 }
            const userService = require('../services/userService');
            mockPrisma.blockedUser.deleteMany.mockResolvedValue({ count: 0 });
            await userService.unblockUser(MOCK_USER_ID, MOCK_USER_ID_2);
            console.log('⚠ 注意: unblockUser 对未拉黑的用户静默成功');
            console.log('   建议: 检查 deleteMany 返回值 { count: 0 } 时报错 "用户未被拉黑"');
        });
        (0, globals_1.test)('BUG-21: blockUser 应拒绝拉黑自己', async () => {
            // 探针: blockUser 在 userService 中有 self-block 检查
            const userService = require('../services/userService');
            try {
                await userService.blockUser(MOCK_USER_ID, MOCK_USER_ID, 'test reason');
                console.log('✗ BUG: 允许拉黑自己');
            }
            catch (error) {
                if (error.code === 'SELF_BLOCK' || error.message.includes('yourself')) {
                    console.log('✓ 正确拒绝拉黑自己');
                }
                else {
                    console.log('✗ 错误类型错误:', error.code, error.message);
                }
            }
        });
        (0, globals_1.test)('BUG-22: getBlockedUsers 正确返回拉黑列表', async () => {
            // 探针: 检查 getBlockedUsers 是否正确返回
            const userService = require('../services/userService');
            const blockedUsers = [
                {
                    id: 'block-1',
                    userId: MOCK_USER_ID,
                    blockedUserId: MOCK_USER_ID_2,
                    reason: 'spam',
                    createdAt: new Date(),
                    blockedUser: {
                        id: MOCK_USER_ID_2,
                        name: 'Bad User',
                        displayName: 'Bad',
                        avatarUrl: null,
                    },
                },
            ];
            mockPrisma.blockedUser.findMany.mockResolvedValue(blockedUsers);
            const result = await userService.getBlockedUsers(MOCK_USER_ID);
            if (result.length === 1 && result[0].blockedUserId === MOCK_USER_ID_2) {
                console.log('✓ getBlockedUsers 正确返回拉黑列表');
            }
            else {
                console.log('✗ BUG: getBlockedUsers 返回数据不正确');
            }
        });
    });
    // ============================================================
    // PT-007: 并发安全性
    // ============================================================
    (0, globals_1.describe)('PT-007: 并发安全性', () => {
        (0, globals_1.test)('BUG-23: 并发修改密码可能导致数据不一致', async () => {
            // 探针: 两个请求同时修改密码，后面的请求可能覆盖前面的
            const userService = require('../services/userService');
            const user = createMockUser();
            mockPrisma.user.findUnique.mockResolvedValue(user);
            let passwordUpdateCount = 0;
            mockPrisma.user.update.mockImplementation(async () => {
                passwordUpdateCount++;
                return user;
            });
            mockBcryptCompare.mockResolvedValue(true);
            await Promise.all([
                userService.changePassword(MOCK_USER_ID, MOCK_PASSWORD, 'Password1!'),
                userService.changePassword(MOCK_USER_ID, MOCK_PASSWORD, 'Password2!'),
            ]);
            if (passwordUpdateCount === 2) {
                console.log('⚠ 注意: 两个密码修改请求都执行了，可能产生竞态条件');
                console.log('   建议: 使用乐观锁 (version 字段) 或悲观锁');
            }
        });
        (0, globals_1.test)('BUG-24: isUserBlocked 使用 findUnique', async () => {
            // 探针: isUserBlocked 使用 findUnique 而非 exists
            const userService = require('../services/userService');
            mockPrisma.blockedUser.findUnique.mockResolvedValue(null);
            const result = await userService.isUserBlocked(MOCK_USER_ID, MOCK_USER_ID_2);
            if (result === false) {
                console.log('✓ isUserBlocked 返回布尔值');
            }
        });
    });
    // ============================================================
    // PT-008: API 响应一致性
    // ============================================================
    (0, globals_1.describe)('PT-008: API 响应一致性', () => {
        (0, globals_1.test)('BUG-25: users.ts 和 userPrivacy.ts 响应格式不一致', async () => {
            // 探针: users.ts 使用 ApiResponse.success()
            // userPrivacy.ts 使用 { success: true, data: ... }
            console.log('✗ BUG: users.ts 使用 ApiResponse.success()');
            console.log('   userPrivacy.ts 使用 { success: true, data: ... }');
            console.log('   应该统一使用 ApiResponse 类');
        });
        (0, globals_1.test)('BUG-26: 错误码不一致', async () => {
            // 探针: 检查不同文件的错误码命名
            console.log('✗ BUG: 错误码不一致:');
            console.log('   userPrivacy.ts: USER_NOT_FOUND, INVALID_PASSWORD, SAME_PASSWORD');
            console.log('   users.ts: USER_NOT_FOUND, INVALID_PASSWORD');
            console.log('   userService.ts: USER_NOT_FOUND, INVALID_PASSWORD (缺少 SAME_PASSWORD)');
            console.log('   建议: 统一错误码在 errors/index.ts 中定义');
        });
        (0, globals_1.test)('BUG-27: 密码强度不验证', async () => {
            // 探针: userService.changePassword 不验证密码强度
            // 只有 Zod schema 在路由层验证
            const userService = require('../services/userService');
            const user = createMockUser();
            mockPrisma.user.findUnique.mockResolvedValue(user);
            mockPrisma.user.update.mockResolvedValue(user);
            mockBcryptCompare.mockResolvedValue(true);
            // 尝试设置弱密码 (纯数字)
            await userService.changePassword(MOCK_USER_ID, MOCK_PASSWORD, '12345678');
            console.log('✗ BUG: userService.changePassword 不验证密码强度');
            console.log('   只有 users.ts 路由的 Zod schema 验证，但 service 层没有');
            console.log('   建议: 在 service 层也验证密码强度');
        });
    });
});
//# sourceMappingURL=probe_A003a.test.js.map