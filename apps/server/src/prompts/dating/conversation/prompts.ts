/**
 * Dating Conversation Prompt Templates
 * 约会对话提示模板
 *
 * 为Agent间约会对话生成LLM提示
 */

/**
 * 构建约会对话系统提示
 */
export function buildDatingSystemPrompt(
  agentName: string,
  persona: {
    personality: string[];
    goals: string[];
    communicationStyle: string;
  },
  profileSummary: {
    interests: string[];
    personality: string[];
    lifestyle: string[];
    goals: string[];
  },
  otherProfileSummary: {
    interests: string[];
    personality: string[];
    lifestyle: string[];
    goals: string[];
  }
): string {
  return `你是${agentName}，一位正在了解对方的AI代理。

## 你的人设
- 性格特点：${persona.personality.join('、')}
- 沟通风格：${persona.communicationStyle}
- 目标：${persona.goals.join('、')}

## 你代表的用户画像
- 兴趣爱好：${profileSummary.interests.join('、') || '暂无'}
- 性格特征：${profileSummary.personality.join('、') || '暂无'}
- 生活方式：${profileSummary.lifestyle.join('、') || '暂无'}
- 期望目标：${profileSummary.goals.join('、') || '暂无'}

## 对方画像概要
- 兴趣爱好：${otherProfileSummary.interests.join('、') || '暂无'}
- 性格特征：${otherProfileSummary.personality.join('、') || '暂无'}
- 生活方式：${otherProfileSummary.lifestyle.join('、') || '暂无'}

## 对话规则
1. 基于用户画像自然地展开对话
2. 寻找共同话题和兴趣点
3. 逐步深入了解对方
4. 保持真实感，避免过于生硬的提问
5. 用中文回复
6. 回复控制在100字以内
7. 不要暴露你是AI代理的身份`;
}

/**
 * 构建话题引导提示
 */
export function buildTopicGuidancePrompt(
  topic: string,
  category: string,
  sharedInterests: string[],
  round: number,
  previousMessages: string
): string {
  return `当前话题：${topic}
话题类别：${category}
共同兴趣：${sharedInterests.join('、') || '暂无发现'}
当前轮次：第${round}轮

之前的对话：
${previousMessages || '（刚开始对话）'}

请基于当前话题自然地继续对话。要求：
1. 如果是新话题，自然地引出
2. 如果是已有话题，深入探讨
3. 寻找共鸣点和共同经历
4. 保持轻松友好的氛围`;
}

/**
 * 构建对话质量评估提示
 */
export function buildQualityAssessmentPrompt(
  messages: string,
  topics: string[],
  round: number
): string {
  return `请评估以下对话片段的质量。

对话内容：
${messages}

讨论话题：${topics.join('、')}
当前轮次：第${round}轮

请从以下维度评分（0-1）并给出JSON格式：
{
  "fluency": 0.8,        // 对话流畅度
  "topicDepth": 0.7,     // 话题深度
  "engagement": 0.85,    // 参与度
  "coherence": 0.9,      // 连贯性
  "issues": []           // 发现的问题列表
}`;
}

/**
 * 构建对话摘要生成提示
 */
export function buildSummaryPrompt(messages: string, profileA: string, profileB: string): string {
  return `请为以下两位用户的Agent对话生成摘要。

用户A画像：${profileA}
用户B画像：${profileB}

对话内容：
${messages}

请生成包含以下内容的摘要（JSON格式）：
{
  "summary": "对话总体摘要",
  "sharedInterests": ["发现的共同兴趣"],
  "highlights": [{"topic": "话题", "content": "亮点内容", "type": "类型"}],
  "compatibilityFactors": ["匹配因素"],
  "suggestions": ["后续建议"]
}`;
}

/**
 * 构建安全检查提示
 */
export function buildSafetyCheckPrompt(content: string): string {
  return `请检查以下对话内容是否存在安全问题。

内容：${content}

请检查以下类别并返回JSON：
{
  "safe": true,
  "flags": [],
  "level": "safe"
}

检查类别：
- sensitive_topic: 敏感话题（政治、宗教等）
- inappropriate_content: 不当内容
- personal_info: 个人信息泄露
- offensive_language: 冒犯性语言
- harassment: 骚扰行为

level: safe | warning | danger | critical`;
}
