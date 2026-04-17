import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MomentDetailScreen } from '../screens/moment/MomentDetailScreen';
import { UserProfileScreen } from '../screens/user/UserProfileScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { EditProfileScreen } from '../screens/settings/EditProfileScreen';
import { ChatScreen } from '../screens/messages/ChatScreen';
import { RootStackParamList } from '../types/navigation';

import { DrawerNavigator } from './DrawerNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const MainNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Main drawer navigator with tabs */}
      <Stack.Screen name="Main" component={DrawerNavigator} />

      {/* Shared screens accessible from multiple tabs */}
      <Stack.Group screenOptions={{ presentation: 'card' }}>
        <Stack.Screen name="MomentDetail" component={MomentDetailScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
};
