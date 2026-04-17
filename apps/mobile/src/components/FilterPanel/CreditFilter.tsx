import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Slider,
  ScrollView,
} from 'react-native';
import { CreditLevel, CREDIT_LEVEL_THRESHOLDS } from '@bridgeai/shared';

interface CreditFilterProps {
  minScore?: number;
  maxScore?: number;
  selectedLevels?: CreditLevel[];
  includeNoCredit?: boolean;
  onMinScoreChange?: (score: number) => void;
  onMaxScoreChange?: (score: number) => void;
  onLevelChange?: (levels: CreditLevel[]) => void;
  onIncludeNoCreditChange?: (include: boolean) => void;
}

const CREDIT_LEVELS: { level: CreditLevel; label: string; color: string; icon: string }[] = [
  { level: 'excellent', label: '优秀', color: '#4CAF50', icon: '★★★★★' },
  { level: 'good', label: '良好', color: '#8BC34A', icon: '★★★★☆' },
  { level: 'average', label: '一般', color: '#FFC107', icon: '★★★☆☆' },
  { level: 'poor', label: '较差', color: '#FF5722', icon: '★★☆☆☆' },
];

export const CreditFilter: React.FC<CreditFilterProps> = ({
  minScore = 0,
  maxScore = 1000,
  selectedLevels = [],
  includeNoCredit = false,
  onMinScoreChange,
  onMaxScoreChange,
  onLevelChange,
  onIncludeNoCreditChange,
}) => {
  const [localMinScore, setLocalMinScore] = useState(minScore);
  const [localMaxScore, setLocalMaxScore] = useState(maxScore);
  const [localLevels, setLocalLevels] = useState<CreditLevel[]>(selectedLevels);
  const [localIncludeNoCredit, setLocalIncludeNoCredit] = useState(includeNoCredit);

  const handleMinScoreChange = useCallback((value: number) => {
    const newValue = Math.min(value, localMaxScore - 50);
    setLocalMinScore(newValue);
    onMinScoreChange?.(newValue);
  }, [localMaxScore, onMinScoreChange]);

  const handleMaxScoreChange = useCallback((value: number) => {
    const newValue = Math.max(value, localMinScore + 50);
    setLocalMaxScore(newValue);
    onMaxScoreChange?.(newValue);
  }, [localMinScore, onMaxScoreChange]);

  const handleLevelToggle = useCallback((level: CreditLevel) => {
    const newLevels = localLevels.includes(level)
      ? localLevels.filter(l => l !== level)
      : [...localLevels, level];
    setLocalLevels(newLevels);
    onLevelChange?.(newLevels);

    // Auto-adjust score range based on selected levels
    if (newLevels.length > 0) {
      const ranges = newLevels.map(l => CREDIT_LEVEL_THRESHOLDS[l]);
      const minScore = Math.min(...ranges.map(r => r.min));
      const maxScore = Math.max(...ranges.map(r => r.max));
      setLocalMinScore(minScore);
      setLocalMaxScore(maxScore);
      onMinScoreChange?.(minScore);
      onMaxScoreChange?.(maxScore);
    }
  }, [localLevels, onLevelChange, onMinScoreChange, onMaxScoreChange]);

  const handleQuickSelect = useCallback((min: number, max: number, levels: CreditLevel[]) => {
    setLocalMinScore(min);
    setLocalMaxScore(max);
    setLocalLevels(levels);
    onMinScoreChange?.(min);
    onMaxScoreChange?.(max);
    onLevelChange?.(levels);
  }, [onMinScoreChange, onMaxScoreChange, onLevelChange]);

  const getCreditLevelFromScore = (score: number): CreditLevel | null => {
    for (const level of CREDIT_LEVELS) {
      const threshold = CREDIT_LEVEL_THRESHOLDS[level.level];
      if (score >= threshold.min && score <= threshold.max) {
        return level.level;
      }
    }
    return null;
  };

  const currentLevel = getCreditLevelFromScore(Math.round((localMinScore + localMaxScore) / 2));
  const currentLevelInfo = CREDIT_LEVELS.find(l => l.level === currentLevel);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>信用筛选</Text>
        {currentLevelInfo && (
          <View style={[styles.levelBadge, { backgroundColor: currentLevelInfo.color }]}>
            <Text style={styles.levelBadgeText}>{currentLevelInfo.label}</Text>
          </View>
        )}
      </View>

      {/* Quick Select Buttons */}
      <View style={styles.quickSelectContainer}>
        <Text style={styles.sectionLabel}>快速选择</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickSelect(800, 1000, ['excellent'])}
          >
            <Text style={styles.quickButtonText}>优秀</Text>
            <Text style={styles.quickButtonSubtext}>800+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickSelect(600, 1000, ['excellent', 'good'])}
          >
            <Text style={styles.quickButtonText}>良好及以上</Text>
            <Text style={styles.quickButtonSubtext}>600+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickSelect(400, 1000, ['excellent', 'good', 'average'])}
          >
            <Text style={styles.quickButtonText}>一般及以上</Text>
            <Text style={styles.quickButtonSubtext}>400+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickSelect(0, 1000, ['excellent', 'good', 'average', 'poor'])}
          >
            <Text style={styles.quickButtonText}>全部</Text>
            <Text style={styles.quickButtonSubtext}>不限</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Credit Level Selection */}
      <View style={styles.levelsContainer}>
        <Text style={styles.sectionLabel}>信用等级</Text>
        <View style={styles.levelsGrid}>
          {CREDIT_LEVELS.map(({ level, label, color, icon }) => {
            const isSelected = localLevels.includes(level);
            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.levelCard,
                  isSelected && { borderColor: color, backgroundColor: color + '10' },
                ]}
                onPress={() => handleLevelToggle(level)}
              >
                <Text style={[styles.levelIcon, { color }]}>{icon}</Text>
                <Text style={[styles.levelLabel, isSelected && { color }]}>{label}</Text>
                <Text style={styles.levelRange}>
                  {CREDIT_LEVEL_THRESHOLDS[level].min}-{CREDIT_LEVEL_THRESHOLDS[level].max}
                </Text>
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: color }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Score Range Sliders */}
      <View style={styles.slidersContainer}>
        <Text style={styles.sectionLabel}>信用分范围</Text>
        <View style={styles.rangeDisplay}>
          <View style={styles.rangeItem}>
            <Text style={styles.rangeLabel}>最低分</Text>
            <Text style={styles.rangeValue}>{localMinScore}</Text>
          </View>
          <Text style={styles.rangeDivider}>-</Text>
          <View style={styles.rangeItem}>
            <Text style={styles.rangeLabel}>最高分</Text>
            <Text style={styles.rangeValue}>{localMaxScore}</Text>
          </View>
        </View>

        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>最低分设置</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderMin}>0</Text>
            <Slider
              style={styles.slider}
              value={localMinScore}
              onValueChange={handleMinScoreChange}
              minimumValue={0}
              maximumValue={950}
              step={10}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#E0E0E0"
            />
            <Text style={styles.sliderMax}>950</Text>
          </View>
        </View>

        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>最高分设置</Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderMin}>50</Text>
            <Slider
              style={styles.slider}
              value={localMaxScore}
              onValueChange={handleMaxScoreChange}
              minimumValue={50}
              maximumValue={1000}
              step={10}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#E0E0E0"
            />
            <Text style={styles.sliderMax}>1000</Text>
          </View>
        </View>
      </View>

      {/* Include No Credit Option */}
      <TouchableOpacity
        style={styles.noCreditOption}
        onPress={() => {
          const newValue = !localIncludeNoCredit;
          setLocalIncludeNoCredit(newValue);
          onIncludeNoCreditChange?.(newValue);
        }}
      >
        <View style={[styles.checkbox, localIncludeNoCredit && styles.checkboxChecked]}>
          {localIncludeNoCredit && <Text style={styles.checkboxText}>✓</Text>}
        </View>
        <Text style={styles.noCreditText}>包含无信用分的 Agent</Text>
      </TouchableOpacity>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>信用等级说明</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>优秀 (800-1000)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8BC34A' }]} />
            <Text style={styles.legendText}>良好 (600-799)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
            <Text style={styles.legendText}>一般 (400-599)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF5722' }]} />
            <Text style={styles.legendText}>较差 (0-399)</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  quickSelectContainer: {
    marginBottom: 20,
  },
  quickButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  quickButtonSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  levelsContainer: {
    marginBottom: 20,
  },
  levelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  levelCard: {
    width: '23%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  levelIcon: {
    fontSize: 14,
    marginBottom: 4,
  },
  levelLabel: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  levelRange: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  slidersContainer: {
    marginBottom: 20,
  },
  rangeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  rangeItem: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rangeLabel: {
    fontSize: 12,
    color: '#999',
  },
  rangeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  rangeDivider: {
    fontSize: 18,
    color: '#999',
    marginHorizontal: 12,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderMin: {
    fontSize: 12,
    color: '#999',
    width: 30,
  },
  sliderMax: {
    fontSize: 12,
    color: '#999',
    width: 40,
    textAlign: 'right',
  },
  noCreditOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  noCreditText: {
    fontSize: 14,
    color: '#333',
  },
  legend: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});

export default CreditFilter;
