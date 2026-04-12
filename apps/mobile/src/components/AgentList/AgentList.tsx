import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { AgentCard } from './AgentCard';
import { SortDropdown } from './SortDropdown';
import { FilterBar } from './FilterBar';

export interface Agent {
  id: string;
  name: string;
  avatar?: string;
  skills: string[];
  rating: number;
  hourlyRate: number;
  isAvailable: boolean;
  isVerified: boolean;
  experienceYears: number;
  creditScore?: number;
  location?: string;
  category?: string;
  lastActiveAt?: Date;
  matchScore?: number;
  matchDetails?: {
    skillMatch: number;
    ratingScore: number;
    priceScore: number;
    availabilityScore: number;
    experienceScore: number;
    verificationScore: number;
  };
}

export type SortOption =
  | 'relevance'
  | 'rating'
  | 'price'
  | 'experience'
  | 'activity'
  | 'credit'
  | 'composite';

interface AgentListProps {
  agents: Agent[];
  loading?: boolean;
  onAgentPress?: (agent: Agent) => void;
  onSortChange?: (sort: SortOption, order: 'asc' | 'desc') => void;
  onFilterPress?: () => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  selectedSort?: SortOption;
  sortOrder?: 'asc' | 'desc';
  appliedFilters?: FilterCriteria;
  resultCount?: number;
}

export interface FilterCriteria {
  skills?: string[];
  minRating?: number;
  maxHourlyRate?: number;
  availability?: boolean;
  location?: string;
  language?: string[];
  experienceYears?: number;
  verified?: boolean;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Best Match' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price', label: 'Price' },
  { value: 'experience', label: 'Experience' },
  { value: 'activity', label: 'Recently Active' },
  { value: 'credit', label: 'Credit Score' },
  { value: 'composite', label: 'Overall Score' },
];

export const AgentList: React.FC<AgentListProps> = ({
  agents,
  loading = false,
  onAgentPress,
  onSortChange,
  onFilterPress,
  onEndReached,
  hasMore = false,
  selectedSort = 'relevance',
  sortOrder = 'desc',
  appliedFilters,
  resultCount,
}) => {
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const activeFilterCount = useMemo(() => {
    if (!appliedFilters) return 0;
    return Object.values(appliedFilters).filter(v => v !== undefined).length;
  }, [appliedFilters]);

  const handleSortSelect = useCallback((sort: SortOption) => {
    const newOrder = selectedSort === sort && sortOrder === 'desc' ? 'asc' : 'desc';
    onSortChange?.(sort, newOrder);
    setShowSortDropdown(false);
  }, [selectedSort, sortOrder, onSortChange]);

  const handleToggleSortOrder = useCallback(() => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    onSortChange?.(selectedSort, newOrder);
  }, [selectedSort, sortOrder, onSortChange]);

  const renderAgentCard = useCallback(({ item }: { item: Agent }) => (
    <AgentCard
      agent={item}
      onPress={() => onAgentPress?.(item)}
    />
  ), [onAgentPress]);

  const renderHeader = () => (
    <View style={styles.header}>
      <FilterBar
        activeFilterCount={activeFilterCount}
        onFilterPress={onFilterPress}
        resultCount={resultCount ?? agents.length}
      />

      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortDropdown(!showSortDropdown)}
        >
          <Text style={styles.sortLabel}>Sort by:</Text>
          <Text style={styles.sortValue}>
            {sortOptions.find(o => o.value === selectedSort)?.label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.orderButton}
          onPress={handleToggleSortOrder}
        >
          <Text style={styles.orderIcon}>
            {sortOrder === 'desc' ? '↓' : '↑'}
          </Text>
        </TouchableOpacity>
      </View>

      {showSortDropdown && (
        <SortDropdown
          options={sortOptions}
          selected={selectedSort}
          onSelect={handleSortSelect}
          onClose={() => setShowSortDropdown(false)}
        />
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No agents found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your filters or search criteria
      </Text>
    </View>
  );

  return (
    <FlatList
      data={agents}
      renderItem={renderAgentCard}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={renderHeader}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  sortValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  orderButton: {
    marginLeft: 8,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  orderIcon: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  footerLoader: {
    paddingVertical: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
