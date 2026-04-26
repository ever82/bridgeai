/**
 * ISSUE-F001 Human Acceptance Script
 * 交互式验收脚本 - 逐步验证每个 AC
 */

import { L2FieldType } from '@bridgeai/shared';

import { sceneDetector } from '../services/ai/extractors/sceneDetector';
import { VisionShareExtractor } from '../services/ai/extractors/visionShareExtractor';
import { AgentDateExtractor } from '../services/ai/extractors/agentDateExtractor';
import { AgentJobExtractor } from '../services/ai/extractors/agentJobExtractor';
import { AgentAdExtractor } from '../services/ai/extractors/agentAdExtractor';
import { clarificationService } from '../services/ai/clarificationService';
import { SupplyCompletionService } from '../services/ai/completionService';
import { SupplyQualityAssessor } from '../services/ai/assessors/supplyQualityAssessor';
import { SupplyToL2Mapper } from '../services/ai/mappers/supplyToL2Mapper';
import { Supply } from '../services/ai/supplyExtractionService';

// ============================================================
// AC1: 场景适配 - 需求提取 + 场景检测自动路由 (ISSUE-AI002b~c2)
// ============================================================
function verifyAC1() {
  console.log('\n' + '='.repeat(60));
  console.log('AC1: 场景适配 - 需求提取 + 场景检测自动路由');
  console.log('='.repeat(60));

  const detector = sceneDetector;

  // Test scene detection
  const testCases = [
    { text: '我想找个摄影师拍婚纱照，预算5000左右，希望有修图服务', expected: 'visionshare' },
    { text: '我想找一个28-32岁的女生，喜欢旅游和读书，周末有空见面', expected: 'agentdate' },
    { text: '我是一名前端开发工程师，5年经验，期望薪资25-35K，熟悉React和TypeScript', expected: 'agentjob' },
    { text: '想买一台笔记本电脑，预算6000-8000，偏好苹果或华为', expected: 'agentad' },
    { text: '今天天气真好，适合出去散步', expected: null },
  ];

  console.log('\n--- 场景检测自动路由 ---');
  for (const tc of testCases) {
    const result = detector.detectScene(tc.text);
    const status = (result?.sceneType === tc.expected || (tc.expected === null && !result))
      ? '✅' : '❌';
    console.log(`\n输入: "${tc.text}"`);
    console.log(`期望场景: ${tc.expected || '无匹配'} | 实际: ${result?.sceneType || '无匹配'} ${status}`);
    if (result) console.log(`  置信度: ${(result.confidence * 100).toFixed(0)}%`);
  }

  // Test individual extractors
  console.log('\n--- 各场景需求提取 ---');

  const vsExtractor = new VisionShareExtractor();
  const vsResult = vsExtractor.extract('我想找个摄影师拍婚纱照，下个月15号，预算5000左右，希望有修图服务和外景拍摄');
  console.log('\n[VisionShare提取]');
  console.log('  拍照时间:', vsResult.extractedData?.photoDate || '未提取到');
  console.log('  拍照类型:', vsResult.extractedData?.photoType || '未提取到');
  console.log('  预算:', vsResult.extractedData?.budget || '未提取到');
  console.log('  置信度:', (vsResult.confidence * 100).toFixed(0) + '%');

  const jobExtractor = new AgentJobExtractor();
  const jobResult = jobExtractor.extract('我是一名前端开发工程师，5年经验，期望薪资25-35K，熟悉React和TypeScript，可以远程工作');
  console.log('\n[AgentJob提取]');
  console.log('  技能:', jobResult.extractedData?.skills || '未提取到');
  console.log('  经验:', jobResult.extractedData?.experience || '未提取到');
  console.log('  薪资:', jobResult.extractedData?.salaryExpectation || '未提取到');

  const adExtractor = new AgentAdExtractor();
  const adResult = adExtractor.extract('想买一台笔记本电脑，预算6000-8000，偏好苹果或华为');
  console.log('\n[AgentAd提取]');
  console.log('  商品:', adResult.extractedData?.product || '未提取到');
  console.log('  预算:', adResult.extractedData?.budget || '未提取到');
  console.log('  品牌:', adResult.extractedData?.brandPreference || '未提取到');

  console.log('\n✅ AC1 验证完毕');
}

// ============================================================
// AC2: 澄清机制 (ISSUE-AI002b~c4)
// ============================================================
async function verifyAC2() {
  console.log('\n' + '='.repeat(60));
  console.log('AC2: 澄清机制 - 缺失信息检测 + 澄清问题生成');
  console.log('='.repeat(60));

  // Create a demand with missing fields
  const incompleteDemand = {
    id: 'test-1',
    userId: 'user-1',
    text: '我想拍照片',
    scene: 'visionshare',
    extractedData: { photoType: '人像' },
    status: 'pending' as const,
    createdAt: new Date(),
  };

  // 1. Missing field detection
  const missingFields = await clarificationService.detectMissingFields(
    incompleteDemand as any, 'visionshare'
  );
  console.log('\n--- 缺失信息检测 ---');
  console.log('输入需求: "我想拍照片" (仅有 photoType=人像)');
  console.log('检测到缺失字段:', missingFields);

  // 2. Generate clarification questions
  const questions = await clarificationService.generateClarificationQuestions(
    missingFields, 'visionshare'
  );
  console.log('\n--- 生成的澄清问题 ---');
  questions.forEach((q, i) => console.log(`  Q${i + 1}: ${q}`));

  // 3. Start clarification session
  const session = await clarificationService.startClarification(
    incompleteDemand as any, missingFields
  );
  console.log('\n--- 澄清会话 ---');
  console.log('  Session ID:', session.sessionId);
  console.log('  状态:', session.status);
  console.log('  缺失字段数:', session.missingFields.length);
  console.log('  首个问题:', session.history[0]?.question || '(无)');

  // 4. Simulate multi-turn dialog
  if (session.history[0]) {
    const response = await clarificationService.processClarification({
      sessionId: session.sessionId,
      userResponse: '预算大概3000-5000元',
      context: {},
    });
    console.log('\n--- 多轮对话 (第2轮) ---');
    console.log('  用户输入: "预算大概3000-5000元"');
    console.log('  对话状态:', response.status);
    console.log('  进度:', (response.progress?.percentage || 0) + '%');
    console.log('  下一个问题:', response.nextQuestion || '(已完成)');
    console.log('  历史轮数:', response.history?.length || 0);

    // End session
    clarificationService.endSession(session.sessionId);
  }

  console.log('\n✅ AC2 验证完毕');
}

// ============================================================
// AC3: 解析引擎 (ISSUE-AI003~c1) - 跳过LLM, 用结构化数据展示
// ============================================================
function verifyAC3() {
  console.log('\n' + '='.repeat(60));
  console.log('AC3: 解析引擎 - 供给结构化输出 (展示数据模型)');
  console.log('='.repeat(60));

  // Show the Supply data model structure
  const sampleSupply: Supply = {
    id: 'supply-001',
    userId: 'user-001',
    title: '专业婚礼摄影师',
    description: '10年婚礼摄影经验，擅长外景拍摄和后期修图。曾为多家婚庆公司提供摄影服务。',
    serviceType: 'photography',
    capabilities: [
      { name: '婚礼摄影', description: '专业婚礼跟拍', level: 'expert', category: 'photography', keywords: ['婚纱照', '外景'] },
      { name: '后期修图', description: '精修照片处理', level: 'advanced', category: 'post_processing', keywords: ['PS', 'Lightroom'] },
    ],
    pricing: { type: 'range', minRate: 3000, maxRate: 8000, currency: 'CNY', unit: 'session', description: '按拍摄场次计费' },
    skills: ['婚礼摄影', '人像摄影', '后期修图', '外景拍摄'],
    experience: { years: 10, totalProjects: 200, certifications: ['国家高级摄影师'], portfolio: ['http://example.com/portfolio'] },
    location: { city: '上海', remote: false, onsite: true },
    availability: { schedule: '周末', startDate: '2026-05-01' },
    quality: { overallScore: 85, completenessScore: 90, clarityScore: 80, relevanceScore: 85 },
    createdAt: new Date(),
  };

  console.log('\n--- 供给结构化输出示例 ---');
  console.log(JSON.stringify(sampleSupply, null, 2));

  console.log('\n--- 能力评估评分 ---');
  const capLevels: Record<string, number> = { beginner: 25, intermediate: 50, advanced: 75, expert: 100 };
  for (const cap of sampleSupply.capabilities) {
    console.log(`  ${cap.name} (${cap.level}) → ${capLevels[cap.level]}/100`);
  }
  console.log(`  综合: ${sampleSupply.capabilities.reduce((s, c) => s + (capLevels[c.level] || 0), 0) / sampleSupply.capabilities.length}/100`);

  console.log('\n✅ AC3 验证完毕');
}

// ============================================================
// AC4: 供给侧场景适配 (ISSUE-AI003~c2)
// ============================================================
function verifyAC4() {
  console.log('\n' + '='.repeat(60));
  console.log('AC4: 供给侧场景适配 - 场景自动识别');
  console.log('='.repeat(60));

  // Use the supply scene detector
  // We'll show the extractor canHandle logic directly
  const extractors = [
    { name: 'VisionShare供给提取器', extractor: new VisionShareExtractor(), text: '我有5年摄影经验，专业拍摄婚礼和人像，设备齐全' },
    { name: 'AgentJob求职提取器', extractor: new AgentJobExtractor(), text: '前端开发5年经验，精通React和TypeScript，期望薪资25K' },
    { name: 'AgentAd商品提取器', extractor: new AgentAdExtractor(), text: '全新MacBook Pro笔记本电脑，原价12000，现价9500' },
  ];

  console.log('\n--- 场景自动识别 + canHandle ---');
  for (const { name, extractor, text } of extractors) {
    const canHandle = extractor.canHandle(text);
    console.log(`\n${name}:`);
    console.log(`  输入: "${text}"`);
    console.log(`  canHandle: ${canHandle ? '✅ 是' : '❌ 否'}`);
    if (canHandle) {
      const result = extractor.extract(text);
      console.log(`  提取置信度: ${(result.confidence * 100).toFixed(0)}%`);
      console.log(`  提取数据:`, JSON.stringify(result.extractedData, null, 2)?.substring(0, 200));
    }
  }

  console.log('\n✅ AC4 验证完毕');
}

// ============================================================
// AC5: 映射系统 (ISSUE-AI003~c3)
// ============================================================
function verifyAC5() {
  console.log('\n' + '='.repeat(60));
  console.log('AC5: 映射系统 - 供给字段到L2模型映射');
  console.log('='.repeat(60));

  const mapper = new SupplyToL2Mapper();

  const supply: Supply = {
    id: 'supply-map-test',
    userId: 'user-1',
    title: '资深前端工程师',
    description: '8年前端开发经验，精通React生态',
    serviceType: 'development',
    capabilities: [
      { name: 'React', description: '精通', level: 'expert', category: 'frontend', keywords: ['hooks', 'redux'] },
      { name: 'TypeScript', description: '熟练', level: 'advanced', category: 'language', keywords: ['type-safe'] },
    ],
    pricing: { type: 'hourly', minRate: 300, maxRate: 500, currency: 'CNY', unit: 'hour' },
    skills: ['React', 'TypeScript', 'Node.js'],
    experience: { years: 8, totalProjects: 50 },
    location: { city: '北京', remote: true, onsite: false },
    createdAt: new Date(),
  };

  const schema = {
    scene: 'development',
    fields: [
      { id: 'title', name: '标题', type: L2FieldType.TEXT, required: true },
      { id: 'serviceType', name: '服务类型', type: L2FieldType.ENUM, required: true },
      { id: 'priceRange', name: '价格区间', type: L2FieldType.RANGE, required: true },
      { id: 'experience', name: '经验', type: L2FieldType.NUMBER, required: false },
      { id: 'remoteWork', name: '远程工作', type: L2FieldType.BOOLEAN, required: false },
    ],
  };

  const result = mapper.map(supply, schema as any);

  console.log('\n输入供给:', supply.title);
  console.log('目标场景:', schema.scene);
  console.log('\n--- 映射结果 ---');
  console.log('  成功:', result.success ? '✅' : '❌');
  console.log('  映射字段:', result.mappedFields);
  console.log('  未映射字段:', result.unmappedFields || '(无)');
  console.log('  推断字段:', result.inferredFields || '(无)');
  console.log('  标签:', result.generatedTags);
  console.log('  变换记录:', result.transformations.map(t => `${t.field}: ${JSON.stringify(t.originalValue)} → ${JSON.stringify(t.transformedValue)}`).join('\n            '));
  console.log('  冲突:', result.conflicts.length > 0 ? JSON.stringify(result.conflicts) : '(无)');

  console.log('\n✅ AC5 验证完毕');
}

// ============================================================
// AC6: 补全机制 (ISSUE-AI003~c4)
// ============================================================
function verifyAC6() {
  console.log('\n' + '='.repeat(60));
  console.log('AC6: 补全机制 - 缺失检测 + 补全建议');
  console.log('='.repeat(60));

  const service = new SupplyCompletionService();

  // An incomplete supply
  const incompleteSupply: Supply = {
    id: 'incomplete-1',
    userId: 'user-1',
    title: '摄',  // too short
    description: '拍照片',  // too short
    serviceType: 'photography',
    capabilities: [
      { name: '摄影', description: '', level: undefined as any, category: '', keywords: [] },
    ],
    pricing: { type: 'negotiable', minRate: undefined as any, maxRate: undefined as any, currency: undefined as any, unit: 'session', description: '' },
    createdAt: new Date(),
  };

  // 1. Missing field detection
  const { missing, incomplete } = service.detectIncomplete(incompleteSupply);
  console.log('\n--- 信息缺失检测 ---');
  console.log('输入: 一个不完整的供给 (标题太短, 描述太短, 无pricing.currency...)');
  console.log('  缺失字段 (missing):', missing);
  console.log('  不完整字段 (incomplete):', incomplete);

  // 2. Generate suggestions
  const suggestions = service.generateSuggestions(incompleteSupply);
  console.log('\n--- 智能补全建议 ---');
  for (const s of suggestions) {
    console.log(`  [${s.source}] ${s.field}: ${JSON.stringify(s.currentValue)} → ${JSON.stringify(s.suggestedValue)}`);
    console.log(`    置信度: ${s.confidence}% | 原因: ${s.reason}`);
  }

  // 3. Apply suggestions
  const confirmedSuggestions = suggestions.map(s => ({ ...s, confirmed: true }));
  const completedSupply = service.applySuggestions(incompleteSupply, confirmedSuggestions);
  console.log('\n--- 补全后结果 ---');
  console.log('  标题:', completedSupply.title);
  console.log('  描述:', completedSupply.description);
  console.log('  定价货币:', completedSupply.pricing?.currency);

  // 4. Completeness score
  const result = service.complete(incompleteSupply);
  console.log('\n--- 完整度评分 ---');
  console.log('  完整度分数:', result.completenessScore + '/100');

  console.log('\n✅ AC6 验证完毕');
}

// ============================================================
// AC7: 评估系统 (ISSUE-AI003~c5)
// ============================================================
function verifyAC7() {
  console.log('\n' + '='.repeat(60));
  console.log('AC7: 评估系统 - 质量评分 + 优化建议');
  console.log('='.repeat(60));

  const assessor = new SupplyQualityAssessor();

  // Good supply
  const goodSupply: Supply = {
    id: 'good-1',
    userId: 'user-1',
    title: '资深婚礼摄影师 - 专业外景跟拍',
    description: '10年婚礼摄影经验，擅长外景拍摄和后期修图。使用Canon EOS R5和Sony A7IV双机位拍摄，提供500+精修照片，包含婚前MV和婚礼全程录像。已服务超过200对新人，覆盖上海及周边城市。',
    serviceType: 'photography',
    capabilities: [
      { name: '婚礼摄影', description: '专业婚礼跟拍', level: 'expert', category: 'photography', keywords: ['婚纱', '外景'] },
      { name: '后期修图', description: '精修', level: 'advanced', category: 'post_processing', keywords: ['PS'] },
      { name: '视频拍摄', description: '双机位', level: 'intermediate', category: 'videography', keywords: ['录像'] },
    ],
    pricing: { type: 'fixed', minRate: 3000, maxRate: 8000, currency: 'CNY', unit: 'session', description: '按场计费' },
    skills: ['婚礼摄影', '人像摄影', '后期修图', 'Lightroom'],
    experience: { years: 10, totalProjects: 200, certifications: ['国家高级摄影师'], portfolio: ['http://example.com'] },
    location: { city: '上海', remote: false, onsite: true },
    createdAt: new Date(),
  };

  // Poor supply
  const poorSupply: Supply = {
    id: 'poor-1',
    userId: 'user-2',
    title: '拍照',
    description: '会拍照',
    serviceType: 'general',
    capabilities: [],
    pricing: { type: 'negotiable', minRate: 0, maxRate: 0, currency: 'CNY', unit: 'session', description: '' },
    createdAt: new Date(),
  };

  const goodResult = assessor.assess(goodSupply);
  const poorResult = assessor.assess(poorSupply);

  console.log('\n--- 优质供给评分 ---');
  console.log(`  标题: "${goodSupply.title}"`);
  console.log(`  完整性: ${goodResult.completenessScore}/100`);
  console.log(`  可信度: ${goodResult.credibilityScore}/100`);
  console.log(`  竞争力: ${goodResult.competitivenessScore}/100`);
  console.log(`  综合评分: ${goodResult.overallScore}/100 (等级: ${goodResult.grade})`);

  console.log('\n--- 低质量供给评分 ---');
  console.log(`  标题: "${poorSupply.title}"`);
  console.log(`  完整性: ${poorResult.completenessScore}/100`);
  console.log(`  可信度: ${poorResult.credibilityScore}/100`);
  console.log(`  竞争力: ${poorResult.competitivenessScore}/100`);
  console.log(`  综合评分: ${poorResult.overallScore}/100 (等级: ${poorResult.grade})`);

  console.log('\n--- 优化建议 (低质量供给) ---');
  for (const s of poorResult.optimizationSuggestions) {
    console.log(`  [${s.priority}] ${s.field}: ${s.message} (预计提升 +${s.impact})`);
  }

  // Edge case: minRate=0 (the fixed bug)
  console.log('\n--- 边界测试: minRate=0 (NP-166 修复验证) ---');
  const edgeSupply: Supply = {
    id: 'edge-1', userId: 'u', title: '测试', description: '测试供给信息填充到这里',
    serviceType: 'photography', capabilities: [{ name: '测试', description: '', level: 'intermediate', category: 'test', keywords: [] }],
    pricing: { type: 'fixed', minRate: 0, maxRate: 100, currency: 'CNY', unit: 'session', description: '' },
    createdAt: new Date(),
  };
  const edgeResult = assessor.assess(edgeSupply);
  console.log(`  minRate=0, maxRate=100 → 可信度: ${edgeResult.credibilityScore}/100 (应为100，不应因Infinity误扣分)`);

  console.log('\n✅ AC7 验证完毕');
}

// ============================================================
// Main
// ============================================================
async function main() {
  const step = process.argv[2];

  switch (step) {
    case '1': verifyAC1(); break;
    case '2': await verifyAC2(); break;
    case '3': verifyAC3(); break;
    case '4': verifyAC4(); break;
    case '5': verifyAC5(); break;
    case '6': verifyAC6(); break;
    case '7': verifyAC7(); break;
    case 'all':
      verifyAC1();
      await verifyAC2();
      verifyAC3();
      verifyAC4();
      verifyAC5();
      verifyAC6();
      verifyAC7();
      break;
    default:
      console.log('Usage: npx tsx src/__tests__/acceptance-f001.ts <1-7|all>');
      console.log('');
      console.log('  1 - AC1: 场景适配(需求提取+场景检测路由)');
      console.log('  2 - AC2: 澄清机制');
      console.log('  3 - AC3: 解析引擎(结构化输出)');
      console.log('  4 - AC4: 供给侧场景适配');
      console.log('  5 - AC5: 映射系统(L2映射)');
      console.log('  6 - AC6: 补全机制');
      console.log('  7 - AC7: 评估系统(质量评分)');
      console.log('  all - 全部验证');
  }
}

main().catch(console.error);
