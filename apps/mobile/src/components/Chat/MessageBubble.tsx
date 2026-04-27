import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Alert,
  Clipboard,
} from 'react-native';
import { SenderType, SENDER_TYPE_COLORS } from '@bridgeai/shared';

import { UserAvatar } from '../UserAvatar/UserAvatar';
import { IdentityBadge } from '../IdentityBadge/IdentityBadge';
import { ChatMessage, MessageAttachment, resolveMessageSender } from '../../types/chat';
import { theme } from '../../theme';

import { MessageStatus, MessageStatusType } from './MessageStatus';

export interface MessageBubbleProps {
  message: ChatMessage;
  currentUserId: string;
  showSenderIndicator?: boolean;
  isConsecutive?: boolean;
  onPress?: (message: ChatMessage) => void;
  onLongPress?: (message: ChatMessage) => void;
  onImagePress?: (attachment: MessageAttachment) => void;
  onDelete?: (message: ChatMessage) => void;
  onReport?: (message: ChatMessage) => void;
  status?: MessageStatusType;
  totalMembers?: number;
  style?: ViewStyle;
  testID?: string;
}

const isOwnMessage = (message: ChatMessage, currentUserId: string): boolean =>
  message.senderId === currentUserId;

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  showSenderIndicator = false,
  isConsecutive = false,
  onPress,
  onLongPress,
  onImagePress,
  onDelete,
  onReport,
  status = 'sent',
  totalMembers,
  style,
  testID,
}) => {
  const own = isOwnMessage(message, currentUserId);
  const resolved = resolveMessageSender(message);
  const senderType = resolved.senderType === 'AGENT' ? SenderType.AGENT : SenderType.HUMAN;
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

      case 'VIDEO':
        return (
          <View style={styles.fileContainer}>
            <Text style={styles.fileIcon}>🎬</Text>
            <View style={styles.fileInfo}>
              <Text
                style={[styles.fileName, own ? styles.ownText : styles.otherText]}
                numberOfLines={1}
              >
                {message.attachments?.[0]?.name || '视频'}
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

  const handleLongPress = () => {
    Alert.alert(
      '',
      undefined,
      [
        { text: '复制', onPress: () => Clipboard.setString(message.content) },
        ...(onDelete ? [{ text: '删除', onPress: () => onDelete(message) }] : []),
        ...(onReport ? [{ text: '举报', onPress: () => onReport(message) }] : []),
        { text: '取消', style: 'cancel' },
      ],
      { cancelable: true }
    );
    onLongPress?.(message);
  };

  const senderDisplayName = resolved.displayName;
  const senderAvatarUrl = resolved.avatarUrl;
  const isAgent = senderType === SenderType.AGENT;

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
      {/* Sender identity row for other's messages */}
      {!own && showSenderIndicator && (
        <View style={styles.senderIdentityRow}>
          <UserAvatar
            uri={senderAvatarUrl}
            name={senderDisplayName}
            size="xs"
            userType={isAgent ? 'agent' : 'human'}
            showStatus={false}
            testID={`${testID}-avatar`}
          />
          {senderDisplayName ? <Text style={styles.senderName}>{senderDisplayName}</Text> : null}
          <IdentityBadge
            type={isAgent ? 'agent' : 'verified'}
            size="sm"
            showLabel={isAgent}
            position="beside-name"
            testID={`${testID}-identity-badge`}
          />
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.bubble,
          own ? styles.ownBubble : styles.otherBubble,
          own ? { backgroundColor: senderColor } : { backgroundColor: '#F0F0F0' },
        ]}
        onPress={() => onPress?.(message)}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        {/* Own-message identity badge */}
        {own && (
          <View style={styles.ownIdentityRow}>
            <IdentityBadge
              type={isAgent ? 'agent' : 'verified'}
              size="sm"
              showLabel={false}
              position="beside-name"
              testID={`${testID}-identity-badge`}
            />
          </View>
        )}

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
    borderTopRightRadius: theme.borderRadius.none,
  },
  otherBubble: {
    borderTopLeftRadius: theme.borderRadius.none,
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
  senderIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: 2,
    paddingLeft: theme.spacing.xs,
  },
  senderName: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textSecondary,
  },
  ownIdentityRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
});

export default MessageBubble;
