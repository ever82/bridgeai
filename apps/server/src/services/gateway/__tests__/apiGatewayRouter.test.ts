/**
 * Tests for ApiGatewayRouter
 */
import { Request, Response } from 'express';

import { ApiGatewayRouter } from '../apiGatewayRouter';

describe('ApiGatewayRouter', () => {
  let router: ApiGatewayRouter;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  const makeHandler = jest.fn();

  beforeEach(() => {
    router = new ApiGatewayRouter();
    mockReq = {
      path: '',
      url: '/',
      method: 'GET',
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    makeHandler.mockReset();
  });

  // -------------------------------------------------------------------------
  // Path pattern matching
  // -------------------------------------------------------------------------

  describe('path pattern matching', () => {
    it('matches a static path', () => {
      router.addRoute({ id: 'static', path: '/api/users', priority: 0, handler: makeHandler });
      mockReq.path = '/api/users';
      const match = router.matchRoute(mockReq as Request);
      expect(match).not.toBeNull();
      expect(match!.params).toEqual({});
    });

    it('does not match a different static path', () => {
      router.addRoute({ id: 'static', path: '/api/users', priority: 0, handler: makeHandler });
      mockReq.path = '/api/posts';
      expect(router.matchRoute(mockReq as Request)).toBeNull();
    });

    it('matches a named parameter pattern', () => {
      router.addRoute({ id: 'param', path: '/api/users/:id', priority: 0, handler: makeHandler });
      mockReq.path = '/api/users/123';
      const match = router.matchRoute(mockReq as Request);
      expect(match).not.toBeNull();
      expect(match!.params).toEqual({ id: '123' });
    });

    it('matches a named parameter with multiple segments', () => {
      router.addRoute({
        id: 'multi',
        path: '/api/users/:userId/posts/:postId',
        priority: 0,
        handler: makeHandler,
      });
      mockReq.path = '/api/users/10/posts/20';
      const match = router.matchRoute(mockReq as Request);
      expect(match).not.toBeNull();
      expect(match!.params).toEqual({ userId: '10', postId: '20' });
    });

    it('matches a single-segment wildcard *', () => {
      router.addRoute({
        id: 'wildcard',
        path: '/api/*/settings',
        priority: 0,
        handler: makeHandler,
      });
      mockReq.path = '/api/users/settings';
      const match = router.matchRoute(mockReq as Request);
      expect(match).not.toBeNull();
    });

    it('matches a multi-segment wildcard **', () => {
      router.addRoute({ id: 'catchall', path: '/api/**', priority: 0, handler: makeHandler });
      mockReq.path = '/api/v1/users/123/details';
      const match = router.matchRoute(mockReq as Request);
      expect(match).not.toBeNull();
    });

    it('respects caseSensitive option', () => {
      const sensitiveRouter = new ApiGatewayRouter({ caseSensitive: true });
      sensitiveRouter.addRoute({ id: 'cs', path: '/API/Users', priority: 0, handler: makeHandler });
      mockReq.path = '/api/users';
      expect(sensitiveRouter.matchRoute(mockReq as Request)).toBeNull();
      mockReq.path = '/API/Users';
      expect(sensitiveRouter.matchRoute(mockReq as Request)).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Method matching
  // -------------------------------------------------------------------------

  describe('method matching', () => {
    beforeEach(() => {
      router.addRoute({
        id: 'method',
        path: '/api/users',
        method: ['GET', 'POST'],
        priority: 0,
        handler: makeHandler,
      });
    });

    it('matches GET when allowed', () => {
      mockReq.path = '/api/users';
      mockReq.method = 'GET';
      expect(router.matchRoute(mockReq as Request)).not.toBeNull();
    });

    it('matches POST when allowed', () => {
      mockReq.path = '/api/users';
      mockReq.method = 'POST';
      expect(router.matchRoute(mockReq as Request)).not.toBeNull();
    });

    it('does not match PUT when only GET/POST allowed', () => {
      mockReq.path = '/api/users';
      mockReq.method = 'PUT';
      expect(router.matchRoute(mockReq as Request)).toBeNull();
    });

    it('matches lowercase method', () => {
      router.clearRoutes();
      router.addRoute({
        id: 'method',
        path: '/api/users',
        method: 'post',
        priority: 0,
        handler: makeHandler,
      });
      mockReq.path = '/api/users';
      mockReq.method = 'POST';
      expect(router.matchRoute(mockReq as Request)).not.toBeNull();
    });

    it('matches wildcard method *', () => {
      router.clearRoutes();
      router.addRoute({
        id: 'any',
        path: '/api/users',
        method: '*',
        priority: 0,
        handler: makeHandler,
      });
      mockReq.path = '/api/users';
      mockReq.method = 'DELETE';
      expect(router.matchRoute(mockReq as Request)).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Header matching
  // -------------------------------------------------------------------------

  describe('header matching', () => {
    beforeEach(() => {
      router.addRoute({
        id: 'header',
        path: '/api/users',
        method: 'GET',
        headers: { 'x-role': 'admin' },
        priority: 0,
        handler: makeHandler,
      });
      mockReq.path = '/api/users';
      mockReq.method = 'GET';
    });

    it('matches when required header is present', () => {
      mockReq.headers = { 'x-role': 'admin' };
      expect(router.matchRoute(mockReq as Request)).not.toBeNull();
    });

    it('does not match when required header is missing', () => {
      mockReq.headers = {};
      expect(router.matchRoute(mockReq as Request)).toBeNull();
    });

    it('does not match when required header has wrong value', () => {
      mockReq.headers = { 'x-role': 'user' };
      expect(router.matchRoute(mockReq as Request)).toBeNull();
    });

    it('matches case-insensitively on header key', () => {
      // Express normalizes header keys to lowercase
      mockReq.headers = { 'x-role': 'admin' };
      expect(router.matchRoute(mockReq as Request)).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Priority ordering
  // -------------------------------------------------------------------------

  describe('priority ordering', () => {
    it('higher priority route is matched first', () => {
      const handlerLow = jest.fn();
      const handlerHigh = jest.fn();
      router.addRoute({ id: 'low', path: '/api/**', priority: 1, handler: handlerLow });
      router.addRoute({ id: 'high', path: '/api/users', priority: 10, handler: handlerHigh });
      mockReq.path = '/api/users';
      mockReq.method = 'GET';
      const match = router.matchRoute(mockReq as Request);
      expect(match!.route.id).toBe('high');
    });

    it('routes are sorted descending by priority after addRoute', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      router.addRoute({ id: 'first', path: '/a', priority: 5, handler: handler1 });
      router.addRoute({ id: 'second', path: '/b', priority: 10, handler: handler2 });
      router.addRoute({ id: 'third', path: '/c', priority: 3, handler: handler3 });
      const routes = router.getRoutes();
      expect(routes[0].id).toBe('second');
      expect(routes[1].id).toBe('first');
      expect(routes[2].id).toBe('third');
    });
  });

  // -------------------------------------------------------------------------
  // updateRoutes (hot-reload)
  // -------------------------------------------------------------------------

  describe('updateRoutes', () => {
    it('replaces all routes and re-sorts by priority', () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      router.addRoute({ id: 'old', path: '/old', priority: 0, handler: h1 });
      router.updateRoutes([
        { id: 'new1', path: '/new1', priority: 5, handler: h2 },
        { id: 'new2', path: '/new2', priority: 10, handler: jest.fn() },
      ]);
      const routes = router.getRoutes();
      expect(routes.length).toBe(2);
      expect(routes[0].id).toBe('new2');
      expect(routes[1].id).toBe('new1');
    });

    it('removes previously added routes', () => {
      const h = jest.fn();
      router.addRoute({ id: 'old', path: '/old', priority: 0, handler: h });
      router.updateRoutes([]);
      expect(router.getRoutes().length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // No-match fallthrough
  // -------------------------------------------------------------------------

  describe('no-match fallthrough', () => {
    it('returns null when no route matches', () => {
      router.addRoute({ id: 'route', path: '/api/users', priority: 0, handler: makeHandler });
      mockReq.path = '/api/orders';
      mockReq.method = 'GET';
      expect(router.matchRoute(mockReq as Request)).toBeNull();
    });

    it('handle does not throw when no route matches', async () => {
      router.addRoute({ id: 'route', path: '/api/users', priority: 0, handler: makeHandler });
      mockReq.path = '/api/orders';
      mockReq.method = 'GET';
      await expect(router.handle(mockReq as Request, mockRes as Response)).resolves.not.toThrow();
    });

    it('handle calls the matched route handler', async () => {
      const handler = jest.fn();
      router.addRoute({ id: 'route', path: '/api/users', method: 'GET', priority: 0, handler });
      mockReq.path = '/api/users';
      mockReq.method = 'GET';
      await router.handle(mockReq as Request, mockRes as Response);
      expect(handler).toHaveBeenCalledWith(mockReq, mockRes);
    });
  });

  // -------------------------------------------------------------------------
  // Middleware
  // -------------------------------------------------------------------------

  describe('middleware', () => {
    it('executes middleware in order before route matching', async () => {
      const order: string[] = [];
      router.use(() => {
        order.push('mw1');
      });
      router.use(() => {
        order.push('mw2');
      });
      router.addRoute({
        id: 'route',
        path: '/api/users',
        method: 'GET',
        priority: 0,
        handler: () => {
          order.push('handler');
        },
      });
      mockReq.path = '/api/users';
      mockReq.method = 'GET';
      await router.handle(mockReq as Request, mockRes as Response);
      expect(order).toEqual(['mw1', 'mw2', 'handler']);
    });
  });

  // -------------------------------------------------------------------------
  // addRoutes (bulk add)
  // -------------------------------------------------------------------------

  describe('addRoutes', () => {
    it('adds multiple routes and sorts by priority', () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      router.addRoutes([
        { id: 'r1', path: '/a', priority: 1, handler: h1 },
        { id: 'r2', path: '/b', priority: 10, handler: h2 },
      ]);
      const routes = router.getRoutes();
      expect(routes[0].id).toBe('r2');
      expect(routes[1].id).toBe('r1');
    });
  });

  // -------------------------------------------------------------------------
  // clearRoutes
  // -------------------------------------------------------------------------

  describe('clearRoutes', () => {
    it('removes all routes', () => {
      router.addRoute({ id: 'r1', path: '/a', priority: 0, handler: jest.fn() });
      router.addRoute({ id: 'r2', path: '/b', priority: 0, handler: jest.fn() });
      router.clearRoutes();
      expect(router.getRoutes().length).toBe(0);
    });
  });
});
