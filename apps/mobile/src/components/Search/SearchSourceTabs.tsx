import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export type SearchSourceType = 'all' | 'local' | 'cloud';

interface SearchSourceTabsProps {
  activeSource: SearchSourceType;
  onSourceChange: (source: SearchSourceType) => void;
  localCount?: number;
  cloudCount?: number;
  totalCount?: number;
}

interface TabConfig {
  key: SearchSourceType;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { key: 'all', label: 'All Photos', icon: 'photo-library' },
  { key: 'local', label: 'Local', icon: 'phone-android' },
  { key: 'cloud', label: 'Cloud', icon: 'cloud' },
];

export const SearchSourceTabs: React.FC<SearchSourceTabsProps> = ({
  activeSource,
  onSourceChange,
  localCount,
  cloudCount,
  totalCount,
}) => {
  const getCount = (key: SearchSourceType): number | undefined => {
    switch (key) {
      case 'local':
        return localCount;
      case 'cloud':
        return cloudCount;
      case 'all':
        return totalCount;
      default:
        return undefined;
    }
  };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeSource === tab.key;
        const count = getCount(tab.key);

        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onSourceChange(tab.key)}
            activeOpacity={0.7}
          >
            <Icon
              name={tab.icon}
              size={18}
              color={isActive ? '#007AFF' : '#666'}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {count !== undefined && count > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {count > 99 ? '99+' : count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  tabLabel: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
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
});

export default SearchSourceTabs;
