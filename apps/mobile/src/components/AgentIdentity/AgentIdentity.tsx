import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { AgentIdentity as AgentIdentityType, AgentType } from '@visionshare/shared';

interface AgentIdentityProps {
  identity: AgentIdentityType;
  onPress?: () => void;
  compact?: boolean;
  showOwner?: boolean;
  showTrustScore?: boolean;
}

/**
 * AgentIdentity Component
 * Displays agent identity information including avatar, name, type, and trust indicators
 */
export const AgentIdentity: React.FC<AgentIdentityProps> = ({
  identity,
  onPress,
  compact = false,
  showOwner = true,
  showTrustScore = true,
}) => {
  const getAgentTypeLabel = (type: AgentType): string => {
    const labels: Record<AgentType, string> = {
      [AgentType.PERSONAL]: '个人助理',
      [AgentType.BUSINESS]: '商务助手',
      [AgentType.SERVICE]: '服务专员',
      [AgentType.SYSTEM]: '系统',
    };
    return labels[type] || '未知';
  };

  const getTrustLevelColor = (score: number): string => {
    if (score >= 90) return '#4CAF50';
    if (score >= 70) return '#8BC34A';
    if (score >= 50) return '#FFC107';
    if (score >= 30) return '#FF9800';
    return '#F44336';
  };

  const getTrustLevelLabel = (score: number): string => {
    if (score >= 90) return '极高';
    if (score >= 70) return '高';
    if (score >= 50) return '中等';
    if (score >= 30) return '低';
    return '极低';
  };

  if (compact) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.compactContainer}>
        <Image
          source={{ uri: identity.avatarUrl || 'https://via.placeholder.com/40' }}
          style={styles.compactAvatar}
        />
        <View style={styles.compactInfo}>
          <Text style={styles.compactName}>{identity.displayName}</Text>
          <View style={styles.compactMeta}>
            <Text style={styles.typeBadge}>{getAgentTypeLabel(identity.type)}</Text>
            {identity.isVerified && (
              <Text style={styles.verifiedBadge}>✓</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: identity.avatarUrl || 'https://via.placeholder.com/60' }}
          style={styles.avatar}
        />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{identity.displayName}</Text>
            {identity.isVerified && (
              <View style={styles.verifiedContainer}>
                <Text style={styles.verifiedIcon}>✓</Text>
                <Text style={styles.verifiedText}>已认证</Text>
              </View>
            )}
          </View>
          <Text style={styles.type}>{getAgentTypeLabel(identity.type)}</Text>
        </View>
      </View>

      {showOwner && (
        <View style={styles.ownerSection}>
          <Text style={styles.sectionLabel}>所属用户</Text>
          <Text style={styles.ownerName}>{identity.ownerName}</Text>
        </View>
      )}

      {showTrustScore && (
        <View style={styles.trustSection}>
          <Text style={styles.sectionLabel}>可信度</Text>
          <View style={styles.trustRow}>
            <View
              style={[
                styles.trustBar,
                { backgroundColor: getTrustLevelColor(identity.trustScore) },
                { width: `${identity.trustScore}%` },
              ]}
            />
            <Text style={styles.trustScore}>{identity.trustScore}</Text>
            <Text style={[styles.trustLabel, { color: getTrustLevelColor(identity.trustScore) }]}>
              {getTrustLevelLabel(identity.trustScore)}
            </Text>
          </View>
        </View>
      )}

      {identity.capabilities.length > 0 && (
        <View style={styles.capabilitiesSection}>
          <Text style={styles.sectionLabel}>能力标签</Text>
          <View style={styles.capabilitiesRow}>
            {identity.capabilities.map((cap, index) => (
              <View key={index} style={styles.capabilityTag}>
                <Text style={styles.capabilityText}>{cap}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedIcon: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 2,
  },
  verifiedText: {
    color: '#1976D2',
    fontSize: 10,
    fontWeight: '500',
  },
  type: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  ownerSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 14,
    color: '#333',
  },
  trustSection: {
    marginBottom: 12,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustBar: {
    height: 8,
    borderRadius: 4,
    flex: 1,
  },
  trustScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  trustLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  capabilitiesSection: {
    marginTop: 4,
  },
  capabilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  capabilityTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  capabilityText: {
    fontSize: 12,
    color: '#666',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  compactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  compactInfo: {
    marginLeft: 10,
  },
  compactName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  typeBadge: {
    fontSize: 11,
    color: '#666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedBadge: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: 'bold',
  },
});

export default AgentIdentity;
