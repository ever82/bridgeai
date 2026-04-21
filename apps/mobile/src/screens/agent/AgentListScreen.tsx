import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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

interface AgentCardProps {
  agent: Agent;
  onPress: (agent: Agent) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(agent)}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: AGENT_TYPE_COLORS[agent.type] }]}>
          <Text style={styles.typeBadgeText}>{AGENT_TYPE_LABELS[agent.type]}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: AGENT_STATUS_COLORS[agent.status] }]}>
          <Text style={styles.statusBadgeText}>{AGENT_STATUS_LABELS[agent.status]}</Text>
        </View>
      </View>

      <Text style={styles.agentName}>{agent.name}</Text>
      {agent.description && (
        <Text style={styles.agentDescription} numberOfLines={2}>
          {agent.description}
        </Text>
      )}

      <Text style={styles.updatedAt}>
        Updated: {new Date(agent.updatedAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
};

interface EmptyStateProps {
  onCreatePress: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onCreatePress }) => {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Agents Yet</Text>
      <Text style={styles.emptyDescription}>
        Create your first agent to get started with AI-powered matching
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={onCreatePress}>
        <Text style={styles.createButtonText}>Create Agent</Text>
      </TouchableOpacity>
    </View>
  );
};

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

export const AgentListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await agentsApi.getAgents({ limit: 50 });
      setAgents(response.data.data);
    } catch (err) {
      setError((err as Error)?.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAgents();
    setRefreshing(false);
  }, [fetchAgents]);

  const handleAgentPress = useCallback((agent: Agent) => {
    // TODO: Navigate to agent detail screen
    console.log('Agent pressed:', agent.id);
  }, []);

  const handleCreatePress = useCallback(() => {
    navigation.navigate('CreateAgent');
  }, [navigation]);

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAgents}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (agents.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Agents</Text>
        </View>
        <EmptyState onCreatePress={handleCreatePress} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Agents</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreatePress}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={agents}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <AgentCard agent={item} onPress={handleAgentPress} />}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  agentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  updatedAt: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
