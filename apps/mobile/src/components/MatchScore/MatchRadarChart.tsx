/**
 * MatchRadarChart Component
 * 匹配维度雷达图组件
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';

export interface RadarData {
  label: string;
  value: number; // 0-1
  fullMark?: number;
}

export interface MatchRadarChartProps {
  data: RadarData[];
  size?: number;
  style?: ViewStyle;
  showLabels?: boolean;
}

export const MatchRadarChart: React.FC<MatchRadarChartProps> = ({
  data,
  size = 200,
  style,
  showLabels = true,
}) => {
  if (data.length < 3) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>至少需要3个维度</Text>
      </View>
    );
  }

  const center = size / 2;
  const radius = size * 0.35;
  const angleStep = (2 * Math.PI) / data.length;

  // 计算多边形点
  const getPolygonPoints = (values: number[]): string => {
    return values
      .map((value, index) => {
        const angle = index * angleStep - Math.PI / 2;
        const r = radius * value;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');
  };

  // 计算标签位置
  const getLabelPosition = (index: number, distance: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const x = center + distance * Math.cos(angle);
    const y = center + distance * Math.sin(angle);
    return { x, y };
  };

  const polygonPoints = getPolygonPoints(data.map((d) => d.value));
  const backgroundPoints = getPolygonPoints(new Array(data.length).fill(1));

  // 网格线
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {/* 背景网格 */}
        {gridLevels.map((level, i) => (
          <Polygon
            key={`grid-${i}`}
            points={getPolygonPoints(new Array(data.length).fill(level))}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={1}
          />
        ))}

        {/* 轴线 */}
        {data.map((_, index) => {
          const endPos = getLabelPosition(index, radius);
          return (
            <Line
              key={`axis-${index}`}
              x1={center}
              y1={center}
              x2={endPos.x}
              y2={endPos.y}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
          );
        })}

        {/* 背景多边形（最大值） */}
        <Polygon
          points={backgroundPoints}
          fill="rgba(59, 130, 246, 0.05)"
          stroke="#3B82F6"
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {/* 数据多边形 */}
        <Polygon
          points={polygonPoints}
          fill="rgba(16, 185, 129, 0.3)"
          stroke="#10B981"
          strokeWidth={2}
        />

        {/* 数据点 */}
        {data.map((item, index) => {
          const pos = getLabelPosition(index, radius * item.value);
          return (
            <Circle
              key={`point-${index}`}
              cx={pos.x}
              cy={pos.y}
              r={4}
              fill="#10B981"
              stroke="#fff"
              strokeWidth={2}
            />
          );
        })}

        {/* 标签 */}
        {showLabels &&
          data.map((item, index) => {
            const pos = getLabelPosition(index, radius + 25);
            const valueText = `${Math.round(item.value * 100)}%`;

            return (
              <React.Fragment key={`label-${index}`}>
                <SvgText
                  x={pos.x}
                  y={pos.y - 6}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="600"
                  fill="#374151"
                >
                  {item.label}
                </SvgText>
                <SvgText
                  x={pos.x}
                  y={pos.y + 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#6B7280"
                >
                  {valueText}
                </SvgText>
              </React.Fragment>
            );
          })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
});

export default MatchRadarChart;
