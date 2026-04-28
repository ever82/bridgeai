import { L2Schema, L2SchemaField, L2Data, L2ValidationResult } from '@bridgeai/shared';
/**
 * Validate L2 data against schema
 */
export declare function validateL2Data(data: L2Data, schema: L2Schema): L2ValidationResult;
/**
 * Get field value label for display
 */
export declare function getFieldValueLabel(field: L2SchemaField, value: any): string;
/**
 * Filter visible fields based on conditional logic
 */
export declare function getVisibleFields(schema: L2Schema, data: L2Data): L2SchemaField[];
/**
 * Calculate L2 completion percentage
 */
export declare function calculateL2Completion(data: L2Data, schema: L2Schema): {
    percentage: number;
    filled: number;
    total: number;
};
//# sourceMappingURL=l2Validation.d.ts.map