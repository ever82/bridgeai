/**
 * Match Subscription Socket Handlers
 *
 * Bridges Socket.IO clients into the QuerySubscriptionManager event stream.
 * Clients can subscribe to FilterDSL queries and receive incremental updates,
 * heartbeats, and lifecycle events for their own subscriptions only.
 */
import { logger } from '../../utils/logger';
import { MatchQueryValidationError } from '../../services/matching/matchQueryService';
import { querySubscriptionManager, } from '../../services/matching/querySubscriptionManager';
/**
 * Register match subscription handlers on a connected socket.
 *
 * The socket-level event listener is removed on disconnect to avoid leaking
 * EventEmitter listeners on the long-lived QuerySubscriptionManager.
 */
export function registerMatchSubscriptionHandlers(socket, _nsp) {
    const userId = socket.user?.id;
    if (!userId) {
        socket.emit('error', { code: 'UNAUTHORIZED', message: 'Authentication required' });
        socket.disconnect(true);
        return;
    }
    logger.info('[Socket/matchSubscriptions] Client connected', {
        socketId: socket.id,
        userId,
    });
    // Track which subscriptions this socket owns so we can clean them up on
    // disconnect. We do NOT remove subscriptions the user created via HTTP — only
    // the ones created on this socket.
    const socketSubscriptionIds = new Set();
    /**
     * Forward subscription events for this user to the client. We filter inside
     * the listener so each socket only sees its own user's events.
     */
    const eventListener = (event) => {
        const sub = querySubscriptionManager.getSubscription(event.subscriptionId);
        if (!sub)
            return;
        if (sub.userId !== userId)
            return;
        socket.emit('subscription_event', event);
    };
    querySubscriptionManager.on('event', eventListener);
    socket.on('subscribe', async (payload, ack) => {
        try {
            if (!payload?.query) {
                ack?.({ ok: false, error: 'query is required' });
                return;
            }
            const subscription = await querySubscriptionManager.createSubscription(userId, payload.query, payload.filters);
            socketSubscriptionIds.add(subscription.id);
            ack?.({ ok: true, subscriptionId: subscription.id });
        }
        catch (err) {
            const message = err instanceof MatchQueryValidationError
                ? err.message
                : err instanceof Error
                    ? err.message
                    : 'Failed to create subscription';
            logger.warn('[Socket/matchSubscriptions] subscribe failed', {
                socketId: socket.id,
                userId,
                message,
            });
            ack?.({ ok: false, error: message });
        }
    });
    socket.on('unsubscribe', (payload, ack) => {
        const id = payload?.subscriptionId;
        if (!id) {
            ack?.({ ok: false, error: 'subscriptionId is required' });
            return;
        }
        const sub = querySubscriptionManager.getSubscription(id);
        if (!sub || sub.userId !== userId) {
            ack?.({ ok: false, error: 'Subscription not found' });
            return;
        }
        const removed = querySubscriptionManager.removeSubscription(id);
        socketSubscriptionIds.delete(id);
        ack?.({ ok: removed });
    });
    socket.on('heartbeat', (payload, ack) => {
        const id = payload?.subscriptionId;
        if (!id) {
            ack?.({ ok: false });
            return;
        }
        const sub = querySubscriptionManager.getSubscription(id);
        if (!sub || sub.userId !== userId) {
            ack?.({ ok: false });
            return;
        }
        ack?.({ ok: querySubscriptionManager.handleHeartbeat(id) });
    });
    socket.on('refresh', async (payload, ack) => {
        const id = payload?.subscriptionId;
        if (!id) {
            ack?.({ ok: false, error: 'subscriptionId is required' });
            return;
        }
        const sub = querySubscriptionManager.getSubscription(id);
        if (!sub || sub.userId !== userId) {
            ack?.({ ok: false, error: 'Subscription not found' });
            return;
        }
        try {
            await querySubscriptionManager.refreshSubscription(id);
            ack?.({ ok: true });
        }
        catch (err) {
            ack?.({
                ok: false,
                error: err instanceof Error ? err.message : 'Refresh failed',
            });
        }
    });
    socket.on('list', (_payload, ack) => {
        ack?.({ ok: true, subscriptions: querySubscriptionManager.getUserSubscriptions(userId) });
    });
    socket.on('disconnect', (reason) => {
        logger.info('[Socket/matchSubscriptions] Client disconnected', {
            socketId: socket.id,
            userId,
            reason,
        });
        querySubscriptionManager.off('event', eventListener);
        // Clean up subscriptions created on this socket so they don't outlive the
        // connection that asked for them.
        for (const id of socketSubscriptionIds) {
            querySubscriptionManager.removeSubscription(id);
        }
        socketSubscriptionIds.clear();
    });
    socket.emit('connected', {
        namespace: '/matchSubscriptions',
        socketId: socket.id,
        userId,
        timestamp: new Date().toISOString(),
    });
}
//# sourceMappingURL=matchSubscriptionHandler.js.map