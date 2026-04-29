/**
 * Generic API Gateway Router
 *
 * A flexible HTTP routing layer that routes incoming requests based on path patterns,
 * HTTP methods, and header values. Supports dynamic route table updates (hot-reload)
 * and integrates with the existing middleware stack.
 */
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
function buildMatcher(pattern, caseSensitive) {
    const flags = caseSensitive ? '' : 'i';
    const regexParts = ['^'];
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
            }
            else {
                regexParts.push('([^/]+)');
            }
            i = paramEnd;
        }
        else if (ch === '*') {
            if (escaped[i + 1] === '*') {
                // Multi-segment wildcard **
                regexParts.push('(?:.*)');
                i += 2;
            }
            else {
                // Single-segment wildcard *
                regexParts.push('([^/]+)');
                i += 1;
            }
        }
        else {
            regexParts.push(ch);
            i += 1;
        }
    }
    regexParts.push('$');
    const regex = new RegExp(regexParts.join(''), flags);
    return (pathname) => {
        const match = regex.exec(pathname);
        if (!match || match[0] === '')
            return null;
        const params = {};
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
    _routes = [];
    _middleware = [];
    _defaultPriority;
    _caseSensitive;
    constructor(options) {
        this._defaultPriority = options?.defaultPriority ?? 0;
        this._caseSensitive = options?.caseSensitive ?? false;
    }
    // ---- Route management ---------------------------------------------------
    addRoute(route) {
        this._routes.push(this._normalizeRoute(route));
        this._routes.sort((a, b) => b.priority - a.priority);
    }
    addRoutes(routes) {
        const normalized = routes.map(r => this._normalizeRoute(r));
        this._routes.push(...normalized);
        this._routes.sort((a, b) => b.priority - a.priority);
    }
    updateRoutes(routes) {
        this._routes = routes.map(r => this._normalizeRoute(r));
        this._routes.sort((a, b) => b.priority - a.priority);
    }
    getRoutes() {
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
    clearRoutes() {
        this._routes = [];
    }
    // ---- Middleware --------------------------------------------------------
    use(middleware) {
        this._middleware.push(middleware);
    }
    // ---- Request handling --------------------------------------------------
    /**
     * Express middleware entry point.
     * Runs all registered middleware then attempts to match and execute a route.
     */
    async handle(req, res) {
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
        }
        // If no match: fall through — caller should attach subsequent middleware/router.
    }
    /**
     * Returns the first matching route for the given request, or null.
     */
    matchRoute(req) {
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
    _normalizeRoute(route) {
        const pathValue = route.path;
        const matcher = pathValue instanceof RegExp
            ? (p) => {
                const re = new RegExp(pathValue.source, pathValue.flags + (this._caseSensitive ? '' : 'i'));
                const match = re.exec(p);
                return match ? {} : null;
            }
            : buildMatcher(pathValue, this._caseSensitive);
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
export function createApiGatewayRouter(options) {
    return new ApiGatewayRouter(options);
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toGatewayRoute(r) {
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
//# sourceMappingURL=apiGatewayRouter.js.map