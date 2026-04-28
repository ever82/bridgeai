/**
 * OpenAPI Configuration
 * BridgeAI API v1
 *
 * Shared OpenAPI configuration components
 */
export const openApiInfo = {
  title: 'BridgeAI API',
  version: '1.0.0',
  description: `BridgeAI Backend API - AI-powered matching and communication platform.

## API Versioning

All endpoints are versioned under \`/api/v1/\`. When breaking changes are introduced, a new version prefix (e.g., \`/api/v2/\`) will be created.

**Current version**: v1

**Versioning strategy**:
- URL path versioning (\`/api/v1/\`, \`/api/v2/\`)
- Backward-compatible changes (new fields, new endpoints) do not bump version
- Breaking changes (removed fields, changed types) bump version
- Old versions remain available for at least 6 months after deprecation

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
\`Authorization: Bearer <token>\`

Tokens are obtained via \`POST /api/v1/auth/login\` or \`POST /api/v1/auth/register\`.

## Rate Limiting

API requests are rate-limited by IP address. Rate limit headers are included in responses:
- \`X-RateLimit-Limit\`: Maximum requests per window
- \`X-RateLimit-Remaining\`: Remaining requests in current window
- \`X-RateLimit-Reset\`: Timestamp when the rate limit resets

## Response Format

All responses follow a standard format:
\`\`\`json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
\`\`\`

Error responses:
\`\`\`json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
\`\`\``,
  contact: {
    name: 'BridgeAI Team',
    email: 'api@bridgeai.example.com',
  },
  'x-api-version': '1.0.0',
  'x-deprecated-versions': [],
};

export const openApiServers = [
  {
    url: process.env.API_URL || 'http://localhost:3000',
    description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
  },
  {
    url: 'http://localhost:3000',
    description: 'Local Development',
  },
];

export const openApiComponents = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT Bearer token. Obtain via POST /api/v1/auth/login',
    },
  },
  schemas: {
    ApiResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
        message: { type: 'string' },
        error: { type: 'string' },
        code: { type: 'string' },
      },
    },
    ApiSuccess: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
      },
    },
    User: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', description: 'User unique identifier' },
        email: { type: 'string', format: 'email', description: 'User email address' },
        name: { type: 'string', description: 'Display name' },
        avatarUrl: { type: 'string', format: 'uri', description: 'Avatar URL' },
        phone: { type: 'string', description: 'Phone number' },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
          description: 'Account status',
        },
        role: { type: 'string', enum: ['ADMIN', 'USER', 'AGENT'], description: 'User role' },
        createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
        updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
      },
    },
    Agent: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        type: { type: 'string', enum: ['DATING', 'JOB', 'AD', 'VISION_SHARE'] },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
        config: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Tokens: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'JWT access token' },
        refreshToken: { type: 'string', description: 'JWT refresh token' },
        expiresIn: { type: 'integer', description: 'Token expiry in seconds' },
      },
    },
    Error: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', description: 'Error message' },
        code: { type: 'string', description: 'Error code' },
      },
    },
    Pagination: {
      type: 'object',
      properties: {
        page: { type: 'integer' },
        limit: { type: 'integer' },
        total: { type: 'integer' },
        totalPages: { type: 'integer' },
        hasMore: { type: 'boolean' },
      },
    },
    Merchant: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        agentId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        address: { type: 'string' },
        phone: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Offer: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        merchantId: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        type: {
          type: 'string',
          enum: ['DISCOUNT', 'REDUCTION', 'GIFT', 'PACKAGE', 'PERCENTAGE', 'FIXED_AMOUNT'],
        },
        status: {
          type: 'string',
          enum: ['DRAFT', 'PENDING', 'ACTIVE', 'PAUSED', 'EXPIRED', 'SOLD_OUT', 'DISABLED'],
        },
        originalPrice: { type: 'number' },
        offerPrice: { type: 'number' },
        stock: { type: 'integer' },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Review: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        reviewerId: { type: 'string', format: 'uuid' },
        targetId: { type: 'string', format: 'uuid' },
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        comment: { type: 'string' },
        reply: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Job: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        company: { type: 'string' },
        location: { type: 'string' },
        salaryMin: { type: 'number' },
        salaryMax: { type: 'number' },
        status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED'] },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    DisclosureSettings: {
      type: 'object',
      properties: {
        agentId: { type: 'string', format: 'uuid' },
        levels: {
          type: 'object',
          description: 'Field-to-level mapping for disclosure control',
          additionalProperties: { type: 'string', enum: ['PUBLIC', 'MATCHED', 'CHAT', 'PRIVATE'] },
        },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    ConsumerAgent: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        userId: { type: 'string', format: 'uuid' },
        categories: { type: 'array', items: { type: 'string' }, maxItems: 5 },
        budget: {
          type: 'object',
          properties: { min: { type: 'number' }, max: { type: 'number' } },
        },
        preferences: { type: 'object' },
        timeline: { type: 'object' },
        location: { type: 'object' },
        status: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    CreditScore: {
      type: 'object',
      properties: {
        score: { type: 'integer', minimum: 0, maximum: 1000 },
        level: { type: 'string', enum: ['EXCELLENT', 'GOOD', 'GENERAL', 'POOR'] },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Notification: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        type: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' },
        read: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    Location: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Location code' },
        name: { type: 'string', description: 'Location name' },
        level: {
          type: 'integer',
          description: 'Administrative level (1=province, 2=city, 3=district)',
        },
        parentCode: { type: 'string', description: 'Parent location code' },
      },
    },
    SceneConfig: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        icon: { type: 'string' },
        active: { type: 'boolean' },
        capabilities: { type: 'array', items: { type: 'string' } },
        fields: { type: 'array', items: { type: 'object' } },
      },
    },
  },
};
