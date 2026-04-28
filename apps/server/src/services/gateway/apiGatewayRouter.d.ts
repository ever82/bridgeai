/**
 * Generic API Gateway Router
 *
 * A flexible HTTP routing layer that routes incoming requests based on path patterns,
 * HTTP methods, and header values. Supports dynamic route table updates (hot-reload)
 * and integrates with the existing middleware stack.
 */
import type { Request, Response } from 'express';
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
export declare class ApiGatewayRouter {
    private _routes;
    private _middleware;
    private _defaultPriority;
    private _caseSensitive;
    constructor(options?: {
        defaultPriority?: number;
        caseSensitive?: boolean;
    });
    addRoute(route: GatewayRoute): void;
    addRoutes(routes: GatewayRoute[]): void;
    updateRoutes(routes: GatewayRoute[]): void;
    getRoutes(): GatewayRoute[];
    clearRoutes(): void;
    use(middleware: (req: Request, res: Response) => Promise<void> | void): void;
    /**
     * Express middleware entry point.
     * Runs all registered middleware then attempts to match and execute a route.
     */
    handle(req: Request, res: Response): Promise<void>;
    /**
     * Returns the first matching route for the given request, or null.
     */
    matchRoute(req: Request): RouteMatch | null;
    private _normalizeRoute;
}
export declare function createApiGatewayRouter(options?: {
    defaultPriority?: number;
    caseSensitive?: boolean;
}): ApiGatewayRouter;
//# sourceMappingURL=apiGatewayRouter.d.ts.map