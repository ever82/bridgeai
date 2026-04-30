/**
 * Generic API Gateway Router
 *
 * A flexible HTTP routing layer that routes incoming requests based on path patterns,
 * HTTP methods, and header values. Supports dynamic route table updates (hot-reload)
 * and integrates with the existing middleware stack.
 */

import type { NextFunction, Request, Response } from 'express';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GatewayRoute {
  id: string;
  path: string | RegExp;
  method?: string | string[];
  headers?: Record<string, string>;
  priority: number;
  handler: (req: Request, res: Response) => Promise<void> | void;
  description?: string;
}

export interface RouteMatch {
  route: GatewayRoute;
  params: Record<string, string>;
}

interface NormalizedRoute {
  id: GatewayRoute['id'];
  originalPath: string;
  methodSet: Set<string>;
  headers: Record<string, string> | null;
  priority: number;
  handler: GatewayRoute['handler'];
  description: string | undefined;
  matcher: (pathname: string) => Record<string, string> | null;
}

// ---------------------------------------------------------------------------
// Path matching helpers
// ---------------------------------------------------------------------------

/**
 * Convert a string path pattern (e.g. "/api/users/:id") into a regex matcher.
 * Supports:
 *   :param   — named segment  → captures as params.param
 *   *         — single-segment wildcard
 *   **       — multi-segment wildcard (matches rest of path)
 *
 * Returns a function that tests a pathname and returns captured params on match.
 */
function buildMatcher(
  pattern: string,
  caseSensitive: boolean
): (pathname: string) => Record<string, string> | null {
  const flags = caseSensitive ? '' : 'i';
  const regexParts: string[] = ['^'];

  // Escape special regex chars except those we use for param/wildcard syntax
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  let i = 0;
  while (i < escaped.length) {
    const ch = escaped[i];
    if (ch === ':') {
      // Named parameter: :paramname
      const end = escaped.indexOf('/', i + 1);
      const paramEnd = end === -1 ? escaped.length : end;
      const name = escaped.slice(i + 1, paramEnd);
      if (name) {
        regexParts.push(`(?<${name}>[^/]+)`);
      } else {
        regexParts.push('([^/]+)');
      }
      i = paramEnd;
    } else if (ch === '*') {
      if (escaped[i + 1] === '*') {
        // Multi-segment wildcard **
        regexParts.push('(?:.*)');
        i += 2;
      } else {
        // Single-segment wildcard *
        regexParts.push('([^/]+)');
        i += 1;
      }
    } else {
      regexParts.push(ch);
      i += 1;
    }
  }

  regexParts.push('$');

  const regex = new RegExp(regexParts.join(''), flags);

  return (pathname: string): Record<string, string> | null => {
    const match = regex.exec(pathname);
    if (!match || match[0] === '') return null;

    const params: Record<string, string> = {};
    if (match.groups) {
      Object.assign(params, match.groups);
    }
    return params;
  };
}

// ---------------------------------------------------------------------------
// ApiGatewayRouter
// ---------------------------------------------------------------------------

export class ApiGatewayRouter {
  private _routes: NormalizedRoute[] = [];
  private _middleware: Array<(req: Request, res: Response) => Promise<void> | void> = [];
  private _defaultPriority: number;
  private _caseSensitive: boolean;

  constructor(options?: { defaultPriority?: number; caseSensitive?: boolean }) {
    this._defaultPriority = options?.defaultPriority ?? 0;
    this._caseSensitive = options?.caseSensitive ?? false;
  }

  // ---- Route management ---------------------------------------------------

  addRoute(route: GatewayRoute): void {
    this._routes.push(this._normalizeRoute(route));
    this._routes.sort((a, b) => b.priority - a.priority);
  }

  addRoutes(routes: GatewayRoute[]): void {
    const normalized = routes.map(r => this._normalizeRoute(r));
    this._routes.push(...normalized);
    this._routes.sort((a, b) => b.priority - a.priority);
  }

  updateRoutes(routes: GatewayRoute[]): void {
    this._routes = routes.map(r => this._normalizeRoute(r));
    this._routes.sort((a, b) => b.priority - a.priority);
  }

  getRoutes(): GatewayRoute[] {
    return this._routes.map(r => ({
      id: r.id,
      path: r.originalPath,
      method: [...r.methodSet],
      headers: r.headers ?? undefined,
      priority: r.priority,
      handler: r.handler,
      description: r.description,
    }));
  }

  clearRoutes(): void {
    this._routes = [];
  }

  // ---- Middleware --------------------------------------------------------

  use(middleware: (req: Request, res: Response) => Promise<void> | void): void {
    this._middleware.push(middleware);
  }

  // ---- Request handling --------------------------------------------------

  /**
   * Express middleware entry point.
   * Runs all registered middleware then attempts to match and execute a route.
   * If no route matches, calls next() so the request continues down the
   * Express middleware/router chain.
   */
  async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Execute middleware chain
      for (const middleware of this._middleware) {
        const result = middleware(req, res);
        if (result instanceof Promise) {
          await result;
        }
      }

      // Attempt to match a route
      const match = this.matchRoute(req);
      if (match) {
        await Promise.resolve(match.route.handler(req, res));
        return;
      }

      // No match: fall through to subsequent middleware/routers.
      next();
    } catch (err) {
      next(err);
    }
  }

  /**
   * Returns the first matching route for the given request, or null.
   */
  matchRoute(req: Request): RouteMatch | null {
    const pathname = req.path ?? req.url.split('?')[0];
    const method = req.method.toUpperCase();

    for (const route of this._routes) {
      // Method check
      if (!route.methodSet.has('*') && !route.methodSet.has(method)) {
        continue;
      }

      // Path check
      const params = route.matcher(pathname);
      if (!params) {
        continue;
      }

      // Header check
      if (route.headers) {
        let headersMatched = true;
        for (const [key, value] of Object.entries(route.headers)) {
          if (req.headers[key.toLowerCase()] !== value) {
            headersMatched = false;
            break;
          }
        }
        if (!headersMatched) {
          continue;
        }
      }

      return { route: toGatewayRoute(route), params };
    }

    return null;
  }

  // ---- Internal ----------------------------------------------------------

  private _normalizeRoute(route: GatewayRoute): NormalizedRoute {
    const pathValue = route.path;
    const matcher =
      pathValue instanceof RegExp
        ? (p: string) => {
            const re = new RegExp(
              pathValue.source,
              pathValue.flags + (this._caseSensitive ? '' : 'i')
            );
            const match = re.exec(p);
            return match ? ({} as Record<string, string>) : null;
          }
        : buildMatcher(pathValue as string, this._caseSensitive);

    const methodRaw = route.method ?? '*';
    const methodArray = Array.isArray(methodRaw) ? methodRaw : [methodRaw];
    const methodSet = new Set(methodArray.map(m => m.toUpperCase()));

    return {
      id: route.id,
      originalPath: pathValue instanceof RegExp ? pathValue.source : pathValue,
      methodSet,
      headers: route.headers ?? null,
      priority: route.priority ?? this._defaultPriority,
      handler: route.handler,
      description: route.description,
      matcher,
    };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createApiGatewayRouter(options?: {
  defaultPriority?: number;
  caseSensitive?: boolean;
}): ApiGatewayRouter {
  return new ApiGatewayRouter(options);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toGatewayRoute(r: NormalizedRoute): GatewayRoute {
  return {
    id: r.id,
    path: r.originalPath,
    method: [...r.methodSet],
    headers: r.headers ?? undefined,
    priority: r.priority,
    handler: r.handler,
    description: r.description,
  };
}
