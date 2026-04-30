/**
 * useDisclosureVeto
 *
 * Subscribes to the `/disclosure` socket namespace and exposes a minimal
 * interface for the realtime disclosure veto event chain:
 *
 *   server -> client : `disclosure:pending`   { disclosureId, adviceId?, content, fromAgentId, expiresAt }
 *   client -> server : `disclosure:veto`      { disclosureId, reason? }
 *   client -> server : `disclosure:confirm`   { disclosureId }
 *   server -> client : `disclosure:vetoed`    { disclosureId, vetoedAt, reason? }
 *   server -> client : `disclosure:confirmed` { disclosureId, confirmedAt }
 *
 * The hook intentionally does NOT render any UI; component-layer code is
 * expected to consume `pending` and present a confirmation modal, then call
 * `vetoDisclosure` / `confirmDisclosure`.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000';

export interface PendingDisclosure {
  disclosureId: string;
  adviceId?: string;
  content: string;
  fromAgentId: string;
  expiresAt: string;
}

export interface DisclosureVetoApi {
  /** Latest pending disclosure awaiting user decision (or null) */
  pending: PendingDisclosure | null;
  /** Reject an in-flight disclosure */
  vetoDisclosure: (disclosureId: string, reason?: string) => Promise<boolean>;
  /** Approve an in-flight disclosure */
  confirmDisclosure: (disclosureId: string) => Promise<boolean>;
  /** Manually clear the current pending entry (e.g. after timeout) */
  clearPending: () => void;
  /** Connection status */
  connected: boolean;
}

export function useDisclosureVeto(authToken: string | null | undefined): DisclosureVetoApi {
  const socketRef = useRef<Socket | null>(null);
  const [pending, setPending] = useState<PendingDisclosure | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!authToken) return;

    const socket = io(`${SOCKET_URL}/disclosure`, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('disclosure:pending', (data: PendingDisclosure) => {
      setPending(data);
    });

    socket.on('disclosure:vetoed', (data: { disclosureId: string }) => {
      setPending(prev => (prev?.disclosureId === data.disclosureId ? null : prev));
    });

    socket.on('disclosure:confirmed', (data: { disclosureId: string }) => {
      setPending(prev => (prev?.disclosureId === data.disclosureId ? null : prev));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [authToken]);

  const vetoDisclosure = useCallback((disclosureId: string, reason?: string): Promise<boolean> => {
    return new Promise(resolve => {
      const socket = socketRef.current;
      if (!socket) {
        resolve(false);
        return;
      }
      socket.emit('disclosure:veto', { disclosureId, reason }, (result: { ok: boolean }) => {
        resolve(Boolean(result?.ok));
      });
    });
  }, []);

  const confirmDisclosure = useCallback((disclosureId: string): Promise<boolean> => {
    return new Promise(resolve => {
      const socket = socketRef.current;
      if (!socket) {
        resolve(false);
        return;
      }
      socket.emit('disclosure:confirm', { disclosureId }, (result: { ok: boolean }) => {
        resolve(Boolean(result?.ok));
      });
    });
  }, []);

  const clearPending = useCallback(() => setPending(null), []);

  return { pending, vetoDisclosure, confirmDisclosure, clearPending, connected };
}

export default useDisclosureVeto;
