import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Agent,
  AGENT_TYPE_LABELS,
  AGENT_STATUS_LABELS,
  AGENT_TYPE_COLORS,
  AGENT_STATUS_COLORS,
} from '@bridgeai/shared';

import { agentsApi } from '../../services/api/agents';
import { ProfileStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'EditAgent'>;
type EditAgentRouteProp = RouteProp<ProfileStackParamList, 'EditAgent'>;

export const EditAgentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditAgentRouteProp>();
  const { agentId } = route.params;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchAgent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await agentsApi.getAgent(agentId);
      setAgent(response.data.data);
    } catch (err) {
      Alert.alert('Error', (err as Error)?.message || 'Failed to fetch agent');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [agentId, navigation]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  const handleDelete = useCallback(() => {
    Alert.alert('删除确认', `确定要删除 Agent "${agent?.name}" 吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await agentsApi.deleteAgent(agentId);
            Alert.alert('成功', 'Agent 已删除', [
              { text: '确定', onPress: () => navigation.navigate('AgentList') },
            ]);
          } catch (err) {
            Alert.alert('错误', (err as Error)?.message || '删除失败');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [agent, agentId, navigation]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!agent) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Agent not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Agent</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Agent Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.typeBadge, { backgroundColor: AGENT_TYPE_COLORS[agent.type] }]}>
              <Text style={styles.typeBadgeText}>{AGENT_TYPE_LABELS[agent.type]}</Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: AGENT_STATUS_COLORS[agent.status] }]}
            >
              <Text style={styles.statusBadgeText}>{AGENT_STATUS_LABELS[agent.status]}</Text>
            </View>
          </View>

          <Text style={styles.agentName}>{agent.name}</Text>
          {agent.description && <Text style={styles.agentDescription}>{agent.description}</Text>}

          <Text style={styles.updatedAt}>
            Updated: {new Date(agent.updatedAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Edit Button */}
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => {
            navigation.navigate('CreateAgent', { agent });
          }}
        >
          <Text style={styles.editButtonText}>编辑 Agent</Text>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteButtonText}>删除 Agent</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  agentName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  agentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  updatedAt: {
    fontSize: 12,
    color: '#999',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
  },
});
