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
export declare function createDemand(data?: DemandFactoryData): Demand;
/**
 * Create a mock Supply object
 */
export declare function createSupply(data?: SupplyFactoryData): Supply;
/**
 * Create multiple Demand objects
 */
export declare function createDemands(count: number, data?: DemandFactoryData): Demand[];
/**
 * Create multiple Supply objects
 */
export declare function createSupplies(count: number, data?: SupplyFactoryData): Supply[];
/**
 * Create a demand with specific tags
 */
export declare function createDemandWithTags(tags: string[], data?: DemandFactoryData): Demand;
/**
 * Create a supply with specific skills
 */
export declare function createSupplyWithSkills(skills: string[], data?: SupplyFactoryData): Supply;
//# sourceMappingURL=demand-supply.factory.d.ts.map