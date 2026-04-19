import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MessagesListScreen } from '../screens/messages/MessagesListScreen';
import { ChatScreen } from '../screens/messages/ChatScreen';
import { MessageSearchScreen } from '../screens/messages/MessageSearchScreen';
import { NewChatScreen } from '../screens/messages/NewChatScreen';
import { NotificationDetailScreen } from '../screens/messages/NotificationDetailScreen';
import { MessageSettingsScreen } from '../screens/messages/MessageSettingsScreen';
import { MessagesStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export const MessagesStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MessagesList" component={MessagesListScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="MessageSearch" component={MessageSearchScreen} />
      <Stack.Screen name="NewChat" component={NewChatScreen} />
      <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
      <Stack.Screen name="MessageSettings" component={MessageSettingsScreen} />
    </Stack.Navigator>
  );
};
