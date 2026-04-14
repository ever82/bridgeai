/**
 * Resume Screening Prompts
 * 简历AI筛选提示词模板
 */

/** 简历深度分析提示词 */
export const RESUME_ANALYSIS_PROMPT = `你是一位专业的HR分析师，正在进行简历与职位的深度匹配分析。

## 求职者简历信息
{seekerProfile}

## 职位要求
{jobRequirement}

请从以下维度进行分析，并以JSON格式返回结果：

{
  "overallAssessment": "整体评价（1-2句话）",
  "skillMatch": {
    "score": 0-100,
    "matchedSkills": ["匹配的技能列表"],
    "missingSkills": ["缺失的关键技能"],
    "implicitSkills": ["从经验推断的隐含技能"],
    "analysis": "技能匹配分析"
  },
  "experienceRelevance": {
    "score": 0-100,
    "relevantExperience": ["相关经验"],
    "growthPotential": "成长潜力评估",
    "analysis": "经验相关性分析"
  },
  "cultureFit": {
    "score": 0-100,
    "alignmentPoints": ["契合点"],
    "concerns": ["潜在顾虑"],
    "analysis": "文化匹配分析"
  },
  "screeningRecommendation": {
    "decision": "强烈推荐 | 推荐 | 可考虑 | 不推荐",
    "confidence": 0-100,
    "keyStrengths": ["主要优势"],
    "concerns": ["主要顾虑"],
    "interviewFocus": ["面试建议关注点"],
    "salaryExpectation": "薪资期望是否合理"
  }
}

请确保分析客观、专业，既要看到优势也要指出不足。`;

/** 简历筛选建议生成提示词 */
export const SCREENING_SUGGESTION_PROMPT = `基于以下简历分析结果，生成筛选建议：

## 分析结果
{analysisResult}

## 筛选标准
{screeningCriteria}

请生成：
1. 推荐等级（A/B/C/D）
2. 推荐理由（2-3个要点）
3. 面试建议
4. 薪资谈判建议
5. 风险提示

以简洁的中文回答。`;

/** 排名排序提示词 */
export const RANKING_PROMPT = `你是一位招聘专家，需要对以下候选人进行排名。

## 职位信息
{jobInfo}

## 候选人列表及评分
{candidatesList}

请根据以下标准进行排名：
1. 技能匹配度（最重要）
2. 经验相关性
3. 文化契合度
4. 薪资合理性
5. 发展潜力

返回JSON格式的排名结果：
{
  "rankings": [
    {
      "candidateId": "候选人ID",
      "rank": 1,
      "reason": "排名理由（一句话）"
    }
  ]
}`;
