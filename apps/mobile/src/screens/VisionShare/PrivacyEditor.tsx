import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

import { DesensitizationControls } from '../../components/PrivacyEditor/DesensitizationControls';
import { DetectionOverlay } from '../../components/PrivacyEditor/DetectionOverlay';
import { AIRecommendations } from '../../components/PrivacyEditor/AIRecommendations';

export type RootStackParamList = {
  PrivacyEditor: {
    imageUri: string;
    imageId?: string;
  };
};

type PrivacyEditorNavigationProp = StackNavigationProp<RootStackParamList, 'PrivacyEditor'>;
type PrivacyEditorRouteProp = RouteProp<RootStackParamList, 'PrivacyEditor'>;

interface PrivacyEditorProps {
  navigation: PrivacyEditorNavigationProp;
  route: PrivacyEditorRouteProp;
}

interface DetectionRegion {
  id: string;
  type: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  method?: string;
  intensity?: number;
  isSelected?: boolean;
}

interface ProcessingHistory {
  regions: DetectionRegion[];
  timestamp: number;
}

const { width: screenWidth } = Dimensions.get('window');

export const PrivacyEditor: React.FC<PrivacyEditorProps> = ({ navigation, route }) => {
  const { imageUri, imageId } = route.params;

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState<DetectionRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [history, setHistory] = useState<ProcessingHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const imageDimensions = useRef({ width: 0, height: 0 });

  // Analyze image for sensitive content
  const analyzeImage = useCallback(async () => {
    setIsAnalyzing(true);

    // Simulate API call for detection
    setTimeout(() => {
      const mockDetections: DetectionRegion[] = [
        {
          id: 'det-1',
          type: 'face',
          boundingBox: { x: 0.1, y: 0.15, width: 0.15, height: 0.2 },
          confidence: 0.95,
          method: 'blur',
          intensity: 80,
        },
        {
          id: 'det-2',
          type: 'face',
          boundingBox: { x: 0.4, y: 0.2, width: 0.12, height: 0.16 },
          confidence: 0.88,
          method: 'blur',
          intensity: 80,
        },
        {
          id: 'det-3',
          type: 'license_plate',
          boundingBox: { x: 0.6, y: 0.65, width: 0.25, height: 0.08 },
          confidence: 0.92,
          method: 'mosaic',
          intensity: 90,
        },
        {
          id: 'det-4',
          type: 'text',
          boundingBox: { x: 0.05, y: 0.05, width: 0.3, height: 0.05 },
          confidence: 0.85,
          method: 'blur',
          intensity: 60,
        },
      ];

      setDetections(mockDetections);
      saveToHistory(mockDetections);
      setIsAnalyzing(false);
    }, 2000);
  }, []);

  // Save current state to history
  const saveToHistory = useCallback((regions: DetectionRegion[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      regions: JSON.parse(JSON.stringify(regions)),
      timestamp: Date.now(),
    });

    // Keep only last 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo action
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setDetections(JSON.parse(JSON.stringify(history[newIndex].regions)));
    }
  }, [history, historyIndex]);

  // Redo action
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setDetections(JSON.parse(JSON.stringify(history[newIndex].regions)));
    }
  }, [history, historyIndex]);

  // Handle region selection
  const handleRegionSelect = useCallback((regionId: string) => {
    setSelectedRegion(regionId);
    setDetections((prev) =>
      prev.map((r) => ({ ...r, isSelected: r.id === regionId }))
    );
  }, []);

  // Handle method change for selected region
  const handleMethodChange = useCallback((method: string) => {
    if (!selectedRegion) return;

    setDetections((prev) => {
      const updated = prev.map((r) =>
        r.id === selectedRegion ? { ...r, method } : r
      );
      saveToHistory(updated);
      return updated;
    });
  }, [selectedRegion, saveToHistory]);

  // Handle intensity change for selected region
  const handleIntensityChange = useCallback((intensity: number) => {
    if (!selectedRegion) return;

    setDetections((prev) => {
      const updated = prev.map((r) =>
        r.id === selectedRegion ? { ...r, intensity } : r
      );
      saveToHistory(updated);
      return updated;
    });
  }, [selectedRegion, saveToHistory]);

  // Apply AI recommendations
  const handleApplyRecommendation = useCallback((recommendation: any) => {
    setDetections((prev) => {
      const updated = prev.map((detection) => {
        if (recommendation.action.type === 'apply_template') {
          // Apply template rules
          return {
            ...detection,
            method: getMethodForType(detection.type),
            intensity: getIntensityForType(detection.type),
          };
        }
        if (recommendation.action.type === 'adjust_intensity') {
          const payload = recommendation.action.payload;
          if (detection.type === payload.contentType) {
            return {
              ...detection,
              method: payload.method,
              intensity: payload.intensity,
            };
          }
        }
        return detection;
      });
      saveToHistory(updated);
      return updated;
    });
    setShowRecommendations(false);
  }, [saveToHistory]);

  // Process image with current settings
  const processImage = useCallback(async () => {
    setIsProcessing(true);

    // Simulate processing
    setTimeout(() => {
      setPreviewUri(imageUri); // In production, this would be the processed image
      setIsProcessing(false);
    }, 1500);
  }, [imageUri]);

  // Save processed image
  const saveImage = useCallback(() => {
    // Navigate back or to next screen
    navigation.goBack();
  }, [navigation]);

  // Helper functions
  const getMethodForType = (type: string): string => {
    const methods: Record<string, string> = {
      face: 'blur',
      license_plate: 'mosaic',
      text: 'blur',
      address: 'pixelate',
      sensitive_object: 'replace_background',
    };
    return methods[type] || 'blur';
  };

  const getIntensityForType = (type: string): number => {
    const intensities: Record<string, number> = {
      face: 80,
      license_plate: 90,
      text: 60,
      address: 85,
      sensitive_object: 95,
    };
    return intensities[type] || 70;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Editor</Text>
        <TouchableOpacity onPress={saveImage}>
          <Text style={[styles.headerButton, styles.saveButton]}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Undo/Redo Controls */}
      <View style={styles.historyControls}>
        <TouchableOpacity
          onPress={undo}
          disabled={historyIndex <= 0}
          style={[styles.historyButton, historyIndex <= 0 && styles.disabledButton]}
        >
          <Text style={styles.historyButtonText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={redo}
          disabled={historyIndex >= history.length - 1}
          style={[
            styles.historyButton,
            historyIndex >= history.length - 1 && styles.disabledButton,
          ]}
        >
          <Text style={styles.historyButtonText}>Redo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Image Preview Area */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: previewUri || imageUri }}
            style={styles.image}
            resizeMode="contain"
            onLoad={(event) => {
              imageDimensions.current = {
                width: event.nativeEvent.source.width,
                height: event.nativeEvent.source.height,
              };
            }}
          />

          {/* Detection Overlays */}
          <DetectionOverlay
            detections={detections}
            selectedRegion={selectedRegion}
            onRegionSelect={handleRegionSelect}
            containerWidth={screenWidth - 32}
          />

          {/* Loading Overlay */}
          {(isAnalyzing || isProcessing) && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>
                {isAnalyzing ? 'Analyzing...' : 'Processing...'}
              </Text>
            </View>
          )}
        </View>

        {/* Analyze Button */}
        {detections.length === 0 && !isAnalyzing && (
          <TouchableOpacity style={styles.analyzeButton} onPress={analyzeImage}>
            <Text style={styles.analyzeButtonText}>Analyze Image</Text>
          </TouchableOpacity>
        )}

        {/* AI Recommendations */}
        {showRecommendations && detections.length > 0 && (
          <AIRecommendations
            detections={detections}
            onApply={handleApplyRecommendation}
            onDismiss={() => setShowRecommendations(false)}
          />
        )}

        {/* Desensitization Controls */}
        {selectedRegion && (
          <DesensitizationControls
            selectedRegion={detections.find((r) => r.id === selectedRegion)}
            onMethodChange={handleMethodChange}
            onIntensityChange={handleIntensityChange}
          />
        )}

        {/* Process Button */}
        {detections.length > 0 && !isProcessing && (
          <TouchableOpacity style={styles.processButton} onPress={processImage}>
            <Text style={styles.processButtonText}>Apply Changes</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  headerButton: {
    fontSize: 16,
    color: '#888',
  },
  saveButton: {
    color: '#007AFF',
    fontWeight: '600',
  },
  historyControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  historyButton: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    marginHorizontal: 8,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.4,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    margin: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 300,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  analyzeButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  processButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#34C759',
    borderRadius: 12,
    alignItems: 'center',
  },
  processButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PrivacyEditor;
