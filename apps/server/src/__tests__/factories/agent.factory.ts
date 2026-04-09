import { faker } from '@faker-js/faker';
import type { Agent, AgentType } from '@prisma/client';

/**
 * Factory for creating Agent test data
 */
export interface AgentFactoryData {
  id?: string;
  userId?: string;
  type?: AgentType;
  name?: string;
  config?: Record<string, unknown> | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create a mock Agent object
 */
export function createAgent(data: AgentFactoryData = {}): Agent {
  const now = new Date();

  return {
    id: data.id ?? faker.string.uuid(),
    userId: data.userId ?? faker.string.uuid(),
    type: data.type ?? faker.helpers.arrayElement<AgentType>(['DEMAND', 'SUPPLY']),
    name: data.name ?? faker.company.name(),
    config: data.config ?? null,
    latitude: data.latitude ?? faker.location.latitude(),
    longitude: data.longitude ?? faker.location.longitude(),
    isActive: data.isActive ?? true,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
}

/**
 * Create multiple Agent objects
 */
export function createAgents(count: number, data: AgentFactoryData = {}): Agent[] {
  return Array.from({ length: count }, () => createAgent(data));
}

/**
 * Create a demand agent
 */
export function createDemandAgent(data: Omit<AgentFactoryData, 'type'> = {}): Agent {
  return createAgent({ ...data, type: 'DEMAND' });
}

/**
 * Create a supply agent
 */
export function createSupplyAgent(data: Omit<AgentFactoryData, 'type'> = {}): Agent {
  return createAgent({ ...data, type: 'SUPPLY' });
}

/**
 * Create an agent at a specific location
 */
export function createAgentAtLocation(
  latitude: number,
  longitude: number,
  data: AgentFactoryData = {}
): Agent {
  return createAgent({ ...data, latitude, longitude });
}
