import { connectionService } from '../../services/connectionService';
import { presenceService } from '../../services/presenceService';
/**
 * Register presence event handlers
 */
export function registerPresenceHandlers(socket, nsp) {
    const userId = socket.user?.id;
    if (!userId)
        return;
    // Set initial online status using PresenceService
    presenceService.setPresence(userId, 'online');
    // Join user's own presence room for targeted updates
    socket.join(`presence:${userId}`);
    // Handle presence:update - user changes their status
    socket.on('presence:update', (data, callback) => {
        try {
            const validStatuses = ['online', 'away', 'busy', 'offline'];
            if (!validStatuses.includes(data.status)) {
                callback?.({ success: false, error: 'Invalid status' });
                return;
            }
            const previousPresence = presenceService.getPresence(userId);
            const previousStatus = previousPresence.status;
            // Update presence via PresenceService
            presenceService.setPresence(userId, data.status, data.customMessage);
            // Broadcast status change to subscribers
            nsp.to(`presence:${userId}`).emit('presence:status_changed', {
                userId,
                previousStatus,
                newStatus: data.status,
                customMessage: data.customMessage,
                timestamp: new Date().toISOString(),
            });
            callback?.({ success: true, data: { status: data.status } });
        }
        catch (error) {
            callback?.({ success: false, error: 'Failed to update presence' });
        }
    });
    // Handle presence:subscribe - subscribe to another user's presence
    socket.on('presence:subscribe', (data, callback) => {
        try {
            socket.join(`presence:${data.targetUserId}`);
            // Subscribe via PresenceService
            presenceService.subscribeToPresence(userId, data.targetUserId);
            // Return current status immediately from PresenceService
            const presence = presenceService.getPresence(data.targetUserId);
            callback?.({
                success: true,
                data: {
                    userId: data.targetUserId,
                    status: presence.status,
                    lastSeen: presence.lastActivityAt?.toISOString(),
                },
            });
        }
        catch (error) {
            callback?.({ success: false, error: 'Failed to subscribe' });
        }
    });
    // Handle presence:unsubscribe - unsubscribe from a user's presence
    socket.on('presence:unsubscribe', (data, callback) => {
        try {
            socket.leave(`presence:${data.targetUserId}`);
            presenceService.unsubscribeFromPresence(userId, data.targetUserId);
            callback?.({ success: true });
        }
        catch (error) {
            callback?.({ success: false, error: 'Failed to unsubscribe' });
        }
    });
    // Handle disconnect - mark user as offline only if no other active connections
    socket.on('disconnect', () => {
        const remainingConnections = connectionService.getUserConnectionCount(userId);
        if (remainingConnections > 0) {
            return; // User still has other active connections
        }
        const previousPresence = presenceService.getPresence(userId);
        if (previousPresence.status !== 'offline') {
            presenceService.markOffline(userId);
            // Broadcast offline status
            nsp.to(`presence:${userId}`).emit('presence:status_changed', {
                userId,
                previousStatus: previousPresence.status,
                newStatus: 'offline',
                timestamp: new Date().toISOString(),
            });
        }
    });
}
/**
 * Get presence state for a user (delegates to PresenceService)
 */
export function getPresenceState(userId) {
    const presence = presenceService.getPresence(userId);
    return {
        userId: presence.userId,
        status: presence.status,
        lastSeen: presence.lastActivityAt,
        customMessage: presence.customStatus,
    };
}
export default { registerPresenceHandlers, getPresenceState };
//# sourceMappingURL=presenceHandler.js.map