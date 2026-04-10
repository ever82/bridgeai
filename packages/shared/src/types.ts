// Shared types
export * from './types/agent';
export * from './types/agentProfile';
export * from './schemas/l2';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
