/**
 * Agent Model
 * Defines the Agent entity for the smart filtering system
 */
export interface Agent {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    bio?: string;
    skills: string[];
    category?: string;
    specializations?: string[];
    rating: number;
    reviewCount?: number;
    hourlyRate: number;
    currency?: string;
    isAvailable: boolean;
    isVerified: boolean;
    status?: 'active' | 'inactive' | 'suspended';
    experienceYears: number;
    completedProjects?: number;
    creditScore?: number;
    trustScore?: number;
    location?: string;
    timezone?: string;
    languages?: string[];
    lastActiveAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    userId?: string;
    profile?: any;
}
export interface AgentProfile {
    id: string;
    agentId: string;
    portfolio?: string[];
    certifications?: string[];
    education?: Education[];
    workHistory?: WorkExperience[];
}
export interface Education {
    institution: string;
    degree: string;
    field?: string;
    startYear?: number;
    endYear?: number;
}
export interface WorkExperience {
    company: string;
    title: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    current?: boolean;
}
export interface AgentStats {
    agentId: string;
    totalEarnings: number;
    totalHoursWorked: number;
    clientCount: number;
    repeatClientRate: number;
    onTimeDeliveryRate: number;
    responseTimeMinutes: number;
}
//# sourceMappingURL=Agent.d.ts.map