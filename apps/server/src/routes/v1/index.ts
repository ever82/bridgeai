import { Router } from 'express';
import healthRoutes from './health';
import authRoutes from './auth';

const router: Router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Placeholder for future routes
// router.use('/users', userRoutes);
// router.use('/agents', agentRoutes);
// router.use('/chats', chatRoutes);
// router.use('/matches', matchRoutes);

export default router;
