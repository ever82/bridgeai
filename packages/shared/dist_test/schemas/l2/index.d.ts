export * from './types';
export { default as visionShareL2Schema } from './visionShare';
export { default as agentDateL2Schema } from './agentDate';
export { default as agentJobL2Schema } from './agentJob';
export { default as agentAdL2Schema } from './agentAd';
export { default as agentAdConsumerL2Schema } from './agentAdConsumer';
import { L2Schema } from './types';
export declare const L2_SCHEMAS: Record<string, L2Schema>;
export declare function getL2Schema(scene: string, role?: string): L2Schema | undefined;
export declare function getAllL2Schemas(): L2Schema[];
export declare function getL2SchemaIds(): string[];
//# sourceMappingURL=index.d.ts.map