import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { theme } from '../../theme';

interface SearchResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  tags: string[];
  confidence: number;
  matchedTerms: string[];
}

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  resultCount: number;
}

export const SearchAlbumScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    favoritesOnly: false,
    dateRange: null as { start: Date; end: Date } | null,
    tags: [] as string[],
  });

  // Load search history on mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    // TODO: Load from API
    const mockHistory: SearchHistoryItem[] = [
      { id: '1', query: 'beach sunset', timestamp: new Date(), resultCount: 24 },
      { id: '2', query: 'family photos', timestamp: new Date(), resultCount: 18 },
      { id: '3', query: 'birthday party', timestamp: new Date(), resultCount: 32 },
    ];
    setSearchHistory(mockHistory);
  };

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);

    // TODO: Call API to search
    // Mock results for now
    const mockResults: SearchResult[] = [
      {
        id: '1',
        url: 'https://example.com/photo1.jpg',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        title: 'Sunset at the Beach',
        description: 'Beautiful sunset captured at the beach during summer vacation',
        tags: ['sunset', 'beach', 'summer', 'vacation'],
        confidence: 0.95,
        matchedTerms: ['beach', 'sunset'],
      },
      {
        id: '2',
        url: 'https://example.com/photo2.jpg',
        thumbnailUrl: 'https://example.com/thumb2.jpg',
        title: 'Family Beach Day',
        description: 'Family enjoying a sunny day at the beach',
        tags: ['family', 'beach', 'summer', 'fun'],
        confidence: 0.88,
        matchedTerms: ['beach'],
      },
    ];

    setTimeout(() => {
      setResults(mockResults);
      setIsSearching(false);
      // Save to history
      const newHistoryItem: SearchHistoryItem = {
        id: Date.now().toString(),
        query,
        timestamp: new Date(),
        resultCount: mockResults.length,
      };
      setSearchHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]);
    }, 500);
  }, [query, activeFilters]);

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch();
  };

  const handleHistoryItemPress = (item: SearchHistoryItem) => {
    setQuery(item.query);
    handleSearch();
  };

  const clearHistory = () => {
    setSearchHistory([]);
  };

  const toggleFavoriteFilter = () => {
    setActiveFilters(prev => ({
      ...prev,
      favoritesOnly: !prev.favoritesOnly,
    }));
  };

  const renderResultItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.resultCard}>
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>📷</Text>
        </View>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>{Math.round(item.confidence * 100)}%</Text>
        </View>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.tagsContainer}>
          {item.tags.map((tag, index) => (
            <View key={index} style={styles.tagBadge}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.matchedTerms}>
          Matched: {item.matchedTerms.join(', ')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderHistoryItem = ({ item }: { item: SearchHistoryItem }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => handleHistoryItemPress(item)}
    >
      <Text style={styles.historyIcon}>🕐</Text>
      <View style={styles.historyContent}>
        <Text style={styles.historyQuery}>{item.query}</Text>
        <Text style={styles.historyMeta}>{item.resultCount} results</Text>
      </View>
      <TouchableOpacity onPress={() => setQuery(item.query)}>
        <Text style={styles.historyAction}>↻</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyTitle}>Search Your Photos</Text>
      <Text style={styles.emptyText}>
        Describe what you're looking for in natural language
      </Text>
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Try searching for:</Text>
        {['sunset at the beach', 'family dinner', 'birthday party', 'mountain hiking'].map(
          (suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => handleSuggestionPress(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
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
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search photos... (e.g., 'sunset at beach')"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterButton}>
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeFilters.favoritesOnly && styles.filterChipActive,
            ]}
            onPress={toggleFavoriteFilter}
          >
            <Text style={[
              styles.filterChipText,
              activeFilters.favoritesOnly && styles.filterChipTextActive,
            ]}>
              ⭐ Favorites Only
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Searching with AI...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderResultItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      ) : query.length === 0 ? (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            {searchHistory.length > 0 && (
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          {searchHistory.length > 0 ? (
            <FlatList
              data={searchHistory}
              renderItem={renderHistoryItem}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            renderEmptyState()
          )}
        </View>
      ) : (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsIcon}>😕</Text>
          <Text style={styles.noResultsTitle}>No results found</Text>
          <Text style={styles.noResultsText}>
            Try different keywords or check your filters
          </Text>
        </View>
      )}
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
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  backIcon: {
    fontSize: 24,
    color: theme.colors.text,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.base,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
  },
  clearIcon: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    padding: theme.spacing.xs,
  },
  filterButton: {
    padding: theme.spacing.sm,
  },
  filterIcon: {
    fontSize: 20,
  },
  filterPanel: {
    flexDirection: 'row',
    padding: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  filterChip: {
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
  loadingText: {
    marginTop: theme.spacing.base,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
  resultsList: {
    padding: theme.spacing.base,
  },
  resultCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.base,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 48,
  },
  confidenceBadge: {
    position: 'absolute',
    top: theme.spacing.base,
    right: theme.spacing.base,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  confidenceText: {
    color: theme.colors.white,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  resultInfo: {
    padding: theme.spacing.base,
  },
  resultTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  resultDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  tagBadge: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  tagText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.primary,
  },
  matchedTerms: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  historyContainer: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  clearText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.primary,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  historyIcon: {
    fontSize: 16,
    marginRight: theme.spacing.base,
  },
  historyContent: {
    flex: 1,
  },
  historyQuery: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
  },
  historyMeta: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
  },
  historyAction: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    padding: theme.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  suggestionsContainer: {
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.base,
  },
  suggestionChip: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.sm,
  },
  suggestionText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  noResultsIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.base,
  },
  noResultsTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  noResultsText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
