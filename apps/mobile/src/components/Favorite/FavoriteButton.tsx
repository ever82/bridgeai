import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { theme } from '../../theme';

interface FavoriteButtonProps {
  imageId: string;
  initialFavorite?: boolean;
  onToggle?: (isFavorite: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  favoriteCount?: number;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  imageId,
  initialFavorite = false,
  onToggle,
  size = 'medium',
  showCount = false,
  favoriteCount = 0,
}) => {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [scaleAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    setIsFavorite(initialFavorite);
  }, [initialFavorite]);

  const handlePress = () => {
    // Animate
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const newValue = !isFavorite;
    setIsFavorite(newValue);
    onToggle?.(newValue);

    // TODO: Call API to toggle favorite
    console.log('Toggle favorite for image:', imageId, newValue);
  };

  const getSize = () => {
    switch (size) {
      case 'small':
        return { button: 32, icon: 16, font: theme.fonts.sizes.sm };
      case 'large':
        return { button: 48, icon: 24, font: theme.fonts.sizes.md };
      default:
        return { button: 40, icon: 20, font: theme.fonts.sizes.base };
    }
  };

  const sizeStyles = getSize();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { width: sizeStyles.button, height: sizeStyles.button },
        isFavorite && styles.buttonActive,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={[styles.icon, { fontSize: sizeStyles.icon }]}>
          {isFavorite ? '★' : '☆'}
        </Text>
      </Animated.View>
      {showCount && favoriteCount > 0 && (
        <Text style={[styles.count, { fontSize: sizeStyles.font }]}>
          {favoriteCount}
        </Text>
      )}
    </TouchableOpacity>
  );
};

interface QuickFavoriteTagsProps {
  tags: string[];
  selectedTags: string[];
  onTagPress: (tag: string) => void;
}

export const QuickFavoriteTags: React.FC<QuickFavoriteTagsProps> = ({
  tags,
  selectedTags,
  onTagPress,
}) => {
  return (
    <View style={styles.tagsContainer}>
      {tags.map((tag, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.tag,
            selectedTags.includes(tag) && styles.tagActive,
          ]}
          onPress={() => onTagPress(tag)}
        >
          <Text
            style={[
              styles.tagText,
              selectedTags.includes(tag) && styles.tagTextActive,
            ]}
          >
            {selectedTags.includes(tag) ? '★' : '☆'} {tag}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

interface FavoritesListProps {
  favorites: Array<{
    id: string;
    imageId: string;
    title: string;
    thumbnailUrl?: string;
    tags: string[];
    createdAt: Date;
  }>;
  onItemPress?: (favorite: any) => void;
  onRemove?: (id: string) => void;
  emptyText?: string;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({
  favorites,
  onItemPress,
  onRemove,
  emptyText = 'No favorites yet',
}) => {
  if (favorites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>☆</Text>
        <Text style={styles.emptyTitle}>{emptyText}</Text>
        <Text style={styles.emptySubtitle}>
          Tap the star icon to add photos to your favorites
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {favorites.map((favorite) => (
        <TouchableOpacity
          key={favorite.id}
          style={styles.favoriteItem}
          onPress={() => onItemPress?.(favorite)}
        >
          <View style={styles.thumbnail}>
            <Text style={styles.thumbnailPlaceholder}>📷</Text>
          </View>
          <View style={styles.favoriteInfo}>
            <Text style={styles.favoriteTitle}>{favorite.title}</Text>
            <View style={styles.favoriteTags}>
              {favorite.tags.slice(0, 3).map((tag, idx) => (
                <View key={idx} style={styles.favoriteTag}>
                  <Text style={styles.favoriteTagText}>{tag}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.favoriteDate}>
              {favorite.createdAt.toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove?.(favorite.id)}
          >
            <Text style={styles.removeIcon}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonActive: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  icon: {
    color: theme.colors.textSecondary,
  },
  count: {
    marginLeft: theme.spacing.xs,
    color: theme.colors.text,
    fontWeight: theme.fonts.weights.medium,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tagText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
  },
  tagTextActive: {
    color: theme.colors.white,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.base,
    color: theme.colors.textSecondary,
  },
  emptyTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  listContainer: {
    padding: theme.spacing.base,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.base,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.base,
  },
  thumbnailPlaceholder: {
    fontSize: 24,
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  favoriteTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  favoriteTag: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  favoriteTagText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.primary,
  },
  favoriteDate: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  removeButton: {
    padding: theme.spacing.sm,
  },
  removeIcon: {
    fontSize: 16,
    color: theme.colors.error,
  },
});
