/**
 * OpenAPI 3.0 Specification Generator
 * BridgeAI API v1 - Complete API Documentation
 */
import swaggerJsdoc from 'swagger-jsdoc';
import { openApiInfo, openApiServers, openApiComponents } from './swagger';
const options = {
    definition: {
        openapi: '3.0.3',
        info: openApiInfo,
        servers: openApiServers,
        externalDocs: {
            description: 'BridgeAI API Changelog',
            url: '/api/docs/changelog',
        },
        components: openApiComponents,
        tags: [
            { name: 'Auth', description: 'Authentication and authorization endpoints' },
            { name: 'Users', description: 'User profile management endpoints' },
            { name: 'Agents', description: 'AI Agent management endpoints' },
            { name: 'Health', description: 'Health check endpoints' },
            { name: 'Scenes', description: 'Scene configuration endpoints' },
            { name: 'Credit', description: 'Credit score endpoints' },
            { name: 'Offers', description: 'Offer and promotion endpoints' },
            { name: 'Merchants', description: 'Merchant management endpoints' },
            { name: 'Reviews', description: 'Review and rating endpoints' },
            { name: 'Jobs', description: 'Job posting and interview endpoints' },
            { name: 'AI', description: 'AI service endpoints' },
            { name: 'Upload', description: 'File upload endpoints' },
            { name: 'Notifications', description: 'Notification management endpoints' },
            { name: 'Location', description: 'Location lookup and geospatial endpoints' },
            { name: 'Chat', description: 'Real-time chat and messaging endpoints' },
            { name: 'Disclosure', description: 'Information disclosure control endpoints' },
            { name: 'Consumer', description: 'Consumer demand agent endpoints' },
            { name: 'Admin', description: 'Admin dashboard and security endpoints' },
        ],
        paths: {
            // =============================================================================
            // AUTH ENDPOINTS
            // =============================================================================
            '/api/v1/auth/register': {
                post: {
                    tags: ['Auth'],
                    summary: 'Register new user',
                    description: 'Create a new user account with email or phone',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['password', 'name'],
                                    properties: {
                                        email: {
                                            type: 'string',
                                            format: 'email',
                                            description: 'Email address (required if phone not provided)',
                                        },
                                        phone: {
                                            type: 'string',
                                            description: 'Phone number (required if email not provided)',
                                        },
                                        password: {
                                            type: 'string',
                                            minLength: 8,
                                            description: 'Password (min 8 chars, must contain uppercase, lowercase, digit, special char)',
                                        },
                                        name: { type: 'string', minLength: 1, description: 'Display name' },
                                        verificationCode: {
                                            type: 'string',
                                            description: 'Verification code for phone registration',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Registration successful',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    user: { $ref: '#/components/schemas/User' },
                                                    tokens: { $ref: '#/components/schemas/Tokens' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        400: {
                            description: 'Validation error',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                        },
                    },
                },
            },
            '/api/v1/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'User login',
                    description: 'Authenticate with email/phone and password, or OAuth provider',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['password'],
                                    properties: {
                                        email: { type: 'string', format: 'email', description: 'Email address' },
                                        phone: { type: 'string', description: 'Phone number' },
                                        password: { type: 'string', description: 'Password' },
                                        deviceInfo: {
                                            type: 'string',
                                            description: 'Device information for token tracking',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Login successful',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    user: { $ref: '#/components/schemas/User' },
                                                    tokens: { $ref: '#/components/schemas/Tokens' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        401: {
                            description: 'Invalid credentials',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                        },
                    },
                },
            },
            '/api/v1/auth/refresh': {
                post: {
                    tags: ['Auth'],
                    summary: 'Refresh access token',
                    description: 'Use refresh token to obtain a new access token',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['refreshToken'],
                                    properties: {
                                        refreshToken: { type: 'string', description: 'JWT refresh token' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Token refreshed',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    tokens: { $ref: '#/components/schemas/Tokens' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        401: {
                            description: 'Invalid or expired refresh token',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                        },
                    },
                },
            },
            '/api/v1/auth/logout': {
                post: {
                    tags: ['Auth'],
                    summary: 'Logout',
                    description: 'Logout and blacklist the current access token',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        refreshToken: {
                                            type: 'string',
                                            description: 'Optional: refresh token to revoke',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Logout successful',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } },
                            },
                        },
                    },
                },
            },
            '/api/v1/auth/logout-all': {
                post: {
                    tags: ['Auth'],
                    summary: 'Logout from all devices',
                    description: 'Invalidate all tokens for the current user',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Logged out from all devices',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } },
                            },
                        },
                    },
                },
            },
            '/api/v1/auth/forgot-password': {
                post: {
                    tags: ['Auth'],
                    summary: 'Request password reset',
                    description: 'Request a password reset email or SMS',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email'],
                                    properties: {
                                        email: { type: 'string', format: 'email' },
                                        phone: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Reset token sent',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } },
                            },
                        },
                    },
                },
            },
            '/api/v1/auth/reset-password': {
                post: {
                    tags: ['Auth'],
                    summary: 'Reset password',
                    description: 'Reset password using reset token',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['resetToken', 'newPassword'],
                                    properties: {
                                        resetToken: {
                                            type: 'string',
                                            description: 'Password reset token from email/SMS',
                                        },
                                        newPassword: { type: 'string', minLength: 8, description: 'New password' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Password reset successful',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } },
                            },
                        },
                        400: {
                            description: 'Invalid or expired token',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                        },
                    },
                },
            },
            '/api/v1/auth/change-password': {
                post: {
                    tags: ['Auth'],
                    summary: 'Change password',
                    description: 'Change password while logged in',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['oldPassword', 'newPassword'],
                                    properties: {
                                        oldPassword: { type: 'string', description: 'Current password' },
                                        newPassword: { type: 'string', minLength: 8, description: 'New password' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Password changed',
                            content: {
                                'application/json': { schema: { $ref: '#/components/schemas/ApiSuccess' } },
                            },
                        },
                    },
                },
            },
            '/api/v1/auth/me': {
                get: {
                    tags: ['Auth'],
                    summary: 'Get current user',
                    description: 'Retrieve the currently authenticated user profile',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'User profile',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
                        },
                        401: {
                            description: 'Unauthorized',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                        },
                    },
                },
            },
            // =============================================================================
            // USER ENDPOINTS
            // =============================================================================
            '/api/v1/users/me': {
                get: {
                    tags: ['Users'],
                    summary: 'Get current user profile',
                    description: 'Get the authenticated user profile',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'User profile',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/User' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                put: {
                    tags: ['Users'],
                    summary: 'Update current user profile',
                    description: 'Update the authenticated user profile fields',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string', description: 'Display name' },
                                        displayName: { type: 'string', description: 'Display name' },
                                        bio: { type: 'string', description: 'User bio' },
                                        website: { type: 'string', format: 'uri', description: 'Personal website URL' },
                                        location: { type: 'string', description: 'User location' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Profile updated',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/User' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/api/v1/users/me/avatar': {
                post: {
                    tags: ['Users'],
                    summary: 'Update user avatar',
                    description: 'Upload a new avatar image for the current user',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'multipart/form-data': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        file: {
                                            type: 'string',
                                            format: 'binary',
                                            description: 'Avatar image file (max 5MB, jpg/png/gif/webp)',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Avatar updated' },
                    },
                },
            },
            // =============================================================================
            // AGENT ENDPOINTS
            // =============================================================================
            '/api/v1/agents': {
                get: {
                    tags: ['Agents'],
                    summary: 'List agents',
                    description: 'Get all agents for the current user with optional filtering and pagination',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'type',
                            in: 'query',
                            schema: { type: 'string' },
                            description: 'Filter by agent type',
                        },
                        {
                            name: 'status',
                            in: 'query',
                            schema: { type: 'string' },
                            description: 'Filter by agent status',
                        },
                        {
                            name: 'page',
                            in: 'query',
                            schema: { type: 'integer', default: 1 },
                            description: 'Page number',
                        },
                        {
                            name: 'limit',
                            in: 'query',
                            schema: { type: 'integer', default: 20 },
                            description: 'Items per page',
                        },
                        {
                            name: 'sortBy',
                            in: 'query',
                            schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'name'] },
                            description: 'Sort field',
                        },
                        {
                            name: 'sortOrder',
                            in: 'query',
                            schema: { type: 'string', enum: ['asc', 'desc'] },
                            description: 'Sort direction',
                        },
                    ],
                    responses: {
                        200: {
                            description: 'Agent list with pagination',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    items: { type: 'array', items: { $ref: '#/components/schemas/Agent' } },
                                                    total: { type: 'integer' },
                                                    page: { type: 'integer' },
                                                    limit: { type: 'integer' },
                                                    hasMore: { type: 'boolean' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['Agents'],
                    summary: 'Create agent',
                    description: 'Create a new AI agent',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['type', 'name'],
                                    properties: {
                                        type: {
                                            type: 'string',
                                            enum: ['DATING', 'JOB', 'AD', 'VISION_SHARE'],
                                            description: 'Agent type/scene',
                                        },
                                        name: { type: 'string', description: 'Agent name' },
                                        description: { type: 'string', description: 'Agent description' },
                                        config: {
                                            type: 'object',
                                            description: 'Agent configuration (model, temperature, system prompt)',
                                        },
                                        latitude: { type: 'number', description: 'Location latitude' },
                                        longitude: { type: 'number', description: 'Location longitude' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Agent created',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/Agent' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/api/v1/agents/{id}': {
                get: {
                    tags: ['Agents'],
                    summary: 'Get agent by ID',
                    description: 'Retrieve a specific agent by its ID',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                            description: 'Agent ID',
                        },
                    ],
                    responses: {
                        200: { description: 'Agent details' },
                        404: {
                            description: 'Agent not found',
                            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                        },
                    },
                },
                put: {
                    tags: ['Agents'],
                    summary: 'Update agent',
                    description: 'Update an existing agent',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                            description: 'Agent ID',
                        },
                    ],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        description: { type: 'string' },
                                        config: { type: 'object' },
                                        latitude: { type: 'number' },
                                        longitude: { type: 'number' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Agent updated' },
                    },
                },
                delete: {
                    tags: ['Agents'],
                    summary: 'Delete agent',
                    description: 'Delete an agent',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                            description: 'Agent ID',
                        },
                    ],
                    responses: {
                        200: { description: 'Agent deleted' },
                    },
                },
            },
            '/api/v1/agents/{id}/status': {
                patch: {
                    tags: ['Agents'],
                    summary: 'Update agent status',
                    description: 'Update agent active/inactive status',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                            description: 'Agent ID',
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['status'],
                                    properties: {
                                        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Status updated' },
                    },
                },
            },
            '/api/v1/agents/{id}/history': {
                get: {
                    tags: ['Agents'],
                    summary: 'Get agent status history',
                    description: 'Get the status change history for an agent',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                            description: 'Agent ID',
                        },
                    ],
                    responses: {
                        200: { description: 'Status history' },
                    },
                },
            },
            '/api/v1/agents/filter': {
                post: {
                    tags: ['Agents'],
                    summary: 'Filter agents with DSL',
                    description: 'Query agents using the BridgeAI Filter DSL',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { type: 'object', description: 'FilterDSL query object' },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Filtered agents' },
                    },
                },
            },
            '/api/v1/agents/search': {
                get: {
                    tags: ['Agents'],
                    summary: 'Search agents',
                    description: 'Search agents with smart filtering and sorting',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'skills',
                            in: 'query',
                            schema: { type: 'string' },
                            description: 'Comma-separated skills',
                        },
                        {
                            name: 'minRating',
                            in: 'query',
                            schema: { type: 'number' },
                            description: 'Minimum rating',
                        },
                        {
                            name: 'maxHourlyRate',
                            in: 'query',
                            schema: { type: 'number' },
                            description: 'Maximum hourly rate',
                        },
                        {
                            name: 'availability',
                            in: 'query',
                            schema: { type: 'boolean' },
                            description: 'Availability filter',
                        },
                        {
                            name: 'location',
                            in: 'query',
                            schema: { type: 'string' },
                            description: 'Location filter',
                        },
                        {
                            name: 'language',
                            in: 'query',
                            schema: { type: 'string' },
                            description: 'Comma-separated languages',
                        },
                        {
                            name: 'experienceYears',
                            in: 'query',
                            schema: { type: 'integer' },
                            description: 'Minimum experience years',
                        },
                        {
                            name: 'verified',
                            in: 'query',
                            schema: { type: 'boolean' },
                            description: 'Verified only',
                        },
                        {
                            name: 'sortBy',
                            in: 'query',
                            schema: {
                                type: 'string',
                                enum: [
                                    'relevance',
                                    'rating',
                                    'price',
                                    'experience',
                                    'activity',
                                    'credit',
                                    'composite',
                                ],
                            },
                        },
                        { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                    ],
                    responses: {
                        200: { description: 'Search results with pagination' },
                    },
                },
            },
            '/api/v1/agents/recommended': {
                get: {
                    tags: ['Agents'],
                    summary: 'Get agent recommendations',
                    description: 'Get personalized agent recommendations based on user preferences',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
                    ],
                    responses: {
                        200: { description: 'Personalized agent recommendations' },
                    },
                },
            },
            '/api/v1/agents/sort-options': {
                get: {
                    tags: ['Agents'],
                    summary: 'Get sort options',
                    description: 'Get available sorting strategies for agent search',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Available sorting options' },
                    },
                },
            },
            '/api/v1/agents/filter-suggestions': {
                get: {
                    tags: ['Agents'],
                    summary: 'Get filter suggestions',
                    description: 'Get popular filter preset suggestions',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Popular filter presets' },
                    },
                },
            },
            // =============================================================================
            // HEALTH ENDPOINTS
            // =============================================================================
            '/api/v1/health': {
                get: {
                    tags: ['Health'],
                    summary: 'Basic health check',
                    description: 'Returns basic server health status',
                    responses: {
                        200: {
                            description: 'Server is healthy',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    status: { type: 'string' },
                                                    timestamp: { type: 'string', format: 'date-time' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/api/v1/health/detailed': {
                get: {
                    tags: ['Health'],
                    summary: 'Detailed health check',
                    description: 'Returns detailed health status with system metrics',
                    responses: {
                        200: { description: 'Detailed health status' },
                    },
                },
            },
            // =============================================================================
            // SCENES ENDPOINTS
            // =============================================================================
            '/api/v1/scenes': {
                get: {
                    tags: ['Scenes'],
                    summary: 'List all scenes',
                    description: 'Get all available scenes (DATING, JOB, AD, VISION_SHARE)',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Scene list' },
                    },
                },
            },
            '/api/v1/scenes/active': {
                get: {
                    tags: ['Scenes'],
                    summary: 'List active scenes',
                    description: 'Get all active scenes',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Active scene list' },
                    },
                },
            },
            '/api/v1/scenes/{sceneId}': {
                get: {
                    tags: ['Scenes'],
                    summary: 'Get scene details',
                    description: 'Get details of a specific scene',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'sceneId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                            description: 'Scene identifier (DATING, JOB, AD, VISION_SHARE)',
                        },
                    ],
                    responses: {
                        200: { description: 'Scene details' },
                    },
                },
            },
            '/api/v1/scenes/{sceneId}/fields': {
                get: {
                    tags: ['Scenes'],
                    summary: 'Get scene fields',
                    description: 'Get field configuration for a scene',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'sceneId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: { description: 'Scene field configuration' },
                    },
                },
            },
            '/api/v1/scenes/{sceneId}/capabilities': {
                get: {
                    tags: ['Scenes'],
                    summary: 'Get scene capabilities',
                    description: 'Get AI capabilities for a scene',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'sceneId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: { description: 'Scene capabilities' },
                    },
                },
            },
            // =============================================================================
            // CREDIT ENDPOINTS
            // =============================================================================
            '/api/v1/credit/score': {
                get: {
                    tags: ['Credit'],
                    summary: 'Get credit score',
                    description: 'Get current user credit score',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Credit score response' },
                    },
                },
            },
            '/api/v1/credit/history': {
                get: {
                    tags: ['Credit'],
                    summary: 'Get credit history',
                    description: 'Get credit score change history',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Credit history' },
                    },
                },
            },
            '/api/v1/credit/factors': {
                get: {
                    tags: ['Credit'],
                    summary: 'Get credit factors',
                    description: 'Get credit score factor breakdown',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Credit factors' },
                    },
                },
            },
            '/api/v1/credit/level': {
                get: {
                    tags: ['Credit'],
                    summary: 'Get credit level',
                    description: 'Get credit level (EXCELLENT/GOOD/GENERAL/POOR)',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Credit level' },
                    },
                },
            },
            // =============================================================================
            // OFFERS ENDPOINTS
            // =============================================================================
            '/api/v1/offers': {
                get: {
                    tags: ['Offers'],
                    summary: 'List offers',
                    description: 'Get paginated list of offers',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Offer list' },
                    },
                },
                post: {
                    tags: ['Offers'],
                    summary: 'Create offer',
                    description: 'Create a new offer/promotion',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        title: { type: 'string' },
                                        description: { type: 'string' },
                                        type: {
                                            type: 'string',
                                            enum: [
                                                'DISCOUNT',
                                                'REDUCTION',
                                                'GIFT',
                                                'PACKAGE',
                                                'PERCENTAGE',
                                                'FIXED_AMOUNT',
                                            ],
                                        },
                                        status: {
                                            type: 'string',
                                            enum: [
                                                'DRAFT',
                                                'PENDING',
                                                'ACTIVE',
                                                'PAUSED',
                                                'EXPIRED',
                                                'SOLD_OUT',
                                                'DISABLED',
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Offer created' },
                    },
                },
            },
            '/api/v1/offers/{id}': {
                get: {
                    tags: ['Offers'],
                    summary: 'Get offer',
                    description: 'Get offer details by ID',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Offer details' },
                    },
                },
                put: {
                    tags: ['Offers'],
                    summary: 'Update offer',
                    description: 'Update an existing offer',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Offer updated' },
                    },
                },
                delete: {
                    tags: ['Offers'],
                    summary: 'Delete offer',
                    description: 'Delete an offer',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Offer deleted' },
                    },
                },
            },
            '/api/v1/offers/{id}/status': {
                patch: {
                    tags: ['Offers'],
                    summary: 'Update offer status',
                    description: 'Change offer status',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: {
                                            type: 'string',
                                            enum: [
                                                'DRAFT',
                                                'PENDING',
                                                'ACTIVE',
                                                'PAUSED',
                                                'EXPIRED',
                                                'SOLD_OUT',
                                                'DISABLED',
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Status updated' },
                    },
                },
            },
            // =============================================================================
            // MERCHANTS ENDPOINTS
            // =============================================================================
            '/api/v1/merchants': {
                get: {
                    tags: ['Merchants'],
                    summary: 'List merchants',
                    description: 'Get paginated list of merchants',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Merchant list' },
                    },
                },
                post: {
                    tags: ['Merchants'],
                    summary: 'Create merchant',
                    description: 'Create a new merchant',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        address: { type: 'string' },
                                        phone: { type: 'string' },
                                        description: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Merchant created' },
                    },
                },
            },
            '/api/v1/merchants/{id}': {
                get: {
                    tags: ['Merchants'],
                    summary: 'Get merchant',
                    description: 'Get merchant details by ID',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Merchant details' },
                    },
                },
                put: {
                    tags: ['Merchants'],
                    summary: 'Update merchant',
                    description: 'Update merchant information',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Merchant updated' },
                    },
                },
                delete: {
                    tags: ['Merchants'],
                    summary: 'Delete merchant',
                    description: 'Delete a merchant',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Merchant deleted' },
                    },
                },
            },
            // =============================================================================
            // REVIEWS ENDPOINTS
            // =============================================================================
            '/api/v1/reviews': {
                get: {
                    tags: ['Reviews'],
                    summary: 'List reviews',
                    description: 'Get reviews received or given by user',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'type',
                            in: 'query',
                            schema: { type: 'string', enum: ['received', 'given'] },
                            description: 'Review direction',
                        },
                    ],
                    responses: {
                        200: { description: 'Review list' },
                    },
                },
                post: {
                    tags: ['Reviews'],
                    summary: 'Create review',
                    description: 'Create a new review',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        targetId: { type: 'string', format: 'uuid' },
                                        rating: { type: 'integer', minimum: 1, maximum: 5 },
                                        comment: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Review created' },
                    },
                },
            },
            // =============================================================================
            // UPLOAD ENDPOINTS
            // =============================================================================
            '/api/v1/upload/avatar': {
                post: {
                    tags: ['Upload'],
                    summary: 'Upload avatar',
                    description: 'Upload user avatar image',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'multipart/form-data': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        file: { type: 'string', format: 'binary' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Avatar uploaded' },
                    },
                },
            },
            '/api/v1/upload/image': {
                post: {
                    tags: ['Upload'],
                    summary: 'Upload image',
                    description: 'Upload general image',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'multipart/form-data': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        file: { type: 'string', format: 'binary' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Image uploaded' },
                    },
                },
            },
            // =============================================================================
            // AI ENDPOINTS
            // =============================================================================
            '/api/v1/ai/models': {
                get: {
                    tags: ['AI'],
                    summary: 'List AI models',
                    description: 'Get available AI models',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Available AI models' },
                    },
                },
            },
            '/api/v1/ai/chat': {
                post: {
                    tags: ['AI'],
                    summary: 'Chat with AI',
                    description: 'Send a chat message to AI model',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        model: { type: 'string', description: 'AI model identifier' },
                                        messages: { type: 'array', items: { type: 'object' } },
                                        temperature: { type: 'number', minimum: 0, maximum: 2 },
                                        maxTokens: { type: 'integer' },
                                        stream: { type: 'boolean', default: false },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'AI response' },
                    },
                },
            },
            '/api/v1/ai/health': {
                get: {
                    tags: ['AI'],
                    summary: 'AI health check',
                    description: 'Check AI service health',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'AI service status' },
                    },
                },
            },
            '/api/v1/ai/metrics': {
                get: {
                    tags: ['AI'],
                    summary: 'Get AI metrics',
                    description: 'Get AI service usage metrics',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'AI metrics' },
                    },
                },
            },
            '/api/v1/ai/circuit-breakers': {
                get: {
                    tags: ['AI'],
                    summary: 'Get circuit breaker status',
                    description: 'Get status of all AI circuit breakers',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Circuit breaker states' },
                    },
                },
            },
            // =============================================================================
            // NOTIFICATIONS ENDPOINTS
            // =============================================================================
            '/api/v1/notifications': {
                get: {
                    tags: ['Notifications'],
                    summary: 'List notifications',
                    description: 'Get user notifications with pagination',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                    ],
                    responses: {
                        200: { description: 'Notification list' },
                    },
                },
            },
            '/api/v1/notifications/unread-count': {
                get: {
                    tags: ['Notifications'],
                    summary: 'Get unread count',
                    description: 'Get count of unread notifications',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Unread count' },
                    },
                },
            },
            // =============================================================================
            // JOBS ENDPOINTS
            // =============================================================================
            '/api/v1/jobs': {
                get: {
                    tags: ['Jobs'],
                    summary: 'List job postings',
                    description: 'Get paginated job postings list',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Job postings list' },
                    },
                },
                post: {
                    tags: ['Jobs'],
                    summary: 'Create job posting',
                    description: 'Create a new job posting',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { type: 'object' },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Job posting created' },
                    },
                },
            },
            '/api/v1/jobs/{id}': {
                get: {
                    tags: ['Jobs'],
                    summary: 'Get job posting',
                    description: 'Get job posting details by ID',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Job posting details' },
                    },
                },
            },
            '/api/v1/jobs/interviews': {
                get: {
                    tags: ['Jobs'],
                    summary: 'List interviews',
                    description: 'Get user interviews list',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Interview list' },
                    },
                },
            },
            // =============================================================================
            // LOCATION ENDPOINTS
            // =============================================================================
            '/api/v1/location/provinces': {
                get: {
                    tags: ['Location'],
                    summary: 'List all provinces',
                    description: 'Get all provinces in China',
                    responses: {
                        200: {
                            description: 'Province list',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Location' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/api/v1/location/cities/{provinceCode}': {
                get: {
                    tags: ['Location'],
                    summary: 'List cities by province',
                    description: 'Get all cities within a province',
                    parameters: [
                        {
                            name: 'provinceCode',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                            description: 'Province code',
                        },
                    ],
                    responses: {
                        200: { description: 'City list' },
                    },
                },
            },
            '/api/v1/location/districts/{cityCode}': {
                get: {
                    tags: ['Location'],
                    summary: 'List districts by city',
                    description: 'Get all districts within a city',
                    parameters: [
                        {
                            name: 'cityCode',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                            description: 'City code',
                        },
                    ],
                    responses: {
                        200: { description: 'District list' },
                    },
                },
            },
            '/api/v1/location/hierarchy': {
                get: {
                    tags: ['Location'],
                    summary: 'Get location hierarchy',
                    description: 'Get full province-city-district hierarchy tree',
                    responses: {
                        200: { description: 'Location hierarchy tree' },
                    },
                },
            },
            '/api/v1/location/search': {
                get: {
                    tags: ['Location'],
                    summary: 'Search locations',
                    description: 'Search locations by keyword',
                    parameters: [
                        {
                            name: 'keyword',
                            in: 'query',
                            required: true,
                            schema: { type: 'string' },
                            description: 'Search keyword',
                        },
                    ],
                    responses: {
                        200: { description: 'Search results' },
                    },
                },
            },
            '/api/v1/location/agents': {
                get: {
                    tags: ['Location'],
                    summary: 'Search agents by location',
                    description: 'Search and filter agents by location with privacy awareness',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'province', in: 'query', schema: { type: 'string' } },
                        { name: 'city', in: 'query', schema: { type: 'string' } },
                        { name: 'district', in: 'query', schema: { type: 'string' } },
                        { name: 'lat', in: 'query', schema: { type: 'number' } },
                        { name: 'lng', in: 'query', schema: { type: 'number' } },
                        {
                            name: 'radius',
                            in: 'query',
                            schema: { type: 'number' },
                            description: 'Radius in meters',
                        },
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                    ],
                    responses: {
                        200: { description: 'Agent list with location data' },
                    },
                },
            },
            '/api/v1/location/agents/nearby': {
                get: {
                    tags: ['Location'],
                    summary: 'Find nearby agents',
                    description: 'Find agents within a radius of given coordinates',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'lat', in: 'query', required: true, schema: { type: 'number' } },
                        { name: 'lng', in: 'query', required: true, schema: { type: 'number' } },
                        {
                            name: 'radius',
                            in: 'query',
                            schema: { type: 'number', default: 5000 },
                            description: 'Radius in meters',
                        },
                        { name: 'agentType', in: 'query', schema: { type: 'string' } },
                        { name: 'excludeAgentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Nearby agents' },
                    },
                },
            },
            // =============================================================================
            // NOTIFICATIONS ENDPOINTS
            // =============================================================================
            '/api/v1/notifications': {
                get: {
                    tags: ['Notifications'],
                    summary: 'List notifications',
                    description: 'Get user notifications with filtering and pagination',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'status',
                            in: 'query',
                            schema: { type: 'string', enum: ['read', 'unread', 'archived'] },
                        },
                        { name: 'type', in: 'query', schema: { type: 'string' } },
                        { name: 'category', in: 'query', schema: { type: 'string' } },
                        { name: 'priority', in: 'query', schema: { type: 'string' } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
                    ],
                    responses: {
                        200: {
                            description: 'Notification list',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    items: {
                                                        type: 'array',
                                                        items: { $ref: '#/components/schemas/Notification' },
                                                    },
                                                    total: { type: 'integer' },
                                                    unread: { type: 'integer' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/api/v1/notifications/unread-count': {
                get: {
                    tags: ['Notifications'],
                    summary: 'Get unread count',
                    description: 'Get count of unread notifications, optionally filtered by category',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }],
                    responses: {
                        200: {
                            description: 'Unread count',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    count: { type: 'integer' },
                                                    category: { type: 'string' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/api/v1/notifications/categories': {
                get: {
                    tags: ['Notifications'],
                    summary: 'Get notification categories',
                    description: 'Get available notification categories and counts',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Category list with counts' },
                    },
                },
            },
            '/api/v1/notifications/stats': {
                get: {
                    tags: ['Notifications'],
                    summary: 'Get notification statistics',
                    description: 'Get user notification statistics',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Notification statistics' },
                    },
                },
            },
            '/api/v1/notifications/latest': {
                get: {
                    tags: ['Notifications'],
                    summary: 'Get latest notifications',
                    description: 'Get the most recent notifications',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }],
                    responses: {
                        200: { description: 'Latest notifications' },
                    },
                },
            },
            '/api/v1/notifications/search': {
                get: {
                    tags: ['Notifications'],
                    summary: 'Search notifications',
                    description: 'Search notifications by keyword',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'keyword', in: 'query', required: true, schema: { type: 'string' } },
                    ],
                    responses: {
                        200: { description: 'Search results' },
                    },
                },
            },
            '/api/v1/notifications/{id}': {
                get: {
                    tags: ['Notifications'],
                    summary: 'Get notification detail',
                    description: 'Get a specific notification by ID',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Notification detail' },
                        404: { description: 'Not found' },
                    },
                },
                patch: {
                    tags: ['Notifications'],
                    summary: 'Update notification',
                    description: 'Update notification fields (archive, etc.)',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        archived: { type: 'boolean' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Updated' },
                    },
                },
                delete: {
                    tags: ['Notifications'],
                    summary: 'Delete notification',
                    description: 'Delete a notification',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Deleted' },
                    },
                },
            },
            '/api/v1/notifications/{id}/read': {
                post: {
                    tags: ['Notifications'],
                    summary: 'Mark as read',
                    description: 'Mark a notification as read',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Marked as read' },
                    },
                },
            },
            '/api/v1/notifications/read-all': {
                post: {
                    tags: ['Notifications'],
                    summary: 'Mark all as read',
                    description: 'Mark all notifications as read',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'All marked as read' },
                    },
                },
            },
            '/api/v1/notifications/batch-read': {
                post: {
                    tags: ['Notifications'],
                    summary: 'Batch mark as read',
                    description: 'Mark multiple notifications as read',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['ids'],
                                    properties: {
                                        ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Batch marked' },
                    },
                },
            },
            // =============================================================================
            // CREDIT ENDPOINTS (ENHANCED)
            // =============================================================================
            '/api/v1/credit/user/{userId}': {
                get: {
                    tags: ['Credit'],
                    summary: 'Query other user credit',
                    description: "Query another user's credit score (redacted for privacy)",
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'userId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                    ],
                    responses: {
                        200: { description: 'Redacted credit info' },
                    },
                },
            },
            // =============================================================================
            // AI ENDPOINTS (ENHANCED)
            // =============================================================================
            '/api/v1/ai/embeddings': {
                post: {
                    tags: ['AI'],
                    summary: 'Generate embeddings',
                    description: 'Generate text embeddings using configured LLM',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['input'],
                                    properties: {
                                        input: { type: 'string', description: 'Text to embed' },
                                        model: { type: 'string', description: 'Embedding model (optional)' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Embedding vector' },
                    },
                },
            },
            '/api/v1/ai/stats': {
                get: {
                    tags: ['AI'],
                    summary: 'Get AI statistics',
                    description: 'Get AI service usage statistics',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'AI statistics summary' },
                    },
                },
            },
            '/api/v1/ai/routing/strategy': {
                post: {
                    tags: ['AI'],
                    summary: 'Update routing strategy',
                    description: 'Update the LLM routing strategy',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        strategy: {
                                            type: 'string',
                                            enum: ['random', 'round-robin', 'least-loaded', 'weighted'],
                                        },
                                        weights: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Strategy updated' },
                    },
                },
            },
            // =============================================================================
            // AI EXTRACTION ENDPOINTS
            // =============================================================================
            '/api/v1/ai/extract/extract-demand': {
                post: {
                    tags: ['AI'],
                    summary: 'Extract demand from text',
                    description: 'Use AI to extract structured demand from natural language text',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['text'],
                                    properties: {
                                        text: { type: 'string', description: 'Natural language demand description' },
                                        scene: {
                                            type: 'string',
                                            description: 'Scene type (agentdate, agentjob, agentad, visionshare)',
                                        },
                                        options: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Extracted demand data' },
                    },
                },
            },
            '/api/v1/ai/extract/extract-demand/batch': {
                post: {
                    tags: ['AI'],
                    summary: 'Batch demand extraction',
                    description: 'Extract demands from multiple text inputs',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['texts'],
                                    properties: {
                                        texts: { type: 'array', items: { type: 'string' } },
                                        scene: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Batch extraction results' },
                    },
                },
            },
            '/api/v1/ai/extract/extract-demand/{id}/confirm': {
                post: {
                    tags: ['AI'],
                    summary: 'Confirm extraction result',
                    description: 'Confirm and save an AI extraction result',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        corrections: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Extraction confirmed' },
                    },
                },
            },
            '/api/v1/ai/extract/extract-demand/{id}/status': {
                get: {
                    tags: ['AI'],
                    summary: 'Get extraction status',
                    description: 'Get the status of a demand extraction job',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: { description: 'Extraction status' },
                    },
                },
            },
            '/api/v1/ai/extract/scenes/{scene}/config': {
                get: {
                    tags: ['AI'],
                    summary: 'Get scene extraction config',
                    description: 'Get AI extraction configuration for a specific scene',
                    parameters: [{ name: 'scene', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: { description: 'Scene extraction config' },
                    },
                },
            },
            // =============================================================================
            // AI OFFER EXTRACTION ENDPOINTS
            // =============================================================================
            '/api/v1/ai/extract/offers/extract': {
                post: {
                    tags: ['AI'],
                    summary: 'Extract offer from text',
                    description: 'Use AI to extract structured offer from natural language',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['text'],
                                    properties: {
                                        text: { type: 'string', description: 'Natural language offer description' },
                                        scene: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Extracted offer data' },
                    },
                },
            },
            '/api/v1/ai/extract/offers/preview': {
                post: {
                    tags: ['AI'],
                    summary: 'Preview offer extraction',
                    description: 'Preview AI offer extraction without saving',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        text: { type: 'string' },
                                        scene: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Extraction preview' },
                    },
                },
            },
            // =============================================================================
            // AI VISION ENDPOINTS
            // =============================================================================
            '/api/v1/ai/vision/analyze': {
                post: {
                    tags: ['AI'],
                    summary: 'Analyze image',
                    description: 'Analyze image content using AI vision model',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['imageUrl'],
                                    properties: {
                                        imageUrl: { type: 'string', format: 'uri' },
                                        options: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Image analysis result' },
                    },
                },
            },
            '/api/v1/ai/vision/analyze/batch': {
                post: {
                    tags: ['AI'],
                    summary: 'Batch analyze images',
                    description: 'Analyze multiple images in a batch',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['imageUrls'],
                                    properties: {
                                        imageUrls: { type: 'array', items: { type: 'string', format: 'uri' } },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Batch analysis results' },
                    },
                },
            },
            '/api/v1/ai/vision/moderate': {
                post: {
                    tags: ['AI'],
                    summary: 'Moderate image',
                    description: 'Check image content safety',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['imageUrl'],
                                    properties: {
                                        imageUrl: { type: 'string', format: 'uri' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Moderation result' },
                    },
                },
            },
            '/api/v1/ai/vision/ocr': {
                post: {
                    tags: ['AI'],
                    summary: 'OCR text extraction',
                    description: 'Extract text from images using OCR',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['imageUrl'],
                                    properties: {
                                        imageUrl: { type: 'string', format: 'uri' },
                                        language: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Extracted text' },
                    },
                },
            },
            '/api/v1/ai/vision/search': {
                post: {
                    tags: ['AI'],
                    summary: 'Image search by text',
                    description: 'Search images by text description',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        query: { type: 'string' },
                                        limit: { type: 'integer', default: 20 },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Search results' },
                    },
                },
            },
            '/api/v1/ai/vision/search/similar': {
                post: {
                    tags: ['AI'],
                    summary: 'Find similar images',
                    description: 'Find images similar to the given image',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['imageUrl'],
                                    properties: {
                                        imageUrl: { type: 'string', format: 'uri' },
                                        limit: { type: 'integer', default: 20 },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Similar images' },
                    },
                },
            },
            '/api/v1/ai/vision/index': {
                post: {
                    tags: ['AI'],
                    summary: 'Index image',
                    description: 'Add an image to the search index',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['imageUrl'],
                                    properties: {
                                        imageUrl: { type: 'string', format: 'uri' },
                                        metadata: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Image indexed' },
                    },
                },
            },
            '/api/v1/ai/vision/describe': {
                post: {
                    tags: ['AI'],
                    summary: 'Describe image',
                    description: 'Generate a text description of an image',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['imageUrl'],
                                    properties: {
                                        imageUrl: { type: 'string', format: 'uri' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Image description' },
                    },
                },
            },
            '/api/v1/ai/vision/health': {
                get: {
                    tags: ['AI'],
                    summary: 'Vision service health',
                    description: 'Check AI vision service health status',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Vision service status' },
                    },
                },
            },
            // =============================================================================
            // JOB ENDPOINTS (ENHANCED)
            // =============================================================================
            '/api/v1/jobs/my/jobs': {
                get: {
                    tags: ['Jobs'],
                    summary: 'Get my job postings',
                    description: 'Get all job postings created by the current user',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'status', in: 'query', schema: { type: 'string' } },
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                    ],
                    responses: {
                        200: { description: 'Job postings list' },
                    },
                },
            },
            '/api/v1/jobs/my/stats': {
                get: {
                    tags: ['Jobs'],
                    summary: 'Get my job statistics',
                    description: "Get statistics for the current user's job postings",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Job statistics' },
                    },
                },
            },
            '/api/v1/jobs/{id}/refresh': {
                post: {
                    tags: ['Jobs'],
                    summary: 'Refresh job',
                    description: 'Refresh a job posting to bump its position',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Job refreshed' },
                    },
                },
            },
            '/api/v1/jobs/{id}/stats': {
                get: {
                    tags: ['Jobs'],
                    summary: 'Get job statistics',
                    description: 'Get view/apply statistics for a job posting',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Job statistics' },
                    },
                },
            },
            '/api/v1/jobs/{id}/applications': {
                get: {
                    tags: ['Jobs'],
                    summary: 'Get job applications',
                    description: 'Get applications for a job posting',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                        { name: 'status', in: 'query', schema: { type: 'string' } },
                    ],
                    responses: {
                        200: { description: 'Application list' },
                    },
                },
            },
            '/api/v1/jobs/{id}/applications/{applicationId}': {
                patch: {
                    tags: ['Jobs'],
                    summary: 'Update application status',
                    description: 'Update the status of a job application',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                        {
                            name: 'applicationId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: {
                                            type: 'string',
                                            enum: [
                                                'PENDING',
                                                'REVIEWED',
                                                'SHORTLISTED',
                                                'REJECTED',
                                                'OFFERED',
                                                'ACCEPTED',
                                            ],
                                        },
                                        notes: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Application updated' },
                    },
                },
            },
            '/api/v1/jobs/{id}/evaluate': {
                get: {
                    tags: ['Jobs'],
                    summary: 'Evaluate job quality',
                    description: 'Evaluate job posting quality using AI',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Quality evaluation' },
                    },
                },
            },
            '/api/v1/jobs/extract': {
                post: {
                    tags: ['Jobs'],
                    summary: 'AI extract job posting',
                    description: 'Create a job posting from natural language using AI',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        text: { type: 'string', description: 'Natural language job description' },
                                        agentId: { type: 'string', format: 'uuid' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Job posting created' },
                    },
                },
            },
            // =============================================================================
            // INTERVIEW ENDPOINTS
            // =============================================================================
            '/api/v1/interviews': {
                get: {
                    tags: ['Jobs'],
                    summary: 'List interviews',
                    description: 'Get user interview list',
                    responses: {
                        200: { description: 'Interview list' },
                    },
                },
                post: {
                    tags: ['Jobs'],
                    summary: 'Create interview',
                    description: 'Create a new interview appointment',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { type: 'object' },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Interview created' },
                    },
                },
            },
            '/api/v1/interviews/{id}': {
                get: {
                    tags: ['Jobs'],
                    summary: 'Get interview',
                    description: 'Get interview details',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Interview details' },
                    },
                },
                put: {
                    tags: ['Jobs'],
                    summary: 'Update interview',
                    description: 'Update interview details',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        content: { 'application/json': { schema: { type: 'object' } } },
                    },
                    responses: {
                        200: { description: 'Updated' },
                    },
                },
            },
            '/api/v1/interviews/{id}/slots': {
                get: {
                    tags: ['Jobs'],
                    summary: 'Get available slots',
                    description: 'Get available interview time slots',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Available slots' },
                    },
                },
            },
            '/api/v1/interviews/{id}/schedule': {
                post: {
                    tags: ['Jobs'],
                    summary: 'Schedule interview',
                    description: 'Schedule an interview at a specific time',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        slotTime: { type: 'string', format: 'date-time' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Scheduled' },
                    },
                },
            },
            '/api/v1/interviews/{id}/cancel': {
                post: {
                    tags: ['Jobs'],
                    summary: 'Cancel interview',
                    description: 'Cancel an interview appointment',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        reason: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Cancelled' },
                    },
                },
            },
            '/api/v1/interviews/{id}/complete': {
                post: {
                    tags: ['Jobs'],
                    summary: 'Complete interview',
                    description: 'Mark an interview as completed',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Completed' },
                    },
                },
            },
            '/api/v1/interviews/{id}/feedback': {
                post: {
                    tags: ['Jobs'],
                    summary: 'Submit feedback',
                    description: 'Submit interview feedback',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        rating: { type: 'integer', minimum: 1, maximum: 5 },
                                        comment: { type: 'string' },
                                        recommendation: {
                                            type: 'string',
                                            enum: ['STRONG_YES', 'YES', 'NEUTRAL', 'NO', 'STRONG_NO'],
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Feedback submitted' },
                    },
                },
                get: {
                    tags: ['Jobs'],
                    summary: 'Get feedback',
                    description: 'Get interview feedback',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Feedback' },
                    },
                },
            },
            '/api/v1/interviews/{id}/aggregate-feedback': {
                get: {
                    tags: ['Jobs'],
                    summary: 'Get aggregated feedback',
                    description: 'Get aggregated interview feedback for a job',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Aggregated feedback' },
                    },
                },
            },
            // =============================================================================
            // CHAT ENDPOINTS
            // =============================================================================
            '/api/v1/chats/rooms': {
                get: {
                    tags: ['Chat'],
                    summary: 'List chat rooms',
                    description: 'Get user chat room list with pagination',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                    ],
                    responses: {
                        200: { description: 'Chat room list' },
                    },
                },
                post: {
                    tags: ['Chat'],
                    summary: 'Create chat room',
                    description: 'Create a new chat room (4-party group by default)',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        participantIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
                                        scene: { type: 'string' },
                                        metadata: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Room created' },
                    },
                },
            },
            '/api/v1/chats/rooms/search': {
                get: {
                    tags: ['Chat'],
                    summary: 'Search chat rooms',
                    description: 'Search chat rooms by name or participants',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'keyword', in: 'query', schema: { type: 'string' } }],
                    responses: {
                        200: { description: 'Search results' },
                    },
                },
            },
            '/api/v1/chats/rooms/{id}': {
                get: {
                    tags: ['Chat'],
                    summary: 'Get room detail',
                    description: 'Get chat room details',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Room detail' },
                    },
                },
                patch: {
                    tags: ['Chat'],
                    summary: 'Update room',
                    description: 'Update chat room metadata or settings',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        metadata: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Updated' },
                    },
                },
                delete: {
                    tags: ['Chat'],
                    summary: 'Close room',
                    description: 'Close/archive a chat room',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Room closed' },
                    },
                },
            },
            '/api/v1/chats/rooms/{id}/read': {
                post: {
                    tags: ['Chat'],
                    summary: 'Mark room as read',
                    description: 'Mark all messages in a room as read',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Marked as read' },
                    },
                },
            },
            '/api/v1/chats/rooms/{id}/participants': {
                get: {
                    tags: ['Chat'],
                    summary: 'Get participants',
                    description: 'Get all participants in a room',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    responses: {
                        200: { description: 'Participant list' },
                    },
                },
                post: {
                    tags: ['Chat'],
                    summary: 'Add participant',
                    description: 'Add a participant to the room',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        userId: { type: 'string', format: 'uuid' },
                                        role: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Participant added' },
                    },
                },
            },
            '/api/v1/chats/rooms/{id}/messages': {
                get: {
                    tags: ['Chat'],
                    summary: 'Get messages',
                    description: 'Get message history for a room with pagination',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                        { name: 'before', in: 'query', schema: { type: 'string', format: 'date-time' } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
                    ],
                    responses: {
                        200: { description: 'Message history' },
                    },
                },
            },
            '/api/v1/chats/rooms/{id}/sync': {
                get: {
                    tags: ['Chat'],
                    summary: 'Sync messages',
                    description: 'Incrementally sync messages since a timestamp',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                        {
                            name: 'since',
                            in: 'query',
                            required: true,
                            schema: { type: 'string', format: 'date-time' },
                        },
                    ],
                    responses: {
                        200: { description: 'New messages' },
                    },
                },
            },
            '/api/v1/chats/rooms/{id}/search': {
                get: {
                    tags: ['Chat'],
                    summary: 'Search messages',
                    description: 'Search messages within a room',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                        { name: 'keyword', in: 'query', required: true, schema: { type: 'string' } },
                    ],
                    responses: {
                        200: { description: 'Search results' },
                    },
                },
            },
            // =============================================================================
            // DISCLOSURE ENDPOINTS
            // =============================================================================
            '/api/v1/disclosure/levels/info': {
                get: {
                    tags: ['Disclosure'],
                    summary: 'Get disclosure levels info',
                    description: 'Get available disclosure levels and their descriptions (no auth required)',
                    responses: {
                        200: { description: 'Disclosure levels' },
                    },
                },
            },
            '/api/v1/disclosure/{agentId}/preview': {
                get: {
                    tags: ['Disclosure'],
                    summary: 'Preview disclosure for roles',
                    description: 'Preview what each viewer role would see for an agent',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'agentId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                    ],
                    responses: {
                        200: { description: 'Preview by role' },
                    },
                },
            },
            '/api/v1/disclosure/{agentId}/history': {
                get: {
                    tags: ['Disclosure'],
                    summary: 'Get disclosure history',
                    description: 'Get disclosure level change history',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'agentId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                    ],
                    responses: {
                        200: { description: 'Change history' },
                    },
                },
            },
            '/api/v1/disclosure/{agentId}/access-log': {
                get: {
                    tags: ['Disclosure'],
                    summary: 'Get access audit log',
                    description: 'Get access audit log for disclosure changes',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'agentId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
                    ],
                    responses: {
                        200: { description: 'Access log' },
                    },
                },
            },
            '/api/v1/disclosure/{agentId}/stats': {
                get: {
                    tags: ['Disclosure'],
                    summary: 'Get disclosure statistics',
                    description: 'Get statistics on disclosure settings for an agent',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'agentId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                    ],
                    responses: {
                        200: { description: 'Statistics' },
                    },
                },
            },
            // =============================================================================
            // CONSUMER AGENT ENDPOINTS
            // =============================================================================
            '/api/v1/consumer/agents/consumer/{agentId}/preview': {
                get: {
                    tags: ['Consumer'],
                    summary: 'Get demand profile preview',
                    description: 'Preview the complete consumer demand profile',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'agentId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                    ],
                    responses: {
                        200: { description: 'Demand preview' },
                    },
                },
            },
            '/api/v1/consumer/agents/consumer/{agentId}/publish': {
                post: {
                    tags: ['Consumer'],
                    summary: 'Publish demand',
                    description: 'Publish the consumer demand to make it visible to merchants',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'agentId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', format: 'uuid' },
                        },
                    ],
                    responses: {
                        200: { description: 'Published' },
                    },
                },
            },
            // =============================================================================
            // ADMIN ENDPOINTS
            // =============================================================================
            '/admin/security/stats': {
                get: {
                    tags: ['Admin'],
                    summary: 'Get security stats',
                    description: 'Security overview dashboard statistics',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Security stats' },
                    },
                },
            },
            '/admin/security/realtime': {
                get: {
                    tags: ['Admin'],
                    summary: 'Get real-time security data',
                    description: 'Real-time security monitoring data',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Real-time data' },
                    },
                },
            },
            '/admin/security/ddos': {
                get: {
                    tags: ['Admin'],
                    summary: 'Get DDoS stats',
                    description: 'DDoS protection statistics',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'DDoS stats' },
                    },
                },
            },
            '/admin/security/blocked-ips': {
                get: {
                    tags: ['Admin'],
                    summary: 'Get blocked IPs',
                    description: 'List of blocked IP addresses',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Blocked IPs list' },
                    },
                },
                post: {
                    tags: ['Admin'],
                    summary: 'Block IP',
                    description: 'Add an IP to the block list',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ip: { type: 'string' },
                                        reason: { type: 'string' },
                                        expiresAt: { type: 'string', format: 'date-time' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'IP blocked' },
                    },
                },
                delete: {
                    tags: ['Admin'],
                    summary: 'Unblock IP',
                    description: 'Remove an IP from the block list',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'ip', in: 'query', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: { description: 'IP unblocked' },
                    },
                },
            },
            '/admin/security/whitelist': {
                get: {
                    tags: ['Admin'],
                    summary: 'Get whitelisted IPs',
                    description: 'List of whitelisted IP addresses',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Whitelist' },
                    },
                },
                post: {
                    tags: ['Admin'],
                    summary: 'Add to whitelist',
                    description: 'Add an IP to the whitelist',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        ip: { type: 'string' },
                                        reason: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Added to whitelist' },
                    },
                },
            },
            '/admin/security/events': {
                get: {
                    tags: ['Admin'],
                    summary: 'Get security events',
                    description: 'List security events with filtering',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'status', in: 'query', schema: { type: 'string' } },
                        { name: 'type', in: 'query', schema: { type: 'string' } },
                    ],
                    responses: {
                        200: { description: 'Security events' },
                    },
                },
            },
            '/admin/security/events/{id}/resolve': {
                patch: {
                    tags: ['Admin'],
                    summary: 'Resolve security event',
                    description: 'Mark a security event as resolved',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
                    ],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        resolution: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Resolved' },
                    },
                },
            },
            // =============================================================================
            // OAUTH ENDPOINTS
            // =============================================================================
            '/api/v1/auth/oauth/{provider}': {
                get: {
                    tags: ['Auth'],
                    summary: 'Get OAuth authorization URL',
                    description: 'Get OAuth authorization URL for a provider (wechat, google, etc.)',
                    parameters: [
                        {
                            name: 'provider',
                            in: 'path',
                            required: true,
                            schema: { type: 'string', enum: ['wechat', 'google'] },
                        },
                    ],
                    responses: {
                        200: {
                            description: 'OAuth URL',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: { url: { type: 'string', format: 'uri' } },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                delete: {
                    tags: ['Auth'],
                    summary: 'Unbind OAuth account',
                    description: 'Unbind an OAuth account from the current user',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'provider', in: 'path', required: true, schema: { type: 'string' } },
                    ],
                    responses: {
                        200: { description: 'Account unbound' },
                    },
                },
            },
            '/api/v1/auth/oauth/{provider}/callback': {
                get: {
                    tags: ['Auth'],
                    summary: 'OAuth callback',
                    description: 'Handle OAuth callback from provider',
                    parameters: [
                        { name: 'provider', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'code', in: 'query', schema: { type: 'string' } },
                        { name: 'state', in: 'query', schema: { type: 'string' } },
                    ],
                    responses: {
                        200: { description: 'OAuth success' },
                    },
                },
            },
            '/api/v1/auth/oauth/{provider}/bind': {
                post: {
                    tags: ['Auth'],
                    summary: 'Bind OAuth account',
                    description: 'Bind an OAuth account to the current user',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'provider', in: 'path', required: true, schema: { type: 'string' } },
                    ],
                    responses: {
                        200: { description: 'Account bound' },
                    },
                },
            },
            '/api/v1/auth/oauth/connections': {
                get: {
                    tags: ['Auth'],
                    summary: 'Get OAuth connections',
                    description: 'Get all OAuth accounts connected to the current user',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'OAuth connections' },
                    },
                },
            },
            // =============================================================================
            // USER ENDPOINTS (EXTENDED)
            // =============================================================================
            '/api/v1/users/me': {
                delete: {
                    tags: ['Users'],
                    summary: 'Delete account',
                    description: 'Delete the current user account (soft delete)',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Account deleted' },
                    },
                },
            },
            '/api/v1/users/privacy': {
                get: {
                    tags: ['Users'],
                    summary: 'Get privacy settings',
                    description: 'Get current user privacy settings',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Privacy settings' },
                    },
                },
                put: {
                    tags: ['Users'],
                    summary: 'Update privacy settings',
                    description: 'Update user privacy settings',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        profileVisibility: { type: 'string' },
                                        showOnlineStatus: { type: 'boolean' },
                                        allowContactRequests: { type: 'boolean' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Updated' },
                    },
                },
            },
            '/api/v1/users/password': {
                post: {
                    tags: ['Users'],
                    summary: 'Change password',
                    description: 'Change user account password',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['oldPassword', 'newPassword'],
                                    properties: {
                                        oldPassword: { type: 'string' },
                                        newPassword: { type: 'string', minLength: 8 },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Password changed' },
                    },
                },
            },
            '/api/v1/users/devices': {
                get: {
                    tags: ['Users'],
                    summary: 'Get user devices',
                    description: 'Get all devices logged into this account',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Device list' },
                    },
                },
            },
            '/api/v1/users/devices/{deviceId}': {
                delete: {
                    tags: ['Users'],
                    summary: 'Remove device',
                    description: 'Remove a device from the account',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'deviceId', in: 'path', required: true, schema: { type: 'string' } },
                    ],
                    responses: {
                        200: { description: 'Device removed' },
                    },
                },
            },
            '/api/v1/users/block': {
                post: {
                    tags: ['Users'],
                    summary: 'Block a user',
                    description: 'Block another user from contacting you',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['userId'],
                                    properties: { userId: { type: 'string', format: 'uuid' } },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'User blocked' },
                    },
                },
            },
            '/api/v1/users/unblock': {
                post: {
                    tags: ['Users'],
                    summary: 'Unblock a user',
                    description: 'Unblock a previously blocked user',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['userId'],
                                    properties: { userId: { type: 'string', format: 'uuid' } },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'User unblocked' },
                    },
                },
            },
            '/api/v1/users/blocked': {
                get: {
                    tags: ['Users'],
                    summary: 'Get blocked users',
                    description: 'Get list of blocked users',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Blocked users list' },
                    },
                },
            },
        },
    },
};
export const serveOpenApiSpec = swaggerJsdoc({ ...options, apis: ['./src/docs/*.docs.ts'] });
//# sourceMappingURL=openapi.js.map