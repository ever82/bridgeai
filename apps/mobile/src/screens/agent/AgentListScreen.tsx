import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Agent,
  AgentType,
  AgentStatus,
  AGENT_TYPE_LABELS,
  AGENT_STATUS_LABELS,
  AGENT_TYPE_COLORS,
  AGENT_STATUS_COLORS,
  VALID_STATUS_TRANSITIONS,
} from '@bridgeai/shared';

import { agentsApi } from '../../services/api/agents';
import { ProfileStackParamList } from '../../types/navigation';

type SortField = 'name' | 'createdAt' | 'updatedAt';

interface SortOption {
  value: SortField;
  label: string;
}

const sortOptions: SortOption[] = [
  { value: 'name', label: 'Name' },
  { value: 'createdAt', label: 'Created Time' },
  { value: 'updatedAt', label: 'Updated Time' },
];

const typeOptions: { value: AgentType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: AgentType.VISIONSHARE, label: 'VisionShare' },
  { value: AgentType.AGENTDATE, label: 'AgentDate' },
  { value: AgentType.AGENTJOB, label: 'AgentJob' },
  { value: AgentType.AGENTAD, label: 'AgentAd' },
  { value: AgentType.DEMAND, label: 'Demand' },
  { value: AgentType.SUPPLY, label: 'Supply' },
];

interface AgentCardProps {
  agent: Agent;
  onPress: (agent: Agent) => void;
  onStatusToggle: (agent: Agent, newStatus: AgentStatus) => void;
  isGrid?: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onPress, onStatusToggle, isGrid }) => {
  const nextStatuses = VALID_STATUS_TRANSITIONS[agent.status];
  const canToggle = nextStatuses.length > 0;

  const handleToggle = () => {
    const nextStatus = nextStatuses[0];
    if (nextStatus) {
      onStatusToggle(agent, nextStatus);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, isGrid && styles.gridCard]}
      onPress={() => onPress(agent)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: AGENT_TYPE_COLORS[agent.type] }]}>
          <Text style={styles.typeBadgeText}>{AGENT_TYPE_LABELS[agent.type]}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <View
            style={[styles.statusBadge, { backgroundColor: AGENT_STATUS_COLORS[agent.status] }]}
          >
            <Text style={styles.statusBadgeText}>{AGENT_STATUS_LABELS[agent.status]}</Text>
          </View>
          {canToggle && (
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={handleToggle}
              testID={`agent-card-toggle-${agent.id}`}
            >
              <Text style={styles.toggleButtonText}>Toggle</Text>
            </TouchableOpacity>
          )}
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
      <TouchableOpacity
        style={styles.createButton}
        onPress={onCreatePress}
        testID="agent-list-empty-create"
      >
        <Text style={styles.createButtonText}>Create Agent</Text>
      </TouchableOpacity>
    </View>
  );
};

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

interface DropdownProps {
  visible: boolean;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const Dropdown: React.FC<DropdownProps> = ({ visible, options, selected, onSelect, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dropdown}>
              {options.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    selected === option.value && styles.dropdownOptionSelected,
                  ]}
                  onPress={() => onSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      selected === option.value && styles.dropdownOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selected === option.value && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export const AgentListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<AgentType | ''>('');
  const [selectedSort, setSelectedSort] = useState<SortField>('updatedAt');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, unknown> = { limit: 50 };
      if (selectedType) {
        params.type = selectedType;
      }

      const response = await agentsApi.getAgents(params);
      let result = response.data.data.agents;

      // Client-side sorting since API doesn't support sorting fields
      if (selectedSort === 'name') {
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
      } else if (selectedSort === 'createdAt') {
        result = [...result].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else {
        result = [...result].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }

      setAgents(result);
    } catch (err) {
      setError((err as Error)?.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedSort]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAgents();
    setRefreshing(false);
  }, [fetchAgents]);

  const handleAgentPress = useCallback(
    (agent: Agent) => {
      navigation.navigate('EditAgent', { agentId: agent.id });
    },
    [navigation]
  );

  const handleStatusToggle = useCallback(async (agent: Agent, newStatus: AgentStatus) => {
    try {
      await agentsApi.updateAgentStatus(agent.id, newStatus);
      // Update local state to reflect the change
      setAgents(prev => prev.map(a => (a.id === agent.id ? { ...a, status: newStatus } : a)));
    } catch (err) {
      console.error('Failed to update agent status:', err);
    }
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
      <View style={styles.container} testID="agent-list-screen">
        <View style={styles.header}>
          <Text style={styles.title}>My Agents</Text>
        </View>
        <EmptyState onCreatePress={handleCreatePress} />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="agent-list-screen">
      <View style={styles.header}>
        <Text style={styles.title}>My Agents</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.viewToggleButton}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            testID="agent-list-view-toggle"
          >
            <Text style={styles.viewToggleText}>{viewMode === 'list' ? '⊞' : '☰'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreatePress}
            testID="agent-list-create-button"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowTypeDropdown(true)}>
          <Text style={styles.filterButtonText}>
            {typeOptions.find(o => o.value === selectedType)?.label || 'All Types'}
          </Text>
          <Text style={styles.filterArrow}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterButton} onPress={() => setShowSortDropdown(true)}>
          <Text style={styles.filterButtonText}>
            {sortOptions.find(o => o.value === selectedSort)?.label || 'Updated Time'}
          </Text>
          <Text style={styles.filterArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      <Dropdown
        visible={showTypeDropdown}
        options={typeOptions}
        selected={selectedType}
        onSelect={value => {
          setSelectedType(value as AgentType | '');
          setShowTypeDropdown(false);
        }}
        onClose={() => setShowTypeDropdown(false)}
      />

      <Dropdown
        visible={showSortDropdown}
        options={sortOptions}
        selected={selectedSort}
        onSelect={value => {
          setSelectedSort(value as SortField);
          setShowSortDropdown(false);
        }}
        onClose={() => setShowSortDropdown(false)}
      />

      <FlatList
        data={agents}
        keyExtractor={item => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        renderItem={({ item }) => (
          <AgentCard
            agent={item}
            onPress={handleAgentPress}
            onStatusToggle={handleStatusToggle}
            isGrid={viewMode === 'grid'}
          />
        )}
        contentContainerStyle={[styles.listContainer, viewMode === 'grid' && styles.gridContainer]}
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggleText: {
    fontSize: 20,
    color: '#333',
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  gridContainer: {
    padding: 8,
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
  gridCard: {
    flex: 1,
    margin: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  toggleButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
  },
  filterArrow: {
    fontSize: 10,
    color: '#666',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownOptionSelected: {
    backgroundColor: '#E3F2FD',
  },
  dropdownOptionText: {
    fontSize: 15,
    color: '#333',
  },
  dropdownOptionTextSelected: {
    fontWeight: '600',
    color: '#1976D2',
  },
  checkmark: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: 'bold',
  },
});
