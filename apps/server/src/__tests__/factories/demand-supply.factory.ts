import { faker } from '@faker-js/faker';
import type { Demand, DemandStatus, Supply, SupplyStatus } from '@prisma/client';

/**
 * Factory for creating Demand test data
 */
export interface DemandFactoryData {
  id?: string;
  agentId?: string;
  title?: string;
  description?: string | null;
  tags?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: DemandStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Factory for creating Supply test data
 */
export interface SupplyFactoryData {
  id?: string;
  agentId?: string;
  title?: string;
  description?: string | null;
  skills?: string[];
  hourlyRate?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  availability?: Record<string, unknown> | null;
  status?: SupplyStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create a mock Demand object
 */
export function createDemand(data: DemandFactoryData = {}): Demand {
  const now = new Date();
  const budgetMin = data.budgetMin ?? faker.number.int({ min: 100, max: 500 });

  return {
    id: data.id ?? faker.string.uuid(),
    agentId: data.agentId ?? faker.string.uuid(),
    title: data.title ?? faker.lorem.sentence(3),
    description: data.description ?? faker.lorem.paragraph(),
    tags: data.tags ?? faker.helpers.arrayElements(
      ['web', 'mobile', 'design', 'backend', 'frontend', 'ai', 'consulting'],
      faker.number.int({ min: 1, max: 3 })
    ),
    budgetMin,
    budgetMax: data.budgetMax ?? budgetMin + faker.number.int({ min: 100, max: 1000 }),
    latitude: data.latitude ?? faker.location.latitude(),
    longitude: data.longitude ?? faker.location.longitude(),
    status: data.status ?? 'OPEN',
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
}

/**
 * Create a mock Supply object
 */
export function createSupply(data: SupplyFactoryData = {}): Supply {
  const now = new Date();

  return {
    id: data.id ?? faker.string.uuid(),
    agentId: data.agentId ?? faker.string.uuid(),
    title: data.title ?? faker.lorem.sentence(3),
    description: data.description ?? faker.lorem.paragraph(),
    skills: data.skills ?? faker.helpers.arrayElements(
      ['React', 'Node.js', 'Python', 'Design', 'AI/ML', 'DevOps', 'Mobile'],
      faker.number.int({ min: 2, max: 5 })
    ),
    hourlyRate: data.hourlyRate ?? faker.number.int({ min: 50, max: 300 }),
    latitude: data.latitude ?? faker.location.latitude(),
    longitude: data.longitude ?? faker.location.longitude(),
    availability: data.availability ?? null,
    status: data.status ?? 'AVAILABLE',
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
}

/**
 * Create multiple Demand objects
 */
export function createDemands(count: number, data: DemandFactoryData = {}): Demand[] {
  return Array.from({ length: count }, () => createDemand(data));
}

/**
 * Create multiple Supply objects
 */
export function createSupplies(count: number, data: SupplyFactoryData = {}): Supply[] {
  return Array.from({ length: count }, () => createSupply(data));
}

/**
 * Create a demand with specific tags
 */
export function createDemandWithTags(tags: string[], data: DemandFactoryData = {}): Demand {
  return createDemand({ ...data, tags });
}

/**
 * Create a supply with specific skills
 */
export function createSupplyWithSkills(skills: string[], data: SupplyFactoryData = {}): Supply {
  return createSupply({ ...data, skills });
}
