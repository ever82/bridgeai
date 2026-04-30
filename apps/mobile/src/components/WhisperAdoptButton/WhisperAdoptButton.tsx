/**
 * WhisperAdoptButton
 *
 * One-tap button that lets the user adopt an Agent-generated private
 * advice ("whisper") and immediately post its content as a chat message
 * into the relevant room.
 *
 * Backend: POST /api/v1/whisper/adopt
 * Service: see apps/server/src/services/dating/privateAdviceService.ts
 */
import React, { useState, useCallback } from 'react';

import { Button } from '../Button';
import { api } from '../../services/api/client';

export type WhisperAdviceType =
  | 'topic_suggestion'
  | 'risk_warning'
  | 'intent_analysis'
  | 'one_tap_action';

export interface WhisperAdvice {
  id: string;
  roomId: string;
  /** Either content or message is accepted; content takes priority. */
  content?: string;
  message?: string;
  type?: WhisperAdviceType;
}

export interface WhisperAdoptButtonProps {
  advice: WhisperAdvice;
  title?: string;
  onAdopted?: (result: { messageId: string; adviceId: string }) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  testID?: string;
}

interface AdoptResponse {
  message: {
    id: string;
    roomId: string;
    senderId: string;
    content: string;
    createdAt: string;
  };
  adviceId: string;
}

export const WhisperAdoptButton: React.FC<WhisperAdoptButtonProps> = ({
  advice,
  title = '一键采用建议',
  onAdopted,
  onError,
  disabled = false,
  testID,
}) => {
  const [loading, setLoading] = useState(false);
  const [adopted, setAdopted] = useState(false);

  const handlePress = useCallback(async () => {
    const content = advice.content ?? advice.message;
    if (!content || !advice.roomId || !advice.id) {
      onError?.(new Error('Invalid advice payload'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<AdoptResponse>('/v1/whisper/adopt', {
        adviceId: advice.id,
        roomId: advice.roomId,
        content,
        type: advice.type ?? 'one_tap_action',
      });

      const data = response.data.data;
      setAdopted(true);
      if (data) {
        onAdopted?.({ messageId: data.message.id, adviceId: data.adviceId });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to adopt advice');
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [advice, onAdopted, onError]);

  return (
    <Button
      title={adopted ? '已发送' : title}
      onPress={handlePress}
      variant="primary"
      size="sm"
      loading={loading}
      disabled={disabled || loading || adopted}
      testID={testID ?? 'whisper-adopt-button'}
    />
  );
};

export default WhisperAdoptButton;
