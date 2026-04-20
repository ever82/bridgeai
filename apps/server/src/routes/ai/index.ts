/**
 * AI Routes Index
 * AI服务路由主入口
 */

import { Router } from 'express';

import llmRoutes from '../aiRoute';

import visionRoutes from './vision';
import supplyRoutes from './supply';

const router = Router();

// LLM服务路由
router.use('/', llmRoutes);

// Vision API路由
router.use('/vision', visionRoutes);

// Supply Extraction API路由
router.use('/supply', supplyRoutes);

export default router;
