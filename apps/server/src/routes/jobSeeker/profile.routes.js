/**
 * Job Seeker Profile Routes
 *
 * Routes for job seeker profile and resume management
 */
import { Router } from 'express';
import { create, get, getMyProfiles, getMyPrimaryProfile, getStats, update, remove, updatePrivacy, getQuality, getTimeline, exportResume, browse, parseResume, } from '../../controllers/jobSeeker/profileController';
import { authenticate } from '../../middleware/auth';
const router = Router();
// Public routes
router.get('/', browse);
// Parse resume (AI extraction)
router.post('/parse', authenticate, parseResume);
// Protected routes
router.post('/', authenticate, create);
router.get('/me', authenticate, getMyProfiles);
router.get('/me/primary', authenticate, getMyPrimaryProfile);
router.get('/me/stats', authenticate, getStats);
router.get('/:id', authenticate, get);
router.put('/:id', authenticate, update);
router.delete('/:id', authenticate, remove);
router.patch('/:id/visibility', authenticate, updatePrivacy);
router.get('/:id/quality', authenticate, getQuality);
router.get('/:id/timeline', authenticate, getTimeline);
router.get('/:id/export', authenticate, exportResume);
export default router;
//# sourceMappingURL=profile.routes.js.map