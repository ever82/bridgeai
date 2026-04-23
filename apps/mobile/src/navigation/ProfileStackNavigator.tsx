import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { EditProfileScreen } from '../screens/settings/EditProfileScreen';
import { SecuritySettingsScreen } from '../screens/settings/SecuritySettingsScreen';
import { PrivacySettingsScreen } from '../screens/settings/PrivacySettingsScreen';
import { DisclosureSettings } from '../screens/settings/DisclosureSettings';
import { BlockedUsersScreen } from '../screens/settings/BlockedUsersScreen';
import { DisclosurePreview } from '../components/Disclosure/DisclosurePreview';
import { DeviceManagementScreen } from '../screens/settings/DeviceManagementScreen';
import { MyMomentsScreen } from '../screens/profile/MyMomentsScreen';
import { LikedMomentsScreen } from '../screens/profile/LikedMomentsScreen';
import { MomentDetailScreen } from '../screens/moment/MomentDetailScreen';
import { UserProfileScreen } from '../screens/user/UserProfileScreen';
import { ReviewListScreen, ReviewDetailScreen, WriteReviewScreen } from '../screens/Reviews';
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
      <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <Stack.Screen name="DisclosureSettings" component={DisclosureSettings} />
      <Stack.Screen name="DeviceManagement" component={DeviceManagementScreen} />
      <Stack.Screen name="DisclosurePreview" component={DisclosurePreview} />
      <Stack.Screen name="MyMoments" component={MyMomentsScreen} />
      <Stack.Screen name="LikedMoments" component={LikedMomentsScreen} />
      <Stack.Screen name="MomentDetail" component={MomentDetailScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="ReviewList" component={ReviewListScreen} />
      <Stack.Screen name="ReviewDetail" component={ReviewDetailScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
      <Stack.Screen name="AgentList" component={AgentListScreen} />
      <Stack.Screen name="CreateAgent" component={CreateAgentScreen} />
    </Stack.Navigator>
  );
};
