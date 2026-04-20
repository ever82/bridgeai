/**
 * Chat API Documentation
 * OpenAPI 3.0 schema definitions for chat/messaging
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
 */