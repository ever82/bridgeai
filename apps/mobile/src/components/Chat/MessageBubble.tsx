import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { SenderType, SENDER_TYPE_COLORS } from '@bridgeai/shared';

import { ChatMessage, MessageAttachment } from '../../types/chat';
import { theme } from '../../theme';

import { SenderIndicator } from './SenderIndicator';
import { MessageStatus, MessageStatusType } from './MessageStatus';

export interface MessageBubbleProps {
  message: ChatMessage;
  currentUserId: string;
  showSenderIndicator?: boolean;
  isConsecutive?: boolean;
  onPress?: (message: ChatMessage) => void;
  onLongPress?: (message: ChatMessage) => void;
  onImagePress?: (attachment: MessageAttachment) => void;
  status?: MessageStatusType;
  totalMembers?: number;
  style?: ViewStyle;
  testID?: string;
}

const isOwnMessage = (message: ChatMessage, currentUserId: string): boolean =>
  message.senderId === currentUserId;

const getSenderType = (message: ChatMessage, _currentUserId: string): SenderType => {
  if (message.senderType === 'AGENT') return SenderType.AGENT;
  return SenderType.HUMAN;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  showSenderIndicator = false,
  isConsecutive = false,
  onPress,
  onLongPress,
  onImagePress,
  status = 'sent',
  totalMembers,
  style,
  testID,
}) => {
  const own = isOwnMessage(message, currentUserId);
  const senderType = getSenderType(message, currentUserId);
  const senderColor = SENDER_TYPE_COLORS[senderType] || theme.colors.textSecondary;

  const renderContent = () => {
    switch (message.type) {
      case 'IMAGE':
        return (
          <View style={styles.imageContainer}>
            {message.attachments?.map(att => (
              <TouchableOpacity
                key={att.id}
                onPress={() => onImagePress?.(att)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: att.url }} style={styles.image} resizeMode="cover" />
              </TouchableOpacity>
            ))}
            {message.content ? (
              <Text style={[styles.text, own ? styles.ownText : styles.otherText]}>
                {message.content}
              </Text>
            ) : null}
          </View>
        );

      case 'FILE':
        return (
          <View style={styles.fileContainer}>
            <Text style={styles.fileIcon}>📎</Text>
            <View style={styles.fileInfo}>
              <Text
                style={[styles.fileName, own ? styles.ownText : styles.otherText]}
                numberOfLines={1}
              >
                {message.attachments?.[0]?.name || '文件'}
              </Text>
              {message.attachments?.[0]?.size && (
                <Text style={styles.fileSize}>
                  {(message.attachments[0].size / 1024).toFixed(1)} KB
                </Text>
              )}
            </View>
          </View>
        );

      default:
        return (
          <Text style={[styles.text, own ? styles.ownText : styles.otherText]}>
            {message.content}
          </Text>
        );
    }
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View
      style={[
        styles.wrapper,
        own ? styles.ownWrapper : styles.otherWrapper,
        isConsecutive && styles.consecutiveWrapper,
        style,
      ]}
      testID={testID}
    >
      {showSenderIndicator && !own && (
        <SenderIndicator
          senderType={senderType}
          senderName={message.sender?.displayName || message.sender?.name}
        />
      )}

      <TouchableOpacity
        style={[
          styles.bubble,
          own ? styles.ownBubble : styles.otherBubble,
          own ? { backgroundColor: senderColor } : { backgroundColor: '#F0F0F0' },
        ]}
        onPress={() => onPress?.(message)}
        onLongPress={() => onLongPress?.(message)}
        activeOpacity={0.7}
      >
        {renderContent()}

        <View style={[styles.footer, own ? styles.ownFooter : styles.otherFooter]}>
          <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
          {own && (
            <MessageStatus
              messageId={message.id}
              roomId={message.chatRoomId}
              currentUserId={currentUserId}
              status={status}
              totalMembers={totalMembers}
              showReadCount={false}
              showReadList={false}
            />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: theme.spacing.base,
    marginVertical: 2,
  },
  ownWrapper: {
    alignItems: 'flex-end',
  },
  otherWrapper: {
    alignItems: 'flex-start',
  },
  consecutiveWrapper: {
    marginTop: 0,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  ownBubble: {
    borderTopRightRadius: theme.borderRadius.xs,
  },
  otherBubble: {
    borderTopLeftRadius: theme.borderRadius.xs,
  },
  text: {
    fontSize: theme.fonts.sizes.base,
    lineHeight: 22,
  },
  ownText: {
    color: theme.colors.textInverse,
  },
  otherText: {
    color: theme.colors.text,
  },
  imageContainer: {
    gap: theme.spacing.xs,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: theme.borderRadius.md,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  fileIcon: {
    fontSize: 24,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  fileSize: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ownFooter: {
    justifyContent: 'flex-end',
  },
  otherFooter: {
    justifyContent: 'flex-start',
  },
  time: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textTertiary,
  },
});

export default MessageBubble;
