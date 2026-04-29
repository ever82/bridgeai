/**
 * Chat API Documentation
 * OpenAPI 3.0 schema definitions for chat/messaging
 *
 * This file documents chat endpoints using JSDoc annotations
 * for swagger-jsdoc to parse
 */
/**
 * @openapi
 * components:
 *   schemas:
 *     Conversation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         participants:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
 *         lastMessage:
 *           $ref: '#/components/schemas/Message'
 *         unreadCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         conversationId:
 *           type: string
 *           format: uuid
 *         role:
 *           type: string
 *           enum: [user, assistant, system, tool]
 *         content:
 *           type: string
 *         attachments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Attachment'
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Attachment:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [image, file, audio, video, code]
 *         url:
 *           type: string
 *           format: uri
 *         name:
 *           type: string
 *         size:
 *           type: integer
 *     SendMessageRequest:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 20000
 *         parentMessageId:
 *           type: string
 *           format: uuid
 *         attachments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Attachment'
 *           maxItems: 10
 *     CreateChatRoomRequest:
 *       type: object
 *       required:
 *         - participantIds
 *       properties:
 *         participantIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           minItems: 1
 *           description: List of user IDs to include in the chat room
 *         type:
 *           type: string
 *           enum: [direct, group]
 *           default: direct
 *           description: Type of chat room
 *     UpdateChatRoomRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Chat room display name (for group chats)
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           description: Chat room avatar URL
 *     AddParticipantRequest:
 *       type: object
 *       required:
 *         - participantId
 *       properties:
 *         participantId:
 *           type: string
 *           format: uuid
 *           description: User ID to add as a participant
 *     UpdateParticipantRequest:
 *       type: object
 *       properties:
 *         role:
 *           type: string
 *           enum: [admin, member]
 *           description: Updated role for the participant
 *     TransferOwnershipRequest:
 *       type: object
 *       required: []
 *       properties: {}
 *     AddReactionRequest:
 *       type: object
 *       required:
 *         - emoji
 *       properties:
 *         emoji:
 *           type: string
 *           description: Emoji reaction to add
 *     ChatRoom:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         type:
 *           type: string
 *           enum: [direct, group]
 *         avatarUrl:
 *           type: string
 *           format: uri
 *         participants:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               role:
 *                 type: string
 *                 enum: [owner, admin, member]
 *               joinedAt:
 *                 type: string
 *                 format: date-time
 *         lastMessage:
 *           $ref: '#/components/schemas/Message'
 *         unreadCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ChatRoomParticipant:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *         roomId:
 *           type: string
 *           format: uuid
 *         role:
 *           type: string
 *           enum: [owner, admin, member]
 *         joinedAt:
 *           type: string
 *           format: date-time
 */
/**
 * @openapi
 * /api/v1/chat/rooms:
 *   get:
 *     tags: ['Chat']
 *     summary: Get user's chat rooms
 *     description: Retrieve all chat rooms the authenticated user belongs to
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of chat rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChatRoom'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     tags: ['Chat']
 *     summary: Create a chat room
 *     description: Create a new chat room with specified participants
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChatRoomRequest'
 *           example:
 *             participantIds:
 *               - 550e8400-e29b-41d4-a716-446655440000
 *             type: direct
 *     responses:
 *       '201':
 *         description: Chat room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChatRoom'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/chat/rooms/search:
 *   get:
 *     tags: ['Chat']
 *     summary: Search chat rooms
 *     description: Search for chat rooms by name or participant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *     responses:
 *       '200':
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChatRoom'
 *       '400':
 *         description: Missing search query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/chat/rooms/{id}:
 *   get:
 *     tags: ['Chat']
 *     summary: Get chat room by ID
 *     description: Retrieve detailed information about a specific chat room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *     responses:
 *       '200':
 *         description: Chat room details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChatRoom'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Chat room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     tags: ['Chat']
 *     summary: Update chat room
 *     description: Update chat room properties such as name or avatar
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateChatRoomRequest'
 *           example:
 *             name: Project Discussion
 *             avatarUrl: https://example.com/avatar.png
 *     responses:
 *       '200':
 *         description: Chat room updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChatRoom'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Not authorized to update this room
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Chat room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: ['Chat']
 *     summary: Delete chat room
 *     description: Delete a chat room (owner only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *     responses:
 *       '200':
 *         description: Chat room deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Chat room deleted successfully
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Not authorized to delete this room
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Chat room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/chat/rooms/{id}/read:
 *   post:
 *     tags: ['Chat']
 *     summary: Mark room as read
 *     description: Mark all messages in a chat room as read for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *     responses:
 *       '200':
 *         description: Room marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Chat room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/chat/rooms/{id}/participants:
 *   get:
 *     tags: ['Chat']
 *     summary: Get room participants
 *     description: Retrieve all participants of a chat room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *     responses:
 *       '200':
 *         description: List of participants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChatRoomParticipant'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Chat room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     tags: ['Chat']
 *     summary: Add participant to room
 *     description: Add a new participant to an existing chat room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddParticipantRequest'
 *           example:
 *             participantId: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       '200':
 *         description: Participant added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChatRoomParticipant'
 *       '400':
 *         description: Validation error or user already in room
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Not authorized to add participants
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Chat room or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/chat/rooms/{id}/participants/{participantId}:
 *   patch:
 *     tags: ['Chat']
 *     summary: Update participant role
 *     description: Update a participant's role in the chat room (e.g., promote to admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *       - name: participantId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Participant user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateParticipantRequest'
 *           example:
 *             role: admin
 *     responses:
 *       '200':
 *         description: Participant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChatRoomParticipant'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Not authorized to update participant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Chat room or participant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: ['Chat']
 *     summary: Remove participant from room
 *     description: Remove a participant from a chat room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *       - name: participantId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Participant user ID
 *     responses:
 *       '200':
 *         description: Participant removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Participant removed successfully
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Not authorized to remove participant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Chat room or participant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/chat/rooms/{id}/participants/{participantId}/transfer:
 *   post:
 *     tags: ['Chat']
 *     summary: Transfer room ownership
 *     description: Transfer ownership of a chat room to another participant (owner only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *       - name: participantId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Participant to transfer ownership to
 *     responses:
 *       '200':
 *         description: Ownership transferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ChatRoom'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Only the owner can transfer ownership
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Chat room or participant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/chat/rooms/{roomId}/messages:
 *   get:
 *     tags: ['Chat']
 *     summary: Get chat room messages
 *     description: Retrieve paginated messages from a chat room with optional cursor-based pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: roomId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: Number of messages to return
 *       - name: before
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp
 *       - name: after
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages after this timestamp
 *       - name: cursor
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Pagination cursor from previous response
 *     responses:
 *       '200':
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 cursor:
 *                   type: string
 *                   description: Pagination cursor for next page
 *                 hasMore:
 *                   type: boolean
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Chat room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     tags: ['Chat']
 *     summary: Send a message
 *     description: Send a message to a chat room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: roomId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendMessageRequest'
 *           example:
 *             content: Hello, how are you?
 *             attachments:
 *               - type: image
 *                 url: https://example.com/photo.jpg
 *                 name: photo.jpg
 *                 size: 102400
 *     responses:
 *       '201':
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Chat room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/chat/rooms/{roomId}/messages/search:
 *   get:
 *     tags: ['Chat']
 *     summary: Search messages in a chat room
 *     description: Search for messages within a specific chat room by keyword
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: roomId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of results to return
 *     responses:
 *       '200':
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       '400':
 *         description: Missing search query
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Chat room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/chat/rooms/{roomId}/messages/sync:
 *   get:
 *     tags: ['Chat']
 *     summary: Sync messages
 *     description: Synchronize messages since a given timestamp for offline support
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: roomId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *       - name: lastMessageCreatedAt
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Timestamp of the last synced message
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 100
 *           minimum: 1
 *           maximum: 500
 *         description: Maximum number of messages to return
 *     responses:
 *       '200':
 *         description: Synced messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Message'
 *                     lastMessageCreatedAt:
 *                       type: string
 *                       format: date-time
 *                     hasMore:
 *                       type: boolean
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Chat room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/chat/rooms/{roomId}/messages/{messageId}:
 *   get:
 *     tags: ['Chat']
 *     summary: Get message by ID
 *     description: Retrieve a specific message from a chat room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: roomId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *       - name: messageId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       '200':
 *         description: Message details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Message or room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   patch:
 *     tags: ['Chat']
 *     summary: Update message
 *     description: Edit the content of an existing message (sender only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: roomId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *       - name: messageId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 20000
 *           example:
 *             content: Updated message content
 *     responses:
 *       '200':
 *         description: Message updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Not authorized to edit this message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Message or room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: ['Chat']
 *     summary: Delete message
 *     description: Delete a message from a chat room (sender or room admin/owner)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: roomId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *       - name: messageId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       '200':
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Message deleted successfully
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '403':
 *         description: Not authorized to delete this message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Message or room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/chat/rooms/{roomId}/messages/{messageId}/replies:
 *   get:
 *     tags: ['Chat']
 *     summary: Get message replies
 *     description: Retrieve all replies (thread) for a specific message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: roomId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *       - name: messageId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Parent message ID
 *     responses:
 *       '200':
 *         description: List of replies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Message or room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/chat/rooms/{id}/messages/{messageId}/reactions:
 *   post:
 *     tags: ['Chat']
 *     summary: Add reaction to message
 *     description: Add an emoji reaction to a specific message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *       - name: messageId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddReactionRequest'
 *          example:
 *             emoji: thumbsup
 *     responses:
 *       '200':
 *         description: Reaction added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     messageId:
 *                       type: string
 *                       format: uuid
 *                     emoji:
 *                       type: string
 *                     userId:
 *                       type: string
 *                       format: uuid
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Message or room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: ['Chat']
 *     summary: Remove reaction from message
 *     description: Remove an emoji reaction from a specific message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Chat room ID
 *       - name: messageId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *       - name: emoji
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Emoji to remove
 *     responses:
 *       '200':
 *         description: Reaction removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Message, room, or reaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
//# sourceMappingURL=chats.docs.js.map