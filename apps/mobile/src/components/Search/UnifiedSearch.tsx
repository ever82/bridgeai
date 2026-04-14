import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

export type SearchSource = 'all' | 'local' | 'cloud';

export interface UnifiedSearchResult {
  id: string;
  uri: string;
  title?: string;
  source: SearchSource;
  sourceLabel: string;
  relevanceScore: number;
  tags: string[];
  createdAt: Date;
  thumbnailUri?: string;
}

interface UnifiedSearchProps {
  onSearch?: (query: string, source: SearchSource) => void;
  onResultPress?: (result: UnifiedSearchResult) => void;
  placeholder?: string;
  initialSource?: SearchSource;
  showSourceTabs?: boolean;
  results?: UnifiedSearchResult[];
  loading?: boolean;
}

interface SearchSourceTabProps {
  source: SearchSource;
  label: string;
  active: boolean;
  onPress: () => void;
  count?: number;
}

const SearchSourceTab: React.FC<SearchSourceTabProps> = ({
  label,
  active,
  onPress,
  count,
}) => (
  <TouchableOpacity
    style={[styles.sourceTab, active && styles.sourceTabActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.sourceTabText, active && styles.sourceTabTextActive]}>
      {label}
    </Text>
    {count !== undefined && count > 0 && (
      <View style={styles.countBadge}>
        <Text style={styles.countBadgeText}>{count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

export const UnifiedSearch: React.FC<UnifiedSearchProps> = ({
  onSearch,
  onResultPress,
  placeholder = 'Search photos...',
  initialSource = 'all',
  showSourceTabs = true,
  results = [],
  loading = false,
}) => {
  const [query, setQuery] = useState('');
  const [activeSource, setActiveSource] = useState<SearchSource>(initialSource);
  const insets = useSafeAreaInsets();

  const handleSearch = useCallback(() => {
    if (onSearch && query.trim()) {
      onSearch(query.trim(), activeSource);
    }
  }, [query, activeSource, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
  }, []);

  const getSourceCount = useCallback((
    source: SearchSource,
  ): number | undefined => {
    if (!results) return undefined;
    if (source === 'all') return results.length;
    return results.filter(r => r.source === source).length;
  }, [results]);

  const filteredResults = results.filter(result =>
    activeSource === 'all' || result.source === activeSource,
  );

  const sortedResults = filteredResults.sort(
    (a, b) => b.relevanceScore - a.relevanceScore,
  );

  const renderResult = useCallback(
    ({ item }: { item: UnifiedSearchResult }) => (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => onResultPress?.(item)}
        activeOpacity={0.8}
      >
        <View style={styles.thumbnail}>
          {item.thumbnailUri ? (
            <Text style={styles.thumbnailText}>IMG</Text>
          ) : (
            <Icon name="image" size={40} color="#ccc" />
          )}
        </View>
        <View style={styles.resultInfo}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle} numberOfLines={1}>
              {item.title || `Photo ${item.id}`}
            </Text>
            <SourceBadge source={item.source} />
          </View>
          <Text style={styles.resultTags} numberOfLines={1}>
            {item.tags.slice(0, 3).join(', ')}
          </Text>
          <Text style={styles.resultMeta}>
            Score: {(item.relevanceScore * 100).toFixed(0)}% •{' '}
            {item.createdAt.toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [onResultPress],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor="#999"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Icon name="close" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSourceTabs && (
        <View style={styles.sourceTabs}>
          <SearchSourceTab
            source="all"
            label="All"
            active={activeSource === 'all'}
            onPress={() => setActiveSource('all')}
            count={getSourceCount('all')}
          />
          <SearchSourceTab
            source="local"
            label="Local"
            active={activeSource === 'local'}
            onPress={() => setActiveSource('local')}
            count={getSourceCount('local')}
          />
          <SearchSourceTab
            source="cloud"
            label="Cloud"
            active={activeSource === 'cloud'}
            onPress={() => setActiveSource('cloud')}
            count={getSourceCount('cloud')}
          />
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedResults}
          keyExtractor={item => item.id}
          renderItem={renderResult}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            query.length > 0 ? (
              <View style={styles.emptyState}>
                <Icon name="search-off" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>
                  No results found for "{query}"
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const SourceBadge: React.FC<{ source: SearchSource }> = ({ source }) => {
  const colors = {
    local: '#34C759',
    cloud: '#007AFF',
    all: '#8E8E93',
  };

  const labels = {
    local: 'Local',
    cloud: 'Cloud',
    all: 'Mixed',
  };

  return (
    <View style={[styles.sourceBadge, { backgroundColor: colors[source] }]}>
      <Text style={styles.sourceBadgeText}>{labels[source]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: 44,
  },
  clearButton: {
    padding: 4,
  },
  sourceTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sourceTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  sourceTabActive: {
    backgroundColor: '#007AFF',
  },
  sourceTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sourceTabTextActive: {
    color: '#fff',
  },
  countBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailText: {
    fontSize: 12,
    color: '#666',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  sourceBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  resultTags: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  resultMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default UnifiedSearch;
