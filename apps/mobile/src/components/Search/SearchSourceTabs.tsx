import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

export type SearchSource = 'all' | 'local' | 'cloud';

export interface SearchSourceOption {
  source: SearchSource;
  label: string;
  icon?: string;
  count?: number;
}

interface SearchSourceTabsProps {
  activeSource: SearchSource;
  onSourceChange: (source: SearchSource) => void;
  localCount?: number;
  cloudCount?: number;
  totalCount?: number;
  showCounts?: boolean;
  disabled?: boolean;
}

const SOURCE_OPTIONS: SearchSourceOption[] = [
  { source: 'all', label: 'All' },
  { source: 'local', label: 'Local' },
  { source: 'cloud', label: 'Cloud' },
];

export const SearchSourceTabs: React.FC<SearchSourceTabsProps> = ({
  activeSource,
  onSourceChange,
  localCount,
  cloudCount,
  totalCount,
  showCounts = true,
  disabled = false,
}) => {
  const getCountForSource = (source: SearchSource): number | undefined => {
    if (!showCounts) return undefined;

    switch (source) {
      case 'all':
        return totalCount;
      case 'local':
        return localCount;
      case 'cloud':
        return cloudCount;
      default:
        return undefined;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SOURCE_OPTIONS.map((option) => {
          const isActive = activeSource === option.source;
          const count = getCountForSource(option.source);

          return (
            <TouchableOpacity
              key={option.source}
              style={[
                styles.tab,
                isActive && styles.activeTab,
                disabled && styles.disabledTab,
              ]}
              onPress={() => !disabled && onSourceChange(option.source)}
              activeOpacity={disabled ? 1 : 0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive, disabled }}
              accessibilityLabel={`${option.label} search results`}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.activeTabText,
                  disabled && styles.disabledTabText,
                ]}
              >
                {option.label}
              </Text>
              {count !== undefined && count > 0 && (
                <View style={[styles.badge, isActive && styles.activeBadge]}>
                  <Text
                    style={[
                      styles.badgeText,
                      isActive && styles.activeBadgeText,
                    ]}
                  >
                    {count > 99 ? '99+' : count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Source indicator */}
      <View style={styles.indicatorContainer}>
        {SOURCE_OPTIONS.map((option) => {
          const isActive = activeSource === option.source;
          return (
            <View
              key={`indicator-${option.source}`}
              style={[
                styles.indicator,
                isActive && styles.activeIndicator,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    marginRight: 8,
    minHeight: 36,
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  disabledTab: {
    opacity: 0.5,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  activeTabText: {
    color: '#ffffff',
  },
  disabledTabText: {
    color: '#adb5bd',
  },
  badge: {
    backgroundColor: '#6c757d',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  activeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  activeBadgeText: {
    color: '#ffffff',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 8,
    gap: 4,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dee2e6',
  },
  activeIndicator: {
    backgroundColor: '#007bff',
    width: 18,
  },
});

export default SearchSourceTabs;
