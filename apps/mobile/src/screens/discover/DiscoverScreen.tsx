import React from 'react';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';
import { Text } from 'react-native';

export const DiscoverScreen = () => {
  return (
    <ScreenContainer>
      <Header title="发现" />
      <Text>发现页面</Text>
    </ScreenContainer>
  );
};
