import React from 'react';
import { Text } from 'react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';

export const MessagesListScreen = () => {
  return (
    <ScreenContainer>
      <Header title="消息" />
      <Text>消息列表页面</Text>
    </ScreenContainer>
  );
};
