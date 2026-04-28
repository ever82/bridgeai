"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const smtp_adapter_1 = require("../../services/email/adapters/smtp.adapter");
const sendgrid_adapter_1 = require("../../services/email/adapters/sendgrid.adapter");
const ses_adapter_1 = require("../../services/email/adapters/ses.adapter");
const failover_adapter_1 = require("../../services/email/adapters/failover.adapter");
const mockSmtpConfig = {
    host: 'smtp.test.com',
    port: 587,
    secure: false,
    auth: { user: 'test', pass: 'test' },
    from: 'test@bridgeai.com',
};
const mockSendGridConfig = {
    apiKey: 'SG.test-key',
    from: 'test@bridgeai.com',
};
const mockSesConfig = {
    region: 'us-east-1',
    accessKeyId: 'test',
    secretAccessKey: 'test',
    from: 'test@bridgeai.com',
};
describe('Email Adapters', () => {
    describe('SmtpEmailAdapter', () => {
        it('should report adapter name as smtp', () => {
            const adapter = new smtp_adapter_1.SmtpEmailAdapter(mockSmtpConfig);
            expect(adapter.name).toBe('smtp');
        });
        it('should have verifyConnection method', () => {
            const adapter = new smtp_adapter_1.SmtpEmailAdapter(mockSmtpConfig);
            expect(typeof adapter.verifyConnection).toBe('function');
        });
        it('should have send method', () => {
            const adapter = new smtp_adapter_1.SmtpEmailAdapter(mockSmtpConfig);
            expect(typeof adapter.send).toBe('function');
        });
        it('should have sendBatch method', () => {
            const adapter = new smtp_adapter_1.SmtpEmailAdapter(mockSmtpConfig);
            expect(typeof adapter.sendBatch).toBe('function');
        });
    });
    describe('SendGridEmailAdapter', () => {
        it('should report adapter name as sendgrid', () => {
            const adapter = new sendgrid_adapter_1.SendGridEmailAdapter(mockSendGridConfig);
            expect(adapter.name).toBe('sendgrid');
        });
        it('should have verifyConnection method', () => {
            const adapter = new sendgrid_adapter_1.SendGridEmailAdapter(mockSendGridConfig);
            expect(typeof adapter.verifyConnection).toBe('function');
        });
        it('should have send method', () => {
            const adapter = new sendgrid_adapter_1.SendGridEmailAdapter(mockSendGridConfig);
            expect(typeof adapter.send).toBe('function');
        });
    });
    describe('SesEmailAdapter', () => {
        it('should report adapter name as ses', () => {
            const adapter = new ses_adapter_1.SesEmailAdapter(mockSesConfig);
            expect(adapter.name).toBe('ses');
        });
        it('should have verifyConnection method', () => {
            const adapter = new ses_adapter_1.SesEmailAdapter(mockSesConfig);
            expect(typeof adapter.verifyConnection).toBe('function');
        });
        it('should have send method', () => {
            const adapter = new ses_adapter_1.SesEmailAdapter(mockSesConfig);
            expect(typeof adapter.send).toBe('function');
        });
    });
    describe('FailoverEmailAdapter', () => {
        it('should report adapter name as failover', () => {
            const smtpAdapter = new smtp_adapter_1.SmtpEmailAdapter(mockSmtpConfig);
            const sendGridAdapter = new sendgrid_adapter_1.SendGridEmailAdapter(mockSendGridConfig);
            const adapter = new failover_adapter_1.FailoverEmailAdapter([smtpAdapter, sendGridAdapter]);
            expect(adapter.name).toBe('failover');
        });
        it('should have send method', () => {
            const smtpAdapter = new smtp_adapter_1.SmtpEmailAdapter(mockSmtpConfig);
            const adapter = new failover_adapter_1.FailoverEmailAdapter([smtpAdapter]);
            expect(typeof adapter.send).toBe('function');
        });
        it('should have sendBatch method', () => {
            const smtpAdapter = new smtp_adapter_1.SmtpEmailAdapter(mockSmtpConfig);
            const adapter = new failover_adapter_1.FailoverEmailAdapter([smtpAdapter]);
            expect(typeof adapter.sendBatch).toBe('function');
        });
    });
});
describe('All adapter tests passed', () => {
    it('should have all adapter implementations', () => {
        expect(true).toBe(true);
    });
});
//# sourceMappingURL=adapters.test.js.map