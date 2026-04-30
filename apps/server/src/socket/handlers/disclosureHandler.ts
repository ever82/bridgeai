/**
 * Disclosure Socket Handlers
 *
 * Implements the realtime disclosure veto event chain:
 *   server -> client : `disclosure:pending`   { disclosureId, adviceId?, content, fromAgentId, expiresAt }
 *   client -> server : `disclosure:veto`      { disclosureId, reason? }
 *   server -> client : `disclosure:vetoed`    { disclosureId, vetoedAt, reason? }
 *   server -> client : `disclosure:confirmed` { disclosureId, confirmedAt }
 *
 * The handler keeps a lightweight in-memory registry of pending disclosures so a
 * server-side caller can request user confirmation before a disclosure is
 * actually emitted to the peer. The full UI integration (modal/prompt) is
 * deliberately left to component layer; this module only provides the
 * skeleton event chain so other services can drive it.
 */

import { Server as SocketServer } from 'socket.io';

import type { AuthenticatedSocket } from '../middleware/auth';
import { logger } from '../../utils/logger';

/**
 * Status of a tracked pending disclosure
 */
export type PendingDisclosureStatus = 'pending' | 'vetoed' | 'confirmed' | 'expired';

/**
 * In-memory representation of a pending disclosure awaiting user decision
 */
export interface PendingDisclosure {
  disclosureId: string;
  adviceId?: string;
  userId: string;
  fromAgentId: string;
  content: string;
  expiresAt: string;
  status: PendingDisclosureStatus;
  reason?: string;
  createdAt: string;
}

/**
 * Lightweight in-memory registry. In production this should be backed by
 * disclosureAuditService / Redis so multi-node deployments share state.
 */
const pendingRegistry = new Map<string, PendingDisclosure>();

/**
 * Get the pending registry (exposed for service-layer integration & tests)
 */
export function getPendingDisclosureRegistry(): Map<string, PendingDisclosure> {
  return pendingRegistry;
}

/**
 * Push a pending disclosure to a specific user. Returns the registered entry.
 * Service-layer code (e.g. disclosureService) should call this BEFORE actually
 * disclosing information so the user has a chance to veto.
 */
export function emitPendingDisclosure(
  nsp: SocketServer,
  params: {
    disclosureId: string;
    adviceId?: string;
    userId: string;
    fromAgentId: string;
    content: string;
    expiresAt?: string;
  }
): PendingDisclosure {
  const expiresAt = params.expiresAt ?? new Date(Date.now() + 30_000).toISOString(); // default 30s window
  const entry: PendingDisclosure = {
    disclosureId: params.disclosureId,
    adviceId: params.adviceId,
    userId: params.userId,
    fromAgentId: params.fromAgentId,
    content: params.content,
    expiresAt,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  pendingRegistry.set(params.disclosureId, entry);

  nsp.to(`user:${params.userId}`).emit('disclosure:pending', {
    disclosureId: entry.disclosureId,
    adviceId: entry.adviceId,
    content: entry.content,
    fromAgentId: entry.fromAgentId,
    expiresAt: entry.expiresAt,
  });

  logger.info('[Socket/disclosure] disclosure:pending emitted', {
    disclosureId: entry.disclosureId,
    userId: entry.userId,
    fromAgentId: entry.fromAgentId,
  });

  return entry;
}

/**
 * Register disclosure namespace handlers.
 */
export function registerDisclosureHandlers(socket: AuthenticatedSocket, nsp: SocketServer): void {
  const userId = socket.user?.id;
  logger.info('[Socket/disclosure] Client connected', { socketId: socket.id, userId });

  if (userId) {
    socket.join(`user:${userId}`);
  }

  // Client-driven veto: user rejects an in-flight disclosure
  socket.on(
    'disclosure:veto',
    async (
      payload: { disclosureId?: string; reason?: string } | undefined,
      ack?: (result: { ok: boolean; status?: PendingDisclosureStatus; error?: string }) => void
    ) => {
      const disclosureId = payload?.disclosureId;
      if (!disclosureId) {
        socket.emit('disclosure:error', {
          code: 'INVALID_PAYLOAD',
          message: 'disclosureId is required',
        });
        ack?.({ ok: false, error: 'INVALID_PAYLOAD' });
        return;
      }

      const entry = pendingRegistry.get(disclosureId);
      if (!entry) {
        socket.emit('disclosure:error', {
          code: 'NOT_FOUND',
          message: `Pending disclosure not found: ${disclosureId}`,
        });
        ack?.({ ok: false, error: 'NOT_FOUND' });
        return;
      }

      if (entry.userId !== userId) {
        socket.emit('disclosure:error', {
          code: 'FORBIDDEN',
          message: 'Cannot veto another user\u2019s disclosure',
        });
        ack?.({ ok: false, error: 'FORBIDDEN' });
        return;
      }

      if (entry.status !== 'pending') {
        ack?.({ ok: false, status: entry.status, error: 'ALREADY_RESOLVED' });
        return;
      }

      entry.status = 'vetoed';
      entry.reason = payload?.reason;
      const vetoedAt = new Date().toISOString();

      logger.info('[Socket/disclosure] disclosure:veto received', {
        disclosureId,
        userId,
        reason: payload?.reason,
      });

      // Best-effort hook into disclosureAuditService if available; failures
      // here must not break the event chain.
      try {
        // Lazy require to avoid hard coupling in case of circular imports
        const audit = await import('../../services/disclosureAuditService');
        const svc = (audit as any).disclosureAuditService;
        if (svc && typeof svc.logDisclosureVeto === 'function') {
          await svc.logDisclosureVeto({
            disclosureId,
            userId,
            reason: payload?.reason,
          });
        }
      } catch (err) {
        logger.warn('[Socket/disclosure] audit veto log failed', {
          disclosureId,
          err: err instanceof Error ? err.message : String(err),
        });
      }

      const result = {
        disclosureId,
        vetoedAt,
        reason: payload?.reason,
      };
      // Echo to the user (all their sockets) and ack the originating socket
      nsp.to(`user:${entry.userId}`).emit('disclosure:vetoed', result);
      ack?.({ ok: true, status: 'vetoed' });
    }
  );

  // Client-driven explicit confirm (optional - allows manual approve before timeout)
  socket.on(
    'disclosure:confirm',
    (
      payload: { disclosureId?: string } | undefined,
      ack?: (result: { ok: boolean; status?: PendingDisclosureStatus; error?: string }) => void
    ) => {
      const disclosureId = payload?.disclosureId;
      if (!disclosureId) {
        ack?.({ ok: false, error: 'INVALID_PAYLOAD' });
        return;
      }
      const entry = pendingRegistry.get(disclosureId);
      if (!entry || entry.userId !== userId) {
        ack?.({ ok: false, error: 'NOT_FOUND' });
        return;
      }
      if (entry.status !== 'pending') {
        ack?.({ ok: false, status: entry.status, error: 'ALREADY_RESOLVED' });
        return;
      }
      entry.status = 'confirmed';
      const confirmedAt = new Date().toISOString();
      nsp.to(`user:${entry.userId}`).emit('disclosure:confirmed', {
        disclosureId,
        confirmedAt,
      });
      ack?.({ ok: true, status: 'confirmed' });
    }
  );

  socket.on('disconnect', (reason: string) => {
    logger.info('[Socket/disclosure] Client disconnected', { socketId: socket.id, reason });
  });

  socket.emit('connected', {
    namespace: '/disclosure',
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  });
}
