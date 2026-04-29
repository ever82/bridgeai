import { logger } from '../../utils/logger';
// Lazy import safety service
async function getSafetyService() {
    const { checkMessageSafety } = await import('../../services/dating/conversationSafetyService').catch(() => ({
        checkMessageSafety: null,
    }));
    return { checkMessageSafety };
}
export async function conversationSafetyCheck(req, res, next) {
    try {
        const { roomId, content, senderId, messageId } = req.body;
        if (!roomId || !content) {
            next();
            return;
        }
        const { checkMessageSafety } = await getSafetyService();
        if (!checkMessageSafety) {
            next();
            return;
        }
        const result = await checkMessageSafety(roomId, messageId, content, senderId);
        if (result.action === 'block') {
            res.status(400).json({ error: 'Message blocked by safety filter', flags: result.flags });
            return;
        }
        if (result.action === 'terminate') {
            res.status(403).json({ error: 'Conversation terminated for safety reasons' });
            return;
        }
        req.body.safetyCheck = result;
        next();
    }
    catch (error) {
        logger.error('Safety middleware error', { error: error.message });
        next();
    }
}
export default { conversationSafetyCheck };
//# sourceMappingURL=conversationSafetyMiddleware.js.map