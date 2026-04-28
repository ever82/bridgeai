/**
 * OpenAPI Specification Tests
 * Validates the OpenAPI spec for completeness and correctness
 */
import { serveOpenApiSpec } from '../config/openapi';

describe('OpenAPI Specification', () => {
  let spec: Record<string, unknown>;

  beforeAll(() => {
    spec = serveOpenApiSpec as Record<string, unknown>;
  });

  describe('Spec Structure', () => {
    it('should have valid OpenAPI 3.0.3 version', () => {
      expect(spec.openapi).toBe('3.0.3');
    });

    it('should have info object with title and version', () => {
      const info = spec.info as Record<string, unknown>;
      expect(info).toBeDefined();
      expect(info.title).toBe('BridgeAI API');
      expect(info.version).toBe('1.0.0');
      expect(info.description).toBeDefined();
      expect(typeof info.description).toBe('string');
      expect((info.description as string).length).toBeGreaterThan(100);
    });

    it('should have servers configured', () => {
      const servers = spec.servers as Array<Record<string, unknown>>;
      expect(servers).toBeDefined();
      expect(servers.length).toBeGreaterThan(0);
      expect(servers[0].url).toBeDefined();
    });

    it('should have contact information', () => {
      const info = spec.info as Record<string, unknown>;
      const contact = info.contact as Record<string, unknown>;
      expect(contact).toBeDefined();
      expect(contact.name).toBeDefined();
      expect(contact.email).toBeDefined();
    });
  });

  describe('Security Schemes', () => {
    it('should define bearer auth security scheme', () => {
      const components = spec.components as Record<string, unknown>;
      const securitySchemes = components.securitySchemes as Record<string, unknown>;
      expect(securitySchemes).toBeDefined();
      expect(securitySchemes.bearerAuth).toBeDefined();

      const bearer = securitySchemes.bearerAuth as Record<string, unknown>;
      expect(bearer.type).toBe('http');
      expect(bearer.scheme).toBe('bearer');
      expect(bearer.bearerFormat).toBe('JWT');
    });
  });

  describe('Schema Definitions', () => {
    let schemas: Record<string, unknown>;

    beforeAll(() => {
      const components = spec.components as Record<string, unknown>;
      schemas = components.schemas as Record<string, unknown>;
    });

    it('should define core schemas', () => {
      const requiredSchemas = [
        'ApiResponse',
        'ApiSuccess',
        'Error',
        'User',
        'Agent',
        'Tokens',
        'Pagination',
        'Merchant',
        'Offer',
        'Review',
        'Job',
        'CreditScore',
        'Notification',
        'Location',
        'SceneConfig',
      ];

      const missing = requiredSchemas.filter(s => !schemas[s]);
      expect(missing).toEqual([]);
    });

    it('should have properties on User schema', () => {
      const user = schemas.User as Record<string, unknown>;
      const props = user.properties as Record<string, unknown>;
      expect(props.id).toBeDefined();
      expect(props.email).toBeDefined();
      expect(props.name).toBeDefined();
      expect(props.status).toBeDefined();
      expect(props.role).toBeDefined();
    });

    it('should have properties on Agent schema', () => {
      const agent = schemas.Agent as Record<string, unknown>;
      const props = agent.properties as Record<string, unknown>;
      expect(props.id).toBeDefined();
      expect(props.userId).toBeDefined();
      expect(props.type).toBeDefined();
      expect(props.status).toBeDefined();
    });

    it('should have enum on Error schema', () => {
      const error = schemas.Error as Record<string, unknown>;
      const props = error.properties as Record<string, unknown>;
      const success = props.success as Record<string, unknown>;
      expect(success.example).toBe(false);
    });

    it('should have format: uuid on id fields', () => {
      const user = schemas.User as Record<string, unknown>;
      const props = user.properties as Record<string, unknown>;
      const id = props.id as Record<string, unknown>;
      expect(id.format).toBe('uuid');
    });
  });

  describe('Tags', () => {
    it('should have all required tags', () => {
      const tags = spec.tags as Array<Record<string, unknown>>;
      const tagNames = tags.map(t => t.name as string);

      const requiredTags = [
        'Auth',
        'Users',
        'Agents',
        'Health',
        'Scenes',
        'Credit',
        'Offers',
        'Merchants',
        'Reviews',
        'Jobs',
        'AI',
        'Upload',
        'Notifications',
        'Location',
        'Chat',
        'Disclosure',
        'Consumer',
        'Admin',
      ];

      const missing = requiredTags.filter(t => !tagNames.includes(t));
      expect(missing).toEqual([]);
    });

    it('should have descriptions on all tags', () => {
      const tags = spec.tags as Array<Record<string, unknown>>;
      const missingDesc = tags.filter(
        t => !t.description || (t.description as string).length === 0
      );
      expect(missingDesc).toEqual([]);
    });
  });

  describe('Paths Coverage', () => {
    let paths: Record<string, unknown>;

    beforeAll(() => {
      paths = spec.paths as Record<string, unknown>;
    });

    it('should have paths defined', () => {
      expect(Object.keys(paths).length).toBeGreaterThan(30);
    });

    // Auth endpoints
    it('should document auth endpoints', () => {
      const authPaths = [
        '/api/v1/auth/register',
        '/api/v1/auth/login',
        '/api/v1/auth/refresh',
        '/api/v1/auth/logout',
        '/api/v1/auth/logout-all',
        '/api/v1/auth/forgot-password',
        '/api/v1/auth/reset-password',
        '/api/v1/auth/change-password',
        '/api/v1/auth/me',
      ];

      const missing = authPaths.filter(p => !paths[p]);
      expect(missing).toEqual([]);
    });

    // User endpoints
    it('should document user endpoints', () => {
      expect(paths['/api/v1/users/me']).toBeDefined();
      expect(paths['/api/v1/users/me/avatar']).toBeDefined();
    });

    // Agent endpoints
    it('should document agent endpoints', () => {
      const agentPaths = [
        '/api/v1/agents',
        '/api/v1/agents/{id}',
        '/api/v1/agents/{id}/status',
        '/api/v1/agents/{id}/history',
        '/api/v1/agents/filter',
        '/api/v1/agents/search',
        '/api/v1/agents/recommended',
        '/api/v1/agents/sort-options',
        '/api/v1/agents/filter-suggestions',
      ];

      const missing = agentPaths.filter(p => !paths[p]);
      expect(missing).toEqual([]);
    });

    // Credit endpoints
    it('should document credit endpoints', () => {
      const creditPaths = [
        '/api/v1/credit/score',
        '/api/v1/credit/history',
        '/api/v1/credit/factors',
        '/api/v1/credit/level',
      ];

      const missing = creditPaths.filter(p => !paths[p]);
      expect(missing).toEqual([]);
    });

    // AI endpoints
    it('should document AI endpoints', () => {
      const aiPaths = [
        '/api/v1/ai/models',
        '/api/v1/ai/chat',
        '/api/v1/ai/health',
        '/api/v1/ai/metrics',
        '/api/v1/ai/circuit-breakers',
        '/api/v1/ai/embeddings',
        '/api/v1/ai/stats',
      ];

      const missing = aiPaths.filter(p => !paths[p]);
      expect(missing).toEqual([]);
    });

    // Notification endpoints
    it('should document notification endpoints', () => {
      expect(paths['/api/v1/notifications']).toBeDefined();
      expect(paths['/api/v1/notifications/unread-count']).toBeDefined();
      expect(paths['/api/v1/notifications/{id}']).toBeDefined();
      expect(paths['/api/v1/notifications/read-all']).toBeDefined();
    });

    // Location endpoints
    it('should document location endpoints', () => {
      expect(paths['/api/v1/location/provinces']).toBeDefined();
      expect(paths['/api/v1/location/cities/{provinceCode}']).toBeDefined();
      expect(paths['/api/v1/location/agents']).toBeDefined();
      expect(paths['/api/v1/location/agents/nearby']).toBeDefined();
    });

    // Merchant endpoints
    it('should document merchant endpoints', () => {
      expect(paths['/api/v1/merchants']).toBeDefined();
      expect(paths['/api/v1/merchants/{id}']).toBeDefined();
    });

    // Offer endpoints
    it('should document offer endpoints', () => {
      expect(paths['/api/v1/offers']).toBeDefined();
      expect(paths['/api/v1/offers/{id}']).toBeDefined();
      expect(paths['/api/v1/offers/{id}/status']).toBeDefined();
    });

    // Review endpoints
    it('should document review endpoints', () => {
      expect(paths['/api/v1/reviews']).toBeDefined();
    });

    // Job endpoints
    it('should document job endpoints', () => {
      expect(paths['/api/v1/jobs']).toBeDefined();
      expect(paths['/api/v1/jobs/{id}']).toBeDefined();
    });

    // Health endpoints
    it('should document health endpoints', () => {
      expect(paths['/api/v1/health']).toBeDefined();
      expect(paths['/api/v1/health/detailed']).toBeDefined();
    });

    // Scene endpoints
    it('should document scene endpoints', () => {
      expect(paths['/api/v1/scenes']).toBeDefined();
      expect(paths['/api/v1/scenes/{sceneId}']).toBeDefined();
    });

    // Upload endpoints
    it('should document upload endpoints', () => {
      expect(paths['/api/v1/upload/avatar']).toBeDefined();
      expect(paths['/api/v1/upload/image']).toBeDefined();
    });
  });

  describe('Endpoint Quality', () => {
    it('should have tags on all endpoints', () => {
      const paths = spec.paths as Record<string, Record<string, Record<string, unknown>>>;
      const missing: string[] = [];

      for (const [path, methods] of Object.entries(paths)) {
        for (const [method, operation] of Object.entries(methods)) {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            if (!operation.tags || (operation.tags as unknown[]).length === 0) {
              missing.push(`${method.toUpperCase()} ${path}`);
            }
          }
        }
      }
      expect(missing).toEqual([]);
    });

    it('should have summary on all endpoints', () => {
      const paths = spec.paths as Record<string, Record<string, Record<string, unknown>>>;
      const missing: string[] = [];

      for (const [path, methods] of Object.entries(paths)) {
        for (const [method, operation] of Object.entries(methods)) {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            if (!operation.summary || typeof operation.summary !== 'string') {
              missing.push(`${method.toUpperCase()} ${path}`);
            }
          }
        }
      }
      expect(missing).toEqual([]);
    });

    it('should have description on all endpoints', () => {
      const paths = spec.paths as Record<string, Record<string, Record<string, unknown>>>;
      const missing: string[] = [];

      for (const [path, methods] of Object.entries(paths)) {
        for (const [method, operation] of Object.entries(methods)) {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            if (!operation.description) {
              missing.push(`${method.toUpperCase()} ${path}`);
            }
          }
        }
      }
      expect(missing).toEqual([]);
    });

    it('should have responses on all endpoints', () => {
      const paths = spec.paths as Record<string, Record<string, Record<string, unknown>>>;
      const missing: string[] = [];

      for (const [path, methods] of Object.entries(paths)) {
        for (const [method, operation] of Object.entries(methods)) {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            if (!operation.responses) {
              missing.push(`${method.toUpperCase()} ${path}`);
            }
          }
        }
      }
      expect(missing).toEqual([]);
    });
  });

  describe('API Versioning', () => {
    it('should have externalDocs for changelog', () => {
      const externalDocs = spec.externalDocs as Record<string, unknown>;
      expect(externalDocs).toBeDefined();
      expect(externalDocs.description).toBeDefined();
      expect(externalDocs.url).toBeDefined();
    });

    it('should have version info in info object', () => {
      const info = spec.info as Record<string, unknown>;
      expect(info['x-api-version']).toBe('1.0.0');
    });

    it('should include versioning documentation in description', () => {
      const info = spec.info as Record<string, unknown>;
      const desc = info.description as string;
      expect(desc).toContain('Versioning');
      expect(desc).toContain('/api/v1/');
    });
  });
});
