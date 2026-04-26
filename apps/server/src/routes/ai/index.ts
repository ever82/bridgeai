/**
 * AI Routes Index
 * AI服务路由主入口
 */

import { Router } from 'express';

import llmRoutes from '../aiRoute';

import extractionRoutes from './extraction';
import negotiationRoutes from './negotiation';
import supplyRoutes from './supply';
import visionRoutes from './vision';
import dialogRoutes from './dialog';

const router: Router = Router();

// LLM服务路由
router.use('/', llmRoutes);

// Vision API路由
router.use('/vision', visionRoutes);

// L3自然语言提取路由
router.use('/', extractionRoutes);

// 供给提取路由
router.use('/supply', supplyRoutes);

// 协商路由
router.use('/negotiation', negotiationRoutes);

// Agent对话路由
router.use('/dialog', dialogRoutes);

export default router;
