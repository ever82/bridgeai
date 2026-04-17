import React from 'react';
import { Text } from 'react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';

export const SearchScreen = () => {
  return (
    <ScreenContainer>
      <Header title="搜索" showBackButton />
      <Text>搜索页面</Text>
    </ScreenContainer>
  );
};
