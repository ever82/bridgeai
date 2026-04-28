/**
 * Task Filter Service
 * 任务筛选服务
 */
import { Task, TaskSearchRequest, TaskSearchResponse, NearbyTaskQuery, NearbyTaskResult } from '@bridgeai/shared';
/**
 * Initialize mock tasks for development
 */
export declare function initializeMockTasks(): void;
/**
 * Search tasks with filter
 * 根据筛选条件搜索任务
 */
export declare function searchTasks(request: TaskSearchRequest): Promise<TaskSearchResponse>;
/**
 * Get nearby tasks
 * 获取附近的任务
 */
export declare function getNearbyTasks(query: NearbyTaskQuery): Promise<NearbyTaskResult[]>;
/**
 * Get task by ID
 * 根据ID获取任务
 */
export declare function getTaskById(taskId: string): Promise<Task | null>;
/**
 * Get filter options
 * 获取筛选项
 */
export declare function getFilterOptions(): {
    distanceRanges: {
        value: number;
        label: string;
        labelZh: string;
    }[];
    taskTypes: {
        value: string;
        label: string;
        labelZh: string;
    }[];
    sortOptions: {
        value: string;
        label: string;
        labelZh: string;
    }[];
    publishTimeRanges: {
        value: string;
        label: string;
        labelZh: string;
    }[];
};
//# sourceMappingURL=taskFilter.d.ts.map