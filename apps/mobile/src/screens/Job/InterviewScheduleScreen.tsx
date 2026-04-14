import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

// Types
interface Interview {
  id: string;
  jobApplicationId: string;
  jobSeekerId: string;
  employerId: string;
  positionId: string;
  round: string;
  roundNumber: number;
  status: string;
  type: string;
  schedule?: {
    scheduledAt: string;
    duration: number;
    timezone: string;
    location?: string;
    meetingLink?: string;
  };
  proposedSlots: TimeSlot[];
  confirmedSlotId?: string;
  interviewers: string[];
  createdAt: string;
}

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  timezone: string;
  isAvailable: boolean;
  proposedBy?: string;
}

type RootStackParamList = {
  InterviewSchedule: { applicationId: string; isJobSeeker: boolean };
  InterviewDetail: { interviewId: string };
  ProposeTimeSlots: { interviewId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'InterviewSchedule'>;

// API client
const apiClient = {
  getInterviews: async (applicationId: string): Promise<Interview[]> => {
    const response = await fetch(`/api/job/interviews?jobApplicationId=${applicationId}`);
    const data = await response.json();
    return data.data;
  },

  getInterviewSeries: async (applicationId: string): Promise<{
    applicationId: string;
    interviews: Interview[];
    currentRound: string | null;
    nextRound: string | null;
    totalRounds: number;
    completedRounds: number;
    overallStatus: string;
  }> => {
    const response = await fetch(`/api/job/interviews/application/${applicationId}/series`);
    const data = await response.json();
    return data.data;
  },

  scheduleInterview: async (interviewId: string, slotId: string): Promise<Interview> => {
    const response = await fetch(`/api/job/interviews/${interviewId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId })
    });
    const data = await response.json();
    return data.data;
  },

  rescheduleInterview: async (interviewId: string, slotId: string, reason?: string): Promise<Interview> => {
    const response = await fetch(`/api/job/interviews/${interviewId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId, reason })
    });
    const data = await response.json();
    return data.data;
  },

  cancelInterview: async (interviewId: string, reason: string): Promise<Interview> => {
    const response = await fetch(`/api/job/interviews/${interviewId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelledBy: 'user', reason })
    });
    const data = await response.json();
    return data.data;
  },

  requestHandoff: async (interviewId: string, reason: string): Promise<void> => {
    await fetch(`/api/job/interviews/${interviewId}/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, priority: 'medium' })
    });
  }
};

const InterviewScheduleScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { applicationId, isJobSeeker } = route.params;

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [series, setSeries] = useState<{
    totalRounds: number;
    completedRounds: number;
    overallStatus: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);

  useEffect(() => {
    loadData();
  }, [applicationId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [interviewsData, seriesData] = await Promise.all([
        apiClient.getInterviews(applicationId),
        apiClient.getInterviewSeries(applicationId)
      ]);
      setInterviews(interviewsData);
      setSeries({
        totalRounds: seriesData.totalRounds,
        completedRounds: seriesData.completedRounds,
        overallStatus: seriesData.overallStatus
      });
    } catch (error) {
      console.error('Failed to load interviews:', error);
      Alert.alert('Error', 'Failed to load interview schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleSchedule = (interview: Interview) => {
    if (interview.proposedSlots.length === 0) {
      Alert.alert('No Time Slots', 'No time slots have been proposed yet.');
      return;
    }

    const availableSlots = interview.proposedSlots.filter(s => s.isAvailable);
    if (availableSlots.length === 0) {
      Alert.alert('No Available Slots', 'All proposed time slots have been taken.');
      return;
    }

    setSelectedInterview(interview);
  };

  const confirmSchedule = async (slot: TimeSlot) => {
    if (!selectedInterview) return;

    try {
      await apiClient.scheduleInterview(selectedInterview.id, slot.id);
      Alert.alert('Success', 'Interview scheduled successfully!');
      setSelectedInterview(null);
      loadData();
    } catch (error) {
      console.error('Failed to schedule interview:', error);
      Alert.alert('Error', 'Failed to schedule interview');
    }
  };

  const handleReschedule = (interview: Interview) => {
    Alert.alert(
      'Reschedule Interview',
      'Would you like to propose new time slots or select from existing ones?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Propose New',
          onPress: () => navigation.navigate('ProposeTimeSlots', { interviewId: interview.id })
        },
        {
          text: 'Select Existing',
          onPress: () => setSelectedInterview(interview)
        }
      ]
    );
  };

  const handleCancel = (interview: Interview) => {
    Alert.alert(
      'Cancel Interview',
      'Are you sure you want to cancel this interview?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.cancelInterview(interview.id, 'User cancelled');
              Alert.alert('Success', 'Interview cancelled');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel interview');
            }
          }
        }
      ]
    );
  };

  const handleHandoff = (interview: Interview) => {
    Alert.alert(
      'Request Human Support',
      'A human agent will assist you with scheduling.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              await apiClient.requestHandoff(interview.id, 'User requested scheduling assistance');
              Alert.alert('Success', 'Human support requested');
            } catch (error) {
              Alert.alert('Error', 'Failed to request support');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed':
        return '#34C759';
      case 'pending':
        return '#FF9500';
      case 'proposed':
        return '#007AFF';
      case 'completed':
        return '#5856D6';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getInterviewTypeLabel = (type: string): string => {
    switch (type) {
      case 'phone':
        return 'Phone Interview';
      case 'video':
        return 'Video Interview';
      case 'onsite':
        return 'On-site Interview';
      case 'online_assessment':
        return 'Online Assessment';
      case 'group':
        return 'Group Interview';
      case 'panel':
        return 'Panel Interview';
      default:
        return type;
    }
  };

  const getRoundLabel = (round: string): string => {
    switch (round) {
      case 'screening':
        return 'Screening';
      case 'technical':
        return 'Technical';
      case 'behavioral':
        return 'Behavioral';
      case 'culture_fit':
        return 'Culture Fit';
      case 'final':
        return 'Final Round';
      case 'hr':
        return 'HR Interview';
      case 'offer_discussion':
        return 'Offer Discussion';
      default:
        return round;
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const renderInterviewCard = ({ item }: { item: Interview }) => {
    const isScheduled = item.status === 'confirmed' || item.status === 'rescheduled';
    const canSchedule = item.status === 'pending' || item.status === 'proposed';
    const canCancel = item.status !== 'cancelled' && item.status !== 'completed';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.roundBadge}>
            <Text style={styles.roundText}>Round {item.roundNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.interviewType}>{getInterviewTypeLabel(item.type)}</Text>
        <Text style={styles.roundLabel}>{getRoundLabel(item.round)}</Text>

        {isScheduled && item.schedule && (
          <View style={styles.scheduleInfo}>
            <Text style={styles.scheduleDate}>
              {formatDateTime(item.schedule.scheduledAt)}
            </Text>
            <Text style={styles.scheduleDuration}>
              Duration: {item.schedule.duration} minutes
            </Text>
            {item.schedule.location && (
              <Text style={styles.scheduleLocation}>
                Location: {item.schedule.location}
              </Text>
            )}
            {item.schedule.meetingLink && (
              <TouchableOpacity
                onPress={() => {/* Open meeting link */}}
                style={styles.meetingLink}
              >
                <Text style={styles.meetingLinkText}>Join Meeting</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isScheduled && item.proposedSlots.length > 0 && (
          <View style={styles.proposedSlots}>
            <Text style={styles.proposedSlotsTitle}>
              {item.proposedSlots.length} time slot(s) proposed
            </Text>
          </View>
        )}

        <View style={styles.cardActions}>
          {canSchedule && (
            <TouchableOpacity
              style={[styles.actionButton, styles.scheduleButton]}
              onPress={() => handleSchedule(item)}
            >
              <Text style={styles.actionButtonText}>
                {item.status === 'proposed' ? 'Confirm Time' : 'Schedule'}
              </Text>
            </TouchableOpacity>
          )}
          {isScheduled && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rescheduleButton]}
              onPress={() => handleReschedule(item)}
            >
              <Text style={styles.actionButtonText}>Reschedule</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancel(item)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.helpButton]}
            onPress={() => handleHandoff(item)}
          >
            <Text style={styles.helpButtonText}>Help</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSlotSelector = () => {
    if (!selectedInterview) return null;

    const availableSlots = selectedInterview.proposedSlots.filter(s => s.isAvailable);

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select a Time Slot</Text>
          <ScrollView style={styles.slotsList}>
            {availableSlots.map(slot => (
              <TouchableOpacity
                key={slot.id}
                style={styles.slotItem}
                onPress={() => confirmSchedule(slot)}
              >
                <Text style={styles.slotTime}>{formatDateTime(slot.startTime)}</Text>
                <Text style={styles.slotDuration}>{slot.duration} minutes</Text>
                <Text style={styles.slotTimezone}>{slot.timezone}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedInterview(null)}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading interviews...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Interview Schedule</Text>
        {series && (
          <Text style={styles.headerSubtitle}>
            {series.completedRounds} of {series.totalRounds} rounds completed
          </Text>
        )}
      </View>

      {/* Progress Bar */}
      {series && series.totalRounds > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(series.completedRounds / series.totalRounds) * 100}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round((series.completedRounds / series.totalRounds) * 100)}% Complete
          </Text>
        </View>
      )}

      {/* Interview List */}
      <FlatList
        data={interviews}
        renderItem={renderInterviewCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No interviews scheduled yet</Text>
          </View>
        }
      />

      {/* Slot Selector Modal */}
      {selectedInterview && renderSlotSelector()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'right'
  },
  listContainer: {
    padding: 16
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
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  roundBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  roundText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  interviewType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  roundLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  scheduleInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  scheduleDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  scheduleDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  scheduleLocation: {
    fontSize: 14,
    color: '#666'
  },
  meetingLink: {
    marginTop: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  meetingLinkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  proposedSlots: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12
  },
  proposedSlotsTitle: {
    fontSize: 14,
    color: '#856404'
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1
  },
  scheduleButton: {
    backgroundColor: '#34C759',
    borderColor: '#34C759'
  },
  rescheduleButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderColor: '#FF3B30'
  },
  helpButton: {
    backgroundColor: '#fff',
    borderColor: '#8E8E93'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: 'bold'
  },
  helpButtonText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: 'bold'
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#666'
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '70%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center'
  },
  slotsList: {
    maxHeight: 300
  },
  slotItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  slotTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  slotDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  slotTimezone: {
    fontSize: 12,
    color: '#999'
  },
  closeButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold'
  }
});

export default InterviewScheduleScreen;
