/**
 * Credit Score API client
 * Handles user credit score operations
 */

import type { CreditScoreResponse } from '@bridgeai/shared';

import { api } from './client';

export const creditApi = {
  /**
   * Get current user's credit score
   */
  getCreditScore: (): Promise<CreditScoreResponse> =>
    api.get<CreditScoreResponse>('/v1/credit/score').then(r => r.data.data),
};
