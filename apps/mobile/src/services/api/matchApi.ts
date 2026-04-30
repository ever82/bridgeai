/**
 * Match API Service
 *
 * API functions for match management (query, cancel, stats)
 */

import { api } from './client';

/**
 * Cancel a pending match (pre-match exit)
 *
 * Server endpoint: POST /matches/cancel
 */
export const cancelMatch = async (matchId: string): Promise<void> => {
  await api.post('/matches/cancel', { matchId });
};

/**
 * Get match list for the current user
 *
 * Server endpoint: GET /matches
 */
export const getMatches = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  matches: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}> => {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const response = await api.get(`/matches?${query.toString()}`);
  return response.data.data;
};

export default {
  cancelMatch,
  getMatches,
};
