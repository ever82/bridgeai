/**
 * OpenAPI Documentation Routes
 * Serves Swagger UI and OpenAPI JSON spec with versioning support
 */
import { Router } from 'express';
import { serveOpenApiSpec } from '../config/openapi';
import { ApiResponse } from '../utils/response';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerUi = require('swagger-ui-express');
const router = Router();
// API Changelog - documents version history and breaking changes
const apiChangelog = [
    {
        version: '1.0.0',
        date: '2025-01-01',
        changes: [
            'Initial API release',
            'Auth endpoints (register, login, refresh, logout, password management)',
            'User profile CRUD and avatar upload',
            'Agent CRUD, filtering, search, and recommendations',
            'Credit score system with history and factors',
            'Offer CRUD with lifecycle management',
            'Merchant CRUD with statistics',
            'Review system with replies and reports',
            'Job posting CRUD with AI extraction',
            'Interview scheduling and feedback',
            'AI service endpoints (chat, extraction, vision)',
            'Notification system with categories and batch operations',
            'Location lookup (provinces, cities, districts)',
            'Scene configuration and templates',
            'Disclosure control with audit logging',
            'Consumer demand agent configuration',
            'Admin security dashboard',
        ],
    },
];
// Serve Swagger UI at /api-docs
router.get('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(serveOpenApiSpec, {
    swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'BridgeAI API Documentation',
}));
// Serve OpenAPI JSON spec
router.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(serveOpenApiSpec);
});
// Serve API changelog
router.get('/changelog', (req, res) => {
    res.json(ApiResponse.success(apiChangelog));
});
// Serve API version info
router.get('/version', (req, res) => {
    res.json(ApiResponse.success({
        version: '1.0.0',
        apiPrefix: '/api/v1',
        deprecatedVersions: [],
        supportedVersions: ['v1'],
    }));
});
export default router;
//# sourceMappingURL=docs.js.map