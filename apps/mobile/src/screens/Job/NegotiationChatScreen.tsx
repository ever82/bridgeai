import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Types
interface NegotiationMessage {
  id: string;
  sender: 'jobseeker_agent' | 'employer_agent' | 'system' | 'human';
  senderId: string;
  content: string;
  timestamp: string;
  round: number;
  isCounterOffer?: boolean;
  offerValue?: number;
  topic?: string;
}

interface NegotiationRoom {
  id: string;
  status: string;
  currentRound: number;
  maxRounds: number;
  agreedAmount?: number;
  currency: string;
  topics: string[];
}

type RootStackParamList = {
  NegotiationChat: { roomId: string; isJobSeeker: boolean };
  NegotiationResult: { roomId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'NegotiationChat'>;

// API client (placeholder - replace with actual API client)
const apiClient = {
  getRoom: async (roomId: string): Promise<NegotiationRoom> => {
    const response = await fetch(`/api/job/negotiations/${roomId}`);
    const data = await response.json();
    return data.data;
  },

  getMessages: async (roomId: string): Promise<NegotiationMessage[]> => {
    const response = await fetch(`/api/job/negotiations/${roomId}/messages`);
    const data = await response.json();
    return data.data;
  },

  sendMessage: async (roomId: string, content: string, isCounterOffer?: boolean, offerValue?: number): Promise<NegotiationMessage> => {
    const response = await fetch(`/api/job/negotiations/${roomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: 'jobseeker_agent',
        senderId: 'user_agent_id',
        content,
        isCounterOffer,
        offerValue
      })
    });
    const data = await response.json();
    return data.data;
  },

  requestHandoff: async (roomId: string, reason: string): Promise<void> => {
    await fetch(`/api/job/negotiations/${roomId}/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, priority: 'medium' })
    });
  },

  confirmAgreement: async (roomId: string): Promise<void> => {
    await fetch(`/api/job/negotiations/${roomId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ party: 'jobseeker' })
    });
  },

  cancelNegotiation: async (roomId: string, reason: string): Promise<void> => {
    await fetch(`/api/job/negotiations/${roomId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
  }
};

const NegotiationChatScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { roomId, isJobSeeker } = route.params;

  const [room, setRoom] = useState<NegotiationRoom | null>(null);
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Polling interval for new messages
  useEffect(() => {
    loadRoomAndMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [roomId]);

  const loadRoomAndMessages = async () => {
    try {
      setIsLoading(true);
      const [roomData, messagesData] = await Promise.all([
        apiClient.getRoom(roomId),
        apiClient.getMessages(roomId)
      ]);
      setRoom(roomData);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load room:', error);
      Alert.alert('Error', 'Failed to load negotiation room');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const messagesData = await apiClient.getMessages(roomId);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    try {
      setIsSending(true);
      const isCounterOffer = !!offerAmount;
      const offerValue = isCounterOffer ? parseFloat(offerAmount) : undefined;

      const newMessage = await apiClient.sendMessage(
        roomId,
        inputText.trim(),
        isCounterOffer,
        offerValue
      );

      setMessages(prev => [...prev, newMessage]);
      setInputText('');
      setOfferAmount('');

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleHandoff = () => {
    Alert.alert(
      'Request Human Support',
      'A human agent will join the conversation to help with your negotiation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          style: 'default',
          onPress: async () => {
            try {
              await apiClient.requestHandoff(roomId, 'User requested human assistance');
              Alert.alert('Success', 'Human support has been requested. An agent will join shortly.');
            } catch (error) {
              Alert.alert('Error', 'Failed to request human support');
            }
          }
        }
      ]
    );
  };

  const handleConfirmAgreement = () => {
    Alert.alert(
      'Confirm Agreement',
      'Are you sure you want to confirm this agreement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            try {
              await apiClient.confirmAgreement(roomId);
              Alert.alert('Success', 'Agreement confirmed!');
              navigation.navigate('NegotiationResult', { roomId });
            } catch (error) {
              Alert.alert('Error', 'Failed to confirm agreement');
            }
          }
        }
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Negotiation',
      'Are you sure you want to cancel this negotiation? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.cancelNegotiation(roomId, 'User cancelled negotiation');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel negotiation');
            }
          }
        }
      ]
    );
  };

  const getSenderName = (sender: string): string => {
    switch (sender) {
      case 'jobseeker_agent':
        return 'You';
      case 'employer_agent':
        return 'Employer';
      case 'system':
        return 'System';
      case 'human':
        return 'Support Agent';
      default:
        return 'Unknown';
    }
  };

  const getMessageStyle = (sender: string) => {
    switch (sender) {
      case 'jobseeker_agent':
        return styles.myMessage;
      case 'employer_agent':
        return styles.theirMessage;
      case 'system':
        return styles.systemMessage;
      case 'human':
        return styles.humanMessage;
      default:
        return styles.theirMessage;
    }
  };

  const renderMessage = ({ item }: { item: NegotiationMessage }) => {
    const isMyMessage = item.sender === 'jobseeker_agent';

    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer]}>
        <View style={[styles.messageBubble, getMessageStyle(item.sender)]}>
          <Text style={styles.senderName}>{getSenderName(item.sender)}</Text>
          <Text style={styles.messageText}>{item.content}</Text>
          {item.isCounterOffer && item.offerValue && (
            <View style={styles.offerBadge}>
              <Text style={styles.offerText}>
                Counter Offer: {item.offerValue}
              </Text>
            </View>
          )}
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading negotiation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Salary Negotiation</Text>
          <Text style={styles.headerSubtitle}>
            Round {room?.currentRound || 0} of {room?.maxRounds || 0}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleHandoff} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Help</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, styles.cancelText]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>Status: {room?.status?.replace('_', ' ').toUpperCase()}</Text>
        {room?.agreedAmount && (
          <Text style={styles.agreedAmount}>
            Agreed: {room.agreedAmount} {room.currency}
          </Text>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Confirm Agreement Button */}
      {room?.status === 'negotiating' && (
        <TouchableOpacity onPress={handleConfirmAgreement} style={styles.confirmButton}>
          <Text style={styles.confirmButtonText}>Confirm Agreement</Text>
        </TouchableOpacity>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.offerInput}
            placeholder="Offer amount (optional)"
            value={offerAmount}
            onChangeText={setOfferAmount}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  headerInfo: {
    flex: 1
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  headerActions: {
    flexDirection: 'row'
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 14
  },
  cancelText: {
    color: '#FF3B30'
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  statusText: {
    fontSize: 14,
    color: '#666'
  },
  agreedAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34C759'
  },
  messagesList: {
    padding: 16
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%'
  },
  myMessageContainer: {
    alignSelf: 'flex-end'
  },
  theirMessageContainer: {
    alignSelf: 'flex-start'
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16
  },
  myMessage: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4
  },
  theirMessage: {
    backgroundColor: '#E9ECEF',
    borderBottomLeftRadius: 4
  },
  systemMessage: {
    backgroundColor: '#FFF3CD',
    alignSelf: 'center',
    borderRadius: 8
  },
  humanMessage: {
    backgroundColor: '#D4EDDA',
    borderBottomLeftRadius: 4
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#666'
  },
  messageText: {
    fontSize: 16,
    color: '#333'
  },
  offerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 6,
    borderRadius: 8,
    marginTop: 8
  },
  offerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end'
  },
  confirmButton: {
    backgroundColor: '#34C759',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  inputContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  offerInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    fontSize: 14
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    padding: 12,
    fontSize: 16,
    maxHeight: 100
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-end',
    marginTop: 8
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc'
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default NegotiationChatScreen;
