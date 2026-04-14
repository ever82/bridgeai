import React from 'react';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DiscoverStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'CategoryMoments'>;

export const CategoryMomentsScreen = ({ route }: Props) => {
  const { categoryId, categoryName } = route.params;

  return (
    <ScreenContainer>
      <Header title={categoryName} showBackButton />
      <Text>分类页面 - Category ID: {categoryId}</Text>
    </ScreenContainer>
  );
};
