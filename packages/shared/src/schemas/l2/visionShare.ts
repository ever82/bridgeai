import { L2Schema, L2FieldType } from './types';

/**
 * VisionShare Scene L2 Schema
 * 视觉分享场景 - 用于分享和发现视觉内容
 */
export const visionShareL2Schema: L2Schema = {
  id: 'visionshare-l2',
  version: '1.0.0',
  scene: 'VISIONSHARE',
  title: '视觉分享偏好',
  description: '设置您的视觉内容分享偏好和兴趣',
  fields: [
    {
      id: 'contentType',
      type: L2FieldType.MULTI_SELECT,
      label: '内容类型',
      description: '您感兴趣分享或发现的内容类型',
      required: true,
      options: [
        { value: 'photography', label: '摄影作品', icon: '📷' },
        { value: 'artwork', label: '艺术创作', icon: '🎨' },
        { value: 'design', label: '设计作品', icon: '✏️' },
        { value: 'illustration', label: '插画', icon: '🖼️' },
        { value: 'video', label: '短视频', icon: '🎬' },
        { value: 'architecture', label: '建筑', icon: '🏛️' },
        { value: 'nature', label: '自然风光', icon: '🌲' },
        { value: 'food', label: '美食', icon: '🍜' },
      ],
    },
    {
      id: 'style',
      type: L2FieldType.MULTI_SELECT,
      label: '风格偏好',
      description: '您偏好的视觉风格',
      required: false,
      options: [
        { value: 'minimalist', label: '极简主义', color: '#333' },
        { value: 'vintage', label: '复古风', color: '#8B4513' },
        { value: 'modern', label: '现代风格', color: '#007AFF' },
        { value: 'abstract', label: '抽象艺术', color: '#FF6B6B' },
        { value: 'realistic', label: '写实风格', color: '#4CAF50' },
        { value: 'fantasy', label: '奇幻风格', color: '#9C27B0' },
      ],
    },
    {
      id: 'purpose',
      type: L2FieldType.ENUM,
      label: '使用目的',
      description: '您主要使用此功能的目的是什么',
      required: true,
      options: [
        { value: 'share', label: '分享作品' },
        { value: 'discover', label: '发现灵感' },
        { value: 'collaborate', label: '寻找合作' },
        { value: 'learn', label: '学习交流' },
        { value: 'business', label: '商业用途' },
      ],
    },
    {
      id: 'skillLevel',
      type: L2FieldType.ENUM,
      label: '专业水平',
      description: '您在视觉创作方面的专业水平',
      required: true,
      options: [
        { value: 'beginner', label: '初学者', description: '刚开始接触' },
        { value: 'hobbyist', label: '爱好者', description: '有一定经验' },
        { value: 'intermediate', label: '进阶者', description: '较有经验' },
        { value: 'professional', label: '专业级', description: '职业创作者' },
        { value: 'expert', label: '专家级', description: '行业专家' },
      ],
    },
    {
      id: 'availability',
      type: L2FieldType.MULTI_SELECT,
      label: '可参与时间',
      description: '您方便参与活动的时间段',
      required: false,
      options: [
        { value: 'weekday_morning', label: '工作日上午' },
        { value: 'weekday_afternoon', label: '工作日下午' },
        { value: 'weekday_evening', label: '工作日晚间' },
        { value: 'weekend_morning', label: '周末上午' },
        { value: 'weekend_afternoon', label: '周末下午' },
        { value: 'weekend_evening', label: '周末晚间' },
      ],
    },
    {
      id: 'additionalInfo',
      type: L2FieldType.LONG_TEXT,
      label: '补充说明',
      description: '其他您想补充的信息',
      required: false,
      placeholder: '请描述您的具体需求或期望...',
      maxLength: 500,
    },
  ],
  steps: [
    {
      id: 'basic',
      title: '基本信息',
      description: '设置您的内容类型和目的',
      fields: ['contentType', 'purpose'],
    },
    {
      id: 'preferences',
      title: '偏好设置',
      description: '选择您的风格和水平',
      fields: ['style', 'skillLevel'],
    },
    {
      id: 'availability',
      title: '时间安排',
      description: '设置您可参与的时间',
      fields: ['availability', 'additionalInfo'],
    },
  ],
};

export default visionShareL2Schema;
