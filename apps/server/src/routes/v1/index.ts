import { Router } from 'express';
import healthRoutes from './health';
import userRoutes from '../users';
import uploadRoutes from '../upload';
import creditRoutes from '../credit';
import agentRoutes from '../agents';
import agentProfileRoutes from '../agentProfile';
import locationRoutes from '../locationRoutes';
import aiRoutes from '../ai';
import sceneRoutes from './scene';

const router: Router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);
router.use('/credit', creditRoutes);
router.use('/agents', agentRoutes);
router.use('/agents', agentProfileRoutes);
router.use('/location', locationRoutes);
router.use('/ai', aiRoutes);
router.use('/scenes', sceneRoutes);

// Placeholder for future routes
// router.use('/auth', authRoutes);
// router.use('/chats', chatRoutes);
// router.use('/matches', matchRoutes);

export default router;
