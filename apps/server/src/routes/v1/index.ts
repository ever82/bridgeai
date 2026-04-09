import { Router } from 'express';
import healthRoutes from './health';

const router: Router = Router();

// Mount routes
router.use('/health', healthRoutes);

// Placeholder for future routes
// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/agents', agentRoutes);
// router.use('/chats', chatRoutes);
// router.use('/matches', matchRoutes);

export default router;
