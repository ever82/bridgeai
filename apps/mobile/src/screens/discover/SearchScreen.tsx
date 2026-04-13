import React from 'react';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';
import { Text } from 'react-native';

export const SearchScreen = () => {
  return (
    <ScreenContainer>
      <Header title="搜索" showBackButton />
      <Text>搜索页面</Text>
    </ScreenContainer>
  );
};
