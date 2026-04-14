/**
 * Merchant Types
 * Types and interfaces for merchant management
 */

export enum MerchantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface BusinessHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
}

export interface Merchant {
  id: string;
  agentId: string;
  name: string;
  address?: string;
  phone?: string;
  businessHours?: BusinessHours;
  description?: string;
  logoUrl?: string;
  category?: string;
  status: MerchantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMerchantInput {
  agentId: string;
  name: string;
  address?: string;
  phone?: string;
  businessHours?: BusinessHours;
  description?: string;
  logoUrl?: string;
  category?: string;
}

export interface UpdateMerchantInput {
  name?: string;
  address?: string;
  phone?: string;
  businessHours?: BusinessHours;
  description?: string;
  logoUrl?: string;
  category?: string;
  status?: MerchantStatus;
}

export interface MerchantFilterOptions {
  status?: MerchantStatus;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface MerchantListResult {
  merchants: Merchant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
