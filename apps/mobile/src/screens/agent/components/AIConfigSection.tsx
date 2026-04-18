/**
 * AI Configuration Section Component
 * Handles LLM model selection, temperature, reply style, auto-reply settings
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

interface AIConfigSectionProps {
  config: {
    model?: string;
    temperature?: number;
    replyStyle?: 'formal' | 'friendly' | 'humorous';
    autoReply?: boolean;
    handoffTrigger?: string;
  };
  onConfigChange: (key: string, value: string | number | boolean) => void;
}

const MODELS = [
  { id: 'gpt-4', name: 'GPT-4', description: '最强大，适合复杂任务' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '快速响应，性价比高' },
  { id: 'claude-3', name: 'Claude 3', description: '优秀的对话能力' },
  { id: 'local', name: '本地模型', description: '离线使用，保护隐私' },
];

const REPLY_STYLES = [
  { id: 'formal', name: '正式', description: '专业、礼貌的表达' },
  { id: 'friendly', name: '友好', description: '轻松、亲切的交流' },
  { id: 'humorous', name: '幽默', description: '轻松活泼的氛围' },
];

const HANDOVER_TRIGGERS = [
  { id: 'never', name: '从不', description: '完全由AI处理' },
  { id: 'keyword', name: '关键词', description: '检测到关键词时转接' },
  { id: 'always', name: '始终', description: '所有消息都转接人工' },
];

export const AIConfigSection: React.FC<AIConfigSectionProps> = ({ config, onConfigChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const renderModelSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>LLM 模型</Text>
      <View style={styles.modelList}>
        {MODELS.map(model => (
          <TouchableOpacity
            key={model.id}
            style={[styles.modelCard, config.model === model.id && styles.modelCardSelected]}
            onPress={() => onConfigChange('model', model.id)}
          >
            <View style={styles.modelHeader}>
              <Text style={styles.modelName}>{model.name}</Text>
              {config.model === model.id && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.modelDescription}>{model.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTemperatureSlider = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>创造性 (温度)</Text>
      <Text style={styles.sliderDescription}>控制回复的创造性和随机性</Text>
      <View style={styles.temperatureRow}>
        <Text style={styles.temperatureLabel}>保守</Text>
        <View style={styles.temperatureSlider}>
          {[0, 0.25, 0.5, 0.75, 1].map(value => (
            <TouchableOpacity
              key={value}
              style={[
                styles.temperatureDot,
                config.temperature === value && styles.temperatureDotSelected,
              ]}
              onPress={() => onConfigChange('temperature', value)}
            />
          ))}
        </View>
        <Text style={styles.temperatureLabel}>创造</Text>
      </View>
      <Text style={styles.temperatureValue}>当前: {config.temperature ?? 0.5}</Text>
    </View>
  );

  const renderReplyStyleSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>回复风格</Text>
      <View style={styles.styleRow}>
        {REPLY_STYLES.map(style => (
          <TouchableOpacity
            key={style.id}
            style={[styles.styleCard, config.replyStyle === style.id && styles.styleCardSelected]}
            onPress={() => onConfigChange('replyStyle', style.id)}
          >
            <Text
              style={[styles.styleName, config.replyStyle === style.id && styles.styleNameSelected]}
            >
              {style.name}
            </Text>
            <Text style={styles.styleDescription}>{style.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAutoReply = () => (
    <View style={styles.section}>
      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchLabel}>自动回复</Text>
          <Text style={styles.switchDescription}>开启后AI自动回复消息</Text>
        </View>
        <Switch
          value={config.autoReply ?? true}
          onValueChange={value => onConfigChange('autoReply', value)}
        />
      </View>
    </View>
  );

  const renderHandoverTrigger = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>人机切换触发条件</Text>
      <View style={styles.handoverList}>
        {HANDOVER_TRIGGERS.map(trigger => (
          <TouchableOpacity
            key={trigger.id}
            style={[
              styles.handoverCard,
              config.handoffTrigger === trigger.id && styles.handoverCardSelected,
            ]}
            onPress={() => onConfigChange('handoffTrigger', trigger.id)}
          >
            <Text
              style={[
                styles.handoverName,
                config.handoffTrigger === trigger.id && styles.handoverNameSelected,
              ]}
            >
              {trigger.name}
            </Text>
            <Text style={styles.handoverDescription}>{trigger.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {config.handoffTrigger === 'keyword' && (
        <View style={styles.keywordInput}>
          <Text style={styles.keywordLabel}>关键词列表 (逗号分隔)</Text>
          <TextInput
            style={styles.input}
            value={config.keywords || ''}
            onChangeText={text => onConfigChange('keywords', text)}
            placeholder="例如: 人工, 转接, 投诉"
          />
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {renderModelSelector()}
      {renderTemperatureSlider()}
      {renderReplyStyleSelector()}
      {renderAutoReply()}
      {renderHandoverTrigger()}

      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => setShowAdvanced(!showAdvanced)}
      >
        <Text style={styles.advancedToggleText}>
          {showAdvanced ? '收起高级设置' : '显示高级设置'}
        </Text>
      </TouchableOpacity>

      {showAdvanced && (
        <View style={styles.advancedSection}>
          <Text style={styles.advancedTitle}>高级配置</Text>
          <View style={styles.field}>
            <Text style={styles.label}>最大回复长度</Text>
            <TextInput
              style={styles.input}
              value={config.maxTokens?.toString() || '500'}
              onChangeText={text => onConfigChange('maxTokens', parseInt(text) || 500)}
              keyboardType="numeric"
              placeholder="500"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>系统提示词</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={config.systemPrompt || ''}
              onChangeText={text => onConfigChange('systemPrompt', text)}
              placeholder="输入自定义系统提示词..."
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  modelList: {
    gap: 12,
  },
  modelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modelCardSelected: {
    borderColor: '#007AFF',
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modelDescription: {
    fontSize: 14,
    color: '#666',
  },
  sliderDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  temperatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  temperatureLabel: {
    fontSize: 12,
    color: '#666',
    width: 40,
  },
  temperatureSlider: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  temperatureDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  temperatureDotSelected: {
    backgroundColor: '#007AFF',
  },
  temperatureValue: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  styleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  styleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  styleCardSelected: {
    borderColor: '#007AFF',
  },
  styleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  styleNameSelected: {
    color: '#007AFF',
  },
  styleDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
  },
  handoverList: {
    gap: 12,
  },
  handoverCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  handoverCardSelected: {
    borderColor: '#007AFF',
  },
  handoverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  handoverNameSelected: {
    color: '#007AFF',
  },
  handoverDescription: {
    fontSize: 14,
    color: '#666',
  },
  keywordInput: {
    marginTop: 12,
  },
  keywordLabel: {
    fontSize: 14,
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
  advancedToggle: {
    alignItems: 'center',
    padding: 16,
  },
  advancedToggleText: {
    color: '#007AFF',
    fontSize: 14,
  },
  advancedSection: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    margin: 16,
    borderRadius: 12,
  },
  advancedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
});
