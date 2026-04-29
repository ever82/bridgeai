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
    id: string;
    type: string;
    description: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    isActive: boolean;
    color: string | null;
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
    id: string;
    type: string;
    description: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    isActive: boolean;
    color: string | null;
    coordinates: import("@prisma/client/runtime/library").JsonValue | null;
    centerLat: number | null;
    centerLng: number | null;
    radiusMeters: number | null;
    createdBy: string | null;
}>;
/**
 * List all geo-fences (optionally filtered by creator)
 */
export declare function listGeoFences(options?: {
    createdBy?: string;
    activeOnly?: boolean;
}): Promise<{
    id: string;
    type: string;
    description: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    isActive: boolean;
    color: string | null;
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
    id: string;
    type: string;
    description: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    isActive: boolean;
    color: string | null;
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
    id: string;
    type: string;
    description: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    isActive: boolean;
    color: string | null;
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
    id: string;
    type: string;
    description: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    isActive: boolean;
    color: string | null;
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
    id: string;
    type: string;
    description: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    isActive: boolean;
    color: string | null;
    coordinates: import("@prisma/client/runtime/library").JsonValue | null;
    centerLat: number | null;
    centerLng: number | null;
    radiusMeters: number | null;
    createdBy: string | null;
}>;
//# sourceMappingURL=geoFenceService.d.ts.map