import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MessagesListScreen } from '../screens/messages/MessagesListScreen';
import { ChatScreen } from '../screens/messages/ChatScreen';
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
    </Stack.Navigator>
  );
};
