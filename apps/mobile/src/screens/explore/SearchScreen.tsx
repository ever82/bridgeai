import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { theme } from '../../theme';

const RECENT_SEARCHES = ['旅行', '美食', '摄影'];

export const SearchScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = () => {
    // TODO: Implement search functionality
    console.log('Search:', query);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索用户、动态..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>搜索</Text>
        </TouchableOpacity>
      </View>

      {query.length === 0 && (
        <View style={styles.recentSearches}>
          <Text style={styles.sectionTitle}>最近搜索</Text>
          {RECENT_SEARCHES.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recentItem}
              onPress={() => setQuery(item)}
            >
              <Text style={styles.recentItemText}>{item}</Text>
              <Text style={styles.recentItemIcon}>↻</Text>
            </TouchableOpacity>
          ))}
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
    fontSize: 20,
    color: theme.colors.text,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.base,
    fontSize: theme.fonts.sizes.base,
  },
  searchButton: {
    paddingHorizontal: theme.spacing.base,
  },
  searchButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
  },
  recentSearches: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  recentItemText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
  },
  recentItemIcon: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});
