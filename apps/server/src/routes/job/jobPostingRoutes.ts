/**
 * Job Posting Routes
 *
 * Routes for job posting management
 */

import { Router } from 'express';
import {
  createJob,
  getJob,
  updateJob,
  updateStatus,
  refreshJob,
  deleteJob,
  listJobs,
  getMyJobs,
  getJobStatistics,
  getMyStatistics,
  getApplications,
  updateApplication,
  evaluateJobQuality,
  extractJob,
} from '../../controllers/job/jobPostingController';

const router: Router = Router();

// Public routes
router.get('/', listJobs);
router.get('/:id', getJob);

// Protected routes - require authentication
router.post('/', createJob);
router.get('/my/jobs', getMyJobs);
router.get('/my/stats', getMyStatistics);
router.put('/:id', updateJob);
router.patch('/:id/status', updateStatus);
router.post('/:id/refresh', refreshJob);
router.delete('/:id', deleteJob);
router.get('/:id/stats', getJobStatistics);
router.get('/:id/applications', getApplications);
router.patch('/:id/applications/:applicationId', updateApplication);
router.get('/:id/evaluate', evaluateJobQuality);

// AI extraction route
router.post('/extract', extractJob);

export default router;
