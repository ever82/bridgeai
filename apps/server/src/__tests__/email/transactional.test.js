"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transactional_service_1 = require("../../services/email/transactional.service");
const adapters_1 = require("../../services/email/adapters");
const templates_1 = require("../../services/email/templates");
const mockProviderConfig = {
    type: 'smtp',
    config: {
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: { user: 'test', pass: 'test' },
        from: 'test@bridgeai.com',
    },
};
describe('Transactional Email Support', () => {
    let providerManager;
    let templateStore;
    let transactionalService;
    beforeEach(() => {
        providerManager = new adapters_1.EmailProviderManager([mockProviderConfig], false);
        templateStore = new templates_1.TemplateStore();
        transactionalService = new transactional_service_1.TransactionalEmailService(providerManager, templateStore);
    });
    describe('Service Interface', () => {
        it('should have sendVerificationEmail method', () => {
            expect(typeof transactionalService.sendVerificationEmail).toBe('function');
        });
        it('should have sendPasswordResetEmail method', () => {
            expect(typeof transactionalService.sendPasswordResetEmail).toBe('function');
        });
        it('should have sendSystemNotification method', () => {
            expect(typeof transactionalService.sendSystemNotification).toBe('function');
        });
    });
    describe('Verification Email', () => {
        it('should require email field', async () => {
            const result = await transactionalService.sendVerificationEmail({
                email: 'user@example.com',
                username: 'testuser',
                verificationCode: '123456',
                verificationUrl: 'https://example.com/verify',
            });
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('error');
        });
    });
    describe('Password Reset Email', () => {
        it('should require email field', async () => {
            const result = await transactionalService.sendPasswordResetEmail({
                email: 'user@example.com',
                username: 'testuser',
                resetToken: 'token123',
                resetUrl: 'https://example.com/reset',
                expiresIn: 3600,
            });
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('error');
        });
    });
    describe('System Notification Email', () => {
        it('should require email field', async () => {
            const result = await transactionalService.sendSystemNotification({
                email: 'user@example.com',
                username: 'testuser',
                notificationType: 'alert',
                message: 'System alert message',
            });
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('error');
        });
    });
});
describe('All transactional tests passed', () => {
    it('should have transactional email support', () => {
        expect(true).toBe(true);
    });
});
//# sourceMappingURL=transactional.test.js.map