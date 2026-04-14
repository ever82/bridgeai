import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';

interface Detection {
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
  isSelected?: boolean;
}

interface DetectionOverlayProps {
  detections: Detection[];
  selectedRegion: string | null;
  onRegionSelect: (regionId: string) => void;
  containerWidth: number;
  containerHeight?: number;
}

const TYPE_COLORS: Record<string, string> = {
  face: '#FF4444',
  license_plate: '#FF8800',
  text: '#FFCC00',
  address: '#00CCFF',
  sensitive_object: '#AA00FF',
  qr_code: '#00FF88',
  barcode: '#00FF88',
};

const TYPE_ICONS: Record<string, string> = {
  face: '👤',
  license_plate: '🚗',
  text: '📝',
  address: '📍',
  sensitive_object: '⚠️',
  qr_code: '🔳',
  barcode: '┃┃┃',
};

const TYPE_LABELS: Record<string, string> = {
  face: 'Face',
  license_plate: 'Plate',
  text: 'Text',
  address: 'Address',
  sensitive_object: 'Object',
  qr_code: 'QR',
  barcode: 'Barcode',
};

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detections,
  selectedRegion,
  onRegionSelect,
  containerWidth,
  containerHeight = 300,
}) => {
  if (detections.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { width: containerWidth, height: containerHeight },
      ]}
      pointerEvents="box-none"
    >
      {detections.map((detection) => {
        const isSelected = detection.id === selectedRegion || detection.isSelected;
        const color = TYPE_COLORS[detection.type] || '#888';
        const icon = TYPE_ICONS[detection.type] || '•';
        const label = TYPE_LABELS[detection.type] || detection.type;

        // Calculate position in pixels
        const left = detection.boundingBox.x * containerWidth;
        const top = detection.boundingBox.y * containerHeight;
        const width = detection.boundingBox.width * containerWidth;
        const height = detection.boundingBox.height * containerHeight;

        return (
          <TouchableOpacity
            key={detection.id}
            style={[
              styles.region,
              {
                left,
                top,
                width,
                height,
                borderColor: color,
                backgroundColor: isSelected
                  ? `${color}33` // 20% opacity
                  : `${color}1A`, // 10% opacity
              },
            ]}
            onPress={() => onRegionSelect(detection.id)}
            activeOpacity={0.7}
          >
            {/* Region Label */}
            <View
              style={[
                styles.label,
                { backgroundColor: color },
                isSelected && styles.labelSelected,
              ]}
            >
              <Text style={styles.labelIcon}>{icon}</Text>
              <Text style={styles.labelText}>{label}</Text>
              <Text style={styles.labelConfidence}>
                {Math.round(detection.confidence * 100)}%
              </Text>
            </View>

            {/* Method Badge */}
            {detection.method && (
              <View style={[styles.methodBadge, { borderColor: color }]}>
                <Text style={[styles.methodBadgeText, { color }]}>
                  {detection.method}
                </Text>
              </View>
            )}

            {/* Selection Indicator */}
            {isSelected && (
              <View style={styles.selectionIndicator}>
                <View style={[styles.corner, styles.cornerTopLeft, { borderColor: color }]} />
                <View style={[styles.corner, styles.cornerTopRight, { borderColor: color }]} />
                <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: color }]} />
                <View style={[styles.corner, styles.cornerBottomRight, { borderColor: color }]} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <View key={type} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{TYPE_LABELS[type]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  region: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  label: {
    position: 'absolute',
    top: -24,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labelSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  labelIcon: {
    fontSize: 12,
    marginRight: 2,
  },
  labelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginRight: 4,
  },
  labelConfidence: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  methodBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  methodBadgeText: {
    fontSize: 9,
    fontWeight: '500',
  },
  selectionIndicator: {
    ...StyleSheet.absoluteFillObject,
  },
  corner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderWidth: 2,
  },
  cornerTopLeft: {
    top: -6,
    left: -6,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: -6,
    right: -6,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: -6,
    left: -6,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  cornerBottomRight: {
    bottom: -6,
    right: -6,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  legend: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 8,
    maxWidth: '90%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    color: '#fff',
    fontSize: 11,
  },
});

export default DetectionOverlay;
