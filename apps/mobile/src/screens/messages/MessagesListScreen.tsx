import React from 'react';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';
import { Text } from 'react-native';

export const MessagesListScreen = () => {
  return (
    <ScreenContainer>
      <Header title="消息" />
      <Text>消息列表页面</Text>
    </ScreenContainer>
  );
};
