// L2 Schema Definitions
export * from './types';
export { default as visionShareL2Schema } from './visionShare';
export { default as agentDateL2Schema } from './agentDate';
export { default as agentJobL2Schema } from './agentJob';
export { default as agentAdL2Schema } from './agentAd';
export { default as agentAdConsumerL2Schema } from './agentAdConsumer';

import { L2Schema } from './types';
import visionShareL2Schema from './visionShare';
import agentDateL2Schema from './agentDate';
import agentJobL2Schema from './agentJob';
import agentAdL2Schema from './agentAd';
import agentAdConsumerL2Schema from './agentAdConsumer';

// Schema registry
export const L2_SCHEMAS: Record<string, L2Schema> = {
  VISIONSHARE: visionShareL2Schema,
  AGENTDATE: agentDateL2Schema,
  AGENTJOB: agentJobL2Schema,
  AGENTAD: agentAdL2Schema,
  AGENTAD_CONSUMER: agentAdConsumerL2Schema,
};

// Get schema by scene code
export function getL2Schema(scene: string, role?: string): L2Schema | undefined {
  // For AgentAd with CONSUMER role, use consumer schema
  if (scene === 'AGENTAD' && role === 'CONSUMER') {
    return agentAdConsumerL2Schema;
  }
  return L2_SCHEMAS[scene];
}

// Get all schemas
export function getAllL2Schemas(): L2Schema[] {
  return Object.values(L2_SCHEMAS);
}

// Get schema IDs
export function getL2SchemaIds(): string[] {
  return Object.keys(L2_SCHEMAS);
}
