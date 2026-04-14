import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Slider,
} from 'react-native';

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
}

interface DesensitizationControlsProps {
  selectedRegion?: DetectionRegion;
  onMethodChange: (method: string) => void;
  onIntensityChange: (intensity: number) => void;
}

type DesensitizationMethod = {
  id: string;
  name: string;
  icon: string;
  description: string;
};

const DESENSITIZATION_METHODS: DesensitizationMethod[] = [
  {
    id: 'blur',
    name: 'Blur',
    icon: '🔍',
    description: 'Gaussian blur effect',
  },
  {
    id: 'mosaic',
    name: 'Mosaic',
    icon: '🏁',
    description: 'Pixel mosaic pattern',
  },
  {
    id: 'pixelate',
    name: 'Pixelate',
    icon: '⬛',
    description: 'Block pixelation',
  },
  {
    id: 'replace_background',
    name: 'Replace BG',
    icon: '🖼️',
    description: 'Smart background replacement',
  },
  {
    id: 'feather',
    name: 'Feather',
    icon: '✨',
    description: 'Edge feathering',
  },
];

const TYPE_LABELS: Record<string, string> = {
  face: 'Face',
  license_plate: 'License Plate',
  text: 'Text',
  address: 'Address',
  sensitive_object: 'Sensitive Object',
  qr_code: 'QR Code',
  barcode: 'Barcode',
};

export const DesensitizationControls: React.FC<DesensitizationControlsProps> = ({
  selectedRegion,
  onMethodChange,
  onIntensityChange,
}) => {
  if (!selectedRegion) return null;

  const currentMethod = selectedRegion.method || 'blur';
  const currentIntensity = selectedRegion.intensity || 70;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {TYPE_LABELS[selectedRegion.type] || selectedRegion.type}
        </Text>
        <Text style={styles.confidence}>
          {Math.round(selectedRegion.confidence * 100)}% confidence
        </Text>
      </View>

      {/* Method Selection */}
      <Text style={styles.sectionTitle}>Desensitization Method</Text>
      <View style={styles.methodsContainer}>
        {DESENSITIZATION_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodButton,
              currentMethod === method.id && styles.methodButtonActive,
            ]}
            onPress={() => onMethodChange(method.id)}
          >
            <Text style={styles.methodIcon}>{method.icon}</Text>
            <Text
              style={[
                styles.methodName,
                currentMethod === method.id && styles.methodNameActive,
              ]}
            >
              {method.name}
            </Text>
            {currentMethod === method.id && (
              <Text style={styles.methodDescription}>{method.description}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Intensity Slider */}
      <Text style={styles.sectionTitle}>Intensity</Text>
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>Light</Text>
        <Slider
          style={styles.slider}
          value={currentIntensity}
          onValueChange={onIntensityChange}
          minimumValue={0}
          maximumValue={100}
          step={5}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#444"
          thumbTintColor="#007AFF"
        />
        <Text style={styles.sliderLabel}>Strong</Text>
      </View>
      <Text style={styles.intensityValue}>{currentIntensity}%</Text>

      {/* Intensity Guidelines */}
      <View style={styles.guidelines}>
        <Text style={styles.guidelineTitle}>Intensity Guidelines:</Text>
        <Text style={styles.guideline}>• 0-30%: Light blur, still somewhat visible</Text>
        <Text style={styles.guideline}>• 30-60%: Moderate, obscured but recognizable shape</Text>
        <Text style={styles.guideline}>• 60-85%: Strong protection, details obscured</Text>
        <Text style={styles.guideline}>• 85-100%: Maximum protection, completely obscured</Text>
      </View>

      {/* Region Info */}
      <View style={styles.regionInfo}>
        <Text style={styles.regionInfoTitle}>Region Details:</Text>
        <Text style={styles.regionInfoText}>
          Position: ({Math.round(selectedRegion.boundingBox.x * 100)}%,{' '}
          {Math.round(selectedRegion.boundingBox.y * 100)}%)
        </Text>
        <Text style={styles.regionInfoText}>
          Size: {Math.round(selectedRegion.boundingBox.width * 100)}% ×{' '}
          {Math.round(selectedRegion.boundingBox.height * 100)}%
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  confidence: {
    fontSize: 14,
    color: '#888',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#aaa',
    marginBottom: 12,
    marginTop: 8,
  },
  methodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodButton: {
    width: '18%',
    minWidth: 70,
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 10,
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#007AFF',
  },
  methodIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  methodName: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
  },
  methodNameActive: {
    color: '#fff',
    fontWeight: '600',
  },
  methodDescription: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  slider: {
    flex: 1,
    marginHorizontal: 12,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#888',
    width: 50,
  },
  intensityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 8,
  },
  guidelines: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  guidelineTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: 8,
  },
  guideline: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  regionInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  regionInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: 8,
  },
  regionInfoText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
});

export default DesensitizationControls;
