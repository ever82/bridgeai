/**
 * Task Filter Service
 * 任务筛选服务
 */

import {
  Task,
  TaskFilter,
  TaskSearchRequest,
  TaskSearchResponse,
  TaskType,
  NearbyTaskQuery,
  NearbyTaskResult,
  calculateDistance,
  DEFAULT_TASK_FILTER,
} from '@bridgeai/shared';
import { logger } from '../../utils/logger';

// Mock task database - in production, this would be from Prisma
let mockTasks: Task[] = [];

/**
 * Initialize mock tasks for development
 */
export function initializeMockTasks(): void {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  mockTasks = [
    {
      id: 'task-001',
      title: '商业摄影拍摄',
      description: '需要专业摄影师拍摄产品照片，约50张',
      type: 'photography',
      status: 'pending',
      priority: 'high',
      publisherId: 'user-001',
      publisherName: '张三',
      publisherCreditScore: 85,
      location: {
        province: '440000',
        provinceName: '广东省',
        city: '440300',
        cityName: '深圳市',
        district: '440305',
        districtName: '南山区',
      },
      coordinates: { latitude: 22.5431, longitude: 114.0579 },
      address: '深圳市南山区科技园',
      budgetMin: 1000,
      budgetMax: 2000,
      currency: 'CNY',
      publishTime: oneDayAgo,
      deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      estimatedDuration: 180,
      images: [],
      tags: ['商业摄影', '产品拍摄'],
      viewCount: 45,
      inquiryCount: 3,
      applicationCount: 1,
      createdAt: oneDayAgo,
      updatedAt: oneDayAgo,
    },
    {
      id: 'task-002',
      title: '短视频拍摄剪辑',
      description: '需要拍摄并剪辑一条30秒的宣传短视频',
      type: 'video',
      status: 'pending',
      priority: 'urgent',
      publisherId: 'user-002',
      publisherName: '李四',
      publisherCreditScore: 92,
      location: {
        province: '440000',
        provinceName: '广东省',
        city: '440300',
        cityName: '深圳市',
        district: '440303',
        districtName: '罗湖区',
      },
      coordinates: { latitude: 22.5485, longitude: 114.1315 },
      address: '深圳市罗湖区万象城',
      budgetMin: 3000,
      budgetMax: 5000,
      currency: 'CNY',
      publishTime: now,
      deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      estimatedDuration: 360,
      images: [],
      tags: ['短视频', '剪辑', '宣传'],
      viewCount: 28,
      inquiryCount: 5,
      applicationCount: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-003',
      title: 'Logo设计',
      description: '为新创公司设计Logo，需要3个方案',
      type: 'design',
      status: 'pending',
      priority: 'normal',
      publisherId: 'user-003',
      publisherName: '王五',
      publisherCreditScore: 78,
      location: {
        province: '440000',
        provinceName: '广东省',
        city: '440300',
        cityName: '深圳市',
        district: '440304',
        districtName: '福田区',
      },
      coordinates: { latitude: 22.5431, longitude: 114.0579 },
      address: '深圳市福田区CBD',
      budgetMin: 800,
      budgetMax: 1500,
      currency: 'CNY',
      publishTime: threeDaysAgo,
      deadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      estimatedDuration: 1440,
      images: [],
      tags: ['Logo设计', '品牌'],
      viewCount: 67,
      inquiryCount: 8,
      applicationCount: 4,
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
    },
    {
      id: 'task-004',
      title: '人像摄影',
      description: '个人写真拍摄，户外自然光',
      type: 'photography',
      status: 'pending',
      priority: 'normal',
      publisherId: 'user-004',
      publisherName: '赵六',
      publisherCreditScore: 88,
      location: {
        province: '440000',
        provinceName: '广东省',
        city: '440300',
        cityName: '深圳市',
        district: '440306',
        districtName: '宝安区',
      },
      coordinates: { latitude: 22.5533, longitude: 113.8831 },
      address: '深圳市宝安区滨海公园',
      budgetMin: 500,
      budgetMax: 800,
      currency: 'CNY',
      publishTime: oneDayAgo,
      deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      estimatedDuration: 120,
      images: [],
      tags: ['人像摄影', '写真'],
      viewCount: 34,
      inquiryCount: 2,
      applicationCount: 0,
      createdAt: oneDayAgo,
      updatedAt: oneDayAgo,
    },
    {
      id: 'task-005',
      title: '活动视频录制',
      description: '公司年会活动全程录制',
      type: 'video',
      status: 'pending',
      priority: 'high',
      publisherId: 'user-005',
      publisherName: '钱七',
      publisherCreditScore: 95,
      location: {
        province: '440000',
        provinceName: '广东省',
        city: '440300',
        cityName: '深圳市',
        district: '440305',
        districtName: '南山区',
      },
      coordinates: { latitude: 22.527, longitude: 113.943 },
      address: '深圳市南山区海岸城',
      budgetMin: 5000,
      budgetMax: 8000,
      currency: 'CNY',
      publishTime: now,
      deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      estimatedDuration: 480,
      images: [],
      tags: ['活动录制', '年会'],
      viewCount: 52,
      inquiryCount: 6,
      applicationCount: 3,
      createdAt: now,
      updatedAt: now,
    },
  ];

  logger.info('Mock tasks initialized', { count: mockTasks.length });
}

/**
 * Search tasks with filter
 * 根据筛选条件搜索任务
 */
export async function searchTasks(
  request: TaskSearchRequest
): Promise<TaskSearchResponse> {
  try {
    const { userLocation, filter = {}, keyword } = request;
    const mergedFilter = { ...DEFAULT_TASK_FILTER, ...filter };

    let tasks = [...mockTasks];

    // Filter by keyword
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      tasks = tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(lowerKeyword) ||
          task.description.toLowerCase().includes(lowerKeyword) ||
          task.tags?.some((tag) => tag.toLowerCase().includes(lowerKeyword))
      );
    }

    // Filter by task types
    if (mergedFilter.types && mergedFilter.types.length > 0) {
      tasks = tasks.filter((task) => mergedFilter.types!.includes(task.type));
    }

    // Filter by budget
    if (mergedFilter.budgetMin !== undefined) {
      tasks = tasks.filter((task) => task.budgetMax >= mergedFilter.budgetMin!);
    }
    if (mergedFilter.budgetMax !== undefined) {
      tasks = tasks.filter((task) => task.budgetMin <= mergedFilter.budgetMax!);
    }

    // Filter by publish time
    if (mergedFilter.publishTimeRange) {
      const now = new Date();
      let cutoffDate: Date;

      switch (mergedFilter.publishTimeRange) {
        case 'today':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      tasks = tasks.filter((task) => task.publishTime >= cutoffDate);
    }

    // Filter by distance
    if (mergedFilter.distanceRange && mergedFilter.distanceRange > 0) {
      tasks = tasks.filter((task) => {
        const { distanceKm } = calculateDistance(
          userLocation,
          task.coordinates
        );
        return distanceKm <= mergedFilter.distanceRange!;
      });
    }

    // Sort
    switch (mergedFilter.sortBy) {
      case 'distance':
        tasks.sort((a, b) => {
          const { distanceKm: distA } = calculateDistance(userLocation, a.coordinates);
          const { distanceKm: distB } = calculateDistance(userLocation, b.coordinates);
          return mergedFilter.sortOrder === 'asc' ? distA - distB : distB - distA;
        });
        break;
      case 'time':
        tasks.sort((a, b) => {
          const timeA = a.publishTime.getTime();
          const timeB = b.publishTime.getTime();
          return mergedFilter.sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });
        break;
      case 'budget':
        tasks.sort((a, b) => {
          return mergedFilter.sortOrder === 'asc'
            ? a.budgetMax - b.budgetMax
            : b.budgetMax - a.budgetMax;
        });
        break;
    }

    // Paginate
    const page = mergedFilter.page || 1;
    const limit = mergedFilter.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedTasks = tasks.slice(start, end);

    return {
      tasks: paginatedTasks,
      total: tasks.length,
      page,
      limit,
      hasMore: end < tasks.length,
    };
  } catch (error) {
    logger.error('Error searching tasks', { error });
    throw error;
  }
}

/**
 * Get nearby tasks
 * 获取附近的任务
 */
export async function getNearbyTasks(
  query: NearbyTaskQuery
): Promise<NearbyTaskResult[]> {
  try {
    const { latitude, longitude, radiusKm, filter } = query;
    const userLocation = { latitude, longitude };

    const request: TaskSearchRequest = {
      userLocation,
      filter: {
        ...filter,
        distanceRange: radiusKm as 1 | 5 | 10 | 0,
        sortBy: 'distance',
        sortOrder: 'asc',
      },
    };

    const response = await searchTasks(request);

    return response.tasks.map((task) => ({
      task,
      distanceKm: calculateDistance(userLocation, task.coordinates).distanceKm,
      estimatedArrivalMinutes: calculateEstimatedArrival(
        userLocation,
        task.coordinates
      ),
    }));
  } catch (error) {
    logger.error('Error getting nearby tasks', { error });
    throw error;
  }
}

/**
 * Get task by ID
 * 根据ID获取任务
 */
export async function getTaskById(taskId: string): Promise<Task | null> {
  const task = mockTasks.find((t) => t.id === taskId);
  return task || null;
}

/**
 * Calculate estimated arrival time in minutes
 * 计算预计到达时间（分钟）
 */
function calculateEstimatedArrival(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const { distanceKm } = calculateDistance(from, to);
  // Assume average speed of 30km/h in city
  const estimatedMinutes = Math.ceil((distanceKm / 30) * 60);
  return Math.max(estimatedMinutes, 5); // Minimum 5 minutes
}

/**
 * Get filter options
 * 获取筛选项
 */
export function getFilterOptions() {
  return {
    distanceRanges: [
      { value: 1, label: '1km', labelZh: '1公里' },
      { value: 5, label: '5km', labelZh: '5公里' },
      { value: 10, label: '10km', labelZh: '10公里' },
      { value: 0, label: 'All', labelZh: '全城' },
    ],
    taskTypes: [
      { value: 'photography', label: 'Photography', labelZh: '摄影' },
      { value: 'video', label: 'Video', labelZh: '视频拍摄' },
      { value: 'design', label: 'Design', labelZh: '设计' },
      { value: 'artwork', label: 'Artwork', labelZh: '艺术作品' },
      { value: 'modeling', label: 'Modeling', labelZh: '模特' },
      { value: 'editing', label: 'Editing', labelZh: '后期编辑' },
      { value: 'other', label: 'Other', labelZh: '其他' },
    ],
    sortOptions: [
      { value: 'distance', label: 'Distance', labelZh: '距离最近' },
      { value: 'time', label: 'Time', labelZh: '最新发布' },
      { value: 'budget', label: 'Budget', labelZh: '预算最高' },
    ],
    publishTimeRanges: [
      { value: 'today', label: 'Today', labelZh: '今天' },
      { value: 'week', label: 'This Week', labelZh: '本周' },
      { value: 'month', label: 'This Month', labelZh: '本月' },
      { value: 'all', label: 'All', labelZh: '全部' },
    ],
  };
}

// Initialize mock data on module load
initializeMockTasks();
