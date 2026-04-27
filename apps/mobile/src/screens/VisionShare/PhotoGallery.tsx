/**
 * PhotoGallery Screen
 * Photo gallery viewer for VisionShare scene photos
 * ISSUE-VS005a: Photo gallery screen with filtering, sorting, and payment integration
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Photo, PhotoFilter, PhotoSortField } from '@bridgeai/shared';

import { PhotoGrid } from '../../components/PhotoViewer/PhotoGrid';

import type { PhotoGalleryProps, PhotoGalleryState } from './types';

// ============================================================
// Mock Data - Replace with actual API calls
// TODO: Wire up to real VisionShare photo API when endpoints are available
// ============================================================

const MOCK_PHOTOS: Photo[] = [
  {
    id: 'photo-001',
    title: '城市夜景',
    description: '深圳CBD夜景摄影作品',
    sceneId: 'visionshare',
    photographer: {
      id: 'user-101',
      name: '李明',
      creditScore: 92,
      avatarUrl: 'https://i.pravatar.cc/100?img=1',
      isVerified: true,
    },
    metadata: {
      camera: 'Sony A7R IV',
      lens: '24-70mm f/2.8 GM',
      iso: 3200,
      aperture: 'f/2.8',
      shutterSpeed: '1/60s',
      focalLength: '35mm',
      locationName: '深圳市福田区',
      capturedAt: '2025-12-15T20:00:00Z',
      width: 7952,
      height: 5304,
    },
    thumbnailUrl: 'https://picsum.photos/seed/photo001/400/300',
    fullUrl: 'https://picsum.photos/seed/photo001/1600/1200',
    previewUrl: 'https://picsum.photos/seed/photo001/200/150',
    status: 'active',
    categories: ['street', 'architecture'],
    credit: { creditCost: 50, priceType: 'fixed', currency: 'CREDIT' },
    isUnlocked: false,
    purchaseCount: 128,
    rating: 4.8,
    ratingCount: 45,
    createdAt: '2025-12-15T20:00:00Z',
    updatedAt: '2025-12-20T10:00:00Z',
  },
  {
    id: 'photo-002',
    title: '海岛日落',
    description: '马尔代夫海边日落',
    sceneId: 'visionshare',
    photographer: {
      id: 'user-102',
      name: '王芳',
      creditScore: 85,
      avatarUrl: 'https://i.pravatar.cc/100?img=5',
      isVerified: true,
    },
    metadata: {
      camera: 'Canon EOS R5',
      iso: 400,
      aperture: 'f/8',
      shutterSpeed: '1/500s',
      locationName: '马尔代夫',
      capturedAt: '2025-11-20T18:30:00Z',
      width: 8192,
      height: 5464,
    },
    thumbnailUrl: 'https://picsum.photos/seed/photo002/400/300',
    fullUrl: 'https://picsum.photos/seed/photo002/1600/1200',
    status: 'active',
    categories: ['landscape', 'nature'],
    credit: { creditCost: 80, priceType: 'fixed', currency: 'CREDIT' },
    isUnlocked: true,
    purchaseCount: 256,
    rating: 4.9,
    ratingCount: 89,
    createdAt: '2025-11-20T18:30:00Z',
    updatedAt: '2025-12-01T09:00:00Z',
    isFavorited: true,
  },
  {
    id: 'photo-003',
    title: '咖啡馆人像',
    description: '文艺风格室内人像',
    sceneId: 'visionshare',
    photographer: {
      id: 'user-103',
      name: '张伟',
      creditScore: 78,
      avatarUrl: 'https://i.pravatar.cc/100?img=3',
      isVerified: false,
    },
    metadata: {
      camera: 'Fujifilm X-T5',
      iso: 800,
      aperture: 'f/1.4',
      shutterSpeed: '1/125s',
      focalLength: '56mm',
      locationName: '深圳市南山区',
      capturedAt: '2025-10-05T14:00:00Z',
      width: 6240,
      height: 4160,
    },
    thumbnailUrl: 'https://picsum.photos/seed/photo003/400/300',
    fullUrl: 'https://picsum.photos/seed/photo003/1600/1200',
    status: 'active',
    categories: ['portrait'],
    credit: { creditCost: 30, priceType: 'fixed', currency: 'CREDIT' },
    isUnlocked: false,
    purchaseCount: 67,
    rating: 4.5,
    ratingCount: 23,
    createdAt: '2025-10-05T14:00:00Z',
    updatedAt: '2025-10-10T16:00:00Z',
  },
  {
    id: 'photo-004',
    title: '产品静物',
    description: '数码产品摄影作品',
    sceneId: 'visionshare',
    photographer: {
      id: 'user-104',
      name: '陈静',
      creditScore: 88,
      avatarUrl: 'https://i.pravatar.cc/100?img=9',
      isVerified: true,
    },
    metadata: {
      camera: 'Nikon Z9',
      iso: 64,
      aperture: 'f/11',
      shutterSpeed: '1/200s',
      focalLength: '105mm',
      locationName: '广州市天河区',
      capturedAt: '2025-09-18T10:00:00Z',
      width: 8256,
      height: 5504,
    },
    thumbnailUrl: 'https://picsum.photos/seed/photo004/400/300',
    fullUrl: 'https://picsum.photos/seed/photo004/1600/1200',
    status: 'active',
    categories: ['product'],
    credit: { creditCost: 100, priceType: 'negotiable', currency: 'CREDIT' },
    isUnlocked: false,
    purchaseCount: 42,
    rating: 4.7,
    ratingCount: 15,
    createdAt: '2025-09-18T10:00:00Z',
    updatedAt: '2025-09-25T12:00:00Z',
  },
  {
    id: 'photo-005',
    title: '建筑线条',
    description: '现代建筑几何美学',
    sceneId: 'visionshare',
    photographer: {
      id: 'user-105',
      name: '刘洋',
      creditScore: 95,
      avatarUrl: 'https://i.pravatar.cc/100?img=7',
      isVerified: true,
    },
    metadata: {
      camera: 'Sony A7R V',
      iso: 100,
      aperture: 'f/8',
      shutterSpeed: '1/250s',
      focalLength: '16mm',
      locationName: '香港中环',
      capturedAt: '2025-08-22T11:00:00Z',
      width: 9504,
      height: 6336,
    },
    thumbnailUrl: 'https://picsum.photos/seed/photo005/400/300',
    fullUrl: 'https://picsum.photos/seed/photo005/1600/1200',
    status: 'active',
    categories: ['architecture'],
    credit: { creditCost: 60, priceType: 'fixed', currency: 'CREDIT' },
    isUnlocked: true,
    purchaseCount: 189,
    rating: 4.6,
    ratingCount: 56,
    createdAt: '2025-08-22T11:00:00Z',
    updatedAt: '2025-09-01T08:00:00Z',
  },
  {
    id: 'photo-006',
    title: '美食摄影',
    description: '精致料理摄影作品',
    sceneId: 'visionshare',
    photographer: {
      id: 'user-106',
      name: '周婷',
      creditScore: 81,
      avatarUrl: 'https://i.pravatar.cc/100?img=16',
      isVerified: false,
    },
    metadata: {
      camera: 'Canon EOS R6 II',
      iso: 400,
      aperture: 'f/2.8',
      shutterSpeed: '1/100s',
      focalLength: '50mm',
      locationName: '上海市静安区',
      capturedAt: '2025-07-30T19:00:00Z',
      width: 6000,
      height: 4000,
    },
    thumbnailUrl: 'https://picsum.photos/seed/photo006/400/300',
    fullUrl: 'https://picsum.photos/seed/photo006/1600/1200',
    status: 'active',
    categories: ['food'],
    credit: { creditCost: 25, priceType: 'fixed', currency: 'CREDIT' },
    isUnlocked: false,
    purchaseCount: 93,
    rating: 4.4,
    ratingCount: 31,
    createdAt: '2025-07-30T19:00:00Z',
    updatedAt: '2025-08-05T14:00:00Z',
  },
];

// Sort options
const SORT_OPTIONS: { key: PhotoSortField; label: string; labelZh: string }[] = [
  { key: 'createdAt', label: 'Date', labelZh: '最新' },
  { key: 'credit', label: 'Price', labelZh: '价格' },
  { key: 'rating', label: 'Rating', labelZh: '评分' },
  { key: 'purchaseCount', label: 'Popularity', labelZh: '人气' },
];

// ============================================================
// Photo Gallery Screen Component
// ============================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const PhotoGalleryScreen: React.FC<PhotoGalleryProps> = ({
  sceneId,
  initialFilter,
  config,
  onPhotoSelect,
  onBack,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, unknown>>>();
  const [state, setState] = useState<PhotoGalleryState>({
    photos: [],
    selectedPhotos: [],
    filter: {
      sceneId,
      page: 1,
      limit: 20,
      sortBy: config?.defaultSortBy || 'createdAt',
      sortOrder: config?.defaultSortOrder || 'desc',
      ...initialFilter,
    },
    isLoading: false,
    hasMore: true,
    error: undefined,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Columns for grid
  const columns = config?.columns || 2;
  const itemWidth = (SCREEN_WIDTH - 16 * 2 - (columns - 1) * 8) / columns;

  // Load photos (mock data - replace with actual API call)
  const loadPhotos = useCallback(async (filter: PhotoFilter, isRefresh = false) => {
    try {
      setState(prev => ({ ...prev, isLoading: !isRefresh, error: undefined }));

      // TODO: Replace with actual API call when endpoint is available
      // const response = await visionShareApi.getPhotos(filter);
      // if (response.success) { ... }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 600));

      // Apply sorting to mock data
      const sortedPhotos = [...MOCK_PHOTOS];
      const sortBy = filter.sortBy || 'createdAt';
      const sortOrder = filter.sortOrder || 'desc';

      sortedPhotos.sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;

        switch (sortBy) {
          case 'credit':
            aVal = a.credit.creditCost;
            bVal = b.credit.creditCost;
            break;
          case 'rating':
            aVal = a.rating || 0;
            bVal = b.rating || 0;
            break;
          case 'purchaseCount':
            aVal = a.purchaseCount || 0;
            bVal = b.purchaseCount || 0;
            break;
          case 'createdAt':
          default:
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
            break;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortOrder === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });

      // Apply pagination
      const page = filter.page || 1;
      const limit = filter.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPhotos = sortedPhotos.slice(startIndex, endIndex);

      setState(prev => ({
        ...prev,
        photos: isRefresh ? paginatedPhotos : [...prev.photos, ...paginatedPhotos],
        hasMore: endIndex < sortedPhotos.length,
        isLoading: false,
        filter,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: '加载照片失败，请稍后重试',
      }));
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadPhotos(state.filter, true);
  }, []);

  // Refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPhotos({ ...state.filter, page: 1 }, true);
    setRefreshing(false);
  }, [state.filter, loadPhotos]);

  // Load more
  const handleLoadMore = useCallback(() => {
    if (!state.isLoading && state.hasMore) {
      loadPhotos({ ...state.filter, page: (state.filter.page || 1) + 1 });
    }
  }, [state.isLoading, state.hasMore, state.filter, loadPhotos]);

  // Handle sort change
  const handleSortChange = useCallback(
    (sortBy: PhotoSortField) => {
      setShowSortModal(false);
      const newFilter = {
        ...state.filter,
        sortBy,
        page: 1,
      };
      setState(prev => ({ ...prev, filter: newFilter }));
      loadPhotos(newFilter, true);
    },
    [state.filter, loadPhotos]
  );

  // Handle photo press
  const handlePhotoPress = useCallback(
    (photo: Photo, _index: number) => {
      if (config?.selectionEnabled) {
        setState(prev => {
          const selectedIds = prev.selectedPhotos.includes(photo.id)
            ? prev.selectedPhotos.filter(id => id !== photo.id)
            : [...prev.selectedPhotos, photo.id];
          return { ...prev, selectedPhotos: selectedIds };
        });
      } else {
        // Navigate to photo viewer
        if (onPhotoSelect) {
          onPhotoSelect(photo);
        } else {
          navigation.navigate('PhotoViewer', { photoId: photo.id, sceneId: photo.sceneId });
        }
      }
    },
    [config, navigation, onPhotoSelect]
  );

  // Handle photo long press
  const handlePhotoLongPress = useCallback((photo: Photo) => {
    if (photo.unlockType === 'paid' && !photo.isUnlocked) {
      Alert.alert('解锁照片', `需要 ${photo.credit.creditCost} 积分解锁此照片`, [
        { text: '取消', style: 'cancel' },
        {
          text: '解锁',
          onPress: () => {
            // TODO: Implement payment/unlock flow
            Alert.alert('提示', '解锁功能即将上线');
          },
        },
      ]);
    }
  }, []);

  // Handle back
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  }, [navigation, onBack]);

  // Get current sort option label
  const currentSortLabel = useMemo(() => {
    return SORT_OPTIONS.find(o => o.key === state.filter.sortBy)?.labelZh || '最新';
  }, [state.filter.sortBy]);

  // Render photo item
  const renderPhotoItem = useCallback(
    ({ item, index }: { item: Photo; index: number }) => {
      const isUnlocked = item.isUnlocked ?? false;

      return (
        <TouchableOpacity
          style={[styles.photoItem, { width: itemWidth }]}
          onPress={() => handlePhotoPress(item, index)}
          onLongPress={() => handlePhotoLongPress(item)}
          activeOpacity={0.8}
        >
          {/* Thumbnail */}
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.photoThumbnail}
            resizeMode="cover"
          />

          {/* Lock overlay */}
          {!isUnlocked && (
            <View style={styles.lockOverlay}>
              <View style={styles.lockBadge}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
            </View>
          )}

          {/* Price tag */}
          {config?.showPrice !== false && (
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>{item.credit.creditCost} 积分</Text>
            </View>
          )}

          {/* Photographer credit score */}
          {config?.showPhotographerCredit !== false && (
            <View style={styles.photographerCredit}>
              <Text style={styles.creditScore}>{item.photographer.creditScore}</Text>
            </View>
          )}

          {/* Rating */}
          {item.rating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {item.rating.toFixed(1)}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [itemWidth, config, handlePhotoPress, handlePhotoLongPress]
  );

  // Render grid using PhotoGrid if available, else FlatList
  const renderGrid = () => {
    // If PhotoGrid component is available, use it
    // This allows easy swap-in once PhotoGrid is implemented
    if (PhotoGrid) {
      return (
        <PhotoGrid
          photos={state.photos}
          columns={columns}
          onPhotoPress={(photo, index) => handlePhotoPress(photo, index)}
          onPhotoLongPress={handlePhotoLongPress}
          isLoading={state.isLoading}
          hasMore={state.hasMore}
          onEndReached={handleLoadMore}
        />
      );
    }

    // Fallback: FlatList grid layout
    return (
      <FlatList
        data={state.photos}
        renderItem={renderPhotoItem}
        keyExtractor={item => item.id}
        numColumns={columns}
        key={columns} // Force re-render when columns change
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        contentContainerStyle={styles.gridContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          state.isLoading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#9C27B0" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !state.isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📷</Text>
              <Text style={styles.emptyTitle}>暂无照片</Text>
              <Text style={styles.emptySubtitle}>该场景下还没有照片，稍后再来看看吧</Text>
            </View>
          ) : null
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>{'<'} 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>照片库</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Sort bar */}
      <TouchableOpacity style={styles.sortBar} onPress={() => setShowSortModal(true)}>
        <Text style={styles.sortLabel}>排序:</Text>
        <Text style={styles.sortValue}>{currentSortLabel}</Text>
        <Text style={styles.sortArrow}>▼</Text>
      </TouchableOpacity>

      {/* Filter summary */}
      <View style={styles.filterSummary}>
        <Text style={styles.filterSummaryText}>
          共 {state.photos.length} 张照片
          {state.hasMore && state.photos.length > 0 ? '+' : ''}
        </Text>
      </View>

      {/* Loading state */}
      {state.isLoading && state.photos.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C27B0" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      ) : (
        renderGrid()
      )}

      {/* Error state */}
      {state.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{state.error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContent}>
            <Text style={styles.modalTitle}>排序方式</Text>
            {SORT_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOption,
                  state.filter.sortBy === option.key && styles.sortOptionActive,
                ]}
                onPress={() => handleSortChange(option.key)}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    state.filter.sortBy === option.key && styles.sortOptionTextActive,
                  ]}
                >
                  {option.labelZh}
                </Text>
                {state.filter.sortBy === option.key && (
                  <Text style={styles.sortOptionCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // Header
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
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#9C27B0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
  },
  headerRight: {
    width: 60,
  },
  // Sort bar
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sortLabel: {
    fontSize: 14,
    color: '#8C8C8C',
    marginRight: 6,
  },
  sortValue: {
    fontSize: 14,
    color: '#262626',
    fontWeight: '500',
    flex: 1,
  },
  sortArrow: {
    fontSize: 10,
    color: '#8C8C8C',
  },
  // Filter summary
  filterSummary: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterSummaryText: {
    fontSize: 12,
    color: '#8C8C8C',
  },
  // Grid content
  gridContent: {
    padding: 16,
    gap: 8,
  },
  row: {
    gap: 8,
    marginBottom: 8,
  },
  // Photo item
  photoItem: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  photoThumbnail: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#E0E0E0',
  },
  // Overlays
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 14,
  },
  priceTag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(156, 39, 176, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  photographerCredit: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditScore: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ratingBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 10,
    color: '#FFD700',
    fontWeight: '600',
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8C8C8C',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8C8C8C',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // Error state
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
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Footer loader
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: SCREEN_WIDTH * 0.7,
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 16,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sortOptionActive: {
    backgroundColor: '#F3E5F5',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  sortOptionText: {
    fontSize: 16,
    color: '#595959',
  },
  sortOptionTextActive: {
    color: '#9C27B0',
    fontWeight: '600',
  },
  sortOptionCheck: {
    fontSize: 16,
    color: '#9C27B0',
    fontWeight: '700',
  },
});

export default PhotoGalleryScreen;
