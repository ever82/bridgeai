export { Button } from './Button';
export { LoginForm } from './LoginForm';
export { ItemList } from './ItemList';
export { StarRating, ReviewCard, ReviewStats } from './Reviews';
export { UserStatusIndicator } from './UserStatusIndicator';
export type {
  UserStatusIndicatorProps,
  PresenceStatus,
  IndicatorVariant,
} from './UserStatusIndicator';

// UI004b components
export { UserAvatar } from './UserAvatar/UserAvatar';
export type { UserAvatarProps } from './UserAvatar/UserAvatar';
export { TypingIndicator } from './TypingIndicator/TypingIndicator';
export type { TypingIndicatorProps } from './TypingIndicator/TypingIndicator';
export { IdentityBadge } from './IdentityBadge/IdentityBadge';
export type { IdentityBadgeProps } from './IdentityBadge/IdentityBadge';
export { LastSeen } from './LastSeen/LastSeen';
export type { LastSeenProps } from './LastSeen/LastSeen';
export { ConversationItem } from './ConversationItem/ConversationItem';
export type { ConversationItemProps } from './ConversationItem/ConversationItem';
export { CreditScore } from './CreditScore/CreditScore';
export type { CreditScoreProps } from './CreditScore/CreditScore';
export { SenderIndicator } from './Chat/SenderIndicator';
export type { SenderIndicatorProps } from './Chat/SenderIndicator';
export { StatusChangeNotification } from './Chat/StatusChangeNotification';
export type { StatusChangeNotificationProps } from './Chat/StatusChangeNotification';

// Chat message rendering - integrates UserAvatar + IdentityBadge (US-AGENT-008)
export { MessageBubble as ChatMessage } from './Chat/MessageBubble';
export type { MessageBubbleProps as ChatMessageProps } from './Chat/MessageBubble';

// Whisper (private advice) one-tap adopt — AS-007/AS-008
export { WhisperAdoptButton } from './WhisperAdoptButton';
export type {
  WhisperAdoptButtonProps,
  WhisperAdvice,
  WhisperAdviceType,
} from './WhisperAdoptButton';
