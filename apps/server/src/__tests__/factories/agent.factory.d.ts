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
    creditScore?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
/**
 * Create a mock Agent object
 */
export declare function createAgent(data?: AgentFactoryData): Agent;
/**
 * Create multiple Agent objects
 */
export declare function createAgents(count: number, data?: AgentFactoryData): Agent[];
/**
 * Create a demand agent
 */
export declare function createDemandAgent(data?: Omit<AgentFactoryData, 'type'>): Agent;
/**
 * Create a supply agent
 */
export declare function createSupplyAgent(data?: Omit<AgentFactoryData, 'type'>): Agent;
/**
 * Create an agent at a specific location
 */
export declare function createAgentAtLocation(latitude: number, longitude: number, data?: AgentFactoryData): Agent;
//# sourceMappingURL=agent.factory.d.ts.map