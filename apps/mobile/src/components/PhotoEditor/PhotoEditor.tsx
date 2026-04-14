import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Text,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface EditablePhoto {
  uri: string;
  id: string;
  crop?: { x: number; y: number; width: number; height: number };
  rotation?: number;
  filter?: string;
  brightness?: number;
  annotations?: Annotation[];
}

export interface Annotation {
  id: string;
  type: 'text' | 'arrow' | 'circle' | 'rectangle';
  x: number;
  y: number;
  text?: string;
  color: string;
}

export const FILTERS = [
  { id: 'normal', name: '原图', value: null },
  { id: 'brightness', name: '增亮', value: 1.2 },
  { id: 'contrast', name: '对比', value: 1.3 },
  { id: 'saturation', name: '饱和', value: 1.4 },
  { id: 'warm', name: '暖色', value: 'warm' },
  { id: 'cool', name: '冷色', value: 'cool' },
  { id: 'grayscale', name: '黑白', value: 'grayscale' },
  { id: 'sepia', name: '复古', value: 'sepia' },
];

interface PhotoEditorProps {
  photo: EditablePhoto;
  onSave: (photo: EditablePhoto) => void;
  onCancel: () => void;
}

export const PhotoEditor: React.FC<PhotoEditorProps> = ({
  photo,
  onSave,
  onCancel,
}) => {
  const [editedPhoto, setEditedPhoto] = useState<EditablePhoto>(photo);
  const [activeTool, setActiveTool] = useState<'crop' | 'filter' | 'annotate' | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('normal');
  const [brightness, setBrightness] = useState(1);
  const [annotationText, setAnnotationText] = useState('');
  const [, setSelectedAnnotation] = useState<string | null>(null);

  // Transform values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const panGestureEvent = useAnimatedGestureHandler({
    onStart: (_, context: Record<string, number>) => {
      context.translateX = translateX.value;
      context.translateY = translateY.value;
    },
    onActive: (event, context) => {
      translateX.value = context.translateX + event.translationX;
      translateY.value = context.translateY + event.translationY;
    },
    onEnd: () => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    },
  });

  const pinchGestureEvent = useAnimatedGestureHandler({
    onStart: (_, context: Record<string, number>) => {
      context.scale = scale.value;
    },
    onActive: (event, context) => {
      scale.value = context.scale * event.scale;
    },
    onEnd: () => {
      scale.value = withSpring(1);
    },
  });

  const rotationGestureEvent = useAnimatedGestureHandler({
    onStart: (_, context: Record<string, number>) => {
      context.rotation = rotation.value;
    },
    onActive: (event, context) => {
      rotation.value = context.rotation + event.rotation;
    },
    onEnd: () => {
      rotation.value = withSpring(0);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  const handleRotate = useCallback(() => {
    setEditedPhoto((prev) => ({
      ...prev,
      rotation: ((prev.rotation || 0) + 90) % 360,
    }));
  }, []);

  const handleFlip = useCallback(() => {
    setEditedPhoto((prev) => ({
      ...prev,
      rotation: (prev.rotation || 0) + 180,
    }));
  }, []);

  const handleFilterSelect = useCallback((filterId: string) => {
    setSelectedFilter(filterId);
    const filter = FILTERS.find((f) => f.id === filterId);
    setEditedPhoto((prev) => ({
      ...prev,
      filter: filterId,
      brightness: filter?.value && typeof filter.value === 'number' ? filter.value : 1,
    }));
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBrightnessChange = useCallback((value: number) => {
    setBrightness(value);
    setEditedPhoto((prev) => ({
      ...prev,
      brightness: value,
    }));
  }, []);

  const handleAddAnnotation = useCallback((type: Annotation['type']) => {
    if (!annotationText && type === 'text') return;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      type,
      x: SCREEN_WIDTH / 2,
      y: 200,
      text: type === 'text' ? annotationText : undefined,
      color: '#FF0000',
    };

    setEditedPhoto((prev) => ({
      ...prev,
      annotations: [...(prev.annotations || []), newAnnotation],
    }));
    setAnnotationText('');
  }, [annotationText]);

  const handleSave = useCallback(() => {
    onSave(editedPhoto);
  }, [editedPhoto, onSave]);

  const getFilterStyle = () => {
    switch (editedPhoto.filter) {
      case 'grayscale':
        return { filter: 'grayscale(100%)' };
      case 'sepia':
        return { filter: 'sepia(100%)' };
      case 'warm':
        return { filter: 'saturate(120%) hue-rotate(-10deg)' };
      case 'cool':
        return { filter: 'saturate(90%) hue-rotate(10deg)' };
      default:
        return {};
    }
  };

  const getImageStyle = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseStyle: any = {
      width: SCREEN_WIDTH - 32,
      height: (SCREEN_WIDTH - 32) * 0.75,
      borderRadius: 8,
    };

    if (editedPhoto.rotation) {
      baseStyle.transform = [{ rotate: `${editedPhoto.rotation}deg` }];
    }

    return baseStyle;
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>编辑照片</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>保存</Text>
          </TouchableOpacity>
        </View>

        {/* Photo Preview */}
        <View style={styles.previewContainer}>
          <PanGestureHandler onGestureEvent={panGestureEvent}>
            <Animated.View style={animatedStyle}>
              <PinchGestureHandler onGestureEvent={pinchGestureEvent}>
                <Animated.View>
                  <RotationGestureHandler onGestureEvent={rotationGestureEvent}>
                    <Animated.View>
                      <Image
                        source={{ uri: editedPhoto.uri }}
                        style={[getImageStyle(), getFilterStyle()]}
                        resizeMode="cover"
                      />
                      {/* Annotations */}
                      {(editedPhoto.annotations || []).map((annotation) => (
                        <View
                          key={annotation.id}
                          style={[
                            styles.annotation,
                            {
                              left: annotation.x,
                              top: annotation.y,
                              borderColor: annotation.color,
                            },
                            selectedAnnotation === annotation.id && styles.selectedAnnotation,
                          ]}
                        >
                          {annotation.type === 'text' && (
                            <Text style={styles.annotationText}>{annotation.text}</Text>
                          )}
                        </View>
                      ))}
                    </Animated.View>
                  </RotationGestureHandler>
                </Animated.View>
              </PinchGestureHandler>
            </Animated.View>
          </PanGestureHandler>
        </View>

        {/* Tools */}
        <View style={styles.toolsContainer}>
          {/* Tool Tabs */}
          <View style={styles.toolTabs}>
            <TouchableOpacity
              style={[styles.toolTab, activeTool === 'crop' && styles.activeToolTab]}
              onPress={() => setActiveTool('crop')}
            >
              <Ionicons name="crop" size={24} color={activeTool === 'crop' ? '#007AFF' : '#666'} />
              <Text style={styles.toolTabText}>裁剪</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolTab, activeTool === 'filter' && styles.activeToolTab]}
              onPress={() => setActiveTool('filter')}
            >
              <Ionicons name="color-filter" size={24} color={activeTool === 'filter' ? '#007AFF' : '#666'} />
              <Text style={styles.toolTabText}>滤镜</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolTab, activeTool === 'annotate' && styles.activeToolTab]}
              onPress={() => setActiveTool('annotate')}
            >
              <Ionicons name="create" size={24} color={activeTool === 'annotate' ? '#007AFF' : '#666'} />
              <Text style={styles.toolTabText}>标记</Text>
            </TouchableOpacity>
          </View>

          {/* Tool Content */}
          {activeTool === 'crop' && (
            <View style={styles.toolContent}>
              <View style={styles.cropControls}>
                <TouchableOpacity style={styles.cropButton} onPress={handleRotate}>
                  <Ionicons name="refresh" size={24} color="#333" />
                  <Text style={styles.cropButtonText}>旋转</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cropButton} onPress={handleFlip}>
                  <Ionicons name="swap-horizontal" size={24} color="#333" />
                  <Text style={styles.cropButtonText}>翻转</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTool === 'filter' && (
            <View style={styles.toolContent}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterItem,
                      selectedFilter === filter.id && styles.selectedFilter,
                    ]}
                    onPress={() => handleFilterSelect(filter.id)}
                  >
                    <View style={styles.filterPreview} />
                    <Text style={styles.filterName}>{filter.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.brightnessControl}>
                <Text>亮度</Text>
                <Text>{Math.round(brightness * 100)}%</Text>
              </View>
            </View>
          )}

          {activeTool === 'annotate' && (
            <View style={styles.toolContent}>
              <View style={styles.annotationTools}>
                <TextInput
                  style={styles.annotationInput}
                  placeholder="输入文字注释..."
                  value={annotationText}
                  onChangeText={setAnnotationText}
                />
                <TouchableOpacity
                  style={styles.annotationButton}
                  onPress={() => handleAddAnnotation('text')}
                >
                  <Ionicons name="text" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  annotation: {
    position: 'absolute',
    padding: 8,
    borderWidth: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  selectedAnnotation: {
    borderColor: '#007AFF',
  },
  annotationText: {
    fontSize: 14,
    color: '#333',
  },
  toolsContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  toolTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  toolTab: {
    alignItems: 'center',
    padding: 8,
  },
  activeToolTab: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  toolTabText: {
    fontSize: 12,
    marginTop: 4,
    color: '#666',
  },
  toolContent: {
    padding: 16,
    maxHeight: 120,
  },
  cropControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  cropButton: {
    alignItems: 'center',
    padding: 12,
  },
  cropButtonText: {
    marginTop: 8,
    fontSize: 14,
    color: '#333',
  },
  filterItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    padding: 8,
    borderRadius: 8,
  },
  selectedFilter: {
    backgroundColor: '#f0f8ff',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  filterPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#ddd',
  },
  filterName: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  brightnessControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  annotationTools: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  annotationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
  },
  annotationButton: {
    padding: 12,
  },
});

export default PhotoEditor;
