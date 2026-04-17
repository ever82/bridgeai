import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {
  UnifiedSearch,
  UnifiedSearchResult,
  SearchSource,
} from '../../components/Search/UnifiedSearch';
import { localSearchIndex, IndexedImage } from '../../services/indexing/localIndexer';
import { localImageAnalysis } from '../../services/ai/localImageAnalysis';
import { photoLibraryPermission } from '../../permissions/photoLibrary';
import { PhotoLibraryPrivacyManager } from '../../services/privacy/localPrivacy';

interface VisionShareSearchScreenProps {
  navigation?: any;
}

export const VisionShareSearchScreen: React.FC<VisionShareSearchScreenProps> = ({
  navigation,
}) => {
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
    setHasPermission(
      state.hasFullAccess || state.hasPartialAccess,
    );
  };

  const initializeServices = async () => {
    try {
      await localSearchIndex.initialize();
      await localImageAnalysis.initialize();
    } catch (error) {
      console.error('Failed to initialize services:', error);
    }
  };

  const handleSearch = useCallback(async (query: string, source: SearchSource) => {
    setLoading(true);

    try {
      const searchResults: UnifiedSearchResult[] = [];

      if (source === 'all' || source === 'local') {
        const localResults = await localSearchIndex.search(query, 50);

        localResults.forEach(result => {
          searchResults.push({
            id: result.id,
            uri: result.uri,
            source: 'local',
            sourceLabel: 'Local',
            relevanceScore: result.relevanceScore,
            tags: result.tags,
            createdAt: new Date(),
          });
        });
      }

      if (source === 'all' || source === 'cloud') {
        await new Promise(resolve => setTimeout(resolve, 300));
        const mockCloudResults: UnifiedSearchResult[] = [
          {
            id: 'cloud-1',
            uri: 'https://cloud.example.com/photo1.jpg',
            title: 'Cloud Photo 1',
            source: 'cloud',
            sourceLabel: 'Cloud',
            relevanceScore: 0.85,
            tags: ['vacation', 'beach', 'summer'],
            createdAt: new Date('2024-01-15'),
          },
          {
            id: 'cloud-2',
            uri: 'https://cloud.example.com/photo2.jpg',
            title: 'Cloud Photo 2',
            source: 'cloud',
            sourceLabel: 'Cloud',
            relevanceScore: 0.72,
            tags: ['family', 'party', 'birthday'],
            createdAt: new Date('2024-02-20'),
          },
        ];
        searchResults.push(...mockCloudResults);
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleResultPress = useCallback((result: UnifiedSearchResult) => {
    navigation?.navigate('PhotoDetail', { photoId: result.id });
  }, [navigation]);

  const handleRequestPermission = async () => {
    const state = await photoLibraryPermission.requestPermission();
    setHasPermission(
      state.hasFullAccess || state.hasPartialAccess,
    );
  };

  if (!hasPermission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.permissionContainer}>
          <Icon name="photo-library" size={64} color="#007AFF" />
          <Text style={styles.permissionTitle}>Photo Library Access</Text>
          <Text style={styles.permissionDescription}>
            To search your local photos with AI, we need access to your photo library.
            Your photos will be analyzed on-device and never uploaded without your permission.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleRequestPermission}
          >
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
