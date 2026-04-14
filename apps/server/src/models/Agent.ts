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

  // Skills and expertise
  skills: string[];
  category?: string;
  specializations?: string[];

  // Ratings and reviews
  rating: number;
  reviewCount?: number;

  // Pricing
  hourlyRate: number;
  currency?: string;

  // Status
  isAvailable: boolean;
  isVerified: boolean;
  status?: 'active' | 'inactive' | 'suspended';

  // Experience
  experienceYears: number;
  completedProjects?: number;

  // Platform metrics
  creditScore?: number;
  trustScore?: number;

  // Location and language
  location?: string;
  timezone?: string;
  languages?: string[];

  // Activity tracking
  lastActiveAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  // User relation
  userId?: string;

  // Profile relation (for Prisma include)
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
