import { connectionManager } from '../connectionManager';
const groupStates = new Map();
/**
 * Get or create group state
 */
function getGroupState(groupId) {
    return groupStates.get(groupId);
}
/**
 * Create group state
 */
function createGroupState(groupId, name, creatorId) {
    const state = {
        groupId,
        name,
        members: [
            {
                userId: creatorId,
                role: 'owner',
                joinedAt: new Date(),
                online: true,
            },
        ],
        settings: {
            allowInvite: true,
            muteNotifications: false,
            onlyAdminsCanPost: false,
        },
        lastSyncAt: new Date(),
    };
    groupStates.set(groupId, state);
    return state;
}
/**
 * Update member online status
 */
function updateMemberOnlineStatus(groupId, userId, online) {
    const state = groupStates.get(groupId);
    if (state) {
        const member = state.members.find(m => m.userId === userId);
        if (member) {
            member.online = online;
            if (!online) {
                member.lastSeenAt = new Date();
            }
        }
    }
}
/**
 * Broadcast group state to all members
 */
function broadcastGroupState(nsp, groupId) {
    const state = groupStates.get(groupId);
    if (state) {
        nsp.to(`group:${groupId}`).emit('group:state_sync', {
            groupId,
            members: state.members.map(m => ({
                userId: m.userId,
                role: m.role,
                online: m.online,
                lastSeenAt: m.lastSeenAt,
            })),
            settings: state.settings,
            timestamp: new Date().toISOString(),
        });
    }
}
/**
 * Register group event handlers
 */
export function registerGroupHandlers(socket, nsp) {
    // Create group
    socket.on('group:create', async (data, callback) => {
        try {
            if (!socket.user?.id) {
                callback?.({ success: false, error: 'Authentication required' });
                return;
            }
            const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const state = createGroupState(groupId, data.name, socket.user.id);
            // Add additional members
            if (data.memberIds) {
                for (const memberId of data.memberIds) {
                    if (memberId !== socket.user.id) {
                        state.members.push({
                            userId: memberId,
                            role: 'member',
                            joinedAt: new Date(),
                            online: connectionManager.isUserOnline(memberId),
                        });
                    }
                }
            }
            // Join the group room
            socket.join(`group:${groupId}`);
            callback?.({
                success: true,
                data: { groupId, state },
            });
        }
        catch (error) {
            callback?.({ success: false, error: 'Failed to create group' });
        }
    });
    // Join group
    socket.on('group:join', async (data, callback) => {
        try {
            if (!socket.user?.id) {
                callback?.({ success: false, error: 'Authentication required' });
                return;
            }
            const { groupId } = data;
            const state = getGroupState(groupId);
            if (!state) {
                callback?.({ success: false, error: 'Group not found' });
                return;
            }
            // Check if user is a member
            const isMember = state.members.some(m => m.userId === socket.user?.id);
            if (!isMember) {
                callback?.({ success: false, error: 'Not a member of this group' });
                return;
            }
            // Join the group room
            socket.join(`group:${groupId}`);
            // Update online status
            updateMemberOnlineStatus(groupId, socket.user.id, true);
            // Notify other members
            socket.to(`group:${groupId}`).emit('group:member_online', {
                groupId,
                userId: socket.user.id,
                timestamp: new Date().toISOString(),
            });
            // Send full state to the joining user
            callback?.({
                success: true,
                data: {
                    groupId,
                    name: state.name,
                    members: state.members,
                    settings: state.settings,
                },
            });
            // Broadcast updated state to all members
            broadcastGroupState(nsp, groupId);
        }
        catch (error) {
            callback?.({ success: false, error: 'Failed to join group' });
        }
    });
    // Leave group
    socket.on('group:leave', (data, callback) => {
        try {
            const { groupId } = data;
            socket.leave(`group:${groupId}`);
            if (socket.user?.id) {
                updateMemberOnlineStatus(groupId, socket.user.id, false);
                // Notify other members
                socket.to(`group:${groupId}`).emit('group:member_offline', {
                    groupId,
                    userId: socket.user.id,
                    timestamp: new Date().toISOString(),
                });
                broadcastGroupState(nsp, groupId);
            }
            callback?.({ success: true });
        }
        catch (error) {
            callback?.({ success: false, error: 'Failed to leave group' });
        }
    });
    // Request group state sync
    socket.on('group:sync', (data, callback) => {
        const state = getGroupState(data.groupId);
        if (!state) {
            callback?.({ success: false, error: 'Group not found' });
            return;
        }
        // Update online status for all members
        for (const member of state.members) {
            member.online = connectionManager.isUserOnline(member.userId);
        }
        callback?.({
            success: true,
            data: {
                groupId: state.groupId,
                name: state.name,
                members: state.members,
                settings: state.settings,
                timestamp: new Date().toISOString(),
            },
        });
    });
    // Update group settings
    socket.on('group:update_settings', (data, callback) => {
        if (!socket.user?.id) {
            callback?.({ success: false, error: 'Authentication required' });
            return;
        }
        const state = getGroupState(data.groupId);
        if (!state) {
            callback?.({ success: false, error: 'Group not found' });
            return;
        }
        // Check if user is admin or owner
        const member = state.members.find(m => m.userId === socket.user?.id);
        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            callback?.({ success: false, error: 'Permission denied' });
            return;
        }
        // Update settings
        state.settings = { ...state.settings, ...data.settings };
        state.lastSyncAt = new Date();
        // Broadcast updated settings to all members
        nsp.to(`group:${data.groupId}`).emit('group:settings_updated', {
            groupId: data.groupId,
            settings: state.settings,
            updatedBy: socket.user.id,
            timestamp: new Date().toISOString(),
        });
        callback?.({ success: true, data: { settings: state.settings } });
    });
    // Add member to group
    socket.on('group:add_member', (data, callback) => {
        if (!socket.user?.id) {
            callback?.({ success: false, error: 'Authentication required' });
            return;
        }
        const state = getGroupState(data.groupId);
        if (!state) {
            callback?.({ success: false, error: 'Group not found' });
            return;
        }
        // Check if user has permission to add members
        const requester = state.members.find(m => m.userId === socket.user?.id);
        const canInvite = requester?.role === 'owner' || requester?.role === 'admin' || state.settings.allowInvite;
        if (!canInvite) {
            callback?.({ success: false, error: 'Permission denied' });
            return;
        }
        // Check if user is already a member
        if (state.members.some(m => m.userId === data.userId)) {
            callback?.({ success: false, error: 'User is already a member' });
            return;
        }
        // Add member
        state.members.push({
            userId: data.userId,
            role: data.role || 'member',
            joinedAt: new Date(),
            online: connectionManager.isUserOnline(data.userId),
        });
        // Notify all members
        nsp.to(`group:${data.groupId}`).emit('group:member_added', {
            groupId: data.groupId,
            userId: data.userId,
            role: data.role || 'member',
            addedBy: socket.user.id,
            timestamp: new Date().toISOString(),
        });
        broadcastGroupState(nsp, data.groupId);
        callback?.({ success: true });
    });
    // Remove member from group
    socket.on('group:remove_member', (data, callback) => {
        if (!socket.user?.id) {
            callback?.({ success: false, error: 'Authentication required' });
            return;
        }
        const state = getGroupState(data.groupId);
        if (!state) {
            callback?.({ success: false, error: 'Group not found' });
            return;
        }
        // Check if user has permission to remove members
        const requester = state.members.find(m => m.userId === socket.user?.id);
        const target = state.members.find(m => m.userId === data.userId);
        if (!requester || !target) {
            callback?.({ success: false, error: 'Member not found' });
            return;
        }
        // Owner can remove anyone, admin can remove members only
        const canRemove = requester.role === 'owner' ||
            (requester.role === 'admin' && target.role === 'member') ||
            requester.userId === target.userId; // Self removal
        if (!canRemove) {
            callback?.({ success: false, error: 'Permission denied' });
            return;
        }
        // Remove member
        state.members = state.members.filter(m => m.userId !== data.userId);
        // Notify all members
        nsp.to(`group:${data.groupId}`).emit('group:member_removed', {
            groupId: data.groupId,
            userId: data.userId,
            removedBy: socket.user.id,
            timestamp: new Date().toISOString(),
        });
        broadcastGroupState(nsp, data.groupId);
        callback?.({ success: true });
    });
    // Handle user disconnect - update online status in all groups
    socket.on('disconnect', () => {
        if (socket.user?.id) {
            for (const [groupId, state] of groupStates) {
                const member = state.members.find(m => m.userId === socket.user?.id);
                if (member) {
                    updateMemberOnlineStatus(groupId, socket.user.id, false);
                    socket.to(`group:${groupId}`).emit('group:member_offline', {
                        groupId,
                        userId: socket.user.id,
                        timestamp: new Date().toISOString(),
                    });
                    broadcastGroupState(nsp, groupId);
                }
            }
        }
    });
}
export default { registerGroupHandlers };
//# sourceMappingURL=groupHandler.js.map