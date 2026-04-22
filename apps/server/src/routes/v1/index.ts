import { Router } from 'express';

import userRoutes from '../users';
import uploadRoutes from '../upload';
import creditRoutes from '../credit';
import agentRoutes from '../agents';
import agentProfileRoutes from '../agentProfile';
import locationRoutes from '../locationRoutes';
import aiRoutes from '../ai';
import aiExtractionRoutes from '../ai/extraction';
import merchantRoutes from '../merchants';
import offerRoutes from '../offers';
import jobPostingRoutes from '../job/jobPostingRoutes';
import consumerDemandRoutes from '../consumerDemand';
import reviewRoutes from '../reviews';
import authRoutes from '../auth';
import disclosureRoutes from '../disclosure';
import userPrivacyRoutes from '../userPrivacy';
import { strictAuthLimiter } from '../../middleware/rateLimiter';

import healthRoutes from './health';
import sceneRoutes from './scene';

const router: Router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', strictAuthLimiter, authRoutes);
router.use('/scenes', sceneRoutes);
router.use('/disclosure', disclosureRoutes);
router.use('/users', userRoutes);
router.use('/users', userPrivacyRoutes);
router.use('/upload', uploadRoutes);
router.use('/credit', creditRoutes);
router.use('/agents', agentRoutes);
router.use('/agents', agentProfileRoutes);
router.use('/location', locationRoutes);
router.use('/ai', aiRoutes);
router.use('/ai', aiExtractionRoutes);
router.use('/merchants', merchantRoutes);
router.use('/offers', offerRoutes);
router.use('/jobs', jobPostingRoutes);
router.use('/consumer', consumerDemandRoutes);
router.use('/reviews', reviewRoutes);

// Placeholder for future routes
// router.use('/chats', chatRoutes);
// router.use('/matches', matchRoutes);

export default router;
