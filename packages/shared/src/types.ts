// Shared types
export * from './types/agent';
export * from './types/agentProfile';
export * from './types/location';
export * from './types/filter';
export * from './types/scene';
export * from './types/points';
export * from './types/task';
export * from './schemas/l2';
export * from './schemas/sceneFields';

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
