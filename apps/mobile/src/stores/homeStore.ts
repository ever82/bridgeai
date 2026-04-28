import { create } from 'zustand';

/**
 * Cache Strategy for Home Store
 *
 * The home store implements a two-tier caching strategy:
 *
 * 1. Cache Duration (cacheDuration): How long data is considered fresh before
 *    requiring a forced refresh. Prevents redundant API calls within this window.
 *    Default: 5 minutes. Can be overridden via setCacheDuration().
 *
 * 2. Auto-Refresh Interval (refreshInterval): Background polling interval that
 *    silently refreshes stale data. Keeps the UI fresh without user interaction.
 *    Default: 30 minutes. Can be configured via setRefreshInterval().
 *
 * Behavior:
 * - fetchHomeData(force=false) checks cache duration before fetching
 * - fetchHomeData(force=true) bypasses cache and always fetches fresh data
 * - Auto-refresh is controlled by startAutoRefresh()/stopAutoRefresh()
 * - Auto-refresh only triggers when current data exceeds cache duration
 * - Manual refresh (refresh()) always forces a fresh fetch
 */

// Cache configuration defaults
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEFAULT_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes (auto-refresh)

interface AgentSceneStatus {
  scene: string;
  label: string;
  activeCount: number;
}

interface AgentStatus {
  name: string;
  statusText: string;
  scenes: AgentSceneStatus[];
}

interface Recommendation {
  id: string;
  scene: string;
  sceneIcon: string;
  title: string;
  subtitle: string;
  extra: string;
  actionLabel: string;
}

export interface MatchResult {
  id: string;
  userName: string;
  userAvatar?: string;
  matchScore: number;
  scene: string;
  sceneIcon: string;
  timestamp: string;
  matchedInterest: string;
}

interface FeaturedItem {
  id: string;
  scene: string;
  sceneIcon: string;
  title: string;
  subtitle: string;
  tags: string[];
  actionLabel: string;
}

interface HomeState {
  agentStatus: AgentStatus | null;
  recommendations: Recommendation[];
  recentMatches: MatchResult[];
  featuredContent: FeaturedItem[];
  scenePreference: string | null;
  points: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetched: number | null;

  /** Current cache duration in ms */
  cacheDuration: number;
  /** Auto-refresh interval in ms */
  refreshInterval: number;

  fetchHomeData: (force?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  setCacheDuration: (ms: number) => void;
  setRefreshInterval: (ms: number) => void;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
}

let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

const MOCK_AGENT_STATUS: AgentStatus = {
  name: '小A',
  statusText: '正在为您匹配中...',
  scenes: [
    { scene: 'visionshare', label: 'VisionShare', activeCount: 1 },
    { scene: 'agentdate', label: 'AgentDate', activeCount: 3 },
    { scene: 'agentjob', label: 'AgentJob', activeCount: 0 },
    { scene: 'agentad', label: 'AgentAd', activeCount: 0 },
  ],
};

const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: '1',
    scene: 'visionshare',
    sceneIcon: '📷',
    title: 'VisionShare',
    subtitle: '附近有人想看三里屯路况',
    extra: '距离你 500米 | 奖励 10积分',
    actionLabel: '去响应',
  },
  {
    id: '2',
    scene: 'agentdate',
    sceneIcon: '💕',
    title: 'AgentDate',
    subtitle: '小红 (信用分 92)',
    extra: '匹配度: 85% | 喜欢户外、摄影',
    actionLabel: '开始聊天',
  },
  {
    id: '3',
    scene: 'agentjob',
    sceneIcon: '💼',
    title: 'AgentJob',
    subtitle: '附近有新职位发布',
    extra: '前端开发 | 薪资 15-25K',
    actionLabel: '查看详情',
  },
];

const MOCK_RECENT_MATCHES: MatchResult[] = [
  {
    id: 'm1',
    userName: '小雨',
    userAvatar: undefined,
    matchScore: 92,
    scene: 'agentdate',
    sceneIcon: '💕',
    timestamp: '5分钟前',
    matchedInterest: '都喜欢户外摄影',
  },
  {
    id: 'm2',
    userName: 'Alex',
    userAvatar: undefined,
    matchScore: 87,
    scene: 'agentjob',
    sceneIcon: '💼',
    timestamp: '30分钟前',
    matchedInterest: '都擅长前端开发',
  },
  {
    id: 'm3',
    userName: '摄影师阿杰',
    userAvatar: undefined,
    matchScore: 78,
    scene: 'visionshare',
    sceneIcon: '📷',
    timestamp: '2小时前',
    matchedInterest: '都在三里屯附近',
  },
];

const MOCK_FEATURED_CONTENT: FeaturedItem[] = [
  {
    id: 'f1',
    scene: 'visionshare',
    sceneIcon: '📷',
    title: '三里屯实时路况',
    subtitle: '500米内 | 奖励10积分',
    tags: ['🔥 热门', '附近'],
    actionLabel: '去响应',
  },
  {
    id: 'f2',
    scene: 'agentdate',
    sceneIcon: '💕',
    title: '小红 想认识你',
    subtitle: '匹配度 85% | 户外、摄影',
    tags: ['新动态', '高匹配'],
    actionLabel: '开始聊天',
  },
  {
    id: 'f3',
    scene: 'agentjob',
    sceneIcon: '💼',
    title: '前端开发工程师',
    subtitle: '15-25K | 附近',
    tags: ['新发布', '高薪'],
    actionLabel: '查看详情',
  },
  {
    id: 'f4',
    scene: 'agentad',
    sceneIcon: '🛒',
    title: '闲置物品转让',
    subtitle: '相机 95新 | 附近',
    tags: ['限时优惠'],
    actionLabel: '立即查看',
  },
];

export const useHomeStore = create<HomeState>()((set, get) => ({
  agentStatus: null,
  recommendations: [],
  recentMatches: [],
  featuredContent: [],
  scenePreference: null,
  points: 0,
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastFetched: null,
  cacheDuration: DEFAULT_CACHE_DURATION,
  refreshInterval: DEFAULT_REFRESH_INTERVAL,

  fetchHomeData: async (force = false) => {
    const { lastFetched, cacheDuration } = get();
    const now = Date.now();

    // Use configurable cache duration
    if (!force && lastFetched && now - lastFetched < cacheDuration) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // Phase 1: Using mock data; will be replaced by real API integration in a future phase
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));

      set({
        agentStatus: MOCK_AGENT_STATUS,
        recommendations: MOCK_RECOMMENDATIONS,
        recentMatches: MOCK_RECENT_MATCHES,
        featuredContent: MOCK_FEATURED_CONTENT,
        points: 125,
        isLoading: false,
        lastFetched: now,
      });
    } catch {
      set({
        isLoading: false,
        error: '加载失败，请重试',
      });
    }
  },

  refresh: async () => {
    set({ isRefreshing: true });
    try {
      await get().fetchHomeData(true);
    } finally {
      set({ isRefreshing: false });
    }
  },

  setCacheDuration: (ms: number) => {
    set({ cacheDuration: ms });
  },

  setRefreshInterval: (ms: number) => {
    set({ refreshInterval: ms });
  },

  startAutoRefresh: () => {
    const { refreshInterval } = get();
    // Clear any existing timer
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
    }
    // Set up auto-refresh using refreshInterval from state
    autoRefreshTimer = setInterval(() => {
      const { lastFetched, cacheDuration } = get();
      const now = Date.now();
      // Only refresh if data is stale beyond cache duration
      if (!lastFetched || now - lastFetched >= cacheDuration) {
        get().fetchHomeData(false);
      }
    }, refreshInterval);
  },

  stopAutoRefresh: () => {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  },
}));
