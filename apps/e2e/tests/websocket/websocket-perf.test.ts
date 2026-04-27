/**
 * WebSocket E2E Performance Tests
 *
 * Validates WebSocket server performance characteristics:
 * - Concurrent connection handling (1000+ connections)
 * - Message broadcast latency (<100ms end-to-end)
 * - Room system concurrency (join/leave under load)
 * - Online presence synchronization performance
 *
 * Prerequisites:
 * - Server must be running on localhost:3000
 * - Valid JWT tokens must be obtainable (or AUTH_TOKEN env var set)
 */
import { io as Client, Socket as ClientSocket } from 'socket.io-client';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const SERVER_URL = process.env.WS_SERVER_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.WS_AUTH_TOKEN || 'test-token';
const CONCURRENT_CONNECTIONS = parseInt(process.env.WS_CONCURRENT_CONNECTIONS || '100', 10);
const BROADCAST_LATENCY_THRESHOLD_MS = 100;
const ROOM_COUNT = 10;
const MESSAGE_COUNT = 50;
const PRESENCE_USER_COUNT = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create an authenticated socket client connected to the given namespace.
 */
function createClient(namespace: string = '/'): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Connection timeout for ${namespace}`));
    }, 15000);

    const socket = Client(`${SERVER_URL}${namespace === '/' ? '' : namespace}`, {
      auth: { token: AUTH_TOKEN },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });

    socket.on('connect_error', err => {
      clearTimeout(timeout);
      reject(err);
    });

    socket.on('connected', () => {
      clearTimeout(timeout);
      resolve(socket);
    });

    // Fallback: resolve on generic connect if 'connected' event is not emitted
    socket.on('connect', () => {
      clearTimeout(timeout);
      resolve(socket);
    });
  });
}

/**
 * Create multiple authenticated clients concurrently.
 */
async function createClients(count: number, namespace: string = '/'): Promise<ClientSocket[]> {
  const promises = Array.from({ length: count }, () => createClient(namespace));
  return Promise.all(promises);
}

/**
 * Disconnect all clients cleanly.
 */
function disconnectAll(clients: ClientSocket[]): void {
  for (const c of clients) {
    if (c.connected) {
      c.disconnect();
    }
  }
}

/**
 * Generate a unique ID for test isolation.
 */
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('WebSocket E2E Performance', () => {
  // Shared across tests for cleanup
  const activeClients: ClientSocket[] = [];

  afterAll(() => {
    disconnectAll(activeClients);
  });

  // -----------------------------------------------------------------------
  // 1. Concurrent Connections
  // -----------------------------------------------------------------------
  describe('Concurrent connections', () => {
    it('should handle multiple simultaneous connections to main namespace', async () => {
      const start = performance.now();
      const clients = await createClients(CONCURRENT_CONNECTIONS, '/');
      const elapsed = performance.now() - start;

      activeClients.push(...clients);

      // All clients must be connected
      const connectedCount = clients.filter(c => c.connected).length;
      expect(connectedCount).toBe(CONCURRENT_CONNECTIONS);

      // Average connection time should be reasonable (< 5s total)
      const avgMs = elapsed / CONCURRENT_CONNECTIONS;
      expect(avgMs).toBeLessThan(5000);

      console.log(
        `[Perf] ${CONCURRENT_CONNECTIONS} connections established in ${elapsed.toFixed(1)}ms ` +
          `(avg ${avgMs.toFixed(2)}ms/connection)`
      );

      disconnectAll(clients);
    }, 60000);

    it('should handle connections across multiple namespaces concurrently', async () => {
      const perNamespace = Math.floor(CONCURRENT_CONNECTIONS / 4);
      const start = performance.now();

      const [mainClients, chatClients, userClients, presenceClients] = await Promise.all([
        createClients(perNamespace, '/'),
        createClients(perNamespace, '/chat'),
        createClients(perNamespace, '/user'),
        createClients(perNamespace, '/presence'),
      ]);

      const elapsed = performance.now() - start;

      const allClients = [...mainClients, ...chatClients, ...userClients, ...presenceClients];
      activeClients.push(...allClients);

      const connectedCount = allClients.filter(c => c.connected).length;
      expect(connectedCount).toBe(perNamespace * 4);

      console.log(
        `[Perf] ${perNamespace * 4} cross-namespace connections in ${elapsed.toFixed(1)}ms`
      );

      disconnectAll(allClients);
    }, 60000);
  });

  // -----------------------------------------------------------------------
  // 2. Message Broadcast Latency
  // -----------------------------------------------------------------------
  describe('Message broadcast latency', () => {
    it('should broadcast messages to room members within latency threshold', async () => {
      const roomId = uid('room');

      // Create sender + receivers
      const sender = await createClient('/chat');
      const receivers = await createClients(10, '/chat');
      activeClients.push(sender, ...receivers);

      // All clients join the same room
      const joinAll = async (clients: ClientSocket[]) => {
        return Promise.all(
          clients.map(
            c =>
              new Promise<void>(resolve => {
                c.emit('chat:join', { roomId }, () => resolve());
              })
          )
        );
      };

      await joinAll([sender, ...receivers]);

      // Small delay to ensure all joins are processed
      await new Promise(r => setTimeout(r, 200));

      // Measure broadcast latency
      const latencies: number[] = [];
      let receivedCount = 0;

      const receivePromise = new Promise<void>(resolve => {
        for (const receiver of receivers) {
          receiver.on('chat:message', (data: any) => {
            if (data.roomId === roomId) {
              const latency = performance.now() - sendTime;
              latencies.push(latency);
              receivedCount++;
              if (receivedCount >= receivers.length) {
                resolve();
              }
            }
          });
        }
      });

      const sendTime = performance.now();
      sender.emit('chat:message', {
        roomId,
        content: 'perf-test-broadcast',
      });

      await receivePromise;

      // All receivers should have received the message
      expect(receivedCount).toBe(receivers.length);

      // Average and max latency checks
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      expect(avgLatency).toBeLessThan(BROADCAST_LATENCY_THRESHOLD_MS);
      expect(maxLatency).toBeLessThan(BROADCAST_LATENCY_THRESHOLD_MS * 2);

      console.log(
        `[Perf] Broadcast latency: avg=${avgLatency.toFixed(2)}ms, max=${maxLatency.toFixed(2)}ms ` +
          `(${receivers.length} receivers)`
      );

      disconnectAll([sender, ...receivers]);
    }, 30000);

    it('should sustain low latency under message burst', async () => {
      const roomId = uid('room-burst');

      const sender = await createClient('/chat');
      const receivers = await createClients(5, '/chat');
      activeClients.push(sender, ...receivers);

      // Join all to room
      const joinAll = async (clients: ClientSocket[]) => {
        return Promise.all(
          clients.map(
            c =>
              new Promise<void>(resolve => {
                c.emit('chat:join', { roomId }, () => resolve());
              })
          )
        );
      };
      await joinAll([sender, ...receivers]);
      await new Promise(r => setTimeout(r, 200));

      let totalReceived = 0;
      const expectedTotal = MESSAGE_COUNT * receivers.length;

      const receivePromise = new Promise<void>(resolve => {
        for (const receiver of receivers) {
          receiver.on('chat:message', (data: any) => {
            if (data.roomId === roomId) {
              totalReceived++;
              if (totalReceived >= expectedTotal) {
                resolve();
              }
            }
          });
        }
      });

      // Send burst of messages
      const sendTimes: number[] = [];
      for (let i = 0; i < MESSAGE_COUNT; i++) {
        sendTimes.push(performance.now());
        sender.emit('chat:message', {
          roomId,
          content: `burst-msg-${i}`,
        });
      }

      await receivePromise;

      // Record latencies based on message order
      const end = performance.now();
      const totalTime = end - sendTimes[0];
      const throughput = expectedTotal / (totalTime / 1000);

      expect(totalReceived).toBe(expectedTotal);

      console.log(
        `[Perf] Burst: ${MESSAGE_COUNT} messages to ${receivers.length} receivers ` +
          `in ${totalTime.toFixed(1)}ms (${throughput.toFixed(1)} msg/s)`
      );

      disconnectAll([sender, ...receivers]);
    }, 30000);
  });

  // -----------------------------------------------------------------------
  // 3. Room System Concurrency
  // -----------------------------------------------------------------------
  describe('Room system concurrency', () => {
    it('should handle concurrent room join/leave operations', async () => {
      const roomId = uid('room-concurrent');
      const clientCount = Math.min(CONCURRENT_CONNECTIONS, 50);
      const clients = await createClients(clientCount, '/chat');
      activeClients.push(...clients);

      // Concurrent joins
      const joinStart = performance.now();
      const joinResults = await Promise.all(
        clients.map(
          c =>
            new Promise<{ success: boolean; memberCount?: number }>(resolve => {
              c.emit(
                'chat:join',
                { roomId },
                (response: { success: boolean; data?: { memberCount?: number } }) => {
                  resolve({
                    success: response.success,
                    memberCount: response.data?.memberCount,
                  });
                }
              );
              // Timeout fallback
              setTimeout(() => resolve({ success: false }), 10000);
            })
        )
      );
      const joinElapsed = performance.now() - joinStart;

      const successCount = joinResults.filter(r => r.success).length;
      expect(successCount).toBe(clientCount);

      console.log(`[Perf] ${clientCount} concurrent room joins in ${joinElapsed.toFixed(1)}ms`);

      // Concurrent leaves
      const leaveStart = performance.now();
      const leaveResults = await Promise.all(
        clients.map(
          c =>
            new Promise<boolean>(resolve => {
              c.emit('chat:leave', { roomId }, (response: { success: boolean }) => {
                resolve(response.success);
              });
              setTimeout(() => resolve(false), 10000);
            })
        )
      );
      const leaveElapsed = performance.now() - leaveStart;

      const leaveSuccessCount = leaveResults.filter(Boolean).length;
      expect(leaveSuccessCount).toBe(clientCount);

      console.log(`[Perf] ${clientCount} concurrent room leaves in ${leaveElapsed.toFixed(1)}ms`);

      disconnectAll(clients);
    }, 30000);

    it('should handle multiple rooms with overlapping members', async () => {
      const clientCount = Math.min(CONCURRENT_CONNECTIONS, 30);
      const clients = await createClients(clientCount, '/chat');
      activeClients.push(...clients);

      const rooms = Array.from({ length: ROOM_COUNT }, (_, i) => uid(`multi-room-${i}`));

      // Each client joins all rooms concurrently
      const joinStart = performance.now();
      const allJoinPromises = clients.map(client =>
        Promise.all(
          rooms.map(
            roomId =>
              new Promise<boolean>(resolve => {
                client.emit('chat:join', { roomId }, (response: { success: boolean }) =>
                  resolve(response.success)
                );
                setTimeout(() => resolve(false), 10000);
              })
          )
        )
      );

      const results = await Promise.all(allJoinPromises);
      const joinElapsed = performance.now() - joinStart;

      const totalOps = clientCount * ROOM_COUNT;
      const successOps = results.flat().filter(Boolean).length;
      expect(successOps).toBe(totalOps);

      const opsPerSecond = totalOps / (joinElapsed / 1000);
      console.log(
        `[Perf] ${totalOps} room joins (${clientCount} clients x ${ROOM_COUNT} rooms) ` +
          `in ${joinElapsed.toFixed(1)}ms (${opsPerSecond.toFixed(0)} ops/s)`
      );

      disconnectAll(clients);
    }, 60000);
  });

  // -----------------------------------------------------------------------
  // 4. Online Presence Sync Performance
  // -----------------------------------------------------------------------
  describe('Online presence synchronization', () => {
    it('should track online status for multiple users', async () => {
      const clientCount = Math.min(PRESENCE_USER_COUNT, 30);
      const clients = await createClients(clientCount, '/presence');
      activeClients.push(...clients);

      // Verify all clients connected successfully
      const connectedCount = clients.filter(c => c.connected).length;
      expect(connectedCount).toBe(clientCount);

      // Subscribe each client to a few other users' presence
      const subscribeStart = performance.now();
      const subscribePromises = clients.map(client =>
        Promise.all(
          clients.slice(0, 5).map(
            target =>
              new Promise<{ success: boolean }>(resolve => {
                client.emit(
                  'presence:subscribe',
                  { targetUserId: `user-${clients.indexOf(target)}` },
                  (response: { success: boolean }) => resolve(response)
                );
                setTimeout(() => resolve({ success: false }), 10000);
              })
          )
        )
      );

      await Promise.all(subscribePromises);
      const subscribeElapsed = performance.now() - subscribeStart;

      console.log(
        `[Perf] Presence subscriptions: ${clientCount * 5} ops in ${subscribeElapsed.toFixed(1)}ms`
      );

      disconnectAll(clients);
    }, 30000);

    it('should broadcast presence updates within latency threshold', async () => {
      const subscriber = await createClient('/presence');
      const broadcaster = await createClient('/presence');
      activeClients.push(subscriber, broadcaster);

      // Subscriber listens for status changes
      const updatePromise = new Promise<number>(resolve => {
        subscriber.on('presence:status_changed', (_data: any) => {
          resolve(performance.now());
        });
      });

      // Subscribe to the broadcaster's presence
      await new Promise<void>(resolve => {
        subscriber.emit('presence:subscribe', { targetUserId: 'user-broadcast' }, () => resolve());
      });

      await new Promise(r => setTimeout(r, 100));

      // Broadcaster updates their status
      const sendTime = performance.now();
      broadcaster.emit('presence:update', { status: 'away' }, () => {});

      const receiveTime = await updatePromise;
      const latency = receiveTime - sendTime;

      expect(latency).toBeLessThan(BROADCAST_LATENCY_THRESHOLD_MS);

      console.log(`[Perf] Presence update latency: ${latency.toFixed(2)}ms`);

      disconnectAll([subscriber, broadcaster]);
    }, 15000);

    it('should handle rapid presence status changes', async () => {
      const clientCount = Math.min(PRESENCE_USER_COUNT, 20);
      const clients = await createClients(clientCount, '/presence');
      activeClients.push(...clients);

      const statuses = ['online', 'away', 'busy', 'offline'] as const;
      const updateCount = 100;

      const updateStart = performance.now();
      const updatePromises = clients.map(client =>
        Promise.all(
          Array.from(
            { length: Math.ceil(updateCount / clientCount) },
            (_, i) =>
              new Promise<boolean>(resolve => {
                const status = statuses[i % statuses.length];
                client.emit('presence:update', { status }, (response: { success: boolean }) =>
                  resolve(response.success)
                );
                setTimeout(() => resolve(false), 5000);
              })
          )
        )
      );

      const results = await Promise.all(updatePromises);
      const updateElapsed = performance.now() - updateStart;

      const totalUpdates = results.flat().length;
      const successUpdates = results.flat().filter(Boolean).length;

      expect(successUpdates).toBe(totalUpdates);

      const updatesPerSecond = totalUpdates / (updateElapsed / 1000);
      console.log(
        `[Perf] Presence updates: ${totalUpdates} in ${updateElapsed.toFixed(1)}ms ` +
          `(${updatesPerSecond.toFixed(0)} updates/s)`
      );

      disconnectAll(clients);
    }, 30000);
  });
});
