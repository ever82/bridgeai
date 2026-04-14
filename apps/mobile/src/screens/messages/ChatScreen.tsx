import React from 'react';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MessagesStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<MessagesStackParamList, 'Chat'>;

export const ChatScreen = ({ route }: Props) => {
  const { conversationId, userName } = route.params;

  return (
    <ScreenContainer>
      <Header title={userName} showBackButton />
      <Text>聊天页面 - Conversation ID: {conversationId}</Text>
    </ScreenContainer>
  );
};
