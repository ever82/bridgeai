import { Router } from 'express';
import healthRoutes from './health';
import authRoutes from '../auth';
import userRoutes from '../users';
import uploadRoutes from '../upload';

const router: Router = Router();

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/users', uploadRoutes);

export default router;
