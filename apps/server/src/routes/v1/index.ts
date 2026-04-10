import { Router } from 'express';
import healthRoutes from './health';
import userRoutes from '../users';
import uploadRoutes from '../upload';
import creditRoutes from '../credit';

const router: Router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);
router.use('/credit', creditRoutes);

// Placeholder for future routes
// router.use('/auth', authRoutes);
// router.use('/agents', agentRoutes);
// router.use('/chats', chatRoutes);
// router.use('/matches', matchRoutes);

export default router;
