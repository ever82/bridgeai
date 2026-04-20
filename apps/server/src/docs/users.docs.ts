/**
 * User API Documentation
 * OpenAPI 3.0 schema definitions for user management
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     UpdateUserRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Display name
 *         displayName:
 *           type: string
 *           description: Display name (alias)
 *         bio:
 *           type: string
 *           description: User bio
 *         website:
 *           type: string
 *           format: uri
 *           description: Personal website URL
 *         location:
 *           type: string
 *           description: User location
 *     AvatarUpload:
 *       type: object
 *       properties:
 *         file:
 *           type: string
 *           format: binary
 *           description: Avatar image file (max 5MB, jpg/png/gif/webp)
 */