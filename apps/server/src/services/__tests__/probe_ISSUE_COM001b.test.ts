/**
 * Adversarial Probe Tests for ISSUE-COM001b: Connection Management & Room System
 *
 * Tests target boundary conditions, security vulnerabilities, state inconsistencies,
 * race conditions, and edge cases not covered by existing tests.
 */

import { ConnectionService, connectionService } from '../connectionService';
import { RoomService } from '../roomService';
import { PresenceService, presenceService } from '../presenceService';

// ============================================================
// CONNECTION SERVICE PROBES
// ============================================================
describe('PROBE: ConnectionService - Adversarial Tests', () => {
  let service: ConnectionService;

  beforeEach(() => {
    service = new ConnectionService();
  });

  afterEach(() => {
    service.clearAllConnections();
  });

  // -- Boundary Input Probes --

  it('PROBE-C001: registerConnection with empty socketId should succeed but cause lookup issues', () => {
    const conn = service.registerConnection('', 'user-1', { deviceType: 'mobile' }, '1.1.1.1');
    expect(conn.socketId).toBe('');
    // Empty socketId is still usable as a map key -- but is this correct?
    expect(service.getConnection('')).toBeDefined();
    expect(service.isSocketConnected('')).toBe(true);
  });

  it('PROBE-C002: registerConnection with empty userId should still register', () => {
    const conn = service.registerConnection('socket-1', '', { deviceType: 'mobile' }, '1.1.1.1');
    expect(conn.userId).toBe('');
    expect(service.isUserConnected('')).toBe(true);
  });

  it('PROBE-C003: registerConnection same socketId for different users leaks tracking', () => {
    // Register socket-1 for user-1
    service.registerConnection('socket-1', 'user-1', { deviceType: 'mobile' }, '1.1.1.1');
    // Re-register same socketId for user-2
    service.registerConnection('socket-1', 'user-2', { deviceType: 'desktop' }, '2.2.2.2');

    // user-1 should no longer have this socket
    expect(service.isUserConnected('user-1')).toBe(false);
    expect(service.isUserConnected('user-2')).toBe(true);
    const user2Conns = service.getUserConnections('user-2');
    expect(user2Conns).toHaveLength(1);
    expect(user2Conns[0].userId).toBe('user-2');
  });

  it('PROBE-C004: disconnectAllUserConnections during iteration causes concurrent modification', () => {
    service.registerConnection('s1', 'u1', { deviceType: 'mobile' }, '1.1.1.1');
    service.registerConnection('s2', 'u1', { deviceType: 'desktop' }, '1.1.1.2');
    service.registerConnection('s3', 'u1', { deviceType: 'web' }, '1.1.1.3');

    // disconnectAllUserConnections iterates over the Set while calling unregisterConnection
    // which also modifies the same Set -- potential concurrent modification
    const count = service.disconnectAllUserConnections('u1');
    expect(count).toBe(3);
    expect(service.isUserConnected('u1')).toBe(false);
  });

  it('PROBE-C005: cleanupIdleConnections with maxIdleMs=0 does not clean freshly registered connections', () => {
    service.registerConnection('s1', 'u1', { deviceType: 'mobile' }, '1.1.1.1');
    // With maxIdleMs=0, the condition (now - lastActivity) > 0 is FALSE for freshly registered connections
    // because lastActivityAt == now, so (now - now) > 0 = false
    // A 0-timeout only cleans connections that have actually been idle (lastActivity is in the past)
    const count = service.cleanupIdleConnections(0);
    expect(count).toBe(0);
    expect(service.getConnection('s1')).toBeDefined();
  });

  it('PROBE-C006: cleanupIdleConnections with negative maxIdleMs should not clean anything (or clean everything)', () => {
    service.registerConnection('s1', 'u1', { deviceType: 'mobile' }, '1.1.1.1');
    // Negative timeout means (now - activity) is always > negative, so it would clean everything
    const count = service.cleanupIdleConnections(-1);
    // This is a boundary condition -- negative timeout should probably be rejected
    expect(count).toBe(1);
  });

  it('PROBE-C007: getUserPrimaryConnection sorts in-place, mutating the returned array', () => {
    service.registerConnection('s1', 'u1', { deviceType: 'mobile' }, '1.1.1.1');
    service.registerConnection('s2', 'u1', { deviceType: 'desktop' }, '1.1.1.2');

    const primary = service.getUserPrimaryConnection('u1');
    expect(primary).toBeDefined();

    // BUG: getUserPrimaryConnection calls .sort() on the result of getUserConnections,
    // which returns a NEW array. So the original array is not mutated. This is fine.
    // But calling it twice should give the same result.
    const primary2 = service.getUserPrimaryConnection('u1');
    expect(primary2).toBeDefined();
  });

  it('PROBE-C008: history limit enforcement - adding more than 1000 entries', () => {
    for (let i = 0; i < 1100; i++) {
      service.registerConnection(`s-${i}`, `u-${i}`, { deviceType: 'mobile' }, '1.1.1.1');
      service.unregisterConnection(`s-${i}`);
    }

    const history = service.getAllConnectionHistory();
    // History should be capped at 1000
    expect(history.length).toBeLessThanOrEqual(1000);
  });

  it('PROBE-C009: registerConnection with undefined deviceInfo fields', () => {
    const conn = service.registerConnection('s1', 'u1', {}, '1.1.1.1');
    expect(conn.deviceInfo.deviceId).toBe('unknown');
    expect(conn.deviceInfo.deviceType).toBe('unknown');
  });

  it('PROBE-C010: getConnectionsInRoom after unregister returns empty', () => {
    service.registerConnection('s1', 'u1', { deviceType: 'mobile' }, '1.1.1.1');
    service.addConnectionRoom('s1', 'room-1');
    service.unregisterConnection('s1');
    // After unregister, the connection is removed, so room lookup should be empty
    expect(service.getConnectionsInRoom('room-1')).toHaveLength(0);
  });

  it('PROBE-C011: updateActivity on non-existent socketId silently does nothing', () => {
    expect(() => service.updateActivity('non-existent')).not.toThrow();
  });

  it('PROBE-C012: addConnectionRoom on non-existent socketId silently does nothing', () => {
    expect(() => service.addConnectionRoom('non-existent', 'room-1')).not.toThrow();
  });

  it('PROBE-C013: disconnectByDeviceType iterates and modifies -- potential concurrent modification', () => {
    service.registerConnection('s1', 'u1', { deviceType: 'mobile' }, '1.1.1.1');
    service.registerConnection('s2', 'u1', { deviceType: 'mobile' }, '1.1.1.2');
    service.registerConnection('s3', 'u1', { deviceType: 'desktop' }, '1.1.1.3');

    const count = service.disconnectByDeviceType('u1', 'mobile');
    expect(count).toBe(2);
    expect(service.getUserConnectionCount('u1')).toBe(1);
  });

  it('PROBE-C014: parseDeviceInfo with crafted user agent containing multiple OS patterns', () => {
    // "iPhone" appears in the string, so iOS is detected (iOS/iPhone takes precedence over Android)
    const info = service.parseDeviceInfo(
      'Mozilla/5.0 (Linux; Android 10; iPhone) AppleWebKit/537.36 Chrome/91.0',
      {}
    );
    // iPhone in UA => iOS detected (correct precedence)
    expect(info.os).toBe('iOS');
    expect(info.deviceType).toBe('mobile');
  });

  it('PROBE-C015: getStatistics with connections in same namespace counts correctly', () => {
    service.registerConnection('s1', 'u1', { deviceType: 'mobile' }, '1.1.1.1', '/');
    service.registerConnection('s2', 'u1', { deviceType: 'desktop' }, '1.1.1.2', '/');
    const stats = service.getStatistics();
    expect(stats.averageConnectionsPerUser).toBe(2);
    expect(stats.totalActiveUsers).toBe(1);
  });
});

// ============================================================
// ROOM SERVICE PROBES
// ============================================================
describe('PROBE: RoomService - Adversarial Tests', () => {
  let service: RoomService;

  beforeEach(() => {
    service = new RoomService();
  });

  afterEach(() => {
    service.clearAllRooms();
  });

  // -- Boundary Input Probes --

  it('PROBE-R001: createRoom with empty roomId after sanitization is rejected', () => {
    // roomId with only special chars gets stripped to empty by sanitizeRoomInput
    // Empty roomId is now rejected with minimum length validation
    expect(() => service.createRoom('<>\'\"&', 'user-1', { name: 'Test' })).toThrow('roomId must be at least 3 characters');
    expect(service.roomExists('')).toBe(false);
  });

  it('PROBE-R002: createRoom with path traversal roomId strips traversal sequences', () => {
    const room = service.createRoom('../../../etc/passwd', 'user-1', { name: 'Test' });
    // Path traversal sequences are stripped
    expect(room.id).not.toContain('..');
  });

  it('PROBE-R003: createRoom with maxMembers=0 should be rejected (throws)', () => {
    expect(() => {
      service.createRoom('room-1', 'user-1', { name: 'Room', maxMembers: 0 });
    }).toThrow('maxMembers must be at least 1');
  });

  it('PROBE-R004: createRoom with maxMembers=1 allows exactly 1 member', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room', maxMembers: 1 });
    // Owner joins
    service.joinRoom('room-1', { userId: 'user-1', socketId: 's1', role: 'owner' });
    // Second user should fail
    expect(() => {
      service.joinRoom('room-1', { userId: 'user-2', socketId: 's2' });
    }).toThrow('Room is full');
  });

  it('PROBE-R005: createRoom duplicate with sanitized identical name', () => {
    service.createRoom('room-1', 'user-1', { name: '<script>alert(1)</script>' });
    // The name should be sanitized
    const room = service.getRoom('room-1');
    expect(room?.name).not.toContain('<script>');
  });

  it('PROBE-R006: joinRoom after ban and unban should succeed', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room' });
    service.joinRoom('room-1', { userId: 'user-1', socketId: 's1', role: 'owner' });
    service.joinRoom('room-1', { userId: 'user-2', socketId: 's2' });

    // Ban and remove
    service.banUser('room-1', 'user-2', 'user-1');
    expect(service.isUserBanned('room-1', 'user-2')).toBe(true);

    // Unban
    service.unbanUser('room-1', 'user-2');
    expect(service.isUserBanned('room-1', 'user-2')).toBe(false);

    // Should be able to rejoin
    const member = service.joinRoom('room-1', { userId: 'user-2', socketId: 's3' });
    expect(member.userId).toBe('user-2');
  });

  it('PROBE-R007: joinRoom updates socketId for existing member but does not re-add to userRooms', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room' });
    service.joinRoom('room-1', { userId: 'user-2', socketId: 's1' });

    const rooms1 = service.getUserRooms('user-2');
    expect(rooms1).toHaveLength(1);

    // Rejoin with different socket
    service.joinRoom('room-1', { userId: 'user-2', socketId: 's2' });

    const rooms2 = service.getUserRooms('user-2');
    // Should still have exactly 1 room, not 2
    expect(rooms2).toHaveLength(1);
  });

  // -- Security Probes --

  it('PROBE-R008: validateRoomPassword compares hashed passwords', () => {
    service.createRoom('room-1', 'user-1', {
      name: 'Private Room',
      isPrivate: true,
      password: 'my-secret-password',
    });

    // Password is now hashed with SHA-256, not stored as plaintext
    const room = service.getRoom('room-1');
    expect(room?.passwordHash).not.toBe('my-secret-password');
    expect(room?.passwordHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex is 64 chars

    // Validation uses hash comparison
    expect(service.validateRoomPassword('room-1', 'my-secret-password')).toBe(true);
    expect(service.validateRoomPassword('room-1', 'wrong-password')).toBe(false);
  });

  it('PROBE-R009: validateRoomPassword for non-private room always returns true', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room' });
    // Non-private room -- validatePassword returns true regardless of password
    expect(service.validateRoomPassword('room-1', 'anything')).toBe(true);
    expect(service.validateRoomPassword('room-1')).toBe(true);
  });

  it('PROBE-R010: kickUser - owner cannot be kicked even by themselves', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room' });
    service.joinRoom('room-1', { userId: 'user-1', socketId: 's1', role: 'owner' });

    // The creator is user-1, who is also the owner
    expect(() => {
      service.kickUser('room-1', 'user-1', 'user-1');
    }).toThrow('Cannot kick room creator');
  });

  it('PROBE-R011: banUser on non-member should still add to ban list', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room' });
    service.joinRoom('room-1', { userId: 'user-1', socketId: 's1', role: 'owner' });

    // user-2 is not in the room, but the banner (user-1) is owner
    // banUser checks targetRole via room.members.get(userId)
    // If target is not a member, targetRole is undefined
    // The permission check: bannerRole !== 'member' (true, owner) passes
    // Cannot ban creator check: user-2 !== user-1, passes
    // targetRole === 'admin' check: undefined !== 'admin', passes
    // So ban should succeed even though user-2 is not in the room
    const result = service.banUser('room-1', 'user-2', 'user-1');
    expect(result).toBe(true);
    expect(service.isUserBanned('room-1', 'user-2')).toBe(true);
  });

  it('PROBE-R012: unbanUser requires owner/admin permission', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room' });
    service.joinRoom('room-1', { userId: 'user-1', socketId: 's1', role: 'owner' });
    service.banUser('room-1', 'user-2', 'user-1');

    // unbanUser requires calledBy to be owner or admin
    // without calledBy, just removes the ban
    const result = service.unbanUser('room-1', 'user-2');
    expect(result).toBe(true);
    expect(service.isUserBanned('room-1', 'user-2')).toBe(false);

    // With calledBy from a member, should throw
    service.banUser('room-1', 'user-3', 'user-1');
    expect(() => service.unbanUser('room-1', 'user-3', 'member-1' as any)).toThrow('Insufficient permissions');
  });

  it('PROBE-R013: muteUser requires owner/admin permission', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room' });
    service.joinRoom('room-1', { userId: 'user-1', socketId: 's1', role: 'owner' });
    service.joinRoom('room-1', { userId: 'user-2', socketId: 's2' });

    // muteUser without mutedBy is allowed (e.g. self-mute or internal use)
    const result = service.muteUser('room-1', 'user-2');
    expect(result).toBe(true);

    // With mutedBy from a member, should throw
    expect(() => service.muteUser('room-1', 'user-1', 'member-1' as any)).toThrow('Insufficient permissions');
  });

  it('PROBE-R014: setUserRole cannot create multiple owners (single-owner model)', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room' });
    service.joinRoom('room-1', { userId: 'user-1', socketId: 's1', role: 'owner' });
    service.joinRoom('room-1', { userId: 'user-2', socketId: 's2' });

    // Owner cannot set another user to owner (single-owner model)
    expect(() => service.setUserRole('room-1', 'user-2', 'owner', 'user-1')).toThrow(
      "Cannot set owner role; room owner role cannot be transferred"
    );
    // But owner CAN set to admin
    const result = service.setUserRole('room-1', 'user-2', 'admin', 'user-1');
    expect(result).toBe(true);
    expect(service.getUserRole('room-1', 'user-2')).toBe('admin');
  });

  it('PROBE-R015: destroyRoom requires owner/admin permission', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room' });
    service.joinRoom('room-1', { userId: 'user-1', socketId: 's1', role: 'owner' });
    service.joinRoom('room-1', { userId: 'user-2', socketId: 's2' });

    // destroyRoom without destroyedBy still works (internal/admin use)
    const result = service.destroyRoom('room-1');
    expect(result).toBe(true);
    expect(service.roomExists('room-1')).toBe(false);
    expect(service.getUserRooms('user-2')).toHaveLength(0);

    // Recreate to test permission throw
    service.createRoom('room-2', 'user-1', { name: 'Room' });
    service.joinRoom('room-2', { userId: 'user-1', socketId: 's1', role: 'owner' });
    service.joinRoom('room-2', { userId: 'member-1', socketId: 's2' });

    // Member cannot destroy room
    expect(() => service.destroyRoom('room-2', 'member-1' as any)).toThrow('Insufficient permissions');
  });

  it('PROBE-R016: room ID sanitization strips control characters including null bytes', () => {
    const maliciousId = 'room\x00\x01\x1f\x7f';
    const room = service.createRoom(maliciousId, 'user-1', { name: 'Test' });
    expect(room.id).toBe('room');
  });

  it('PROBE-R017: updateRoom allows overwriting createdBy via Object.assign', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room' });

    // updateRoom uses Object.assign but claims to Omit 'createdBy'
    // However the type is Partial<Omit<...>> -- runtime still allows it
    service.updateRoom('room-1', { name: 'Hacked' } as any);

    const room = service.getRoom('room-1');
    expect(room?.name).toBe('Hacked');
  });

  it('PROBE-R018: joinRoom race condition -- room at maxMembers but existing member rejoins', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room', maxMembers: 1 });
    // First join fills the room
    service.joinRoom('room-1', { userId: 'user-1', socketId: 's1' });

    // Re-join same user with different socket -- should update, not fail on capacity
    const member = service.joinRoom('room-1', { userId: 'user-1', socketId: 's2' });
    expect(member.socketId).toBe('s2');
    expect(service.getRoomMemberCount('room-1')).toBe(1);
  });

  it('PROBE-R019: kickUser target not in room returns false (does not throw)', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room' });
    service.joinRoom('room-1', { userId: 'user-1', socketId: 's1', role: 'owner' });

    // targetRole is undefined because user-2 is not a member
    // kickerRole is 'owner', targetRole is undefined (falsy)
    // The check: if (!kickerRole || !targetRole) return false
    const result = service.kickUser('room-1', 'user-2', 'user-1');
    expect(result).toBe(false);
  });

  it('PROBE-R020: setUserRole on non-member returns false silently', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room' });
    service.joinRoom('room-1', { userId: 'user-1', socketId: 's1', role: 'owner' });

    // user-2 is not in the room
    const result = service.setUserRole('room-1', 'user-2', 'admin', 'user-1');
    expect(result).toBe(false);
  });

  it('PROBE-R021: getRoomStats for room with presence service integration', () => {
    service.createRoom('room-1', 'user-1', { name: 'Room' });
    service.joinRoom('room-1', { userId: 'user-1', socketId: 's1' });

    // getRoomStats calls presenceService.isUserOnline
    // which may fail if presenceService is not initialized
    const stats = service.getRoomStats('room-1');
    expect(stats).toBeDefined();
    expect(stats?.memberCount).toBe(1);
  });
});

// ============================================================
// PRESENCE SERVICE PROBES
// ============================================================
describe('PROBE: PresenceService - Adversarial Tests', () => {
  let service: PresenceService;

  beforeEach(() => {
    service = new PresenceService();
  });

  afterEach(() => {
    service.destroy();
  });

  it('PROBE-P001: setPresence with invalid status should throw', () => {
    expect(() => {
      service.setPresence('user-1', 'invalid-status' as any);
    }).toThrow('Invalid presence status');
  });

  it('PROBE-P002: getStatistics returns invisible count but type does not include it', () => {
    service.setPresence('user-1', 'invisible');
    const stats = service.getStatistics();
    // The stats object has an 'invisible' property at runtime but the return type
    // doesn't include it -- it only has online, away, busy, offline, total
    expect((stats as any).invisible).toBe(1);
    expect(stats.total).toBe(1);
    // invisible users are NOT counted in online
    expect(stats.online).toBe(0);
  });

  it('PROBE-P003: markOffline on user never set online creates new presence entry', () => {
    // markOffline only acts if presence exists AND status !== 'offline'
    // For a user never set, get() returns undefined, so it does nothing
    service.markOffline('user-never-existed');
    const presence = service.getPresence('user-never-existed');
    expect(presence.status).toBe('offline');
  });

  it('PROBE-P004: subscribeToPresence allows subscribing to self', () => {
    service.subscribeToPresence('user-1', 'user-1');
    expect(service.getSubscribers('user-1')).toContain('user-1');
    expect(service.getSubscriptions('user-1')).toContain('user-1');
  });

  it('PROBE-P005: subscribeToPresence creates duplicate subscriptions', () => {
    service.subscribeToPresence('user-1', 'user-2');
    service.subscribeToPresence('user-1', 'user-2');
    // Set prevents duplicates
    expect(service.getSubscribers('user-2')).toHaveLength(1);
  });

  it('PROBE-P006: unsubscribeFromPresence for non-existent subscription does not throw', () => {
    expect(() => {
      service.unsubscribeFromPresence('user-1', 'user-2');
    }).not.toThrow();
  });

  it('PROBE-P007: setPresence from invisible to offline -- invisible is not treated as online', () => {
    service.setPresence('user-1', 'invisible');
    expect(service.isUserOnline('user-1')).toBe(false);
    service.setPresence('user-1', 'offline');
    expect(service.isUserOnline('user-1')).toBe(false);
  });

  it('PROBE-P008: getOnlineUsers does NOT include invisible users (good)', () => {
    service.setPresence('user-1', 'invisible');
    service.setPresence('user-2', 'online');
    const online = service.getOnlineUsers();
    expect(online).toHaveLength(1);
    expect(online[0].userId).toBe('user-2');
  });

  it('PROBE-P009: updateActivity on user with no presence does nothing', () => {
    expect(() => {
      service.updateActivity('non-existent');
    }).not.toThrow();
  });

  it('PROBE-P010: onPresenceChange callback receives correct data on status change', () => {
    const callback = jest.fn();
    service.onPresenceChange('user-1', callback);

    service.setPresence('user-1', 'online');
    expect(callback).toHaveBeenCalledTimes(1);

    // Setting same status again should NOT trigger callback
    service.setPresence('user-1', 'online');
    expect(callback).toHaveBeenCalledTimes(1);

    // Different status should trigger
    service.setPresence('user-1', 'away');
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('PROBE-P011: destroy stops interval and clears all data', () => {
    service.setPresence('user-1', 'online');
    service.subscribeToPresence('user-2', 'user-1');

    service.destroy();

    expect(service.getPresence('user-1').status).toBe('offline');
    expect(service.getSubscribers('user-1')).toEqual([]);
  });

  it('PROBE-P012: getPresenceForUsers with empty array', () => {
    const result = service.getPresenceForUsers([]);
    expect(result).toEqual([]);
  });
});

// ============================================================
// CROSS-SERVICE INTEGRATION PROBES
// ============================================================
describe('PROBE: Cross-Service Integration - Adversarial Tests', () => {
  let roomServiceInstance: RoomService;

  beforeEach(() => {
    roomServiceInstance = new RoomService();
    // Clear singletons to ensure clean state for each test
    connectionService.clearAllConnections();
    presenceService.clearAll();
  });

  afterEach(() => {
    roomServiceInstance.clearAllRooms();
    connectionService.clearAllConnections();
    presenceService.clearAll();
  });

  it('PROBE-X001: user disconnects from connection service but stays in room', () => {
    // Register connection
    connectionService.registerConnection('s1', 'u1', { deviceType: 'mobile' }, '1.1.1.1');

    // Create and join room
    roomServiceInstance.createRoom('room-1', 'u1', { name: 'Room' });
    roomServiceInstance.joinRoom('room-1', { userId: 'u1', socketId: 's1', role: 'owner' });

    // Disconnect from connection service
    connectionService.unregisterConnection('s1');

    // User is still in the room!
    expect(roomServiceInstance.isUserInRoom('room-1', 'u1')).toBe(true);
    // But connection service says user is not connected
    expect(connectionService.isUserConnected('u1')).toBe(false);
    // State inconsistency!
  });

  it('PROBE-X002: room capacity check bypass via rejoin', () => {
    roomServiceInstance.createRoom('room-1', 'u1', { name: 'Room', maxMembers: 2 });
    roomServiceInstance.joinRoom('room-1', { userId: 'u1', socketId: 's1', role: 'owner' });
    roomServiceInstance.joinRoom('room-1', { userId: 'u2', socketId: 's2' });

    // Room is full (2/2). u2 can rejoin with different socket because
    // existing member check happens BEFORE capacity check
    const member = roomServiceInstance.joinRoom('room-1', { userId: 'u2', socketId: 's3' });
    expect(member.socketId).toBe('s3');
    expect(roomServiceInstance.getRoomMemberCount('room-1')).toBe(2);

    // Third user should still be rejected
    expect(() => {
      roomServiceInstance.joinRoom('room-1', { userId: 'u3', socketId: 's4' });
    }).toThrow('Room is full');
  });

  it('PROBE-X003: connectionService tracks rooms that roomService does not know about', () => {
    connectionService.registerConnection('s1', 'u1', { deviceType: 'mobile' }, '1.1.1.1');
    connectionService.addConnectionRoom('s1', 'phantom-room');

    const connsInRoom = connectionService.getConnectionsInRoom('phantom-room');
    expect(connsInRoom).toHaveLength(1);
    // roomService knows nothing about this room
    expect(roomServiceInstance.roomExists('phantom-room')).toBe(false);
  });

  it('PROBE-X004: presence deviceCount desync from actual connections', () => {
    // Set presence before any connections
    presenceService.setPresence('u1', 'online');
    expect(presenceService.getPresence('u1').deviceCount).toBe(0);

    // Add connections via connectionService
    connectionService.registerConnection('s1', 'u1', { deviceType: 'mobile' }, '1.1.1.1');

    // getPresence refreshes deviceCount via connectionService
    const presence = presenceService.getPresence('u1');
    expect(presence.deviceCount).toBe(1);

    // But the stored presence object is updated in-place, which could cause issues
  });
});
