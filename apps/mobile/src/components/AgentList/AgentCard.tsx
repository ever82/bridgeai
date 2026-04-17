import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';

import { Agent } from './AgentList';

interface AgentCardProps {
  agent: Agent;
  onPress?: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onPress }) => {
  const formatPrice = (rate: number) => `$${rate}/hr`;

  const formatExperience = (years: number) => {
    if (years < 1) return '< 1 year';
    if (years === 1) return '1 year';
    return `${years} years`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Image
          source={
            agent.avatar
              ? { uri: agent.avatar }
              : require('../../assets/default-avatar.png')
          }
          style={styles.avatar}
        />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{agent.name}</Text>
            {agent.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>★ {agent.rating.toFixed(1)}</Text>
            <Text style={styles.creditScore}>
              Credit: {agent.creditScore || 500}
            </Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatPrice(agent.hourlyRate)}</Text>
          {!agent.isAvailable && (
            <View style={styles.unavailableBadge}>
              <Text style={styles.unavailableText}>Unavailable</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.skillsContainer}>
        {agent.skills.slice(0, 4).map((skill, index) => (
          <View key={index} style={styles.skillBadge}>
            <Text style={styles.skillText}>{skill}</Text>
          </View>
        ))}
        {agent.skills.length > 4 && (
          <Text style={styles.moreSkills}>+{agent.skills.length - 4}</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.experience}>{formatExperience(agent.experienceYears)} exp</Text>
        {agent.matchScore && (
          <View style={styles.matchContainer}>
            <Text style={styles.matchLabel}>Match:</Text>
            <Text style={styles.matchScore}>{(agent.matchScore * 100).toFixed(0)}%</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E0E0',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  verifiedBadge: {
    marginLeft: 6,
    backgroundColor: '#4CAF50',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    fontSize: 14,
    color: '#FFC107',
    fontWeight: '500',
  },
  creditScore: {
    fontSize: 12,
    color: '#666',
    marginLeft: 12,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  unavailableBadge: {
    marginTop: 4,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unavailableText: {
    fontSize: 10,
    color: '#F44336',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  skillBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  skillText: {
    fontSize: 12,
    color: '#1976D2',
  },
  moreSkills: {
    fontSize: 12,
    color: '#999',
    paddingVertical: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  experience: {
    fontSize: 13,
    color: '#666',
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 4,
  },
  matchScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
});
