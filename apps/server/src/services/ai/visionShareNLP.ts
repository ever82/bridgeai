/**
 * VisionShare NLP Service
 * 自然语言处理服务，用于从VisionShare任务描述中提取实体
 */

import { logger } from '../../utils/logger';

export interface ExtractedEntities {
  location?: {
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  timeRange?: {
    start?: Date;
    end?: Date;
    flexibility?: 'strict' | 'flexible' | 'anytime';
  };
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
    type?: 'fixed' | 'range' | 'hourly';
  };
  category?: string;
  tags: string[];
}

/**
 * VisionShare NLP服务
 */
export class VisionShareNLPService {
  private readonly logger = logger.child({ module: 'VisionShareNLP' });

  /**
   * 从描述中提取实体
   */
  extractEntities(description: string): ExtractedEntities {
    const result: ExtractedEntities = {
      tags: [],
    };

    try {
      // 提取地点
      result.location = this.extractLocation(description);

      // 提取时间
      result.timeRange = this.extractTimeRange(description);

      // 提取预算
      result.budget = this.extractBudget(description);

      // 提取分类
      result.category = this.extractCategory(description);

      // 提取标签
      result.tags = this.extractTags(description);

      this.logger.debug('Entities extracted', {
        location: result.location?.name,
        category: result.category,
        tags: result.tags,
      });
    } catch (error) {
      this.logger.error('Entity extraction failed', { error });
    }

    return result;
  }

  /**
   * 提取地点信息
   */
  private extractLocation(description: string): ExtractedEntities['location'] | undefined {
    // 常见地点关键词匹配
    const locationPatterns = [
      // 地点前缀
      { pattern: /在\s*([\u4e00-\u9fa5]+(?:市|区|县|镇|街|路|号|楼|层|室))/g, type: 'address' },
      { pattern: /位于?\s*([\u4e00-\u9fa5]+(?:市|区|县|镇|街|路|号))/g, type: 'address' },
      { pattern: /(?:去|到)\s*([\u4e00-\u9fa5]+(?:市|区|县|镇))/g, type: 'city' },

      // 英文地点
      { pattern: /(?:at|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g, type: 'english' },
      { pattern: /(?:near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g, type: 'english' },

      // 特定地标
      { pattern: /(故宫|天安门|外滩|东方明珠|西湖|长城|颐和园|天坛|黄鹤楼|西湖)/g, type: 'landmark' },
    ];

    for (const { pattern, type } of locationPatterns) {
      const matches = [...description.matchAll(pattern)];
      if (matches.length > 0) {
        const location = matches[0][1].trim();
        if (location.length > 1) {
          return {
            name: location,
            address: type === 'address' ? location : undefined,
          };
        }
      }
    }

    return undefined;
  }

  /**
   * 提取时间范围
   */
  private extractTimeRange(description: string): ExtractedEntities['timeRange'] | undefined {
    const result: ExtractedEntities['timeRange'] = {};

    // 时间关键词
    const timePatterns = [
      // 具体时间点
      { pattern: /(\d{1,2}):(\d{2})/g, type: 'time' },
      { pattern: /(\d{1,2})点/g, type: 'hour' },

      // 日期
      { pattern: /(\d{4})年(\d{1,2})月(\d{1,2})日/g, type: 'date' },
      { pattern: /(\d{4})-(\d{1,2})-(\d{1,2})/g, type: 'date' },

      // 相对时间
      { pattern: /(明天|后天|下周|周末|本周|今天)/g, type: 'relative' },

      // 时间段
      { pattern: /(上午|中午|下午|晚上|凌晨)/g, type: 'period' },

      // 时长
      { pattern: /(\d+)\s*(小时|h|小时)/g, type: 'duration' },
    ];

    const times: Date[] = [];

    for (const { pattern, type } of timePatterns) {
      const matches = [...description.matchAll(pattern)];
      for (const match of matches) {
        try {
          if (type === 'time' || type === 'hour') {
            const hour = parseInt(match[1], 10);
            const minute = type === 'time' ? parseInt(match[2], 10) : 0;
            if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
              const date = new Date();
              date.setHours(hour, minute, 0, 0);
              times.push(date);
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    // 灵活性判断
    if (/随时|anytime|flexible|灵活|都可以|都行/i.test(description)) {
      result.flexibility = 'flexible';
    } else if (/尽快|asap|马上|立刻/i.test(description)) {
      result.flexibility = 'strict';
    }

    // 设置开始和结束时间
    if (times.length >= 2) {
      result.start = times[0];
      result.end = times[1];
    } else if (times.length === 1) {
      result.start = times[0];
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  /**
   * 提取预算信息
   */
  private extractBudget(description: string): ExtractedEntities['budget'] | undefined {
    const result: ExtractedEntities['budget'] = {};

    // 货币符号
    const currencyMatch = description.match(/(¥|\$|￥|USD|CNY|RMB|美元|人民币|元)/i);
    if (currencyMatch) {
      const symbol = currencyMatch[1];
      if (['$', 'USD', '美元'].includes(symbol)) {
        result.currency = 'USD';
      } else {
        result.currency = 'CNY';
      }
    }

    // 价格范围
    const pricePatterns = [
      // 范围格式: 100-200元, 100到200元
      { pattern: /(\d+)\s*(?:-|到|~|至)\s*(\d+)\s*(?:元|块|\$|￥|¥)/, type: 'range' },

      // 起价格式: 100元起, 从100元
      { pattern: /(?:从|起|最低|最少)?\s*(\d+)\s*(?:元|块|\$|￥|¥)/, type: 'min' },

      // 封顶格式: 最多200元, 200元以内
      { pattern: /(?:最多|最高|不超过|以内)?\s*(\d+)\s*(?:元|块|\$|￥|¥)/, type: 'max' },

      // 每小时格式: 100元/小时, 每小时100元
      { pattern: /(?:每小时|一小时|时薪)?\s*(\d+)\s*(?:元|块|\$|￥|¥)\s*(?:\/小时|每小时|一小时)?/, type: 'hourly' },
    ];

    for (const { pattern, type } of pricePatterns) {
      const match = description.match(pattern);
      if (match) {
        if (type === 'range') {
          result.min = parseInt(match[1], 10);
          result.max = parseInt(match[2], 10);
          result.type = 'range';
        } else if (type === 'min') {
          result.min = parseInt(match[1], 10);
          result.type = result.type || 'fixed';
        } else if (type === 'max') {
          result.max = parseInt(match[1], 10);
          result.type = result.type || 'fixed';
        } else if (type === 'hourly') {
          result.min = parseInt(match[1], 10);
          result.type = 'hourly';
        }
        break;
      }
    }

    // 如果只有最小值，设为固定价格
    if (result.min && !result.max && !result.type) {
      result.type = 'fixed';
    }

    return result.min !== undefined || result.max !== undefined ? result : undefined;
  }

  /**
   * 提取分类
   */
  private extractCategory(description: string): string | undefined {
    const categoryKeywords: { [key: string]: string[] } = {
      '人像摄影': ['人像', '人物', 'portrait', 'headshot', '证件照', '写真', '模特'],
      '风景摄影': ['风景', '风光', 'landscape', 'scenery', 'nature', '自然', '航拍'],
      '街拍': ['街拍', 'street', '街拍', '扫街', '纪实', 'documentary'],
      '美食摄影': ['美食', 'food', '餐饮', '餐厅', '美食照', '菜品'],
      '建筑摄影': ['建筑', 'architecture', 'building', 'architecture', '室内', 'interior'],
      '活动摄影': ['活动', 'event', '婚礼', '聚会', 'party', '活动跟拍', '会议'],
      '夜景摄影': ['夜景', 'night', 'nightscape', '灯光', '夜景'],
      '商业摄影': ['商业', 'commercial', '产品', 'product', '广告', '宣传'],
      '旅拍': ['旅拍', '旅行', 'travel', '旅游', 'trip', 'vlog'],
      '直播': ['直播', 'live', '现场', 'real-time', 'streaming'],
    };

    const desc = description.toLowerCase();
    let bestMatch: { category: string; score: number } | undefined;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      let score = 0;
      for (const keyword of keywords) {
        if (desc.includes(keyword.toLowerCase())) {
          score += keyword.length > 2 ? 2 : 1;
        }
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { category, score };
      }
    }

    return bestMatch?.category;
  }

  /**
   * 提取标签
   */
  private extractTags(description: string): string[] {
    const tags: Set<string> = new Set();
    const desc = description.toLowerCase();

    const tagKeywords: { [key: string]: string[] } = {
      '专业': ['专业', 'professional', '资深', 'expert'],
      '业余': ['业余', 'amateur', '爱好者', 'hobby'],
      '急': ['急', '急用', 'urgent', 'asap', '紧急'],
      '修图': ['修图', '后期', 'ps', 'photoshop', 'edit', 'retouch'],
      '原片': ['原片', 'raw', '原图', '未修'],
      '高清': ['高清', '高分辨率', 'high-res', '4k', 'hd'],
      '创意': ['创意', 'creative', '创意', 'artistic', '艺术'],
      '自然': ['自然', 'natural', '自然光', 'natural light'],
      '棚拍': ['棚拍', 'studio', '影棚', '棚内'],
      '外景': ['外景', 'outdoor', '户外', '外景'],
      '跟拍': ['跟拍', 'follow', '跟拍', 'documentary'],
      '摆拍': ['摆拍', 'posed', '造型', '摆拍'],
      '抓拍': ['抓拍', 'candid', '抓拍', '瞬间'],
      '无人机': ['无人机', 'drone', '航拍', 'aerial'],
      '视频': ['视频', 'video', '录像', 'vlog', '短视频'],
      '照片': ['照片', 'photo', '图片', 'picture'],
    };

    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      for (const keyword of keywords) {
        if (desc.includes(keyword.toLowerCase())) {
          tags.add(tag);
          break;
        }
      }
    }

    return Array.from(tags).slice(0, 10);
  }

  /**
   * 分析文本情感/紧急程度
   */
  analyzeUrgency(description: string): number {
    const urgencyKeywords = [
      { pattern: /急|urgent|asap|马上|立即|今晚|今天/i, weight: 10 },
      { pattern: /尽快|越快越好|希望快|加急/i, weight: 7 },
      { pattern: /明天|后天|本周|这周/i, weight: 5 },
      { pattern: /下周|下月|以后|不急|慢慢/i, weight: -5 },
    ];

    let score = 0;
    for (const { pattern, weight } of urgencyKeywords) {
      if (pattern.test(description)) {
        score += weight;
      }
    }

    return Math.min(100, Math.max(0, 50 + score));
  }
}

// 导出单例实例
export const visionShareNLPService = new VisionShareNLPService();
