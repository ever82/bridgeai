# BridgeAI Server

Express.js backend service for the BridgeAI platform.

## Features

- **Express.js** with TypeScript
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Winston + Morgan
- **Error Handling**: Centralized error handling with custom error classes
- **API Versioning**: v1 ready with versioning support
- **Health Checks**: `/health` and `/ready` endpoints
- **Request ID**: Unique request tracking
- **Timeout Handling**: Request/response timeouts
- **Response Standardization**: Unified API response format

## Project Structure

```
src/
├── app.ts              # Express app configuration
├── server.ts           # Server entry point (with graceful shutdown)
├── index.ts            # Main export
├── routes/
│   ├── index.ts        # Route aggregator
│   └── v1/             # API v1 routes
│       ├── index.ts
│       └── health.ts
├── middleware/
│   ├── errorHandler.ts # Global error handler
│   ├── requestId.ts    # Request ID injection
│   ├── timeout.ts      # Request timeout
│   ├── rateLimit.ts    # Rate limiting
│   └── common.ts       # Common middleware (asyncHandler, requestLogger)
├── controllers/        # Request handlers (for future use)
├── services/          # Business logic (for future use)
├── utils/
│   ├── response.ts    # ApiResponse class
│   └── logger.ts      # Winston logger
├── errors/
│   ├── AppError.ts    # Custom error classes
│   └── index.ts       # Error exports
├── types/
│   └── index.ts       # TypeScript types
└── db/
    └── client.ts      # Prisma client
```

## Getting Started

### Installation

```bash
pnpm install
```

### Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Production

```bash
pnpm start
```

## API Endpoints

### Health Checks

- `GET /health` - Basic health check
- `GET /ready` - Readiness probe
- `GET /api/v1/health` - Detailed health check with DB status

### Root

- `GET /` - API info

## Middleware Stack

1. **Helmet** - Security headers
2. **CORS** - Cross-origin requests
3. **Compression** - Response compression
4. **Request ID** - Unique request tracking
5. **Timeout** - Request timeout handling
6. **Morgan** - HTTP request logging
7. **Body Parser** - JSON and URL-encoded parsing

## Error Handling

The server uses a centralized error handling approach with custom error classes:

- `AppError` - Base error class
- `NotFoundError` - 404 errors
- `ValidationError` - 400 validation errors
- `UnauthorizedError` - 401 errors
- `ForbiddenError` - 403 errors
- `ConflictError` - 409 errors
- `RateLimitError` - 429 errors

## Response Format

All API responses follow a standardized format:

```json
{
  "success": true,
  "data": { ... },
  "message": "optional message",
  "meta": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERROR_CODE",
  "meta": { "statusCode": 500 }
}
```

## License

Private - BridgeAI Project
