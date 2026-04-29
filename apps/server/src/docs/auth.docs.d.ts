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
/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: ['Auth']
 *     summary: Register a new user
 *     description: Register a new user account with email or phone and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             email: user@example.com
 *             password: SecurePass123!
 *             name: John Doe
 *     responses:
 *       '201':
 *         description: User registered successfully
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
 *       '409':
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: ['Auth']
 *     summary: Login with email or phone
 *     description: Authenticate user with email/phone and password, returns access and refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: user@example.com
 *             password: SecurePass123!
 *             deviceInfo: Chrome on Windows
 *     responses:
 *       '200':
 *         description: Login successful
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       $ref: '#/components/schemas/Tokens'
 *       '401':
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '429':
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     tags: ['Auth']
 *     summary: Refresh access token
 *     description: Exchange a valid refresh token for a new access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *           example:
 *             refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       '200':
 *         description: Token refreshed successfully
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
 *                     tokens:
 *                       $ref: '#/components/schemas/Tokens'
 *       '401':
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: ['Auth']
 *     summary: Logout
 *     description: Logout current user by blacklisting the access token and optionally the refresh token
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token to revoke
 *     responses:
 *       '200':
 *         description: Logged out successfully
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
 *                   example: Logged out successfully
 *       '401':
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/auth/logout-all:
 *   post:
 *     tags: ['Auth']
 *     summary: Logout from all devices
 *     description: Logout and revoke all refresh tokens for the current user across all devices
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Logged out from all devices
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
 *                   example: Logged out from all devices
 *                 revokedTokens:
 *                   type: integer
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: ['Auth']
 *     summary: Request password reset
 *     description: Request a password reset by providing email or phone (always returns success to prevent enumeration)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetRequest'
 *           example:
 *             email: user@example.com
 *     responses:
 *       '200':
 *         description: Password reset instructions sent
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
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '429':
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: ['Auth']
 *     summary: Reset password with token
 *     description: Reset user password using the token received via email or SMS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetConfirm'
 *           example:
 *             resetToken: abc123def456
 *             newPassword: NewSecurePass123!
 *     responses:
 *       '200':
 *         description: Password reset successful
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
 *       '400':
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags: ['Auth']
 *     summary: Get current user info
 *     description: Retrieve the currently authenticated user's profile information
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
 */
/**
 * @openapi
 * /api/v1/auth/oauth/{provider}:
 *   get:
 *     tags: ['Auth']
 *     summary: Initiate OAuth login
 *     description: Get the OAuth authorization URL for the specified provider (wechat, google)
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/OAuthProviders'
 *         description: OAuth provider (wechat, google)
 *       - name: state
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: OAuth state parameter for CSRF protection and redirect URL
 *     responses:
 *       '200':
 *         description: OAuth authorization URL
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
 *                     authUrl:
 *                       type: string
 *                       format: uri
 *       '400':
 *         description: Unsupported provider
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/auth/oauth/{provider}/callback:
 *   get:
 *     tags: ['Auth']
 *     summary: OAuth callback
 *     description: Handle OAuth callback from the provider, exchange code for tokens, and optionally redirect with token
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/OAuthProviders'
 *         description: OAuth provider (wechat, google)
 *       - name: code
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from OAuth provider
 *       - name: state
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: State parameter for redirect URL (when provided, response redirects to this URL with token)
 *       - name: error
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: OAuth error code if authorization failed
 *     responses:
 *       '200':
 *         description: OAuth callback processed successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       $ref: '#/components/schemas/Tokens'
 *       '302':
 *         description: Redirect to state URL with token (when state parameter is provided)
 *       '400':
 *         description: OAuth authorization failed or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @openapi
 * /api/v1/auth/oauth/{provider}/bind:
 *   post:
 *     tags: ['Auth']
 *     summary: Bind OAuth provider
 *     description: Bind an OAuth provider account to the current authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/OAuthProviders'
 *         description: OAuth provider (wechat, google)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: OAuth authorization code
 *           example:
 *             code: AUTHORIZATION_CODE_FROM_PROVIDER
 *     responses:
 *       '200':
 *         description: OAuth account bound successfully
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
 *       '400':
 *         description: Invalid code or binding failed
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
 * /api/v1/auth/oauth/{provider}:
 *   delete:
 *     tags: ['Auth']
 *     summary: Unbind OAuth provider
 *     description: Remove OAuth provider binding from the current authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/OAuthProviders'
 *         description: OAuth provider (wechat, google)
 *     responses:
 *       '200':
 *         description: OAuth account unbound successfully
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
 *       '400':
 *         description: Unbind failed (e.g., no account bound)
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
 * /api/v1/auth/oauth/connections:
 *   get:
 *     tags: ['Auth']
 *     summary: List OAuth connections
 *     description: Get all OAuth providers bound to the current authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of OAuth connections
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
 *                     type: object
 *                     properties:
 *                       provider:
 *                         type: string
 *                         enum: [wechat, google]
 *                       boundAt:
 *                         type: string
 *                         format: date-time
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
//# sourceMappingURL=auth.docs.d.ts.map