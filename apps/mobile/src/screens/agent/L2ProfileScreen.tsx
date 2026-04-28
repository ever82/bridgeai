import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getL2Schema, L2Schema, L2Data } from '@bridgeai/shared';

import { agentsApi } from '../../services/api/agents';
import { ProfileStackParamList } from '../../types/navigation';

import { L2ProfileForm } from './L2ProfileForm';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'L2Profile'>;
type L2ProfileRouteProp = RouteProp<ProfileStackParamList, 'L2Profile'>;

export const L2ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<L2ProfileRouteProp>();
  const { agentId, scene } = route.params;

  const [schema, setSchema] = useState<L2Schema | undefined>(undefined);
  const [initialData, setInitialData] = useState<L2Data>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const l2Schema = getL2Schema(scene);
    setSchema(l2Schema ?? undefined);

    const fetchAgent = async () => {
      try {
        setLoading(true);
        const response = await agentsApi.getAgent(agentId);
        const agent = response.data.data;
        const existingL2 = (agent.config?.l2 as L2Data) || {};
        setInitialData(existingL2);
      } catch {
        // Agent may not have L2 data yet; start with empty form
        setInitialData({});
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [agentId, scene]);

  const handleSubmit = useCallback(
    async (data: L2Data) => {
      try {
        setSubmitting(true);
        await agentsApi.updateAgent(agentId, {
          config: { l2: data },
        } as Record<string, unknown>);
        Alert.alert('成功', 'L2 配置已保存', [
          { text: '确定', onPress: () => navigation.goBack() },
        ]);
      } catch (err) {
        Alert.alert('错误', (err as Error)?.message || '保存失败');
      } finally {
        setSubmitting(false);
      }
    },
    [agentId, navigation]
  );

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!schema) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>未找到场景配置</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>L2 配置</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Form */}
      <L2ProfileForm
        schema={schema}
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={submitting}
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
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  backLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backLinkText: {
    fontSize: 16,
    color: '#007AFF',
  },
});
