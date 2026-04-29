import { Router } from 'express';
import v1Routes from './v1';
const router = Router();
// API Version 1
router.use('/v1', v1Routes);
// Default to v1 for backward compatibility
router.use('/', v1Routes);
export default router;
//# sourceMappingURL=index.js.map