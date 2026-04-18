/**
 * Scene Config Form Component
 * Provides scene-specific dynamic configuration
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { AgentType } from '@bridgeai/shared';

interface SceneConfigFormProps {
  agentType: AgentType;
  config: Record<string, string | number | boolean>;
  onConfigChange: (key: string, value: string | number | boolean) => void;
}

export const SceneConfigForm: React.FC<SceneConfigFormProps> = ({
  agentType,
  config,
  onConfigChange,
}) => {
  const renderVisionShareConfig = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>VisionShare 配置</Text>

      <View style={styles.field}>
        <Text style={styles.label}>需求范围</Text>
        <View style={styles.optionsRow}>
          {['本地', '同城', '全国'].map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.optionButton, config.range === option && styles.optionButtonSelected]}
              onPress={() => onConfigChange('range', option)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  config.range === option && styles.optionButtonTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>价格设置 (元/次)</Text>
        <TextInput
          style={styles.input}
          value={config.price?.toString() || ''}
          onChangeText={text => onConfigChange('price', parseFloat(text) || 0)}
          placeholder="0.00"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>自动分享</Text>
        <Switch
          value={config.autoShare || false}
          onValueChange={value => onConfigChange('autoShare', value)}
        />
      </View>
    </View>
  );

  const renderAgentDateConfig = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AgentDate 配置</Text>

      <View style={styles.field}>
        <Text style={styles.label}>交友偏好</Text>
        <View style={styles.optionsRow}>
          {['异性', '同性', '不限'].map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                config.preference === option && styles.optionButtonSelected,
              ]}
              onPress={() => onConfigChange('preference', option)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  config.preference === option && styles.optionButtonTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>年龄范围</Text>
        <View style={styles.rangeRow}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            value={config.minAge?.toString() || ''}
            onChangeText={text => onConfigChange('minAge', parseInt(text) || 18)}
            placeholder="18"
            keyboardType="numeric"
          />
          <Text style={styles.rangeSeparator}>-</Text>
          <TextInput
            style={[styles.input, styles.halfInput]}
            value={config.maxAge?.toString() || ''}
            onChangeText={text => onConfigChange('maxAge', parseInt(text) || 99)}
            placeholder="99"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>匹配条件</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={config.matchCriteria || ''}
          onChangeText={text => onConfigChange('matchCriteria', text)}
          placeholder="描述你希望的匹配条件..."
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderAgentJobConfig = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AgentJob 配置</Text>

      <View style={styles.field}>
        <Text style={styles.label}>求职意向/招聘要求</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={config.jobIntent || ''}
          onChangeText={text => onConfigChange('jobIntent', text)}
          placeholder="描述职位要求或期望..."
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>薪资范围</Text>
        <View style={styles.rangeRow}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            value={config.salaryMin?.toString() || ''}
            onChangeText={text => onConfigChange('salaryMin', parseInt(text) || 0)}
            placeholder="最低"
            keyboardType="numeric"
          />
          <Text style={styles.rangeSeparator}>-</Text>
          <TextInput
            style={[styles.input, styles.halfInput]}
            value={config.salaryMax?.toString() || ''}
            onChangeText={text => onConfigChange('salaryMax', parseInt(text) || 0)}
            placeholder="最高"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>工作类型</Text>
        <View style={styles.optionsRow}>
          {['全职', '兼职', '实习'].map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                config.jobType === option && styles.optionButtonSelected,
              ]}
              onPress={() => onConfigChange('jobType', option)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  config.jobType === option && styles.optionButtonTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderAgentAdConfig = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AgentAd 配置</Text>

      <View style={styles.field}>
        <Text style={styles.label}>消费偏好</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={config.spendingPreference || ''}
          onChangeText={text => onConfigChange('spendingPreference', text)}
          placeholder="描述你的消费偏好..."
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>优惠类型</Text>
        <View style={styles.optionsRow}>
          {['折扣', '返现', '赠品', '抽奖'].map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                config.couponType === option && styles.optionButtonSelected,
              ]}
              onPress={() => onConfigChange('couponType', option)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  config.couponType === option && styles.optionButtonTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>预算上限 (元/天)</Text>
        <TextInput
          style={styles.input}
          value={config.dailyBudget?.toString() || ''}
          onChangeText={text => onConfigChange('dailyBudget', parseFloat(text) || 0)}
          placeholder="100"
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const renderConfig = () => {
    switch (agentType) {
      case AgentType.VISIONSHARE:
        return renderVisionShareConfig();
      case AgentType.AGENTDATE:
        return renderAgentDateConfig();
      case AgentType.AGENTJOB:
        return renderAgentJobConfig();
      case AgentType.AGENTAD:
        return renderAgentAdConfig();
      default:
        return null;
    }
  };

  return <ScrollView style={styles.container}>{renderConfig()}</ScrollView>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#333',
  },
  optionButtonTextSelected: {
    color: '#fff',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  halfInput: {
    flex: 1,
  },
  rangeSeparator: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#666',
  },
});
