// Legacy exports
export { Button } from './Button';
export { LoginForm } from './LoginForm';
export { ItemList } from './ItemList';

// Design System Components
export { Button as ButtonV2 } from './Button/Button';
export { Input } from './Input/Input';
export { Card } from './Card/Card';
export { Modal } from './Modal/Modal';
export { Icon } from './Icon/Icon';

// Types
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button/Button';
export type { InputProps, InputType, InputState } from './Input/Input';
export type { CardProps } from './Card/Card';
export type { ModalProps } from './Modal/Modal';
export type { IconProps, IconName } from './Icon/Icon';

// Chat & Presence Components
export { OnlineStatus, OnlineStatusBadge } from './OnlineStatus';
export { TypingIndicator, TypingInput, useTypingDetector } from './TypingIndicator';
export { MessageStatus, GroupReadStatus, ReadReceiptBadge } from './Chat';

// Types
export type { OnlineStatusProps, OnlineStatusType, OnlineStatusBadgeProps } from './OnlineStatus';
export type {
  TypingIndicatorProps,
  TypingInputProps,
  UseTypingDetectorOptions,
  UseTypingDetectorReturn,
} from './TypingIndicator';
export type {
  MessageStatusProps,
  MessageStatusType,
  ReadReceipt,
  GroupReadStatusProps,
  ReadReceiptBadgeProps,
} from './Chat';
