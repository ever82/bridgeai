import { Router } from 'express';
import healthRoutes from './health';
import userRoutes from '../users';
import uploadRoutes from '../upload';
import creditRoutes from '../credit';
import agentRoutes from '../agents';
import agentProfileRoutes from '../agentProfile';
import locationRoutes from '../locationRoutes';
<<<<<<< HEAD
import aiRoutes from '../ai';
import aiExtractionRoutes from '../ai/extraction';
import merchantRoutes from '../merchants';
import offerRoutes from '../offers';
=======
import aiExtractionRoutes from '../ai/extraction';
import jobPostingRoutes from '../job/jobPostingRoutes';
import consumerDemandRoutes from '../consumerDemand';
>>>>>>> issue/issue-job002

const router: Router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);
router.use('/credit', creditRoutes);
router.use('/agents', agentRoutes);
router.use('/agents', agentProfileRoutes);
router.use('/location', locationRoutes);
<<<<<<< HEAD
router.use('/ai', aiRoutes);
router.use('/ai', aiExtractionRoutes);
router.use('/merchants', merchantRoutes);
router.use('/offers', offerRoutes);
=======
router.use('/ai', aiExtractionRoutes);
router.use('/jobs', jobPostingRoutes);
router.use('/consumer', consumerDemandRoutes);
>>>>>>> issue/issue-job002

// Placeholder for future routes
// router.use('/auth', authRoutes);
// router.use('/chats', chatRoutes);
// router.use('/matches', matchRoutes);

export default router;
