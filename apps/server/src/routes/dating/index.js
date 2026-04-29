import { Router } from 'express';
import profileRoutes from './profile.routes';
const router = Router();
// Mount routes
router.use('/', profileRoutes);
export default router;
//# sourceMappingURL=index.js.map