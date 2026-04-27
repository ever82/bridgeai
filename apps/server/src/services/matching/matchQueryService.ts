/**
 * Match Query Service
 *
 * Public API surface that wires QueryEngine and QuerySubscriptionManager into
 * concrete operations consumed by HTTP routes and the WebSocket transport.
 */

import { FilterDSL } from '@bridgeai/shared';

import { logger } from '../../utils/logger';
import { validateFilterDSL } from '../../utils/queryBuilder';

import { ExecutionPlan, queryEngine, QueryResult } from './queryEngine';
import { Subscription, querySubscriptionManager } from './querySubscriptionManager';

export interface MatchQueryExecuteOptions {
  userId?: string;
  useCache?: boolean;
  cacheTtl?: number;
}

export class MatchQueryValidationError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(`Invalid filter: ${errors.join(', ')}`);
    this.name = 'MatchQueryValidationError';
    this.errors = errors;
  }
}

/**
 * Match Query Service
 *
 * Thin orchestration layer over QueryEngine (compile/execute/parallel) and
 * QuerySubscriptionManager (real-time subscriptions).
 */
export class MatchQueryService {
  /**
   * Compile a FilterDSL into an execution plan without executing it.
   */
  compile(dsl: FilterDSL): ExecutionPlan {
    this.assertValidDsl(dsl);
    return queryEngine.compileQuery(dsl);
  }

  /**
   * Execute a FilterDSL query against the match table.
   */
  async execute<T = unknown>(
    dsl: FilterDSL,
    options: MatchQueryExecuteOptions = {}
  ): Promise<QueryResult<T>> {
    this.assertValidDsl(dsl);
    return queryEngine.execute<T>(dsl, options);
  }

  /**
   * Execute multiple FilterDSL queries in parallel where possible.
   */
  async executeParallel<T = unknown>(
    queries: FilterDSL[],
    options: MatchQueryExecuteOptions & { maxConcurrency?: number } = {}
  ): Promise<QueryResult<T>[]> {
    for (const dsl of queries) {
      this.assertValidDsl(dsl);
    }
    return queryEngine.executeParallel<T>(queries, options);
  }

  /**
   * Resource statistics from the underlying engine and subscription manager.
   */
  getStats(): {
    engine: ReturnType<typeof queryEngine.getResourceStats>;
    subscriptions: ReturnType<typeof querySubscriptionManager.getStats>;
  } {
    return {
      engine: queryEngine.getResourceStats(),
      subscriptions: querySubscriptionManager.getStats(),
    };
  }

  /**
   * Create a real-time subscription for a query. Initial results are pushed
   * via the subscription manager event stream.
   */
  async createSubscription(
    userId: string,
    dsl: FilterDSL,
    filters?: Record<string, unknown>
  ): Promise<Subscription> {
    this.assertValidDsl(dsl);
    return querySubscriptionManager.createSubscription(userId, dsl, filters);
  }

  /**
   * Remove an existing subscription by id. Returns true if a subscription was
   * found and removed.
   */
  removeSubscription(subscriptionId: string): boolean {
    return querySubscriptionManager.removeSubscription(subscriptionId);
  }

  /**
   * List a user's active subscriptions.
   */
  listUserSubscriptions(userId: string): Subscription[] {
    return querySubscriptionManager.getUserSubscriptions(userId);
  }

  /**
   * Heartbeat for a subscription to keep it alive.
   */
  heartbeat(subscriptionId: string): boolean {
    return querySubscriptionManager.handleHeartbeat(subscriptionId);
  }

  /**
   * Force a refresh of a subscription's underlying query.
   */
  async refreshSubscription(subscriptionId: string): Promise<void> {
    return querySubscriptionManager.refreshSubscription(subscriptionId);
  }

  private assertValidDsl(dsl: FilterDSL): void {
    const validation = validateFilterDSL(dsl);
    if (!validation.valid) {
      logger.warn('Invalid filter DSL rejected', { errors: validation.errors });
      throw new MatchQueryValidationError(validation.errors);
    }
  }
}

export const matchQueryService = new MatchQueryService();
