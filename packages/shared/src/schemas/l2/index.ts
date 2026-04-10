// L2 Schema Definitions
export * from './types';
export { default as visionShareL2Schema } from './visionShare';
export { default as agentDateL2Schema } from './agentDate';
export { default as agentJobL2Schema } from './agentJob';
export { default as agentAdL2Schema } from './agentAd';

import { L2Schema } from './types';
import visionShareL2Schema from './visionShare';
import agentDateL2Schema from './agentDate';
import agentJobL2Schema from './agentJob';
import agentAdL2Schema from './agentAd';

// Schema registry
export const L2_SCHEMAS: Record<string, L2Schema> = {
  VISIONSHARE: visionShareL2Schema,
  AGENTDATE: agentDateL2Schema,
  AGENTJOB: agentJobL2Schema,
  AGENTAD: agentAdL2Schema,
};

// Get schema by scene code
export function getL2Schema(scene: string): L2Schema | undefined {
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
