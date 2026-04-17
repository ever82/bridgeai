import React from 'react';
import { Text } from 'react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';

export const DiscoverScreen = () => {
  return (
    <ScreenContainer>
      <Header title="发现" />
      <Text>发现页面</Text>
    </ScreenContainer>
  );
};
