export class TransactionalEmailService {
    providerManager;
    templateStore;
    constructor(providerManager, templateStore) {
        this.providerManager = providerManager;
        this.templateStore = templateStore;
    }
    async sendVerificationEmail(data) {
        const variables = [
            { key: 'username', value: data.username },
            { key: 'verificationCode', value: data.verificationCode },
            { key: 'verificationUrl', value: data.verificationUrl },
        ];
        const rendered = await this.templateStore.render('verification', variables);
        if (!rendered) {
            return { success: false, error: 'Verification template not found' };
        }
        const message = {
            to: data.email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            trackOpens: true,
        };
        const result = await this.providerManager.send(message);
        return { success: result.success, error: result.error };
    }
    async sendPasswordResetEmail(data) {
        const variables = [
            { key: 'username', value: data.username },
            { key: 'resetToken', value: data.resetToken },
            { key: 'resetUrl', value: data.resetUrl },
            { key: 'expiresIn', value: `${data.expiresIn / 60} minutes` },
        ];
        const rendered = await this.templateStore.render('password_reset', variables);
        if (!rendered) {
            return { success: false, error: 'Password reset template not found' };
        }
        const message = {
            to: data.email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            trackOpens: true,
        };
        const result = await this.providerManager.send(message);
        return { success: result.success, error: result.error };
    }
    async sendSystemNotification(data) {
        const variables = [
            { key: 'username', value: data.username },
            { key: 'notificationType', value: data.notificationType },
            { key: 'message', value: data.message },
            { key: 'actionUrl', value: data.actionUrl || '' },
        ];
        const rendered = await this.templateStore.render('system_notification', variables);
        if (!rendered) {
            return { success: false, error: 'System notification template not found' };
        }
        const message = {
            to: data.email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
        };
        const result = await this.providerManager.send(message);
        return { success: result.success, error: result.error };
    }
}
//# sourceMappingURL=transactional.service.js.map