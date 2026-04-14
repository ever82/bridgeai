/**
 * Match Routes
 * 匹配度计算 API 端点
 */

import { Router, Request, Response } from 'express';
import { MatchScoringModel, MatchConfig } from '../services/matchAlgorithm';
import { L1Matcher, L1Attributes } from '../services/matchers/L1Matcher';
import { L2Matcher, L2StructuredData } from '../services/matchers/L2Matcher';
import { L3Matcher, L3SemanticData } from '../services/matchers/L3Matcher';

const router = Router();

// 缓存实例
const modelCache = new Map<string, MatchScoringModel>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

/**
 * 获取或创建匹配模型
 */
function getMatchModel(scene: string, config?: Partial<MatchConfig>): MatchScoringModel {
  const cacheKey = `${scene}_${JSON.stringify(config || {})}`;

  if (!modelCache.has(cacheKey)) {
    const model = new MatchScoringModel({ scene, ...config });
    modelCache.set(cacheKey, model);

    // 设置缓存过期
    setTimeout(() => modelCache.delete(cacheKey), CACHE_TTL);
  }

  return modelCache.get(cacheKey)!;
}

/**
 * POST /api/v1/matches/calculate
 * 计算单个供需匹配度
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const {
      supply,
      demand,
      scene = 'default',
      config,
    } = req.body;

    if (!supply || !demand) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: supply, demand',
      });
    }

    // 获取匹配模型
    const model = getMatchModel(scene, config);

    // L1 匹配
    const l1Matcher = new L1Matcher();
    const l1Score = l1Matcher.calculate(
      supply.l1Attributes as L1Attributes,
      demand.l1Attributes as L1Attributes
    );

    // L2 匹配
    const l2Matcher = new L2Matcher();
    const l2Score = l2Matcher.calculate(
      supply.l2Data as L2StructuredData,
      demand.l2Data as L2StructuredData
    );

    // L3 匹配（异步）
    const l3Matcher = new L3Matcher();
    const l3Result = await l3Matcher.calculate(
      supply.l3Data as L3SemanticData,
      demand.l3Data as L3SemanticData
    );

    // 构建维度数据
    const dimensions = [
      { name: '基础属性', weight: 0.3, score: l1Score },
      { name: '结构化信息', weight: 0.3, score: l2Score },
      { name: '语义匹配', weight: 0.4, score: l3Result.score },
      { name: '地理位置', weight: 0.15, score: l1Matcher.calculate(supply.l1Attributes, demand.l1Attributes) },
      { name: '时间匹配', weight: 0.1, score: l1Score * 0.8 },
    ];

    // 计算综合分数
    const result = model.calculateScore(l1Score, l2Score, l3Result.score, dimensions);

    res.json({
      success: true,
      data: {
        ...result,
        l3Details: {
          semanticSimilarity: l3Result.semanticSimilarity,
          intentAlignment: l3Result.intentAlignment,
          constraintCompatibility: l3Result.constraintCompatibility,
          reasoning: l3Result.reasoning,
          matchedKeywords: l3Result.matchedKeywords,
        },
      },
    });
  } catch (error) {
    console.error('Match calculation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Calculation failed',
    });
  }
});

/**
 * POST /api/v1/matches/batch
 * 批量计算匹配度
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const {
      supply,
      demands,
      scene = 'default',
      config,
    } = req.body;

    if (!supply || !demands || !Array.isArray(demands)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: supply, demands (array)',
      });
    }

    const model = getMatchModel(scene, config);
    const l1Matcher = new L1Matcher();
    const l2Matcher = new L2Matcher();
    const l3Matcher = new L3Matcher();

    // 批量计算
    const results = await Promise.all(
      demands.map(async (demand: any) => {
        const l1Score = l1Matcher.calculate(
          supply.l1Attributes as L1Attributes,
          demand.l1Attributes as L1Attributes
        );

        const l2Score = l2Matcher.calculate(
          supply.l2Data as L2StructuredData,
          demand.l2Data as L2StructuredData
        );

        const l3Result = await l3Matcher.calculate(
          supply.l3Data as L3SemanticData,
          demand.l3Data as L3SemanticData
        );

        const dimensions = [
          { name: '基础属性', weight: 0.3, score: l1Score },
          { name: '结构化信息', weight: 0.3, score: l2Score },
          { name: '语义匹配', weight: 0.4, score: l3Result.score },
        ];

        const result = model.calculateScore(l1Score, l2Score, l3Result.score, dimensions);

        return {
          demandId: demand.id,
          ...result,
        };
      })
    );

    // 按分数排序
    results.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: {
        results,
        total: results.length,
        topMatches: results.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Batch match calculation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Batch calculation failed',
    });
  }
});

/**
 * GET /api/v1/matches/:id
 * 获取匹配结果详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 从缓存或数据库获取匹配结果
    // 这里简化处理，实际应从持久化存储获取

    res.json({
      success: true,
      data: {
        id,
        status: 'calculated',
        message: 'Match result retrieved',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get match result',
    });
  }
});

/**
 * POST /api/v1/matches/explain
 * 获取匹配解释
 */
router.post('/explain', async (req: Request, res: Response) => {
  try {
    const { supply, demand, scene = 'default' } = req.body;

    if (!supply || !demand) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: supply, demand',
      });
    }

    const model = getMatchModel(scene);
    const l1Matcher = new L1Matcher();
    const l2Matcher = new L2Matcher();
    const l3Matcher = new L3Matcher();

    const l1Score = l1Matcher.calculate(
      supply.l1Attributes as L1Attributes,
      demand.l1Attributes as L1Attributes
    );

    const l2Score = l2Matcher.calculate(
      supply.l2Data as L2StructuredData,
      demand.l2Data as L2StructuredData
    );

    const l3Result = await l3Matcher.calculate(
      supply.l3Data as L3SemanticData,
      demand.l3Data as L3SemanticData
    );

    const dimensions = [
      { name: '基础属性匹配', weight: 0.3, score: l1Score },
      { name: '结构化信息匹配', weight: 0.3, score: l2Score },
      { name: '语义匹配', weight: 0.4, score: l3Result.score },
    ];

    const result = model.calculateScore(l1Score, l2Score, l3Result.score, dimensions);

    // 生成详细解释
    const explanation = {
      overview: result.explanation,
      breakdown: {
        l1: {
          score: result.l1Score,
          details: '基于类别、位置、时间、标签的基础属性匹配',
          factors: [
            { name: '类别匹配', contribution: '25%' },
            { name: '地理位置', contribution: '30%' },
            { name: '时间范围', contribution: '20%' },
            { name: '标签匹配', contribution: '25%' },
          ],
        },
        l2: {
          score: result.l2Score,
          details: '基于价格、数量、规格的结构化信息匹配',
          factors: [
            { name: '价格匹配', contribution: '30%' },
            { name: '数量匹配', contribution: '25%' },
            { name: '规格匹配', contribution: '25%' },
            { name: '条件匹配', contribution: '20%' },
          ],
        },
        l3: {
          score: result.l3Score,
          details: '基于语义理解和意图分析的AI匹配',
          factors: [
            { name: '内容相似度', contribution: '40%' },
            { name: '意图对齐', contribution: '35%' },
            { name: '约束兼容', contribution: '25%' },
          ],
          reasoning: l3Result.reasoning,
          matchedKeywords: l3Result.matchedKeywords,
        },
      },
      recommendations: [],
    };

    // 添加改进建议
    if (result.l1Score < 0.6) {
      explanation.recommendations.push('调整位置或时间要求以扩大匹配范围');
    }
    if (result.l2Score < 0.6) {
      explanation.recommendations.push('调整价格或数量期望以提高匹配度');
    }
    if (result.l3Score < 0.6) {
      explanation.recommendations.push('优化描述内容，增加关键词匹配');
    }

    res.json({
      success: true,
      data: explanation,
    });
  } catch (error) {
    console.error('Match explanation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Explanation failed',
    });
  }
});

/**
 * GET /api/v1/matches/config/:scene
 * 获取场景匹配配置
 */
router.get('/config/:scene', (req: Request, res: Response) => {
  try {
    const { scene } = req.params;
    const model = getMatchModel(scene);
    const config = model.getConfig();

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get config',
    });
  }
});

export default router;
