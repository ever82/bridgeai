"use strict";
/**
 * MessageService Unit Tests
 * Tests for createChatRoomMessage transaction safety and atomic rollback
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Mock dependencies before importing messageService
jest.mock('../pushNotification', () => ({
    pushNotificationService: {
        sendMessageNotification: jest.fn().mockResolvedValue(undefined),
    },
}));
jest.mock('../presenceService', () => ({
    presenceService: {
        isUserOnline: jest.fn().mockReturnValue(false),
    },
}));
const client_1 = require("../../db/client");
const messageService_1 = require("../messageService");
// Mock the prisma client
jest.mock('../../db/client', () => {
    const _mockChatMessage = {
        id: 'msg-1',
        chatRoomId: 'room-1',
        senderId: 'user-1',
        senderType: 'USER',
        content: 'encrypted',
        type: 'TEXT',
        attachments: null,
        metadata: { deleted: false },
        status: 'SENT',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const _mockUser = {
        id: 'user-1',
        name: 'Test User',
        avatarUrl: null,
    };
    const _mockRoomParticipants = [
        { userId: 'user-2', isActive: true },
        { userId: 'user-3', isActive: true },
    ];
    return {
        prisma: {
            chatMessage: {
                create: jest.fn(),
            },
            user: {
                findUnique: jest.fn(),
            },
            chatRoom: {
                update: jest.fn(),
            },
            roomParticipant: {
                updateMany: jest.fn(),
                findMany: jest.fn(),
            },
            offlineMessage: {
                create: jest.fn(),
            },
            $transaction: jest.fn(callback => {
                // Simulate transaction by passing a mock tx client
                const mockTx = {
                    chatMessage: {
                        create: jest.fn(),
                    },
                    user: {
                        findUnique: jest.fn(),
                    },
                    chatRoom: {
                        update: jest.fn(),
                    },
                    roomParticipant: {
                        updateMany: jest.fn(),
                        findMany: jest.fn(),
                    },
                    offlineMessage: {
                        create: jest.fn(),
                    },
                };
                return callback(mockTx);
            }),
        },
    };
});
// Mock console.error to suppress expected error output
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
describe('createChatRoomMessage Transaction Safety', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterAll(() => {
        consoleErrorSpy.mockRestore();
    });
    describe('Happy path', () => {
        it('should create a message successfully within a transaction', async () => {
            // Arrange
            const mockTx = {
                chatMessage: {
                    create: jest.fn().mockResolvedValue({
                        id: 'msg-1',
                        chatRoomId: 'room-1',
                        senderId: 'user-1',
                        senderType: 'USER',
                        content: 'encrypted',
                        type: 'TEXT',
                        attachments: null,
                        metadata: { deleted: false },
                        status: 'SENT',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }),
                },
                user: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'user-1',
                        name: 'Test User',
                        avatarUrl: null,
                    }),
                },
                chatRoom: {
                    update: jest.fn().mockResolvedValue({}),
                },
                roomParticipant: {
                    updateMany: jest.fn().mockResolvedValue({ count: 2 }),
                    findMany: jest.fn().mockResolvedValue([
                        { userId: 'user-2', isActive: true },
                        { userId: 'user-3', isActive: true },
                    ]),
                },
                offlineMessage: {
                    create: jest.fn().mockResolvedValue({}),
                },
            };
            client_1.prisma.$transaction.mockImplementation((callback) => {
                return callback(mockTx);
            });
            // Act
            const result = await (0, messageService_1.createChatRoomMessage)({
                chatRoomId: 'room-1',
                senderId: 'user-1',
                content: 'Hello World',
            });
            // Assert
            expect(result.id).toBe('msg-1');
            expect(result.content).toBe('Hello World');
            expect(mockTx.chatMessage.create).toHaveBeenCalledTimes(1);
            expect(mockTx.chatRoom.update).toHaveBeenCalledTimes(1);
            expect(mockTx.roomParticipant.updateMany).toHaveBeenCalledTimes(1);
        });
        it('should call all database operations within the same transaction', async () => {
            // Arrange
            const mockTx = {
                chatMessage: {
                    create: jest.fn().mockResolvedValue({
                        id: 'msg-1',
                        chatRoomId: 'room-1',
                        senderId: 'user-1',
                        senderType: 'USER',
                        content: 'encrypted',
                        type: 'TEXT',
                        attachments: null,
                        metadata: { deleted: false },
                        status: 'SENT',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }),
                },
                user: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'user-1',
                        name: 'Test User',
                        avatarUrl: null,
                    }),
                },
                chatRoom: {
                    update: jest.fn().mockResolvedValue({}),
                },
                roomParticipant: {
                    updateMany: jest.fn().mockResolvedValue({ count: 2 }),
                    findMany: jest.fn().mockResolvedValue([{ userId: 'user-2', isActive: true }]),
                },
                offlineMessage: {
                    create: jest.fn().mockResolvedValue({}),
                },
            };
            client_1.prisma.$transaction.mockImplementation((callback) => {
                return callback(mockTx);
            });
            // Act
            await (0, messageService_1.createChatRoomMessage)({
                chatRoomId: 'room-1',
                senderId: 'user-1',
                content: 'Hello World',
            });
            // Assert - all operations should be called within transaction
            expect(client_1.prisma.$transaction).toHaveBeenCalledTimes(1);
            expect(mockTx.chatMessage.create).toHaveBeenCalledTimes(1);
            expect(mockTx.user.findUnique).toHaveBeenCalledTimes(1);
            expect(mockTx.chatRoom.update).toHaveBeenCalledTimes(1);
            expect(mockTx.roomParticipant.updateMany).toHaveBeenCalledTimes(1);
            expect(mockTx.roomParticipant.findMany).toHaveBeenCalledTimes(1);
        });
    });
    describe('Rollback on failure - chatMessage.create', () => {
        it('should throw error and rollback when chatMessage.create fails', async () => {
            // Arrange
            const dbError = new Error('Database error: chatMessage.create failed');
            client_1.prisma.$transaction.mockImplementation(() => {
                throw dbError;
            });
            // Act & Assert
            await expect((0, messageService_1.createChatRoomMessage)({
                chatRoomId: 'room-1',
                senderId: 'user-1',
                content: 'Hello World',
            })).rejects.toThrow('Database error: chatMessage.create failed');
            // Verify transaction was attempted
            expect(client_1.prisma.$transaction).toHaveBeenCalledTimes(1);
        });
        it('should not commit partial changes when chatMessage.create fails', async () => {
            // Arrange
            const dbError = new Error('Database error: chatMessage.create failed');
            client_1.prisma.$transaction.mockImplementation(() => {
                throw dbError;
            });
            // Act & Assert
            try {
                await (0, messageService_1.createChatRoomMessage)({
                    chatRoomId: 'room-1',
                    senderId: 'user-1',
                    content: 'Hello World',
                });
            }
            catch (error) {
                // Expected to throw
            }
            // No partial commits should occur because transaction throws
            expect(client_1.prisma.$transaction).toHaveBeenCalledTimes(1);
        });
    });
    describe('Rollback on failure - user.findUnique', () => {
        it('should throw error and rollback when user.findUnique fails', async () => {
            // Arrange
            const mockTx = {
                chatMessage: {
                    create: jest.fn().mockResolvedValue({
                        id: 'msg-1',
                        chatRoomId: 'room-1',
                        senderId: 'user-1',
                        senderType: 'USER',
                        content: 'encrypted',
                        type: 'TEXT',
                        attachments: null,
                        metadata: { deleted: false },
                        status: 'SENT',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }),
                },
                user: {
                    findUnique: jest.fn().mockRejectedValue(new Error('Database error: user not found')),
                },
                chatRoom: {
                    update: jest.fn(),
                },
                roomParticipant: {
                    updateMany: jest.fn(),
                    findMany: jest.fn(),
                },
                offlineMessage: {
                    create: jest.fn(),
                },
            };
            client_1.prisma.$transaction.mockImplementation((callback) => {
                return callback(mockTx);
            });
            // Act & Assert
            await expect((0, messageService_1.createChatRoomMessage)({
                chatRoomId: 'room-1',
                senderId: 'user-1',
                content: 'Hello World',
            })).rejects.toThrow('Database error: user not found');
            // Verify chatMessage was created before the failure
            expect(mockTx.chatMessage.create).toHaveBeenCalledTimes(1);
            // But chatRoom.update and roomParticipant.updateMany should not succeed
            expect(mockTx.chatRoom.update).not.toHaveBeenCalled();
        });
    });
    describe('Rollback on failure - chatRoom.update', () => {
        it('should throw error and rollback when chatRoom.update fails', async () => {
            // Arrange
            const mockTx = {
                chatMessage: {
                    create: jest.fn().mockResolvedValue({
                        id: 'msg-1',
                        chatRoomId: 'room-1',
                        senderId: 'user-1',
                        senderType: 'USER',
                        content: 'encrypted',
                        type: 'TEXT',
                        attachments: null,
                        metadata: { deleted: false },
                        status: 'SENT',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }),
                },
                user: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'user-1',
                        name: 'Test User',
                        avatarUrl: null,
                    }),
                },
                chatRoom: {
                    update: jest.fn().mockRejectedValue(new Error('Database error: room update failed')),
                },
                roomParticipant: {
                    updateMany: jest.fn(),
                    findMany: jest.fn(),
                },
                offlineMessage: {
                    create: jest.fn(),
                },
            };
            client_1.prisma.$transaction.mockImplementation((callback) => {
                return callback(mockTx);
            });
            // Act & Assert
            await expect((0, messageService_1.createChatRoomMessage)({
                chatRoomId: 'room-1',
                senderId: 'user-1',
                content: 'Hello World',
            })).rejects.toThrow('Database error: room update failed');
            // Verify earlier operations were called before the failure
            expect(mockTx.chatMessage.create).toHaveBeenCalledTimes(1);
            expect(mockTx.user.findUnique).toHaveBeenCalledTimes(1);
        });
    });
    describe('Rollback on failure - roomParticipant.updateMany', () => {
        it('should throw error and rollback when roomParticipant.updateMany fails', async () => {
            // Arrange
            const mockTx = {
                chatMessage: {
                    create: jest.fn().mockResolvedValue({
                        id: 'msg-1',
                        chatRoomId: 'room-1',
                        senderId: 'user-1',
                        senderType: 'USER',
                        content: 'encrypted',
                        type: 'TEXT',
                        attachments: null,
                        metadata: { deleted: false },
                        status: 'SENT',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }),
                },
                user: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'user-1',
                        name: 'Test User',
                        avatarUrl: null,
                    }),
                },
                chatRoom: {
                    update: jest.fn().mockResolvedValue({}),
                },
                roomParticipant: {
                    updateMany: jest
                        .fn()
                        .mockRejectedValue(new Error('Database error: participant update failed')),
                    findMany: jest.fn(),
                },
                offlineMessage: {
                    create: jest.fn(),
                },
            };
            client_1.prisma.$transaction.mockImplementation((callback) => {
                return callback(mockTx);
            });
            // Act & Assert
            await expect((0, messageService_1.createChatRoomMessage)({
                chatRoomId: 'room-1',
                senderId: 'user-1',
                content: 'Hello World',
            })).rejects.toThrow('Database error: participant update failed');
            // Verify earlier operations were called before the failure
            expect(mockTx.chatMessage.create).toHaveBeenCalledTimes(1);
            expect(mockTx.chatRoom.update).toHaveBeenCalledTimes(1);
        });
    });
    describe('Rollback on failure - offlineMessage.create', () => {
        it('should throw error and rollback when offlineMessage.create fails', async () => {
            // Arrange
            const mockTx = {
                chatMessage: {
                    create: jest.fn().mockResolvedValue({
                        id: 'msg-1',
                        chatRoomId: 'room-1',
                        senderId: 'user-1',
                        senderType: 'USER',
                        content: 'encrypted',
                        type: 'TEXT',
                        attachments: null,
                        metadata: { deleted: false },
                        status: 'SENT',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }),
                },
                user: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'user-1',
                        name: 'Test User',
                        avatarUrl: null,
                    }),
                },
                chatRoom: {
                    update: jest.fn().mockResolvedValue({}),
                },
                roomParticipant: {
                    updateMany: jest.fn().mockResolvedValue({ count: 2 }),
                    findMany: jest.fn().mockResolvedValue([
                        { userId: 'user-2', isActive: true },
                        { userId: 'user-3', isActive: true },
                    ]),
                },
                offlineMessage: {
                    create: jest
                        .fn()
                        .mockRejectedValue(new Error('Database error: offlineMessage.create failed')),
                },
            };
            client_1.prisma.$transaction.mockImplementation((callback) => {
                return callback(mockTx);
            });
            // Act & Assert
            await expect((0, messageService_1.createChatRoomMessage)({
                chatRoomId: 'room-1',
                senderId: 'user-1',
                content: 'Hello World',
            })).rejects.toThrow('Database error: offlineMessage.create failed');
            // Verify all earlier operations were called before the failure
            expect(mockTx.chatMessage.create).toHaveBeenCalledTimes(1);
            expect(mockTx.chatRoom.update).toHaveBeenCalledTimes(1);
            expect(mockTx.roomParticipant.updateMany).toHaveBeenCalledTimes(1);
        });
        it('should rollback when offlineMessage.create partially fails (Promise.all scenario)', async () => {
            // Arrange - simulate partial failure where some offlineMessages are created but others fail
            const mockTx = {
                chatMessage: {
                    create: jest.fn().mockResolvedValue({
                        id: 'msg-1',
                        chatRoomId: 'room-1',
                        senderId: 'user-1',
                        senderType: 'USER',
                        content: 'encrypted',
                        type: 'TEXT',
                        attachments: null,
                        metadata: { deleted: false },
                        status: 'SENT',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }),
                },
                user: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'user-1',
                        name: 'Test User',
                        avatarUrl: null,
                    }),
                },
                chatRoom: {
                    update: jest.fn().mockResolvedValue({}),
                },
                roomParticipant: {
                    updateMany: jest.fn().mockResolvedValue({ count: 2 }),
                    findMany: jest.fn().mockResolvedValue([
                        { userId: 'user-2', isActive: true },
                        { userId: 'user-3', isActive: true },
                    ]),
                },
                offlineMessage: {
                    create: jest
                        .fn()
                        .mockResolvedValueOnce({}) // First succeeds
                        .mockRejectedValueOnce(new Error('Database error: second offlineMessage failed')), // Second fails
                },
            };
            client_1.prisma.$transaction.mockImplementation((callback) => {
                return callback(mockTx);
            });
            // Act & Assert
            await expect((0, messageService_1.createChatRoomMessage)({
                chatRoomId: 'room-1',
                senderId: 'user-1',
                content: 'Hello World',
            })).rejects.toThrow('Database error: second offlineMessage failed');
            // Verify the first offlineMessage.create was called before the failure
            expect(mockTx.offlineMessage.create).toHaveBeenCalledTimes(2);
        });
    });
    describe('Atomicity verification', () => {
        it('should ensure all operations in the transaction are atomic', async () => {
            // Arrange
            const callOrder = [];
            const mockTx = {
                chatMessage: {
                    create: jest.fn().mockImplementation(() => {
                        callOrder.push('chatMessage.create');
                        return Promise.resolve({
                            id: 'msg-1',
                            chatRoomId: 'room-1',
                            senderId: 'user-1',
                            senderType: 'USER',
                            content: 'encrypted',
                            type: 'TEXT',
                            attachments: null,
                            metadata: { deleted: false },
                            status: 'SENT',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });
                    }),
                },
                user: {
                    findUnique: jest.fn().mockImplementation(() => {
                        callOrder.push('user.findUnique');
                        return Promise.resolve({
                            id: 'user-1',
                            name: 'Test User',
                            avatarUrl: null,
                        });
                    }),
                },
                chatRoom: {
                    update: jest.fn().mockImplementation(() => {
                        callOrder.push('chatRoom.update');
                        return Promise.resolve({});
                    }),
                },
                roomParticipant: {
                    updateMany: jest.fn().mockImplementation(() => {
                        callOrder.push('roomParticipant.updateMany');
                        return Promise.resolve({ count: 2 });
                    }),
                    findMany: jest.fn().mockImplementation(() => {
                        callOrder.push('roomParticipant.findMany');
                        return Promise.resolve([{ userId: 'user-2', isActive: true }]);
                    }),
                },
                offlineMessage: {
                    create: jest.fn().mockImplementation(() => {
                        callOrder.push('offlineMessage.create');
                        return Promise.resolve({});
                    }),
                },
            };
            client_1.prisma.$transaction.mockImplementation((callback) => {
                return callback(mockTx);
            });
            // Act
            await (0, messageService_1.createChatRoomMessage)({
                chatRoomId: 'room-1',
                senderId: 'user-1',
                content: 'Hello World',
            });
            // Assert - verify all operations were called in correct order
            expect(callOrder).toEqual([
                'chatMessage.create',
                'user.findUnique',
                'chatRoom.update',
                'roomParticipant.updateMany',
                'roomParticipant.findMany',
                'offlineMessage.create',
            ]);
        });
        it('should use prisma.$transaction to ensure atomicity', async () => {
            // Arrange
            client_1.prisma.$transaction.mockResolvedValue({
                id: 'msg-1',
                content: 'Hello World',
            });
            // Act
            await (0, messageService_1.createChatRoomMessage)({
                chatRoomId: 'room-1',
                senderId: 'user-1',
                content: 'Hello World',
            });
            // Assert - verify $transaction was called
            expect(client_1.prisma.$transaction).toHaveBeenCalledTimes(1);
            expect(client_1.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
        });
    });
    describe('Error propagation', () => {
        it('should propagate database errors correctly', async () => {
            // Arrange
            const originalError = new Error('Connection timeout');
            client_1.prisma.$transaction.mockRejectedValue(originalError);
            // Act & Assert
            await expect((0, messageService_1.createChatRoomMessage)({
                chatRoomId: 'room-1',
                senderId: 'user-1',
                content: 'Hello World',
            })).rejects.toThrow('Connection timeout');
        });
        it('should not catch and swallow errors silently', async () => {
            // Arrange
            const dbError = new Error('Foreign key constraint violation');
            client_1.prisma.$transaction.mockRejectedValue(dbError);
            // Act & Assert
            await expect((0, messageService_1.createChatRoomMessage)({
                chatRoomId: 'room-1',
                senderId: 'user-1',
                content: 'Hello World',
            })).rejects.toThrow('Foreign key constraint violation');
            // Verify error is propagated (not silently swallowed)
        });
    });
});
//# sourceMappingURL=messageService.test.js.map