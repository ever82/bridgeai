# API Integration Test Framework

This directory contains the API integration testing framework for VisionShare server.

## Structure

```
src/tests/
├── helpers/              # Test utilities and helpers
│   ├── index.ts         # Central exports
│   ├── database.ts      # Database lifecycle management
│   ├── auth.ts          # Authentication helpers (JWT, test users)
│   ├── request.ts       # HTTP request helpers (Supertest wrapper)
│   └── validator.ts     # Response validation utilities
├── integration/          # Integration tests
│   ├── auth.integration.test.ts
│   ├── user.integration.test.ts
│   └── error.integration.test.ts
├── factories/           # Test data factories (optional)
├── schemas/             # JSON Schema definitions (optional)
└── setup.ts            # Test setup configuration
```

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.integration.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Helpers Usage

### Database Helper

```typescript
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
  createTestUser,
} from '../helpers/database';

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});
```

### Authentication Helper

```typescript
import {
  createTestUser,
  getUserAuthHeader,
  generateTokens,
  TestUserRole,
} from '../helpers/auth';

// Create test user
const user = await createTestUser({
  email: 'test@example.com',
  role: TestUserRole.ADMIN,
});

// Get auth header
const headers = getUserAuthHeader(user);

// Generate tokens
const { accessToken, refreshToken } = generateTokens(user);
```

### Request Helper

```typescript
import { Request, ApiPaths } from '../helpers/request';

// Simple GET request
const response = await Request.get('/health');

// POST with body and auth
const response = await Request.post(
  ApiPaths.auth.login,
  { email, password },
  { headers: getUserAuthHeader(user) }
);

// Using RequestBuilder for complex requests
const response = await new RequestBuilder()
  .method('PUT')
  .path(ApiPaths.users.update(userId))
  .body({ name: 'New Name' })
  .auth(token)
  .query({ include: 'profile' })
  .execute();
```

### Validator Helper

```typescript
import {
  validateSuccessResponse,
  validateErrorResponse,
  StatusValidators,
  ResponseTimeValidator,
} from '../helpers/validator';

// Validate response structure
expect(validateSuccessResponse(response)).toBe(true);
expect(validateErrorResponse(response)).toBe(true);

// Check status codes
expect(StatusValidators.isSuccess(response.status)).toBe(true);
expect(StatusValidators.isUnauthorized(response.status)).toBe(true);

// Measure response time
const timer = new ResponseTimeValidator();
const response = await Request.get('/api/data');
timer.end();
expect(timer.getDuration()).toBeLessThan(500);
```

## Writing Integration Tests

### Basic Test Structure

```typescript
import {
  Request,
  ApiPaths,
  createTestUser,
  cleanupTestUsers,
  getUserAuthHeader,
  validateSuccessResponse,
} from '../helpers';

describe('Feature API Integration', () => {
  afterAll(async () => {
    await cleanupTestUsers();
  });

  describe('GET /api/v1/resource', () => {
    it('should return list of resources', async () => {
      const user = await createTestUser();
      const headers = getUserAuthHeader(user);

      const response = await Request.get(ApiPaths.v1('/resource'), { headers });

      expect(response.status).toBe(200);
      expect(validateSuccessResponse(response)).toBe(true);
      expect(response.body.data).toHaveProperty('items');
    });
  });
});
```

### Test Database

Tests use a separate test database (configured via `TEST_DATABASE_URL`). The database is cleaned before each test suite runs.

### Test Isolation

Each test should be isolated:
- Create test data in `beforeEach` or at test start
- Clean up in `afterEach` or `afterAll`
- Use unique identifiers (timestamps) to avoid conflicts

## Best Practices

1. **Use Helpers**: Always use the provided helpers for common operations
2. **Validate Responses**: Check both status code and response structure
3. **Test Error Cases**: Include tests for 400, 401, 403, 404, 422 errors
4. **Unique Test Data**: Use timestamps or random values to ensure uniqueness
5. **Clean Up**: Always clean up test data in `afterAll` or `afterEach`
6. **Descriptive Names**: Use clear test descriptions

## Environment Variables

```bash
# Required
NODE_ENV=test
JWT_SECRET=your-test-secret
DATABASE_URL=postgresql://test:test@localhost:5432/visionshare_test

# Optional
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/visionshare_test
```

## Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running and the test database exists:
```bash
# Create test database
createdb visionshare_test
```

### Port Conflicts

Tests don't start a server on a port - they use Supertest directly with the Express app.

### Timeout Issues

Increase timeout in jest.config.js or per-test:
```typescript
jest.setTimeout(60000);
```
