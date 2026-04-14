import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface FilterBarProps {
  activeFilterCount: number;
  onFilterPress?: () => void;
  resultCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  activeFilterCount,
  onFilterPress,
  resultCount,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.resultContainer}>
        <Text style={styles.resultCount}>{resultCount}</Text>
        <Text style={styles.resultLabel}>results</Text>
      </View>

      <TouchableOpacity
        style={styles.filterButton}
        onPress={onFilterPress}
      >
        <Text style={styles.filterIcon}>🔍</Text>
        <Text style={styles.filterText}>Filter</Text>
        {activeFilterCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  badge: {
    backgroundColor: '#FF5722',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
});
