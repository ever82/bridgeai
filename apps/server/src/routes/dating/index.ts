import { Router } from 'express';

import profileRoutes from './profile.routes';

const router: Router = Router();

// Mount routes
router.use('/', profileRoutes);

export default router;
