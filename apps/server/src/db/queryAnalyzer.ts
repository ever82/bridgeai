/**
 * Database Query Analyzer
 *
 * Utilities for analyzing slow queries, examining query plans,
 * and identifying missing indexes in PostgreSQL.
 */

import { prisma } from './client';

export interface SlowQueryInfo {
  query: string;
  calls: number;
  totalExecTime: number;
  meanExecTime: number;
  maxExecTime: number;
  rows: number;
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  reason: string;
  existingIndex: boolean;
}

export interface QueryPlanResult {
  plan: string;
  executionTime: number;
  planningTime: number;
  usesIndexScan: boolean;
  usesSeqScan: boolean;
}

/**
 * Get top N slow queries from pg_stat_statements
 * Requires pg_stat_statements extension to be enabled
 */
export async function getSlowQueries(limit = 10): Promise<SlowQueryInfo[]> {
  try {
    const results = await prisma.$queryRaw<
      Array<{
        query: string;
        calls: bigint;
        total_exec_time: number;
        mean_exec_time: number;
        max_exec_time: number;
        rows: bigint;
      }>
    >`
      SELECT
        LEFT(query, 200) AS query,
        calls,
        total_exec_time,
        mean_exec_time,
        max_exec_time,
        rows
      FROM pg_stat_statements
      WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      ORDER BY mean_exec_time DESC
      LIMIT ${limit}
    `;

    return results.map(r => ({
      query: r.query,
      calls: Number(r.calls),
      totalExecTime: Math.round(r.total_exec_time * 100) / 100,
      meanExecTime: Math.round(r.mean_exec_time * 100) / 100,
      maxExecTime: Math.round(r.max_exec_time * 100) / 100,
      rows: Number(r.rows),
    }));
  } catch {
    // pg_stat_statements extension may not be enabled
    return [];
  }
}

/**
 * Get EXPLAIN ANALYZE result for a query
 */
export async function explainQuery(query: string): Promise<QueryPlanResult> {
  try {
    const results = await prisma.$queryRaw<
      Array<Record<string, string>>
    >`EXPLAIN (ANALYZE, FORMAT JSON) ${prisma.$queryRawUnsafe(query)}`;

    const planStr = results.map(r => Object.values(r)[0]).join('\n');

    return {
      plan: planStr,
      executionTime: 0,
      planningTime: 0,
      usesIndexScan: planStr.includes('Index Scan'),
      usesSeqScan: planStr.includes('Seq Scan'),
    };
  } catch {
    return {
      plan: 'Unable to analyze query',
      executionTime: 0,
      planningTime: 0,
      usesIndexScan: false,
      usesSeqScan: true,
    };
  }
}

/**
 * Get existing indexes for a table
 */
export async function getTableIndexes(tableName: string): Promise<
  Array<{
    indexname: string;
    indexdef: string;
  }>
> {
  try {
    return await prisma.$queryRaw<
      Array<{
        indexname: string;
        indexdef: string;
      }>
    >`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = ${tableName}
      ORDER BY indexname
    `;
  } catch {
    return [];
  }
}

/**
 * Analyze missing indexes based on common query patterns
 */
export async function suggestIndexes(): Promise<IndexSuggestion[]> {
  const suggestions: IndexSuggestion[] = [];

  const checks = [
    {
      table: 'matches',
      columns: ['demand_id', 'status'],
      reason: 'Common filter: demand matches by status (PENDING/ACCEPTED)',
    },
    {
      table: 'matches',
      columns: ['supply_id', 'status'],
      reason: 'Common filter: supply matches by status',
    },
    {
      table: 'matches',
      columns: ['score'],
      reason: 'Sorting by match score for ranking',
    },
    {
      table: 'demands',
      columns: ['status', 'created_at'],
      reason: 'Pagination of open demands sorted by creation time',
    },
    {
      table: 'supplies',
      columns: ['status', 'created_at'],
      reason: 'Pagination of available supplies sorted by creation time',
    },
    {
      table: 'chat_messages',
      columns: ['chat_room_id', 'created_at'],
      reason: 'Message history pagination by room',
    },
    {
      table: 'notifications',
      columns: ['user_id', 'status', 'created_at'],
      reason: 'User notification list with status filter and ordering',
    },
    {
      table: 'points_transactions',
      columns: ['user_id', 'created_at'],
      reason: 'User transaction history sorted by date',
    },
    {
      table: 'reviews',
      columns: ['reviewee_id', 'status'],
      reason: 'User reviews filtered by moderation status',
    },
  ];

  for (const check of checks) {
    try {
      const indexes = await getTableIndexes(check.table);
      const indexDefs = indexes.map(i => i.indexdef.toLowerCase());

      const existing = indexDefs.some(def => check.columns.every(col => def.includes(col)));

      suggestions.push({
        table: check.table,
        columns: check.columns,
        reason: check.reason,
        existingIndex: existing,
      });
    } catch {
      suggestions.push({
        table: check.table,
        columns: check.columns,
        reason: check.reason,
        existingIndex: false,
      });
    }
  }

  return suggestions;
}

/**
 * Get table row counts and sizes
 */
export async function getTableStats(): Promise<
  Array<{
    tableName: string;
    rowCount: bigint;
    totalSize: string;
  }>
> {
  try {
    return await prisma.$queryRaw<
      Array<{
        tableName: string;
        rowCount: bigint;
        totalSize: string;
      }>
    >`
      SELECT
        relname AS "tableName",
        n_live_tup AS "rowCount",
        pg_size_pretty(pg_total_relation_size(relid)) AS "totalSize"
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
    `;
  } catch {
    return [];
  }
}
