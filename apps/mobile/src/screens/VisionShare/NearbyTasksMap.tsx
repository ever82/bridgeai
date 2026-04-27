import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Task,
  TaskFilter,
  GeoCoordinates,
  DISTANCE_RANGE_OPTIONS,
  SORT_OPTIONS,
} from '@bridgeai/shared';

import { visionShareApi } from '../../services/api/visionShare';
import { TaskFilterPanel } from '../../components/VisionShare/TaskFilter/TaskFilterPanel';
import { TaskListItem } from '../../components/VisionShare/TaskFilter/TaskListItem';

// Map placeholder component - in production, use react-native-maps
const MapPlaceholder: React.FC<{
  tasks: Task[];
  userLocation: GeoCoordinates;
  selectedTaskId?: string;
  onTaskSelect: (taskId: string) => void;
}> = ({ tasks, userLocation, selectedTaskId, onTaskSelect: _onTaskSelect }) => {
  return (
    <View style={styles.mapContainer}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>地图视图</Text>
        <Text style={styles.mapSubtext}>{tasks.length} 个任务在附近</Text>
        <Text style={styles.mapSubtext}>
          当前位置: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
        </Text>
        {selectedTaskId && (
          <Text style={styles.selectedTaskText}>
            已选择: {tasks.find(t => t.id === selectedTaskId)?.title}
          </Text>
        )}
      </View>
      {/* Task markers would be rendered here with react-native-maps */}
    </View>
  );
};

export const NearbyTasksMapScreen: React.FC = () => {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>({
    distanceRange: 5,
    sortBy: 'distance',
    sortOrder: 'asc',
    page: 1,
    limit: 20,
  });
  const [showFilter, setShowFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Mock user location (in production, use GPS)
  const userLocation: GeoCoordinates = {
    latitude: 22.5431,
    longitude: 114.0579,
  };

  const fetchTasks = useCallback(
    async (isRefresh = false) => {
      try {
        setLoading(true);
        setError(null);

        const page = isRefresh ? 1 : filter.page || 1;

        const response = await visionShareApi.getNearbyTasks({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          distanceKm: filter.distanceRange,
          limit: filter.limit,
          offset: isRefresh ? 0 : (page - 1) * (filter.limit || 20),
        });

        const fetchedTasks = response.data.tasks as Task[];

        if (isRefresh) {
          setTasks(fetchedTasks);
        } else {
          setTasks(prev => [...prev, ...fetchedTasks]);
        }

        setTotal(response.data.total);
        setHasMore(fetchedTasks.length >= (filter.limit || 20));
      } catch (err) {
        setError('加载任务失败，请稍后重试');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    fetchTasks(true);
  }, [filter.distanceRange, filter.sortBy]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks(true);
  }, [fetchTasks]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      setFilter(prev => ({ ...prev, page: (prev.page || 1) + 1 }));
      fetchTasks();
    }
  }, [loading, hasMore, fetchTasks]);

  const handleTaskPress = useCallback(
    (taskId: string) => {
      navigation.navigate('TaskDetail', { taskId });
    },
    [navigation]
  );

  const handleFilterChange = useCallback((newFilter: TaskFilter) => {
    setFilter(newFilter);
    setShowFilter(false);
  }, []);

  const handleTaskSelect = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const renderTaskItem = useCallback(
    ({ item }: { item: Task }) => (
      <TaskListItem
        task={item}
        userLocation={userLocation}
        onPress={() => handleTaskPress(item.id)}
        isSelected={item.id === selectedTaskId}
      />
    ),
    [handleTaskPress, selectedTaskId, userLocation]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>附近任务</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilter(true)}>
            <Text style={styles.filterButtonText}>筛选</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
          >
            <Text style={styles.viewModeButtonText}>{viewMode === 'map' ? '列表' : '地图'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Summary */}
      <View style={styles.filterSummary}>
        <Text style={styles.filterSummaryText}>
          {DISTANCE_RANGE_OPTIONS.find(o => o.value === filter.distanceRange)?.labelZh || '5公里'}
          {' · '}
          {SORT_OPTIONS.find(o => o.value === filter.sortBy)?.labelZh || '距离最近'}
          {' · '}
          {total} 个任务
        </Text>
      </View>

      {/* Content */}
      {viewMode === 'map' ? (
        <View style={styles.content}>
          <MapPlaceholder
            tasks={tasks}
            userLocation={userLocation}
            selectedTaskId={selectedTaskId || undefined}
            onTaskSelect={handleTaskSelect}
          />
          <View style={styles.taskListOverlay}>
            <FlatList
              data={tasks}
              renderItem={renderTaskItem}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTaskItem}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Loading Indicator */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1890FF" />
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={styles.retryText}>重试</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Panel */}
      {showFilter && (
        <TaskFilterPanel
          filter={filter}
          onChange={handleFilterChange}
          onClose={() => setShowFilter(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#595959',
  },
  viewModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1890FF',
    borderRadius: 4,
  },
  viewModeButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  filterSummary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  filterSummaryText: {
    fontSize: 13,
    color: '#8C8C8C',
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E6F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1890FF',
  },
  mapSubtext: {
    fontSize: 14,
    color: '#8C8C8C',
    marginTop: 8,
  },
  selectedTaskText: {
    fontSize: 14,
    color: '#262626',
    marginTop: 16,
    fontWeight: '500',
  },
  taskListOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    maxHeight: 200,
  },
  horizontalList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 14,
    color: '#FF4D4F',
    marginBottom: 12,
  },
  retryText: {
    fontSize: 14,
    color: '#1890FF',
  },
});
