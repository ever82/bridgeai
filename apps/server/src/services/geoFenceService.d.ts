/**
 * Geo-Fence Service (Database-backed)
 * 地理围栏服务 - 基于 Prisma 持久化
 */
import type { GeoCoordinates, GeoFenceCheckResult } from '@bridgeai/shared';
export interface CreateGeoFenceInput {
    name: string;
    description?: string;
    type?: 'POLYGON' | 'CIRCLE' | 'RECTANGLE';
    coordinates: number[][][];
    centerLat?: number;
    centerLng?: number;
    radiusMeters?: number;
    color?: string;
    createdBy?: string;
    metadata?: Record<string, unknown>;
}
export interface UpdateGeoFenceInput {
    name?: string;
    description?: string;
    coordinates?: number[][][];
    centerLat?: number;
    centerLng?: number;
    radiusMeters?: number;
    color?: string;
    isActive?: boolean;
    metadata?: Record<string, unknown>;
}
/**
 * Create a new geo-fence
 */
export declare function createGeoFence(input: CreateGeoFenceInput): Promise<{
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    id: string;
    name: string;
    type: string;
    createdAt: Date;
    color: string | null;
    description: string | null;
    updatedAt: Date;
    isActive: boolean;
    coordinates: import("@prisma/client/runtime/library").JsonValue | null;
    centerLat: number | null;
    centerLng: number | null;
    radiusMeters: number | null;
    createdBy: string | null;
}>;
/**
 * Get geo-fence by ID
 */
export declare function getGeoFence(id: string): Promise<{
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    id: string;
    name: string;
    type: string;
    createdAt: Date;
    color: string | null;
    description: string | null;
    updatedAt: Date;
    isActive: boolean;
    coordinates: import("@prisma/client/runtime/library").JsonValue | null;
    centerLat: number | null;
    centerLng: number | null;
    radiusMeters: number | null;
    createdBy: string | null;
} | null>;
/**
 * List all geo-fences (optionally filtered by creator)
 */
export declare function listGeoFences(options?: {
    createdBy?: string;
    activeOnly?: boolean;
}): Promise<{
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    id: string;
    name: string;
    type: string;
    createdAt: Date;
    color: string | null;
    description: string | null;
    updatedAt: Date;
    isActive: boolean;
    coordinates: import("@prisma/client/runtime/library").JsonValue | null;
    centerLat: number | null;
    centerLng: number | null;
    radiusMeters: number | null;
    createdBy: string | null;
}[]>;
/**
 * Update geo-fence
 */
export declare function updateGeoFence(id: string, input: UpdateGeoFenceInput): Promise<{
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    id: string;
    name: string;
    type: string;
    createdAt: Date;
    color: string | null;
    description: string | null;
    updatedAt: Date;
    isActive: boolean;
    coordinates: import("@prisma/client/runtime/library").JsonValue | null;
    centerLat: number | null;
    centerLng: number | null;
    radiusMeters: number | null;
    createdBy: string | null;
}>;
/**
 * Delete geo-fence
 */
export declare function deleteGeoFence(id: string): Promise<{
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    id: string;
    name: string;
    type: string;
    createdAt: Date;
    color: string | null;
    description: string | null;
    updatedAt: Date;
    isActive: boolean;
    coordinates: import("@prisma/client/runtime/library").JsonValue | null;
    centerLat: number | null;
    centerLng: number | null;
    radiusMeters: number | null;
    createdBy: string | null;
}>;
/**
 * Check if a point is inside a geo-fence
 */
export declare function checkPointInFence(point: GeoCoordinates, fenceId: string): Promise<GeoFenceCheckResult>;
/**
 * Check a point against multiple fences
 */
export declare function checkMultipleFences(point: GeoCoordinates, fenceIds: string[]): Promise<Record<string, GeoFenceCheckResult>>;
/**
 * Find all fences containing a point
 */
export declare function findContainingFences(point: GeoCoordinates): Promise<{
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    id: string;
    name: string;
    type: string;
    createdAt: Date;
    color: string | null;
    description: string | null;
    updatedAt: Date;
    isActive: boolean;
    coordinates: import("@prisma/client/runtime/library").JsonValue | null;
    centerLat: number | null;
    centerLng: number | null;
    radiusMeters: number | null;
    createdBy: string | null;
}[]>;
/**
 * Create a circular geo-fence (approximated as polygon)
 */
export declare function createCircularFence(name: string, center: GeoCoordinates, radiusMeters: number, options?: {
    description?: string;
    createdBy?: string;
    segments?: number;
    color?: string;
}): Promise<{
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    id: string;
    name: string;
    type: string;
    createdAt: Date;
    color: string | null;
    description: string | null;
    updatedAt: Date;
    isActive: boolean;
    coordinates: import("@prisma/client/runtime/library").JsonValue | null;
    centerLat: number | null;
    centerLng: number | null;
    radiusMeters: number | null;
    createdBy: string | null;
}>;
//# sourceMappingURL=geoFenceService.d.ts.map