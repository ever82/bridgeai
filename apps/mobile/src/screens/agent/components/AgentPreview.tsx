/**
 * Agent Preview Component
 * Shows agent profile preview, test chat, and config history
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Agent } from '@bridgeai/shared';

interface AgentPreviewProps {
  agent: Agent;
  onResetDefaults?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConfigHistoryEntry {
  id: string;
  changedAt: Date;
  summary: string;
}

export const AgentPreview: React.FC<AgentPreviewProps> = ({ agent, onResetDefaults }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'chat' | 'history'>('preview');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatRef = useRef<FlatList>(null);

  // Mock config history
  const configHistory: ConfigHistoryEntry[] = [
    { id: '1', changedAt: new Date(), summary: '更新温度参数为 0.7' },
    { id: '2', changedAt: new Date(Date.now() - 86400000), summary: '切换模型为 GPT-4' },
    { id: '3', changedAt: new Date(Date.now() - 172800000), summary: '修改回复风格为友好' },
  ];

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `这是模拟回复。你说的是: "${chatInput}"`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  const renderPreview = () => (
    <View style={styles.previewContainer}>
      <View style={styles.agentCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{agent.name.charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.agentName}>{agent.name}</Text>
        <Text style={styles.agentType}>{agent.type}</Text>
        {agent.description && <Text style={styles.agentDescription}>{agent.description}</Text>}
      </View>

      <View style={styles.configSummary}>
        <Text style={styles.configTitle}>配置摘要</Text>
        <View style={styles.configItem}>
          <Text style={styles.configLabel}>状态</Text>
          <Text style={styles.configValue}>{agent.status}</Text>
        </View>
        {agent.config &&
          Object.entries(agent.config).map(([key, value]) => (
            <View key={key} style={styles.configItem}>
              <Text style={styles.configLabel}>{key}</Text>
              <Text style={styles.configValue}>{String(value)}</Text>
            </View>
          ))}
      </View>

      {onResetDefaults && (
        <TouchableOpacity style={styles.resetButton} onPress={onResetDefaults}>
          <Text style={styles.resetButtonText}>恢复默认设置</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderChat = () => (
    <View style={styles.chatContainer}>
      <FlatList
        ref={chatRef}
        data={chatMessages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                item.role === 'user' ? styles.userText : styles.assistantText,
              ]}
            >
              {item.content}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => chatRef.current?.scrollToEnd()}
      />

      <View style={styles.chatInput}>
        <TextInput
          style={styles.input}
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="输入消息测试对话..."
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
          <Text style={styles.sendButtonText}>发送</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHistory = () => (
    <View style={styles.historyContainer}>
      <FlatList
        data={configHistory}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.historyItem}>
            <View style={styles.historyDot} />
            <View style={styles.historyContent}>
              <Text style={styles.historySummary}>{item.summary}</Text>
              <Text style={styles.historyTime}>{item.changedAt.toLocaleString()}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'preview' && styles.tabActive]}
          onPress={() => setActiveTab('preview')}
        >
          <Text style={[styles.tabText, activeTab === 'preview' && styles.tabTextActive]}>
            资料预览
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
            对话测试
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            历史记录
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContent}>
        {activeTab === 'preview' && renderPreview()}
        {activeTab === 'chat' && renderChat()}
        {activeTab === 'history' && renderHistory()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  previewContainer: {
    flex: 1,
    padding: 16,
  },
  agentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  agentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  agentType: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  agentDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  configSummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  configLabel: {
    fontSize: 14,
    color: '#666',
  },
  configValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  resetButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  resetButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  messageList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#333',
  },
  chatInput: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  historyContainer: {
    flex: 1,
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    marginRight: 12,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
  },
  historySummary: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
  },
});
