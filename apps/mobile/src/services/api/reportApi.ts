import { ApiResponse } from '../../types';

import { api } from './client';

export type ReportTargetType = 'MESSAGE' | 'USER' | 'CONTENT';
export type ReportReason = 'SPAM' | 'INAPPROPRIATE' | 'FALSE' | 'HARASSMENT' | 'OTHER';

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
  evidence?: string[];
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  evidence: string[] | null;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  handledBy: string | null;
  handledAt: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

// POST /api/v1/reports - Create a report
export const createReport = async (
  payload: CreateReportRequest
): Promise<ApiResponse<Report>> => {
  const response = await api.post<Report>('/reports', payload);
  return response.data;
};
