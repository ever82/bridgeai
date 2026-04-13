import { L2Schema, L2FieldType } from './types';

/**
 * AgentAd Consumer L2 Schema
 * AgentAd场景 - 消费者需求画像配置
 * 用于消费者配置购买需求，匹配商家
 */
export const agentAdConsumerL2Schema: L2Schema = {
  id: 'agentad-consumer-l2',
  version: '1.0.0',
  scene: 'AGENTAD',
  role: 'CONSUMER',
  title: '消费者需求画像',
  description: '配置您的消费需求和偏好，我们将为您匹配最合适的商家',
  fields: [
    // === Role Selection ===
    {
      id: 'role',
      type: L2FieldType.ENUM,
      label: '角色类型',
      description: '选择您在AgentAd场景中的角色',
      required: true,
      defaultValue: 'CONSUMER',
      options: [
        { value: 'CONSUMER', label: '消费者', description: '我有购买需求，寻找商家' },
        { value: 'MERCHANT', label: '商家', description: '我提供商品/服务，寻找客户' },
      ],
    },

    // === Category Configuration ===
    {
      id: 'categories',
      type: L2FieldType.MULTI_SELECT,
      label: '感兴趣的类别',
      description: '选择您感兴趣的商品或服务类别（最多5个）',
      required: true,
      maxItems: 5,
      options: [
        // 餐饮
        { value: 'food', label: '餐饮美食', icon: '🍽️' },
        { value: 'restaurant', label: '餐厅', icon: '🍴', parent: 'food' },
        { value: 'cafe', label: '咖啡茶饮', icon: '☕', parent: 'food' },
        { value: 'bakery', label: '烘焙甜品', icon: '🍰', parent: 'food' },
        { value: 'bar', label: '酒吧', icon: '🍸', parent: 'food' },

        // 零售
        { value: 'retail', label: '零售购物', icon: '🛍️' },
        { value: 'clothing', label: '服装鞋帽', icon: '👕', parent: 'retail' },
        { value: 'electronics', label: '数码电子', icon: '📱', parent: 'retail' },
        { value: 'home', label: '家居用品', icon: '🏠', parent: 'retail' },
        { value: 'beauty', label: '美妆护肤', icon: '💄', parent: 'retail' },
        { value: 'jewelry', label: '珠宝配饰', icon: '💍', parent: 'retail' },
        { value: 'books', label: '图书文具', icon: '📚', parent: 'retail' },

        // 服务
        { value: 'services', label: '生活服务', icon: '🛠️' },
        { value: 'beauty_salon', label: '美容美发', icon: '💇', parent: 'services' },
        { value: 'fitness', label: '健身运动', icon: '💪', parent: 'services' },
        { value: 'cleaning', label: '保洁清洗', icon: '🧹', parent: 'services' },
        { value: 'repair', label: '维修服务', icon: '🔧', parent: 'services' },
        { value: 'pet', label: '宠物服务', icon: '🐕', parent: 'services' },

        // 娱乐
        { value: 'entertainment', label: '休闲娱乐', icon: '🎮' },
        { value: 'ktv', label: 'KTV', icon: '🎤', parent: 'entertainment' },
        { value: 'cinema', label: '电影院', icon: '🎬', parent: 'entertainment' },
        { value: 'gaming', label: '游戏娱乐', icon: '🎮', parent: 'entertainment' },
        { value: 'sports', label: '运动场馆', icon: '⚽', parent: 'entertainment' },

        // 教育
        { value: 'education', label: '教育培训', icon: '📖' },
        { value: 'training', label: '职业培训', icon: '💼', parent: 'education' },
        { value: 'language', label: '语言学习', icon: '🗣️', parent: 'education' },
        { value: 'arts', label: '艺术培训', icon: '🎨', parent: 'education' },

        // 健康
        { value: 'health', label: '医疗健康', icon: '🏥' },
        { value: 'hospital', label: '医院诊所', icon: '🩺', parent: 'health' },
        { value: 'dental', label: '口腔服务', icon: '🦷', parent: 'health' },
        { value: 'massage', label: '按摩理疗', icon: '💆', parent: 'health' },
        { value: 'psychology', label: '心理咨询', icon: '🧠', parent: 'health' },

        // 出行
        { value: 'travel', label: '旅游出行', icon: '✈️' },
        { value: 'hotel', label: '酒店住宿', icon: '🏨', parent: 'travel' },
        { value: 'transport', label: '交通服务', icon: '🚗', parent: 'travel' },
      ],
    },

    // === Budget Configuration ===
    {
      id: 'budgetType',
      type: L2FieldType.ENUM,
      label: '预算类型',
      description: '选择您的预算周期类型',
      required: true,
      defaultValue: 'single',
      options: [
        { value: 'single', label: '单次消费', description: '单次购买的预算' },
        { value: 'weekly', label: '周预算', description: '每周消费预算' },
        { value: 'monthly', label: '月度预算', description: '每月消费预算' },
        { value: 'custom', label: '自定义周期', description: '自定义时间周期' },
      ],
    },
    {
      id: 'budgetMin',
      type: L2FieldType.NUMBER,
      label: '最低预算',
      description: '您期望的最低消费金额',
      required: true,
      min: 0,
      step: 1,
      unit: '元',
    },
    {
      id: 'budgetMax',
      type: L2FieldType.NUMBER,
      label: '最高预算',
      description: '您期望的最高消费金额',
      required: true,
      min: 0,
      step: 1,
      unit: '元',
    },
    {
      id: 'budgetDisclosure',
      type: L2FieldType.ENUM,
      label: '预算披露方式',
      description: '选择是否向商家展示您的预算信息',
      required: true,
      defaultValue: 'RANGE_ONLY',
      options: [
        { value: 'PUBLIC', label: '公开预算', description: '商家可以看到具体预算数值' },
        { value: 'PRIVATE', label: '保密预算', description: '仅系统可见，商家不可见' },
        { value: 'RANGE_ONLY', label: '仅显示范围', description: '商家仅能看到预算范围' },
      ],
    },

    // === Brand Preferences ===
    {
      id: 'preferredBrands',
      type: L2FieldType.TAGS,
      label: '偏好品牌',
      description: '添加您偏好的品牌（可选）',
      required: false,
      maxItems: 10,
      placeholder: '输入品牌名称并按回车添加',
    },
    {
      id: 'avoidedBrands',
      type: L2FieldType.TAGS,
      label: '避开品牌',
      description: '添加您不想考虑的品牌（可选）',
      required: false,
      maxItems: 10,
      placeholder: '输入品牌名称并按回车添加',
    },
    {
      id: 'anyBrand',
      type: L2FieldType.BOOLEAN,
      label: '接受任何品牌',
      description: '如果没有特定品牌偏好，可以接受任何品牌',
      required: false,
      defaultValue: false,
    },

    // === Merchant Preferences ===
    {
      id: 'merchantTypes',
      type: L2FieldType.MULTI_SELECT,
      label: '商家类型偏好',
      description: '选择您偏好的商家类型',
      required: true,
      options: [
        { value: 'CHAIN', label: '连锁品牌', description: '知名连锁品牌商家' },
        { value: 'LOCAL', label: '本地商家', description: '本地特色商家' },
        { value: 'INDIVIDUAL', label: '个人商家', description: '个人经营者' },
        { value: 'ONLINE_ONLY', label: '纯线上商家', description: '仅有线上店铺' },
        { value: 'PREMIUM', label: '高端商家', description: '高端定位商家' },
        { value: 'BUDGET', label: '平价商家', description: '经济实惠型商家' },
      ],
    },
    {
      id: 'minRating',
      type: L2FieldType.NUMBER,
      label: '最低评分要求',
      description: '商家的最低评分要求（1-5分）',
      required: false,
      min: 1,
      max: 5,
      step: 0.5,
      defaultValue: 3,
    },
    {
      id: 'requirePhysicalStore',
      type: L2FieldType.BOOLEAN,
      label: '要求有实体店',
      description: '只考虑有实体店铺的商家',
      required: false,
      defaultValue: false,
    },
    {
      id: 'maxDistance',
      type: L2FieldType.NUMBER,
      label: '最大距离',
      description: '商家距离您的最大距离（公里）',
      required: false,
      min: 0,
      max: 100,
      step: 0.5,
      unit: '公里',
      defaultValue: 10,
    },

    // === Timeline Configuration ===
    {
      id: 'urgency',
      type: L2FieldType.ENUM,
      label: '紧急程度',
      description: '您的需求紧急程度',
      required: true,
      defaultValue: 'MEDIUM',
      options: [
        { value: 'URGENT', label: '急需（24小时内）', description: '需要立即响应' },
        { value: 'HIGH', label: '高（3天内）', description: '近期内需要' },
        { value: 'MEDIUM', label: '中等（1周内）', description: '一周内可以' },
        { value: 'LOW', label: '低（1个月内）', description: '一个月内均可' },
        { value: 'FLEXIBLE', label: '灵活时间', description: '时间灵活，看优惠' },
      ],
    },
    {
      id: 'preferredStartDate',
      type: L2FieldType.DATE,
      label: '期望开始日期',
      description: '您期望的消费开始日期',
      required: false,
    },
    {
      id: 'flexibleDates',
      type: L2FieldType.BOOLEAN,
      label: '日期灵活',
      description: '如果日期可以灵活调整',
      required: false,
      defaultValue: false,
    },
    {
      id: 'timeConstraints',
      type: L2FieldType.MULTI_SELECT,
      label: '时间偏好',
      description: '您偏好的消费时间',
      required: false,
      options: [
        { value: 'weekend', label: '周末' },
        { value: 'weekday', label: '工作日' },
        { value: 'morning', label: '上午' },
        { value: 'afternoon', label: '下午' },
        { value: 'evening', label: '晚上' },
      ],
    },

    // === Location ===
    {
      id: 'locationAddress',
      type: L2FieldType.TEXT,
      label: '位置地址',
      description: '您所在的位置或目标区域',
      required: false,
      placeholder: '输入地址',
    },
    {
      id: 'searchRadius',
      type: L2FieldType.NUMBER,
      label: '搜索半径',
      description: '搜索商家的半径范围',
      required: false,
      min: 1,
      max: 50,
      step: 1,
      unit: '公里',
      defaultValue: 5,
    },

    // === Additional Notes ===
    {
      id: 'additionalNotes',
      type: L2FieldType.LONG_TEXT,
      label: '补充说明',
      description: '其他需要说明的需求或偏好',
      required: false,
      maxLength: 500,
      placeholder: '描述其他需求，如：需要预约、特殊要求等',
    },
  ],
  steps: [
    {
      id: 'role',
      title: '选择角色',
      description: '选择消费者或商家角色',
      fields: ['role'],
    },
    {
      id: 'categories',
      title: '选择类别',
      description: '选择您感兴趣的商品/服务类别',
      fields: ['categories'],
    },
    {
      id: 'budget',
      title: '预算设置',
      description: '设置您的消费预算范围',
      fields: ['budgetType', 'budgetMin', 'budgetMax', 'budgetDisclosure'],
    },
    {
      id: 'brands',
      title: '品牌偏好',
      description: '配置品牌偏好和商家类型',
      fields: ['preferredBrands', 'avoidedBrands', 'anyBrand'],
    },
    {
      id: 'merchants',
      title: '商家偏好',
      description: '设置商家类型和筛选条件',
      fields: ['merchantTypes', 'minRating', 'requirePhysicalStore', 'maxDistance'],
    },
    {
      id: 'timeline',
      title: '时间要求',
      description: '设置消费的时间要求',
      fields: ['urgency', 'preferredStartDate', 'flexibleDates', 'timeConstraints'],
    },
    {
      id: 'location',
      title: '位置设置',
      description: '设置位置和搜索范围',
      fields: ['locationAddress', 'searchRadius'],
    },
    {
      id: 'notes',
      title: '补充说明',
      description: '添加其他需求说明',
      fields: ['additionalNotes'],
    },
  ],
};

export default agentAdConsumerL2Schema;
