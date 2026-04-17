import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { theme } from '../../theme';

interface SmartAlbum {
  id: string;
  name: string;
  description?: string;
  type: 'auto_ai' | 'location' | 'time' | 'scene' | 'custom';
  photoCount: number;
  coverPhotoId?: string;
  createdAt: Date;
  metadata: {
    dateRange?: { start: Date; end: Date };
    location?: { lat: number; lng: number; name: string };
    dominantScenes?: string[];
    dominantTags?: string[];
  };
}

export const SmartAlbumsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [albums, setAlbums] = useState<SmartAlbum[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');

  useEffect(() => {
    loadAlbums();
  }, [selectedType]);

  const loadAlbums = async () => {
    setIsLoading(true);

    // TODO: Load from API
    const mockAlbums: SmartAlbum[] = [
      {
        id: '1',
        name: 'Summer Vacation 2024',
        description: 'AI-generated album from your summer trip',
        type: 'auto_ai',
        photoCount: 156,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        metadata: {
          dateRange: {
            start: new Date('2024-07-01'),
            end: new Date('2024-08-15'),
          },
          dominantScenes: ['beach', 'mountain', 'city'],
          dominantTags: ['vacation', 'travel', 'family'],
        },
      },
      {
        id: '2',
        name: 'Paris Trip',
        description: 'Photos from Paris, France',
        type: 'location',
        photoCount: 89,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
        metadata: {
          location: { lat: 48.8566, lng: 2.3522, name: 'Paris, France' },
          dominantScenes: ['landmark', 'architecture', 'street'],
        },
      },
      {
        id: '3',
        name: 'December 2024',
        description: 'All photos from December 2024',
        type: 'time',
        photoCount: 234,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
        metadata: {
          dateRange: {
            start: new Date('2024-12-01'),
            end: new Date('2024-12-31'),
          },
          dominantScenes: ['holiday', 'winter', 'indoor'],
        },
      },
      {
        id: '4',
        name: 'Wedding Photos',
        description: 'Scene-based collection',
        type: 'scene',
        photoCount: 312,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
        metadata: {
          dominantScenes: ['wedding', 'celebration', 'people'],
          dominantTags: ['wedding', 'party', 'formal'],
        },
      },
      {
        id: '5',
        name: 'My Favorites',
        description: 'Custom collection',
        type: 'custom',
        photoCount: 45,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 100),
        metadata: {
          dominantTags: ['favorite', 'best'],
        },
      },
    ];

    // Filter by type if selected
    const filtered = selectedType
      ? mockAlbums.filter(a => a.type === selectedType)
      : mockAlbums;

    setAlbums(filtered);
    setIsLoading(false);
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'auto_ai':
        return '🤖';
      case 'location':
        return '📍';
      case 'time':
        return '📅';
      case 'scene':
        return '🎭';
      case 'custom':
        return '⭐';
      default:
        return '📁';
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'auto_ai':
        return 'AI Generated';
      case 'location':
        return 'Location';
      case 'time':
        return 'Time Period';
      case 'scene':
        return 'Scene Type';
      case 'custom':
        return 'Custom';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'auto_ai':
        return '#9C27B0';
      case 'location':
        return '#2196F3';
      case 'time':
        return '#FF9800';
      case 'scene':
        return '#4CAF50';
      case 'custom':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const handleAlbumPress = (album: SmartAlbum) => {
    // Navigate to album detail
    console.log('Album pressed:', album.id);
  };

  const handleCreateAlbum = () => {
    if (!newAlbumName.trim()) return;

    const newAlbum: SmartAlbum = {
      id: `custom_${Date.now()}`,
      name: newAlbumName,
      description: newAlbumDescription,
      type: 'custom',
      photoCount: 0,
      createdAt: new Date(),
      metadata: {},
    };

    setAlbums([newAlbum, ...albums]);
    setNewAlbumName('');
    setNewAlbumDescription('');
    setShowCreateModal(false);
  };

  const albumTypes = ['all', 'auto_ai', 'location', 'time', 'scene', 'custom'];

  const renderAlbumItem = ({ item: album }: { item: SmartAlbum }) => (
    <TouchableOpacity
      style={styles.albumCard}
      onPress={() => handleAlbumPress(album)}
    >
      <View style={styles.albumCover}>
        <View
          style={[
            styles.albumCoverPlaceholder,
            { backgroundColor: getTypeColor(album.type) + '20' },
          ]}
        >
          <Text style={styles.albumCoverIcon}>{getTypeIcon(album.type)}</Text>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: getTypeColor(album.type) },
            ]}
          >
            <Text style={styles.typeBadgeText}>{getTypeLabel(album.type)}</Text>
          </View>
        </View>
        <View style={styles.photoCountBadge}>
          <Text style={styles.photoCountText}>{album.photoCount}</Text>
        </View>
      </View>
      <View style={styles.albumInfo}>
        <Text style={styles.albumName}>{album.name}</Text>
        {album.description && (
          <Text style={styles.albumDescription} numberOfLines={2}>
            {album.description}
          </Text>
        )}
        <View style={styles.albumMeta}>
          {album.metadata.location && (
            <Text style={styles.metaItem}>📍 {album.metadata.location.name}</Text>
          )}
          {album.metadata.dateRange && (
            <Text style={styles.metaItem}>
              📅 {album.metadata.dateRange.start.toLocaleDateString()} -{' '}
              {album.metadata.dateRange.end.toLocaleDateString()}
            </Text>
          )}
          {album.metadata.dominantScenes && (
            <View style={styles.tagsContainer}>
              {album.metadata.dominantScenes.slice(0, 3).map((scene, index) => (
                <View
                  key={index}
                  style={[
                    styles.tagBadge,
                    { backgroundColor: getTypeColor(album.type) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { color: getTypeColor(album.type) },
                    ]}
                  >
                    {scene}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Albums</Text>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          style={styles.addButton}
        >
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {albumTypes.map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterChip,
              (selectedType === type || (selectedType === null && type === 'all')) &&
                styles.filterChipActive,
            ]}
            onPress={() => setSelectedType(type === 'all' ? null : type)}
          >
            {type !== 'all' && (
              <Text style={styles.filterChipIcon}>{getTypeIcon(type)}</Text>
            )}
            <Text
              style={[
                styles.filterChipText,
                (selectedType === type || (selectedType === null && type === 'all')) &&
                  styles.filterChipTextActive,
              ]}
            >
              {type === 'all' ? 'All' : getTypeLabel(type)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={albums}
          renderItem={renderAlbumItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.albumList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📁</Text>
              <Text style={styles.emptyTitle}>No albums yet</Text>
              <Text style={styles.emptyText}>
                Create your first album to get started
              </Text>
            </View>
          }
        />
      )}

      {/* Create Album Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Album</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Album name"
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              autoFocus
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newAlbumDescription}
              onChangeText={setNewAlbumDescription}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateAlbum}
            >
              <Text style={styles.createButtonText}>Create Album</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  backIcon: {
    fontSize: 24,
    color: theme.colors.text,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 24,
    color: theme.colors.white,
    fontWeight: theme.fonts.weights.bold,
  },
  filterScroll: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterContainer: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipIcon: {
    marginRight: theme.spacing.xs,
  },
  filterChipText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
  },
  filterChipTextActive: {
    color: theme.colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumList: {
    padding: theme.spacing.base,
  },
  albumCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.base,
    overflow: 'hidden',
  },
  albumCover: {
    position: 'relative',
    height: 180,
  },
  albumCoverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumCoverIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  typeBadge: {
    position: 'absolute',
    top: theme.spacing.base,
    left: theme.spacing.base,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  typeBadgeText: {
    color: theme.colors.white,
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.medium,
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: theme.spacing.base,
    right: theme.spacing.base,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  photoCountText: {
    color: theme.colors.white,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  albumInfo: {
    padding: theme.spacing.base,
  },
  albumName: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  albumDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  albumMeta: {
    gap: theme.spacing.xs,
  },
  metaItem: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  tagBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  tagText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.medium,
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.base,
  },
  emptyTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  closeIcon: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.base,
    alignItems: 'center',
  },
  createButtonText: {
    color: theme.colors.white,
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
  },
});
