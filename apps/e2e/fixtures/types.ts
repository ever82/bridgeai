/**
 * 测试数据类型定义
 */

export interface TestUser {
  id: string;
  email: string;
  nickname: string;
  token: string;
}

export interface TestAgent {
  id: string;
  name: string;
  scene: string;
}

export interface TestData {
  users: TestUser[];
  agents: TestAgent[];
  conversations: string[];
}

export interface VisionShareDemand {
  id?: string;
  title: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  radius: number;
  reward: number;
}

export interface AgentDateProfile {
  id?: string;
  userId?: string;
  age: number;
  gender: string;
  interests: string[];
  preferences: {
    ageRange: [number, number];
    gender: string;
    location: string;
  };
}

export interface AgentJobProfile {
  id?: string;
  userId?: string;
  type: 'jobseeker' | 'employer';
  skills?: string[];
  experience?: string;
  expectations?: {
    salary: [number, number];
    location: string;
    remote: boolean;
  };
}

export interface AgentAdProfile {
  id?: string;
  userId?: string;
  type: 'consumer' | 'merchant';
  interests?: string[];
  budget?: number;
  location?: string;
}
