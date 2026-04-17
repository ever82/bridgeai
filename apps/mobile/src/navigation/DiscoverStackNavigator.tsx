import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { DiscoverScreen } from '../screens/discover/DiscoverScreen';
import { SearchScreen } from '../screens/discover/SearchScreen';
import { CategoryMomentsScreen } from '../screens/discover/CategoryMomentsScreen';
import { DiscoverStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<DiscoverStackParamList>();

export const DiscoverStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="DiscoverMain" component={DiscoverScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="CategoryMoments" component={CategoryMomentsScreen} />
    </Stack.Navigator>
  );
};
