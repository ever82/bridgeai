import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { EditProfileScreen } from '../screens/settings/EditProfileScreen';
import { MyMomentsScreen } from '../screens/profile/MyMomentsScreen';
import { LikedMomentsScreen } from '../screens/profile/LikedMomentsScreen';
import { MomentDetailScreen } from '../screens/moment/MomentDetailScreen';
import { UserProfileScreen } from '../screens/user/UserProfileScreen';
import { AgentListScreen } from '../screens/agent/AgentListScreen';
import { CreateAgentScreen } from '../screens/agent/CreateAgentScreen';
import { ProfileStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="MyMoments" component={MyMomentsScreen} />
      <Stack.Screen name="LikedMoments" component={LikedMomentsScreen} />
      <Stack.Screen name="MomentDetail" component={MomentDetailScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="AgentList" component={AgentListScreen} />
      <Stack.Screen name="CreateAgent" component={CreateAgentScreen} />
    </Stack.Navigator>
  );
};
