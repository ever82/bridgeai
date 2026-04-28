import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {
  UnifiedSearch,
  UnifiedSearchResult,
  SearchSource,
} from '../../components/Search/UnifiedSearch';
import { localSearchIndex } from '../../services/indexing/localIndexer';
import { localImageAnalysis } from '../../services/ai/localImageAnalysis';
import { photoLibraryPermission } from '../../permissions/photoLibrary';
import { visionShareApi } from '../../services/api/visionShare';

interface VisionShareSearchScreenProps {
  navigation?: object;
}

export const VisionShareSearchScreen: React.FC<VisionShareSearchScreenProps> = ({ navigation }) => {
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    checkPermissions();
    initializeServices();
  }, []);

  const checkPermissions = async () => {
    const state = await photoLibraryPermission.checkPermission();
    setHasPermission(state.hasFullAccess || state.hasPartialAccess);
  };

  const initializeServices = async () => {
    try {
      await localSearchIndex.initialize();
      await localImageAnalysis.initialize();
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
  };

  const parseDateRange = (query: string): { start: Date; end: Date } | undefined => {
    const afterMatch = query.match(/after:(\d{4}-\d{2}-\d{2})/i);
    const beforeMatch = query.match(/before:(\d{4}-\d{2}-\d{2})/i);

    if (afterMatch || beforeMatch) {
      return {
        start: afterMatch ? new Date(afterMatch[1]) : new Date('2000-01-01'),
        end: beforeMatch ? new Date(beforeMatch[1]) : new Date(),
      };
    }

    // Try to parse month-year pattern (e.g., "Jan 2024", "2024-01")
    const monthYearMatch = query.match(/(\d{4})-(\d{2})/);
    if (monthYearMatch) {
      const year = parseInt(monthYearMatch[1], 10);
      const month = parseInt(monthYearMatch[2], 10) - 1;
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59),
      };
    }

    return undefined;
  };

  const parseLocation = (query: string): string | undefined => {
    // Match "location:Tokyo" format
    const locationMatch = query.match(/location:(\w+)/i);
    if (locationMatch) {
      return locationMatch[1];
    }

    // Match "in Tokyo" or "at Tokyo" patterns
    const prepositionMatch = query.match(/\b(?:in|at|near)\s+(\w+)/i);
    if (prepositionMatch) {
      return prepositionMatch[1];
    }

    return undefined;
  };

  const stripAllFilters = (query: string): string => {
    return query
      .replace(/after:\d{4}-\d{2}-\d{2}/gi, '')
      .replace(/before:\d{4}-\d{2}-\d{2}/gi, '')
      .replace(/\d{4}-\d{2}/g, '')
      .replace(/location:\w+/gi, '')
      .replace(/\b(?:in|at|near)\s+\w+/gi, '')
      .trim();
  };

  const handleSearch = useCallback(async (query: string, source: SearchSource) => {
    setLoading(true);

    try {
      const searchResults: UnifiedSearchResult[] = [];

      // Parse date range from query (e.g., "beach 2024-01" or "after:2024-01-01 before:2024-06-01")
      const dateRange = parseDateRange(query);
      const location = parseLocation(query);
      const cleanQuery = stripAllFilters(query);

      if (source === 'all' || source === 'local') {
        const localResults = await localSearchIndex.search(cleanQuery, 50, { dateRange, location });

        localResults.forEach(result => {
          // Calculate relevance score based on tag match quality
          const tagMatchCount = result.tags.filter(tag =>
            tag.toLowerCase().includes(cleanQuery.toLowerCase())
          ).length;
          const relevanceScore = Math.min(result.relevanceScore + tagMatchCount * 0.1, 1.0);

          searchResults.push({
            id: result.id,
            uri: result.uri,
            source: 'local',
            sourceLabel: 'Local',
            relevanceScore,
            tags: result.tags,
            createdAt: new Date(),
          });
        });
      }

      if (source === 'all' || source === 'cloud') {
        const cloudResponse = await visionShareApi.searchPhotos({
          query: cleanQuery,
          limit: 50,
        });

        cloudResponse.data.results.forEach(result => {
          searchResults.push({
            id: result.id,
            uri: result.url,
            source: 'cloud',
            sourceLabel: 'Cloud',
            relevanceScore: result.confidence,
            tags: result.tags,
            title: result.title,
            createdAt: new Date(),
          });
        });
      }

      // Sort mixed results by relevance score (cross-source ranking)
      searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleResultPress = useCallback(
    (result: UnifiedSearchResult) => {
      navigation?.navigate('PhotoDetail', { photoId: result.id });
    },
    [navigation]
  );

  const handleRequestPermission = async () => {
    const state = await photoLibraryPermission.requestPermission();
    setHasPermission(state.hasFullAccess || state.hasPartialAccess);
  };

  if (!hasPermission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.permissionContainer}>
          <Icon name="photo-library" size={64} color="#007AFF" />
          <Text style={styles.permissionTitle}>Photo Library Access</Text>
          <Text style={styles.permissionDescription}>
            To search your local photos with AI, we need access to your photo library. Your photos
            will be analyzed on-device and never uploaded without your permission.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermission}>
            <Text style={styles.permissionButtonText}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {showPrivacyNotice && (
        <View style={styles.privacyNotice}>
          <Icon name="security" size={20} color="#34C759" />
          <Text style={styles.privacyNoticeText}>
            AI analysis happens on your device. Your photos stay private.
          </Text>
          <TouchableOpacity
            onPress={() => setShowPrivacyNotice(false)}
            style={styles.privacyCloseButton}
          >
            <Icon name="close" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      <UnifiedSearch
        onSearch={handleSearch}
        onResultPress={handleResultPress}
        placeholder="Search photos with AI (e.g., 'beach vacation')"
        results={results}
        loading={loading}
        showSourceTabs={true}
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomBarButton}>
          <Icon name="settings" size={22} color="#666" />
          <Text style={styles.bottomBarButtonText}>Search Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomBarButton}>
          <Icon name="cloud-off" size={22} color="#666" />
          <Text style={styles.bottomBarButtonText}>Privacy Mode</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d0e8d0',
  },
  privacyNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#2d5a2d',
    marginLeft: 8,
  },
  privacyCloseButton: {
    padding: 4,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  permissionDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  bottomBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bottomBarButtonText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
});

export default VisionShareSearchScreen;
