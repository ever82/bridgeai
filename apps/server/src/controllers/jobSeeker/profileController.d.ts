/**
 * Job Seeker Profile Controller
 *
 * HTTP handlers for job seeker profile management
 */
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
/**
 * Create a new job seeker profile
 */
export declare function create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get profile by ID
 */
export declare function get(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get all profiles for current user
 */
export declare function getMyProfiles(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get primary profile
 */
export declare function getMyPrimaryProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Update a profile
 */
export declare function update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Delete a profile
 */
export declare function remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Update visibility settings
 */
export declare function updatePrivacy(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get quality report
 */
export declare function getQuality(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get work timeline
 */
export declare function getTimeline(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Export resume to markdown
 */
export declare function exportResume(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * List profiles (admin/browse)
 */
export declare function browse(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Parse natural language resume
 */
export declare function parseResume(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get profile stats for current user
 */
export declare function getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=profileController.d.ts.map