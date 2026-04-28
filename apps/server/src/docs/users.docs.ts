/**
 * User API Documentation
 * OpenAPI 3.0 schema definitions for user management
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: User unique identifier
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         name:
 *           type: string
 *           description: User display name
 *         displayName:
 *           type: string
 *           description: User display name (alias)
 *         bio:
 *           type: string
 *           description: User biography
 *         website:
 *           type: string
 *           format: uri
 *           description: Personal website URL
 *         location:
 *           type: string
 *           description: User location
 *         phone:
 *           type: string
 *           description: Phone number
 *         phoneVerified:
 *           type: boolean
 *           description: Whether phone number is verified
 *         emailVerified:
 *           type: boolean
 *           description: Whether email is verified
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           description: Avatar image URL
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED, DELETED]
 *           description: Account status
 *         role:
 *           type: string
 *           enum: [USER, ADMIN, MODERATOR]
 *           description: User role
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: User unique identifier
 *         name:
 *           type: string
 *           description: User display name
 *         displayName:
 *           type: string
 *           description: User display name (alias)
 *         bio:
 *           type: string
 *           description: User biography
 *         website:
 *           type: string
 *           format: uri
 *           description: Personal website URL
 *         location:
 *           type: string
 *           description: User location
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           description: Avatar image URL
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
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
 *     PrivacySettings:
 *       type: object
 *       properties:
 *         profileVisibility:
 *           type: string
 *           enum: [PUBLIC, FRIENDS_ONLY, PRIVATE]
 *           description: Who can view the profile
 *         showEmail:
 *           type: boolean
 *           description: Whether email is visible to others
 *         showPhone:
 *           type: boolean
 *           description: Whether phone is visible to others
 *         showLocation:
 *           type: boolean
 *           description: Whether location is visible to others
 *         allowMessages:
 *           type: string
 *           enum: [EVERYONE, FRIENDS_ONLY, NONE]
 *           description: Who can send messages
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           description: Current password
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           description: New password (min 8 chars)
 *     BlockUserRequest:
 *       type: object
 *       required:
 *         - userId
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID of user to block
 *         reason:
 *           type: string
 *           description: Reason for blocking (optional)
 *     UnblockUserRequest:
 *       type: object
 *       required:
 *         - userId
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID of user to unblock
 *     UpdateEmailRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: New email address
 *     UpdatePhoneRequest:
 *       type: object
 *       required:
 *         - phone
 *       properties:
 *         phone:
 *           type: string
 *           description: New phone number
 *     DeleteAccountRequest:
 *       type: object
 *       required:
 *         - password
 *       properties:
 *         password:
 *           type: string
 *           description: Current password for confirmation
 *     Device:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Device unique identifier
 *         name:
 *           type: string
 *           description: Device name
 *         type:
 *           type: string
 *           description: Device type (e.g., Chrome on Windows)
 *         lastActiveAt:
 *           type: string
 *           format: date-time
 *           description: Last active timestamp
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Device registration timestamp
 *     BlockedUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Blocked user ID
 *         name:
 *           type: string
 *           description: Blocked user name
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           description: Blocked user avatar
 *         reason:
 *           type: string
 *           description: Reason for blocking
 *         blockedAt:
 *           type: string
 *           format: date-time
 *           description: When the user was blocked
 */

/**
 * @openapi
 * /api/v1/users/me:
 *   get:
 *     tags: ['Users']
 *     summary: Get current user profile
 *     description: Retrieve the profile of the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags: ['Users']
 *     summary: Update current user profile
 *     description: Update the profile information of the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *           example:
 *             name: John Doe
 *             displayName: johndoe
 *             bio: Software developer
 *             website: https://example.com
 *             location: San Francisco, CA
 *     responses:
 *       '200':
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
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
 *   delete:
 *     tags: ['Users']
 *     summary: Delete current user account
 *     description: Delete the currently authenticated user's account (requires password confirmation)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeleteAccountRequest'
 *           example:
 *             password: CurrentPassword123!
 *     responses:
 *       '200':
 *         description: Account deleted successfully
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
 *                   example: Account deleted successfully
 *       '400':
 *         description: Invalid password or validation error
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
 * /api/v1/users/avatar:
 *   post:
 *     tags: ['Users']
 *     summary: Upload user avatar
 *     description: Upload and set a new avatar image for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/AvatarUpload'
 *     responses:
 *       '200':
 *         description: Avatar uploaded successfully
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
 *                     avatarUrl:
 *                       type: string
 *                       format: uri
 *       '400':
 *         description: Invalid file or validation error
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
 * /api/v1/users/privacy:
 *   get:
 *     tags: ['Users']
 *     summary: Get privacy settings
 *     description: Retrieve the privacy settings for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Privacy settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PrivacySettings'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags: ['Users']
 *     summary: Update privacy settings
 *     description: Update the privacy settings for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PrivacySettings'
 *           example:
 *             profileVisibility: PUBLIC
 *             showEmail: false
 *             showPhone: true
 *             showLocation: true
 *             allowMessages: FRIENDS_ONLY
 *     responses:
 *       '200':
 *         description: Privacy settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PrivacySettings'
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
 * /api/v1/users/password:
 *   post:
 *     tags: ['Users']
 *     summary: Change password
 *     description: Change the password for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *           example:
 *             currentPassword: CurrentPassword123!
 *             newPassword: NewSecurePass123!
 *     responses:
 *       '200':
 *         description: Password changed successfully
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
 *                   example: Password changed successfully
 *       '400':
 *         description: Validation error or incorrect current password
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
 * /api/v1/users/phone:
 *   post:
 *     tags: ['Users']
 *     summary: Update phone number
 *     description: Update the phone number for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePhoneRequest'
 *           example:
 *             phone: '+1234567890'
 *     responses:
 *       '200':
 *         description: Phone number updated successfully
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
 *                   example: Phone number updated successfully
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
 * /api/v1/users/email:
 *   post:
 *     tags: ['Users']
 *     summary: Update email address
 *     description: Update the email address for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEmailRequest'
 *           example:
 *             email: newemail@example.com
 *     responses:
 *       '200':
 *         description: Email address updated successfully
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
 *                   example: Email address updated successfully
 *       '400':
 *         description: Validation error or email already in use
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
 * /api/v1/users/devices:
 *   get:
 *     tags: ['Users']
 *     summary: Get user devices
 *     description: Retrieve all devices registered for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of user devices
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
 *                     $ref: '#/components/schemas/Device'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: ['Users']
 *     summary: Remove all user devices
 *     description: Remove all devices registered for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: All devices removed successfully
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
 *                   example: All devices removed successfully
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /api/v1/users/devices/{deviceId}:
 *   delete:
 *     tags: ['Users']
 *     summary: Remove a device
 *     description: Remove a specific device for the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: deviceId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Device unique identifier
 *     responses:
 *       '200':
 *         description: Device removed successfully
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
 *                   example: Device removed successfully
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /api/v1/users/block:
 *   post:
 *     tags: ['Users']
 *     summary: Block a user
 *     description: Block another user from interacting with the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BlockUserRequest'
 *           example:
 *             userId: 550e8400-e29b-41d4-a716-446655440000
 *             reason: Spam behavior
 *     responses:
 *       '200':
 *         description: User blocked successfully
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
 *                   example: User blocked successfully
 *       '400':
 *         description: Validation error or cannot block self
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
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /api/v1/users/unblock:
 *   post:
 *     tags: ['Users']
 *     summary: Unblock a user
 *     description: Unblock a previously blocked user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnblockUserRequest'
 *           example:
 *             userId: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       '200':
 *         description: User unblocked successfully
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
 *                   example: User unblocked successfully
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
 *         description: User not found in blocked list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /api/v1/users/blocked:
 *   get:
 *     tags: ['Users']
 *     summary: Get blocked users list
 *     description: Retrieve all users blocked by the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of blocked users
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
 *                     $ref: '#/components/schemas/BlockedUser'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
