/**
 * Scene Routes v1
 * 场景配置路由 v1
 */

import { Router } from 'express';
import sceneRoutes from '../scene';

const router = Router();

// Mount all scene routes under /v1/scenes
router.use('/', sceneRoutes);

export default router;
