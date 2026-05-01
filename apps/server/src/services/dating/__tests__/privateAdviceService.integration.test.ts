/**
 * Private Advice Service — dual-socket isolation integration test
 *
 * Verifies the critical security boundary of `agent:private_advice`:
 *   `emitPrivateAdvice(io, ownerId, advice)` MUST only deliver to the
 *   `user:{ownerId}` room and MUST NOT leak to any other connected user.
 *
 * Setup:
 *   - Boots a fresh http + socket.io server on an OS-chosen port.
 *   - Connects two real socket.io-client sockets — Alice and Bob — each
 *     joining its own `user:{userId}` room (mimicking the auth middleware).
 *   - Triggers `emitPrivateAdvice(io, 'alice-1', advice)`.
 *   - Asserts Alice received exactly one advice payload and Bob received
 *     zero within a 1 second window.
 */

import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';

import { Server as SocketServer } from 'socket.io';
import { io as Client, type Socket as ClientSocket } from 'socket.io-client';

import { emitPrivateAdvice, type PrivateAdvice } from '../privateAdviceService';

function waitForConnect(socket: ClientSocket, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }
    socket.once('connect', () => resolve());
    socket.once('connect_error', err => reject(err));
    setTimeout(() => reject(new Error('socket connect timeout')), timeout);
  });
}

describe('emitPrivateAdvice dual-socket isolation', () => {
  let httpServer: HttpServer;
  let io: SocketServer;
  let port: number;

  let aliceSocket: ClientSocket;
  let bobSocket: ClientSocket;

  beforeAll(async () => {
    httpServer = createServer();
    io = new SocketServer(httpServer, {
      cors: { origin: '*' },
    });

    // Mimic auth middleware: read userId from handshake.auth and join user:{id} room.
    io.on('connection', socket => {
      const userId = (socket.handshake.auth as { userId?: string } | undefined)?.userId;
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    await new Promise<void>(resolve => {
      httpServer.listen(0, () => {
        port = (httpServer.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (aliceSocket && aliceSocket.connected) aliceSocket.disconnect();
    if (bobSocket && bobSocket.connected) bobSocket.disconnect();
    await new Promise<void>(resolve => {
      io.close(() => resolve());
    });
    await new Promise<void>(resolve => {
      httpServer.close(() => resolve());
    });
  });

  it('delivers agent:private_advice ONLY to the owner; the other user receives nothing', async () => {
    aliceSocket = Client(`http://localhost:${port}`, {
      auth: { userId: 'alice-1' },
      transports: ['websocket'],
      forceNew: true,
    });
    bobSocket = Client(`http://localhost:${port}`, {
      auth: { userId: 'bob-1' },
      transports: ['websocket'],
      forceNew: true,
    });

    const aliceReceived: PrivateAdvice[] = [];
    const bobLeaked: PrivateAdvice[] = [];

    aliceSocket.on('agent:private_advice', (payload: PrivateAdvice) => {
      aliceReceived.push(payload);
    });
    bobSocket.on('agent:private_advice', (payload: PrivateAdvice) => {
      bobLeaked.push(payload);
    });

    await Promise.all([waitForConnect(aliceSocket), waitForConnect(bobSocket)]);

    // Give the server-side `connection` handler a tick to run socket.join().
    await new Promise<void>(resolve => setTimeout(resolve, 50));

    const advice: PrivateAdvice = {
      chatSessionId: 'session-iso-1',
      type: 'topic_suggestion',
      content: '只属于 Alice 的建议，Bob 不应看到。',
      metadata: { ownerAgentId: 'agent-alice' },
      createdAt: new Date(),
    };

    emitPrivateAdvice(io, 'alice-1', advice);

    // Wait 1 second for any potential leakage to surface on Bob's socket.
    await new Promise<void>(resolve => setTimeout(resolve, 1000));

    // Critical security assertion: Bob received zero advice events.
    expect(bobLeaked).toHaveLength(0);

    // Functional assertion: Alice received exactly the one emitted advice.
    expect(aliceReceived).toHaveLength(1);
    expect(aliceReceived[0]).toMatchObject({
      chatSessionId: 'session-iso-1',
      type: 'topic_suggestion',
      content: advice.content,
    });
  }, 10000);

  it('does not leak advice to a third unrelated user', async () => {
    const carolSocket: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { userId: 'carol-1' },
      transports: ['websocket'],
      forceNew: true,
    });

    const carolLeaked: PrivateAdvice[] = [];
    carolSocket.on('agent:private_advice', (payload: PrivateAdvice) => {
      carolLeaked.push(payload);
    });

    try {
      await waitForConnect(carolSocket);
      await new Promise<void>(resolve => setTimeout(resolve, 50));

      emitPrivateAdvice(io, 'alice-1', {
        chatSessionId: 'session-iso-2',
        type: 'risk_warning',
        content: 'Alice-only risk warning',
        createdAt: new Date(),
      });

      await new Promise<void>(resolve => setTimeout(resolve, 1000));

      expect(carolLeaked).toHaveLength(0);
    } finally {
      carolSocket.disconnect();
    }
  }, 10000);
});
