/**
 * Authentication API Documentation
 * OpenAPI 3.0 schema definitions
 *
 * This file documents auth endpoints using JSDoc annotations
 * for swagger-jsdoc to parse
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - password
 *         - name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email address (required if phone not provided)
 *         phone:
 *           type: string
 *           description: Phone number (required if email not provided)
 *         password:
 *           type: string
 *           minLength: 8
 *           description: Password (min 8 chars, must contain uppercase, lowercase, digit, special char)
 *         name:
 *           type: string
 *           minLength: 1
 *           description: Display name
 *         verificationCode:
 *           type: string
 *           description: Verification code for phone registration
 *     LoginRequest:
 *       type: object
 *       required:
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         password:
 *           type: string
 *         deviceInfo:
 *           type: string
 *           description: Device information for token tracking
 *     RefreshRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token
 *     PasswordResetRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *     PasswordResetConfirm:
 *       type: object
 *       required:
 *         - resetToken
 *         - newPassword
 *       properties:
 *         resetToken:
 *           type: string
 *           description: Password reset token from email/SMS
 *         newPassword:
 *           type: string
 *           minLength: 8
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - oldPassword
 *         - newPassword
 *       properties:
 *         oldPassword:
 *           type: string
 *         newPassword:
 *           type: string
 *           minLength: 8
 *     OAuthProviders:
 *       type: string
 *       enum: [wechat, google]
 */